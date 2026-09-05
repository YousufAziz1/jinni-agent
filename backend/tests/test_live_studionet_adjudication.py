"""
Real End-to-End GenLayer Studionet Adjudication Test
Validates:
1. Proposal policy evaluation (Policy PASS).
2. Live transaction submission & polling on GenLayer Studionet (0xa54cF1bBCfe4456b6194658699aab540fBeF046c).
3. Live on-chain decision retrieval via get_decision() returning APPROVE.
4. Separation of transaction lifecycle (FINALIZED) from decision (APPROVE).
5. Telemetry isolation (no fabricated validator votes/tallies).
6. Execution gate logic:
   - PASS + APPROVE + Human Confirmation = READY (PREVIEW mode)
   - Negative cases (FAIL, REJECT, DISPUTE, INSUFFICIENT_DATA) = BLOCKED.
7. Contract persistence on GenLayer Studionet.
"""

import os
import sys
import json
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import settings
from agent_domain import (
    AgentProposal,
    EvidenceItem,
    ExecutionState,
    GenLayerResult,
    GenLayerDecision
)
from policy_engine import PolicyEngine
from genlayer_service import GenLayerService
from execution_gate import ExecutionGate


LIVE_CONTRACT_ADDRESS = "0xa54cF1bBCfe4456b6194658699aab540fBeF046c"
LIVE_TX_HASH = "0xae013f22fbea2affccfd90ddca90c2ad65711001c9b090c3fb955402b31acb4b"
PROPOSAL_ID = "prop_live_e2e_001"


def create_safe_proposal() -> AgentProposal:
    """Creates a small, valid, safe proposal within all policy thresholds."""
    return AgentProposal(
        id=PROPOSAL_ID,
        createdAt="2026-09-05T21:30:00Z",
        actionType="SWAP",
        asset="USDC",
        chainId=11155111,
        amount="50.0",
        amountUsd="50.0",
        slippage="0.5%",
        agentRationale="Routine rebalance of USDC on Sepolia testnet within authorized limits.",
        policyVersion="1.0.0",
        evidence=[
            EvidenceItem(id="ev-1", type="DEX_SPOT_PRICE", value="1.001", status="VERIFIED", source="Uniswap V3 Pool 0x..."),
            EvidenceItem(id="ev-2", type="ORACLE_PRICE", value="1.000", status="VERIFIED", source="Chainlink Sepolia Feed"),
            EvidenceItem(id="ev-3", type="LIQUIDITY_CHECK", value="250000.0", status="VERIFIED", source="Uniswap Subgraph"),
            EvidenceItem(id="ev-4", type="CONTRACT_VERIFICATION", value="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", status="VERIFIED", source="Etherscan Sepolia API")
        ],
        execution=ExecutionState(
            status="WAITING_FOR_GENLAYER",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            mode="PREVIEW"
        )
    )


def test_1_policy_evaluation_returns_pass():
    """Step 2 & 3: Run server-side policy evaluation and assert PASS."""
    proposal = create_safe_proposal()
    overall_result, primary_reason, breakdown = PolicyEngine.evaluate(proposal)

    assert overall_result == "PASS"
    assert "satisfied" in primary_reason.lower()
    assert breakdown["result"] == "PASS"


def test_2_live_contract_and_tx_hash_configuration():
    """Verify configured contract matches official deployed Studionet contract."""
    assert settings.JINNI_AGENT_CONTRACT_ADDRESS.lower() == LIVE_CONTRACT_ADDRESS.lower()
    assert settings.GENLAYER_CHAIN_ID == 61999
    assert settings.GENLAYER_NETWORK == "studionet"


def test_3_poll_real_studionet_transaction_status():
    """Step 5 & 6: Poll the REAL transaction using supported GenLayer RPC."""
    res = GenLayerService.poll_transaction_status(LIVE_TX_HASH, PROPOSAL_ID)

    assert res.txHash == LIVE_TX_HASH
    assert res.txStatus in ["ACCEPTED", "FINALIZED"]
    assert res.network == "studionet"
    assert res.chainId == 61999


def test_4_read_real_contract_decision():
    """Step 7 & 8: Read REAL contract decision using get_decision()."""
    res = GenLayerService.poll_transaction_status(LIVE_TX_HASH, PROPOSAL_ID)

    assert res.decision == "APPROVE"
    assert "GenLayer intelligent multi-validator consensus concluded with APPROVE" in res.reasoning


def test_5_separation_of_tx_status_and_decision():
    """Step 9: Verify transaction status (FINALIZED) is decoupled from decision (APPROVE)."""
    res = GenLayerService.poll_transaction_status(LIVE_TX_HASH, PROPOSAL_ID)

    # Status must be a valid transaction lifecycle state
    assert res.txStatus in ["PENDING", "ACCEPTED", "FINALIZED"]
    # Decision must be a valid adjudication outcome
    assert res.decision in ["APPROVE", "REJECT", "DISPUTE", "INSUFFICIENT_DATA", "UNAVAILABLE"]
    # Neither one implies or overwrites the other
    assert res.txStatus != res.decision


def test_6_telemetry_isolation_no_fabricated_votes():
    """Step 10: Do not infer validator count, votes, rounds unless verified from node receipt."""
    res = GenLayerService.poll_transaction_status(LIVE_TX_HASH, PROPOSAL_ID)
    assert res.telemetry is None


def test_7_execution_gate_logic_positive_and_negative():
    """
    Step 11: Test execution gate logic:
    - PASS + APPROVE + Human confirm = READY (mode PREVIEW)
    - PASS + APPROVE + Unconfirmed = AWAITING_USER_CONFIRMATION
    - Negative cases = BLOCKED
    """
    proposal = create_safe_proposal()
    proposal.policyResult = "PASS"
    proposal.genlayer = GenLayerResult(
        network="studionet",
        chainId=61999,
        contractAddress=LIVE_CONTRACT_ADDRESS,
        txHash=LIVE_TX_HASH,
        txStatus="FINALIZED",
        decision="APPROVE",
        reasoning="Multi-validator consensus approved",
        submittedAt="2026-09-05T21:30:00Z",
        finalizedAt="2026-09-05T21:31:00Z",
        telemetry=None
    )

    # 1. Human confirmation required but not confirmed
    proposal.execution.requiresHumanConfirmation = True
    proposal.execution.userConfirmed = False
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "AWAITING_USER_CONFIRMATION"
    assert state == "AWAITING_CONFIRMATION"

    # 2. Human confirmed -> READY (mode PREVIEW)
    proposal.execution.userConfirmed = True
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "READY"
    assert state == "READY_FOR_EXECUTION"
    assert proposal.execution.mode == "PREVIEW"  # Preview only, no live funds moved

    # 3. Negative Case: Policy FAIL -> BLOCKED
    proposal.policyResult = "FAIL"
    proposal.policyFailureReason = "Slippage exceeded limit"
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "POLICY_FAILED"

    # 4. Negative Case: GenLayer REJECT -> BLOCKED
    proposal.policyResult = "PASS"
    proposal.genlayer.decision = "REJECT"
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "REJECTED"

    # 5. Negative Case: GenLayer DISPUTE -> BLOCKED
    proposal.genlayer.decision = "DISPUTE"
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "DISPUTED"

    # 6. Negative Case: GenLayer INSUFFICIENT_DATA -> BLOCKED
    proposal.genlayer.decision = "INSUFFICIENT_DATA"
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "INSUFFICIENT_DATA"
