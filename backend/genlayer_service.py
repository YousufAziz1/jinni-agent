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
    Handles communication with GenLayer Intelligent Contracts on Studionet / Localnet.
    Enforces truthful status reporting and strict isolation of missing telemetry.
    """

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Checks if GenLayer network and contract are configured and reachable."""
        configured = bool(settings.JINNI_AGENT_CONTRACT_ADDRESS and settings.GENLAYER_RPC)
        rpc_reachable = False

        if settings.GENLAYER_RPC:
            try:
                # Test connection using basic JSON-RPC call
                res = requests.post(
                    settings.GENLAYER_RPC,
                    json={"jsonrpc": "2.0", "method": "net_version", "params": [], "id": 1},
                    timeout=3
                )
                rpc_reachable = res.status_code == 200
            except Exception:
                rpc_reachable = False

        return {
            "configured": configured,
            "network": settings.GENLAYER_NETWORK,
            "chainId": settings.GENLAYER_CHAIN_ID,
            "rpcUrl": settings.GENLAYER_RPC,
            "contractAddress": settings.JINNI_AGENT_CONTRACT_ADDRESS or "NOT_CONFIGURED",
            "explorerBaseUrl": settings.GENLAYER_EXPLORER_BASE_URL,
            "rpcReachable": rpc_reachable,
            "mode": "LIVE" if (configured and rpc_reachable) else "CONFIGURATION_BLOCKED"
        }

    @classmethod
    def submit_proposal(cls, proposal: AgentProposal) -> GenLayerResult:
        """
        Submits proposal to the GenLayer Intelligent Contract.
        If contract is not configured or network unreachable, returns explicit UNAVAILABLE state.
        """
        status = cls.get_status()
        now_iso = datetime.datetime.utcnow().isoformat()

        # If not configured, do not synthesize live transaction
        if not status["configured"] or not status["rpcReachable"]:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS or None,
                txHash=None,
                txStatus=None,
                decision="UNAVAILABLE",
                reasoning=(
                    "GenLayer contract is not configured or RPC is currently unreachable. "
                    "Set JINNI_AGENT_CONTRACT_ADDRESS and verify GENLAYER_RPC in backend configuration."
                ),
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
                "maxSlippage": 1.0
            },
            "evidence": [e.model_dump() for e in proposal.evidence],
            "agentRationale": proposal.agentRationale,
            "timestamp": now_iso
        }

        rpc_payload = {
            "jsonrpc": "2.0",
            "method": "gen_sendTransaction",
            "params": [{
                "to": settings.JINNI_AGENT_CONTRACT_ADDRESS,
                "function": "adjudicate_proposal",
                "args": [json.dumps(proposal_payload)]
            }],
            "id": int(time.time())
        }

        try:
            res = requests.post(settings.GENLAYER_RPC, json=rpc_payload, timeout=10)
            data = res.json()
            if "error" in data:
                return GenLayerResult(
                    network=settings.GENLAYER_NETWORK,
                    chainId=settings.GENLAYER_CHAIN_ID,
                    contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                    txHash=None,
                    txStatus="FAILED",
                    decision="UNAVAILABLE",
                    reasoning=f"GenLayer submission error: {data['error'].get('message', str(data['error']))}",
                    submittedAt=now_iso,
                    telemetry=None
                )

            tx_hash = data.get("result", {}).get("hash") or data.get("result")
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=tx_hash,
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
        Polls GenLayer RPC for transaction receipt and parses adjudication outcome.
        Decouples transaction lifecycle (PENDING/ACCEPTED/FINALIZED) from decision (APPROVE/REJECT).
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

        rpc_payload = {
            "jsonrpc": "2.0",
            "method": "gen_getTransactionReceipt",
            "params": [tx_hash],
            "id": 1
        }

        try:
            res = requests.post(settings.GENLAYER_RPC, json=rpc_payload, timeout=8)
            data = res.json()
            receipt = data.get("result")

            if not receipt:
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

            # Extract actual returned receipt status
            raw_status = receipt.get("status", "UNKNOWN").upper()
            mapped_tx_status = (
                "FINALIZED" if raw_status == "FINALIZED"
                else "ACCEPTED" if raw_status == "ACCEPTED"
                else "FAILED" if raw_status in ["FAILED", "REVERTED"]
                else "PENDING"
            )

            # Telemetry mapping: STRICTLY ONLY what the real receipt provides
            # If missing from receipt, remain None / null
            telemetry = None
            if "consensusData" in receipt or "telemetry" in receipt:
                tel_raw = receipt.get("consensusData") or receipt.get("telemetry") or {}
                telemetry = GenLayerTelemetry(
                    validatorCount=tel_raw.get("validatorCount"),
                    validators=tel_raw.get("validators"),
                    votes=tel_raw.get("votes"),
                    votePercentage=tel_raw.get("votePercentage"),
                    consensusPercentage=tel_raw.get("consensusPercentage"),
                    confidence=tel_raw.get("confidence"),
                    rounds=tel_raw.get("rounds"),
                    latencyMs=tel_raw.get("latencyMs"),
                    majorityAgreement=tel_raw.get("majorityAgreement"),
                    resultName=tel_raw.get("resultName")
                )

            # Parse returned adjudication decision from receipt output
            decision: GenLayerDecision = "UNAVAILABLE"
            reasoning = "Awaiting decision extraction from contract output"

            output_raw = receipt.get("output") or receipt.get("return")
            if output_raw:
                try:
                    if isinstance(output_raw, str):
                        output_data = json.loads(output_raw)
                    else:
                        output_data = output_raw
                    
                    dec_str = output_data.get("decision", "").upper()
                    if dec_str in ["APPROVE", "REJECT", "DISPUTE", "INSUFFICIENT_DATA"]:
                        decision = dec_str
                    reasoning = output_data.get("reasoning", reasoning)
                except Exception:
                    reasoning = f"Could not parse contract output: {output_raw}"

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
                telemetry=telemetry,
                rawReceipt=receipt
            )

        except Exception as e:
            return GenLayerResult(
                network=settings.GENLAYER_NETWORK,
                chainId=settings.GENLAYER_CHAIN_ID,
                contractAddress=settings.JINNI_AGENT_CONTRACT_ADDRESS,
                txHash=tx_hash,
                txStatus="UNKNOWN",
                decision="UNAVAILABLE",
                reasoning=f"Error polling GenLayer receipt: {str(e)}",
                telemetry=None
            )
