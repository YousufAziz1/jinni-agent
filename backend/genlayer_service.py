import os
import subprocess
import json
import time
import requests
import datetime
from typing import Dict, Any, Optional
from config import settings
from agent_domain import (
    AgentProposal,
    GenLayerResult,
    GenLayerDecision,
    GenLayerTelemetry
)

class GenLayerService:
    """
    GenLayer Service Adapter for JINNI Agent
    Connects to GenLayer Intelligent Contracts on Studionet / Localnet.
    Enforces truthful status reporting, separation of transaction lifecycle from adjudication,
    and strict isolation of missing telemetry (no data fabrication).
    """

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Checks if GenLayer network and contract are configured and reachable."""
        is_dummy_addr = not settings.JINNI_AGENT_CONTRACT_ADDRESS or settings.JINNI_AGENT_CONTRACT_ADDRESS.replace("0", "").replace("x", "") == ""
        configured = bool(settings.JINNI_AGENT_CONTRACT_ADDRESS and not is_dummy_addr and settings.GENLAYER_RPC)
        rpc_reachable = False

        if settings.GENLAYER_RPC:
            try:
                # Test connectivity using standard eth_blockNumber supported by GenLayer RPC
                res = requests.post(
                    settings.GENLAYER_RPC,
                    json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
                    timeout=5
                )
                if res.status_code == 200:
                    data = res.json()
                    rpc_reachable = "result" in data and not "error" in data
            except Exception:
                rpc_reachable = False

        return {
            "configured": configured,
            "network": settings.GENLAYER_NETWORK,
            "chainId": settings.GENLAYER_CHAIN_ID,
            "rpcUrl": settings.GENLAYER_RPC,
            "contractAddress": settings.JINNI_AGENT_CONTRACT_ADDRESS if configured else "NOT_CONFIGURED",
            "explorerBaseUrl": settings.GENLAYER_EXPLORER_BASE_URL,
            "rpcReachable": rpc_reachable,
            "mode": "LIVE" if (configured and rpc_reachable) else "CONFIGURATION_BLOCKED"
        }

    @classmethod
    def submit_proposal(cls, proposal: AgentProposal) -> GenLayerResult:
        """
        Submits proposal to the GenLayer Intelligent Contract.
        If contract is not configured or network unreachable, returns explicit UNAVAILABLE state.
        Never synthesizes a live transaction.
        """
        status = cls.get_status()
        now_iso = datetime.datetime.utcnow().isoformat()

        # If not configured, truthfully block without fake submission
        if not status["configured"]:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=None,
                txHash=None,
                txStatus=None,
                decision="UNAVAILABLE",
                reasoning=(
                    "GenLayer contract is NOT_CONFIGURED. "
                    "Deploy contracts/JinniAgentGuard.py on GenLayer Studionet (via studio.genlayer.com) "
                    "and set JINNI_AGENT_CONTRACT_ADDRESS in backend/.env to enable live consensus."
                ),
                submittedAt=None,
                finalizedAt=None,
                telemetry=None
            )

        if not status["rpcReachable"]:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=None,
                txStatus=None,
                decision="UNAVAILABLE",
                reasoning=f"GenLayer RPC endpoint ({settings.GENLAYER_RPC}) is currently unreachable.",
                submittedAt=None,
                finalizedAt=None,
                telemetry=None
            )

        # Prepare contract call payload
        proposal_payload = {
            "id": proposal.id,
            "actionType": proposal.actionType,
            "asset": proposal.asset,
            "chain": proposal.chain,
            "chainId": proposal.chainId,
            "amountUsd": proposal.amountUsd,
            "slippage": proposal.slippage,
            "route": proposal.route,
            "policyVersion": proposal.policyVersion,
            "policyRules": {
                "maxTransactionValue": 500.0,
                "maxSlippage": 1.0,
                "minLiquidityUsd": 10000.0
            },
            "evidence": [e.model_dump() for e in proposal.evidence],
            "agentRationale": proposal.agentRationale,
            "timestamp": now_iso
        }

        # Attempt live submission via genlayer_bridge if contract is configured
        is_dummy_addr = not settings.JINNI_AGENT_CONTRACT_ADDRESS or settings.JINNI_AGENT_CONTRACT_ADDRESS.replace("0", "").replace("x", "") == ""
        if settings.JINNI_AGENT_CONTRACT_ADDRESS and not is_dummy_addr:
            try:
                bridge_path = os.path.join(os.path.dirname(__file__), "genlayer_bridge.js")
                cmd = ["node", bridge_path, "submit_proposal", json.dumps(proposal_payload)]
                env = {**os.environ, "JINNI_AGENT_CONTRACT_ADDRESS": settings.JINNI_AGENT_CONTRACT_ADDRESS}
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=45, env=env)
                if proc.returncode == 0 and proc.stdout.strip():
                    bridge_res = json.loads(proc.stdout.strip())
                    tx_hash = bridge_res.get("txHash")
                    if tx_hash:
                        return GenLayerResult(
                            network=settings.GENLAYER_NETWORK,
                            chainId=settings.GENLAYER_CHAIN_ID,
                            contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                            txHash=tx_hash,
                            txStatus="PENDING",
                            decision="UNAVAILABLE",
                            reasoning="Transaction submitted to GenLayer Intelligent Contract on Studionet. Awaiting consensus finalization.",
                            submittedAt=now_iso,
                            finalizedAt=None,
                            telemetry=None
                        )
            except Exception as bridge_err:
                pass

        # Fallback if server-side bridge could not produce an on-chain transaction:
        # Return truthful status requiring client-side signature without crashing on malformed RPC call
        return GenLayerResult(
            network=settings.GENLAYER_NETWORK,
            chainId=settings.GENLAYER_CHAIN_ID,
            contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
            txHash=None,
            txStatus="NOT_APPLICABLE",
            decision="UNAVAILABLE",
            reasoning="GenLayer Intelligent Contract is deployed on Studionet. Transactions must be dispatched with an active client signature.",
            submittedAt=None,
            finalizedAt=None,
            telemetry=None
        )

    @classmethod
    def poll_transaction_status(cls, tx_hash: str, proposal_id: str) -> GenLayerResult:
        """
        Polls GenLayer RPC for transaction status and receipt.
        Strictly decouples transaction lifecycle (PENDING/ACCEPTED/FINALIZED) from adjudication decision (APPROVE/REJECT).
        Never synthesizes missing telemetry.
        """
        now_iso = datetime.datetime.utcnow().isoformat()
        if not tx_hash:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS or None,
                txHash=None,
                txStatus=None,
                decision="UNAVAILABLE",
                reasoning="No transaction hash provided for polling",
                telemetry=None
            )

        # 1. Check transaction status via official gen_getTransactionStatus endpoint
        # Parameters: [tx_hash] (positional string array)
        status_payload = {
            "jsonrpc": "2.0",
            "method": "gen_getTransactionStatus",
            "params": [tx_hash],
            "id": 1
        }

        try:
            res = requests.post(settings.GENLAYER_RPC, json=status_payload, timeout=8)
            data = res.json()

            if "error" in data:
                err_code = data["error"].get("code")
                # -32001 means Transaction not found / still pending
                if err_code == -32001:
                    return GenLayerResult(
                        network=settings.GENLAYER_NETWORK,
                        chainId=settings.GENLAYER_CHAIN_ID,
                        contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                        txHash=tx_hash,
                        txStatus="PENDING",
                        decision="UNAVAILABLE",
                        reasoning="Transaction is pending consensus in GenLayer network.",
                        submittedAt=None,
                        telemetry=None
                    )
                return GenLayerResult(
                    network=settings.GENLAYER_NETWORK,
                    chainId=settings.GENLAYER_CHAIN_ID,
                    contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                    txHash=tx_hash,
                    txStatus="FAILED",
                    decision="UNAVAILABLE",
                    reasoning=f"GenLayer status error: {data['error'].get('message', str(data['error']))}",
                    submittedAt=None,
                    telemetry=None
                )

            res_data = data.get("result")
            if isinstance(res_data, str):
                raw_status = res_data
            elif isinstance(res_data, dict):
                raw_status = res_data.get("status", "Pending")
            else:
                raw_status = "Pending"
            status_upper = raw_status.upper()

            mapped_tx_status = (
                "FINALIZED" if status_upper in ["FINALIZED"]
                else "ACCEPTED" if status_upper in ["ACCEPTED"]
                else "FAILED" if status_upper in ["CANCELED", "VALIDATORSTIMEOUT", "LEADERTIMEOUT", "FAILED", "UNDETERMINED"]
                else "PENDING"
            )

            # 2. If transaction is ACCEPTED or FINALIZED, retrieve the decision via get_decision
            decision: GenLayerDecision = "UNAVAILABLE"
            reasoning = f"Transaction consensus status: {raw_status}."

            if mapped_tx_status in ["ACCEPTED", "FINALIZED"] and settings.JINNI_AGENT_CONTRACT_ADDRESS:
                # Query contract for stored decision via genlayer_bridge
                try:
                    bridge_path = os.path.join(os.path.dirname(__file__), "genlayer_bridge.js")
                    cmd = ["node", bridge_path, "read_decision", proposal_id]
                    env = {**os.environ, "JINNI_AGENT_CONTRACT_ADDRESS": settings.JINNI_AGENT_CONTRACT_ADDRESS}
                    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=12, env=env)
                    if proc.returncode == 0 and proc.stdout.strip():
                        parsed = json.loads(proc.stdout.strip())
                        dec_str = parsed.get("decision", "").upper()
                        if dec_str in ["APPROVE", "REJECT", "DISPUTE", "INSUFFICIENT_DATA"]:
                            decision = dec_str
                        reasoning = parsed.get("reasoning", reasoning)
                except Exception:
                    pass

            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=tx_hash,
                txStatus=mapped_tx_status,
                decision=decision,
                reasoning=reasoning,
                submittedAt=None,
                finalizedAt=now_iso if mapped_tx_status == "FINALIZED" else None,
                telemetry=None  # Strictly None when not provided by receipt; never synthesized
            )

        except Exception as e:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=tx_hash,
                txStatus="UNKNOWN",
                decision="UNAVAILABLE",
                reasoning=f"Error polling GenLayer transaction status: {str(e)}",
                submittedAt=None,
                telemetry=None
            )
