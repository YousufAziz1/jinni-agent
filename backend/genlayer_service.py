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

        # In GenLayer Node JSON-RPC, simulation/read calls use gen_call.
        # Direct write transactions require a signed eth_sendRawTransaction from client.
        # When calling backend endpoint, we invoke gen_call to evaluate consensus preflight
        rpc_payload = {
            "jsonrpc": "2.0",
            "method": "gen_call",
            "params": [{
                "type": "write",
                "to": settings.JINNI_AGENT_CONTRACT_ADDRESS,
                "data": json.dumps(proposal_payload)
            }],
            "id": int(time.time())
        }

        try:
            res = requests.post(settings.GENLAYER_RPC, json=rpc_payload, timeout=15)
            data = res.json()
            if "error" in data:
                err_msg = data["error"].get("message", str(data["error"]))
                return GenLayerResult(
                    network=settings.GENLAYER_NETWORK,
                    chainId=settings.GENLAYER_CHAIN_ID,
                    contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                    txHash=None,
                    txStatus="FAILED",
                    decision="UNAVAILABLE",
                    reasoning=f"GenLayer execution error: {err_msg}",
                    submittedAt=now_iso,
                    telemetry=None
                )

            # Extract return data if available
            result_obj = data.get("result", {})
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=result_obj.get("txHash") or result_obj.get("hash"),
                txStatus="PENDING",
                decision="UNAVAILABLE",
                reasoning="Transaction submitted to GenLayer Intelligent Contract. Awaiting consensus finalization.",
                submittedAt=now_iso,
                finalizedAt=None,
                telemetry=None
            )
        except Exception as e:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=None,
                txStatus="FAILED",
                decision="UNAVAILABLE",
                reasoning=f"RPC connection failed during submission: {str(e)}",
                submittedAt=now_iso,
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

            status_info = data.get("result", {})
            raw_status = status_info.get("status", "Pending")
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
                # Query contract for stored decision
                read_payload = {
                    "jsonrpc": "2.0",
                    "method": "gen_call",
                    "params": [{
                        "type": "read",
                        "to": settings.JINNI_AGENT_CONTRACT_ADDRESS,
                        "data": proposal_id
                    }],
                    "id": 2
                }
                try:
                    read_res = requests.post(settings.GENLAYER_RPC, json=read_payload, timeout=8)
                    read_data = read_res.json()
                    out_raw = read_data.get("result", {}).get("data")
                    if out_raw:
                        if isinstance(out_raw, str) and (out_raw.startswith("{") or "decision" in out_raw):
                            parsed = json.loads(out_raw)
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
