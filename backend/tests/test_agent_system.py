import pytest
import json
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent_domain import (
    AgentProposal,
    EvidenceItem,
    PolicyRuleConfig,
    GenLayerResult,
    GenLayerTelemetry,
    ExecutionState
)
from policy_engine import PolicyEngine
from execution_gate import ExecutionGate
from genlayer_service import GenLayerService
from demo_scenarios import get_demo_scenarios

# -------------------------------------------------------------
# 1. Proposal Validation & Policy Engine Tests
# -------------------------------------------------------------

def test_policy_engine_pass():
    """Valid proposal within limits and verified evidence should PASS."""
    proposal = AgentProposal(
        id="prop-test-pass",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        asset="LINK",
        chainId=11155111,
        amount="1.0",
        amountUsd="15.0",
        slippage="0.5%",
        evidence=[
            EvidenceItem(
                id="ev-1",
                source="CryptoCompare",
                type="PRICE_FEED",
                value="$15.00",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            ),
            EvidenceItem(
                id="ev-2",
                source="Etherscan",
                type="CONTRACT_VERIFICATION",
                value="0x779877A7B0D9E8603169DdbD7836e478b4624789",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            ),
            EvidenceItem(
                id="ev-3",
                source="Uniswap V3 Pool",
                type="LIQUIDITY_CHECK",
                value="250000.0",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            )
        ]
    )
    result, reason, breakdown = PolicyEngine.evaluate(proposal)
    assert result == "PASS"
    assert "criteria satisfied" in reason.lower()
    assert breakdown["checks"]["maxTransactionValue"]["status"] == "PASS"
    assert breakdown["checks"]["maxSlippage"]["status"] == "PASS"
    assert breakdown["checks"]["allowedTokens"]["status"] == "PASS"

def test_policy_engine_fail_exceed_tx_value():
    """Proposal exceeding max transaction value ($500) must FAIL."""
    proposal = AgentProposal(
        id="prop-test-fail-amount",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        asset="UNI",
        chainId=11155111,
        amount="500.0",
        amountUsd="2500.0",
        slippage="0.5%",
        evidence=[
            EvidenceItem(
                id="ev-1",
                source="CryptoCompare",
                type="PRICE_FEED",
                value="$5.00",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            ),
            EvidenceItem(
                id="ev-2",
                source="Etherscan",
                type="CONTRACT_VERIFICATION",
                value="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            )
        ]
    )
    result, reason, breakdown = PolicyEngine.evaluate(proposal)
    assert result == "FAIL"
    assert "exceeds" in reason.lower()
    assert breakdown["checks"]["maxTransactionValue"]["status"] == "FAIL"

def test_policy_engine_fail_excessive_slippage():
    """Proposal exceeding maximum slippage (1.0%) must FAIL."""
    proposal = AgentProposal(
        id="prop-test-fail-slippage",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        asset="USDC",
        chainId=11155111,
        amount="10.0",
        amountUsd="10.0",
        slippage="4.5%",
        evidence=[
            EvidenceItem(
                id="ev-1",
                source="Etherscan",
                type="CONTRACT_VERIFICATION",
                value="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            )
        ]
    )
    result, reason, breakdown = PolicyEngine.evaluate(proposal)
    assert result == "FAIL"
    assert "slippage" in reason.lower()
    assert breakdown["checks"]["maxSlippage"]["status"] == "FAIL"

def test_policy_engine_fail_unauthorized_token():
    """Token not in allowed list must FAIL."""
    proposal = AgentProposal(
        id="prop-test-fail-token",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        asset="SHIB",
        chainId=11155111,
        amount="100.0",
        amountUsd="10.0",
        slippage="0.5%",
        evidence=[]
    )
    result, reason, breakdown = PolicyEngine.evaluate(proposal)
    assert result == "FAIL"
    assert "not in allowed" in reason.lower()
    assert breakdown["checks"]["allowedTokens"]["status"] == "FAIL"

def test_policy_engine_unknown_on_missing_value():
    """Missing USD value must evaluate to UNKNOWN, not PASS."""
    proposal = AgentProposal(
        id="prop-test-unknown-val",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        asset="LINK",
        chainId=11155111,
        amount="1.0",
        amountUsd=None,  # Missing
        slippage="0.5%",
        evidence=[
            EvidenceItem(
                id="ev-1",
                source="Etherscan",
                type="CONTRACT_VERIFICATION",
                value="0x779877A7B0D9E8603169DdbD7836e478b4624789",
                timestamp="2026-09-05T00:00:00Z",
                status="VERIFIED"
            )
        ]
    )
    result, reason, breakdown = PolicyEngine.evaluate(proposal)
    assert result == "UNKNOWN"
    assert "missing" in reason.lower()

def test_policy_engine_missing_liquidity_never_assumed_safe():
    """Missing liquidity must remain UNKNOWN and not defaulted to safe zero or low risk."""
    config = PolicyRuleConfig(minLiquidityUsd=10000.0)
    proposal = AgentProposal(
        id="prop-test-no-liq",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        asset="LINK",
        chainId=11155111,
        amount="1.0",
        amountUsd="10.0",
        slippage="0.5%",
        evidence=[
            EvidenceItem(
                id="ev-1",
                source="Pool",
                type="LIQUIDITY_CHECK",
                value=None,  # Missing
                status="UNAVAILABLE"
            ),
            EvidenceItem(
                id="ev-2",
                source="Etherscan",
                type="CONTRACT_VERIFICATION",
                value="0x779877A7B0D9E8603169DdbD7836e478b4624789",
                status="VERIFIED"
            )
        ]
    )
    result, reason, breakdown = PolicyEngine.evaluate(proposal, config)
    assert result == "UNKNOWN"
    assert breakdown["checks"]["minLiquidity"]["status"] == "UNKNOWN"

# -------------------------------------------------------------
# 2. Execution Gate & State Transitions Tests
# -------------------------------------------------------------

def test_execution_gate_blocked_on_policy_fail():
    """If policy fails, execution gate MUST be BLOCKED."""
    proposal = AgentProposal(
        id="prop-gate-fail",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="FAIL",
        policyFailureReason="Exceeded max trade limit",
        execution=ExecutionState(status="BLOCKED")
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "POLICY_FAILED"
    assert "policy violation" in reason.lower()

def test_execution_gate_blocked_on_genlayer_reject():
    """If GenLayer rejects, execution gate MUST be BLOCKED."""
    proposal = AgentProposal(
        id="prop-gate-rej",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="PASS",
        genlayer=GenLayerResult(
            network="studionet",
            decision="REJECT",
            reasoning="Suspicious counterparty signature"
        )
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "REJECTED"
    assert "rejected" in reason.lower()

def test_execution_gate_blocked_on_genlayer_dispute():
    """If GenLayer consensus is DISPUTE, execution gate MUST be BLOCKED."""
    proposal = AgentProposal(
        id="prop-gate-disp",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="PASS",
        genlayer=GenLayerResult(
            network="studionet",
            decision="DISPUTE",
            reasoning="Validators split on price reasonableness"
        )
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "DISPUTED"
    assert "dispute" in reason.lower()

def test_execution_gate_blocked_on_genlayer_insufficient_data():
    """If GenLayer returns INSUFFICIENT_DATA, execution gate MUST be BLOCKED."""
    proposal = AgentProposal(
        id="prop-gate-insuff",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="PASS",
        genlayer=GenLayerResult(
            network="studionet",
            decision="INSUFFICIENT_DATA",
            reasoning="Missing required oracle verification"
        )
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "BLOCKED"
    assert state == "INSUFFICIENT_DATA"
    assert "insufficient_data" in reason.lower()

def test_execution_gate_human_confirmation_required():
    """When policy PASS and GenLayer APPROVE, human confirmation must hold execution in AWAITING_USER_CONFIRMATION."""
    proposal = AgentProposal(
        id="prop-gate-human-confirm",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="PASS",
        genlayer=GenLayerResult(
            network="studionet",
            decision="APPROVE",
            reasoning="Consensus reached"
        ),
        execution=ExecutionState(
            status="BLOCKED",
            requiresHumanConfirmation=True,
            userConfirmed=False
        )
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "AWAITING_USER_CONFIRMATION"
    assert state == "AWAITING_CONFIRMATION"
    assert "requires human confirmation" in reason.lower()

def test_execution_gate_ready_after_user_confirmed():
    """When user confirms, status transitions to READY."""
    proposal = AgentProposal(
        id="prop-gate-ready",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="PASS",
        genlayer=GenLayerResult(
            network="studionet",
            decision="APPROVE",
            reasoning="Consensus reached"
        ),
        execution=ExecutionState(
            status="AWAITING_USER_CONFIRMATION",
            requiresHumanConfirmation=True,
            userConfirmed=True
        )
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status == "READY"
    assert state == "READY_FOR_EXECUTION"
    assert "cleared for execution" in reason.lower()

# -------------------------------------------------------------
# 3. Telemetry Isolation & Non-Fabrication Tests
# -------------------------------------------------------------

def test_telemetry_isolation_missing_fields_remain_null():
    """Missing validator telemetry must remain null and not be synthesized."""
    tel = GenLayerTelemetry()
    assert tel.validatorCount is None
    assert tel.validators is None
    assert tel.votes is None
    assert tel.votePercentage is None
    assert tel.consensusPercentage is None
    assert tel.confidence is None
    assert tel.rounds is None
    assert tel.latencyMs is None
    assert tel.majorityAgreement is None
    assert tel.resultName is None

def test_finalized_tx_does_not_imply_approve():
    """Separation of powers: A FINALIZED transaction status does not imply APPROVE decision."""
    res = GenLayerResult(
        network="studionet",
        txHash="0x123",
        txStatus="FINALIZED",
        decision="REJECT",  # Finalized rejection
        reasoning="Multi-validator consensus rejected action"
    )
    assert res.txStatus == "FINALIZED"
    assert res.decision == "REJECT"
    assert res.decision != "APPROVE"

def test_ai_output_alone_cannot_authorize_execution():
    """An AI proposal with no GenLayer adjudication must remain WAITING_FOR_GENLAYER / not executable."""
    proposal = AgentProposal(
        id="prop-ai-only",
        createdAt="2026-09-05T00:00:00Z",
        actionType="BUY",
        policyResult="PASS",
        agentRationale="I am an advanced AI agent and I strongly recommend this trade.",
        genlayer=None,  # No GenLayer adjudication
        execution=ExecutionState(status="BLOCKED")
    )
    status, state, reason = ExecutionGate.evaluate_gate(proposal)
    assert status != "READY"
    assert status != "EXECUTED"
    assert status == "WAITING_FOR_GENLAYER"
    assert state == "GENLAYER_NOT_SUBMITTED"

# -------------------------------------------------------------
# 4. Demo Scenarios Determinism Tests
# -------------------------------------------------------------

def test_demo_scenarios_have_correct_four_modes():
    """Verify the 4 canonical deterministic demo scenarios exist, are tagged as demo, and match required outcomes."""
    from demo_scenarios import get_demo_scenarios, get_demo_scenario_by_id
    scenarios = get_demo_scenarios()
    assert len(scenarios) == 4
    for s in scenarios:
        assert s.isDemo is True

    # Check the exact 4 canonical IDs exist
    ids = [s.id for s in scenarios]
    assert "demo-safe-001" in ids
    assert "demo-policy-violation-002" in ids
    assert "demo-insufficient-evidence-003" in ids
    assert "demo-genlayer-rejection-004" in ids

    # 1. Safe Proposal
    safe = get_demo_scenario_by_id("demo-safe-001")
    assert safe is not None
    assert safe.policyResult == "PASS"
    assert safe.genlayer is not None
    assert safe.genlayer.decision == "APPROVE"
    assert safe.execution.status == "AWAITING_USER_CONFIRMATION"
    assert safe.execution.txHash is None  # Never executed unless real receipt exists

    # 2. Policy Violation
    violation = get_demo_scenario_by_id("demo-policy-violation-002")
    assert violation is not None
    assert violation.policyResult == "FAIL"
    assert violation.genlayer is None
    assert violation.execution.status == "BLOCKED"

    # 3. Insufficient Evidence
    insufficient = get_demo_scenario_by_id("demo-insufficient-evidence-003")
    assert insufficient is not None
    assert insufficient.genlayer is not None
    assert insufficient.genlayer.decision == "INSUFFICIENT_DATA"
    assert insufficient.execution.status == "BLOCKED"

    # 4. GenLayer Rejection
    rejection = get_demo_scenario_by_id("demo-genlayer-rejection-004")
    assert rejection is not None
    assert rejection.genlayer is not None
    assert rejection.genlayer.decision == "REJECT"
    assert rejection.execution.status == "BLOCKED"

    # Also verify legacy aliases resolve smoothly
    assert get_demo_scenario_by_id("demo-safe-approved-001") is not None
    assert get_demo_scenario_by_id("demo-conflicting-oracle-003") is not None
    assert get_demo_scenario_by_id("demo-insufficient-evidence-004") is not None

# -------------------------------------------------------------
# 5. DeFi Vault & AI Research Regression Tests
# -------------------------------------------------------------

def test_defi_vault_status_endpoint():
    """Verify /api/status returns expected fields and JINNI Agent branding."""
    from main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)

    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["name"] == "JINNI Agent"
    assert "Autonomous actions. Independent judgment." in data["tagline"]
    assert "delegator_contract" in data
    assert "supported_tokens" in data
    assert "USDC" in data["supported_tokens"]
    assert "LINK" in data["supported_tokens"]

def test_research_score_token_endpoint():
    """Verify research /api/score-token continues working."""
    from main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)

    res = client.post("/api/score-token", json={"symbol": "LINK"})
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "LINK"
    assert "score" in data["decision"]
    assert "verdict" in data["decision"]


# -------------------------------------------------------------
# 6. Off-Chain AI Provider & Safety Boundary Tests
# -------------------------------------------------------------

def test_ai_provider_configuration():
    """Verify AI provider adapter accepts free provider settings."""
    from ai_provider import AIProviderAdapter
    adapter = AIProviderAdapter(
        provider="groq",
        api_key="test_free_key",
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1"
    )
    health = adapter.health_check()
    assert health["provider"] == "groq"
    assert health["model"] == "llama-3.3-70b-versatile"
    assert health["status"] == "CONNECTED"
    assert health["apiKeyConfigured"] is True

def test_ai_provider_gemini_3_8_flash_configuration():
    """Verify Gemini 3.8 Flash configuration is accepted."""
    from ai_provider import AIProviderAdapter
    adapter = AIProviderAdapter(
        provider="gemini",
        api_key="test_gemini_key",
        model="gemini-3.8-flash",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    health = adapter.health_check()
    assert health["provider"] == "gemini"
    assert health["model"] == "gemini-3.8-flash"
    assert health["status"] == "CONNECTED"
    assert health["apiKeyConfigured"] is True

def test_ai_provider_unconfigured_returns_ai_unavailable():
    """When no API key is provided and Ollama is unreachable, status must be AI_UNAVAILABLE."""
    from ai_provider import AIProviderAdapter
    adapter = AIProviderAdapter(api_key="", ollama_url="http://127.0.0.1:59999/v1")
    health = adapter.health_check()
    assert health["status"] == "AI_UNAVAILABLE"
    assert health["apiKeyConfigured"] is False
    assert health["model"] == "None"

def test_ai_provider_proposal_fails_gracefully_without_fabrication():
    """AI proposal generator must NOT fabricate a proposal when AI is unavailable."""
    from ai_provider import AIProviderAdapter
    adapter = AIProviderAdapter(api_key="", ollama_url="http://127.0.0.1:59999/v1")
    res = adapter.generate_agent_proposal(market_telemetry={"asset": "LINK", "price": 15.0})
    assert res["status"] == "AI_UNAVAILABLE"
    assert "error" in res
    assert "actionType" not in res  # Never fabricate a fake trade action

def test_api_generate_ai_proposal_blocks_on_ai_unavailable(monkeypatch):
    """The /api/agent/proposals/generate-ai endpoint must return HTTP 503 when AI is unavailable."""
    from main import app
    from fastapi.testclient import TestClient
    from ai_provider import ai_provider

    # Force AI unavailable state
    monkeypatch.setattr(ai_provider, "get_active_client", lambda: (None, "", "AI_UNAVAILABLE"))
    monkeypatch.setattr(ai_provider, "_is_ollama_reachable", lambda: False)
    monkeypatch.setattr(ai_provider, "api_key", "")

    client = TestClient(app)
    res = client.post("/api/agent/proposals/generate-ai", json={"asset": "LINK"})
    assert res.status_code == 503
    data = res.json()
    assert "AI_UNAVAILABLE" in str(data)

def test_ai_proposal_still_requires_policy_evaluation():
    """Even an AI proposal must strictly undergo deterministic policy evaluation."""
    from main import app
    from fastapi.testclient import TestClient
    from ai_provider import ai_provider

    # Simulate AI proposing a trade that violates policy (e.g. $5,000 when max limit is $500)
    fake_ai_proposal = {
        "status": "SUCCESS",
        "actionType": "BUY",
        "asset": "LINK",
        "amount": "333.0",
        "amountUsd": "5000.0",
        "slippage": "0.5%",
        "route": "Uniswap V3 (USDC -> LINK)",
        "agentRationale": "AI momentum indicator recommends aggressive allocation."
    }

    dummy_client = object()
    dummy_health = {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "status": "CONNECTED"
    }

    import main
    orig_health = main.ai_provider.health_check
    orig_gen = main.ai_provider.generate_agent_proposal
    main.ai_provider.health_check = lambda: dummy_health
    main.ai_provider.generate_agent_proposal = lambda telemetry, intent: fake_ai_proposal

    try:
        client = TestClient(app)
        res = client.post("/api/agent/proposals/generate-ai", json={"asset": "LINK"})
        assert res.status_code == 200
        data = res.json()
        # The proposal was created, but Policy Engine MUST evaluate and FAIL it!
        assert data["policyResult"] == "FAIL"
        assert "Exceeds max transaction limit" in (data["policyFailureReason"] or "")
        # Execution must remain BLOCKED
        assert data["execution"]["status"] == "BLOCKED"
    finally:
        main.ai_provider.health_check = orig_health
        main.ai_provider.generate_agent_proposal = orig_gen

def test_wallet_analysis_agent_offline_safety():
    """WalletAnalysisAgent returns conservative bounds when AI provider is unavailable."""
    from agents import WalletAnalysisAgent
    from database import get_db

    db = next(get_db())
    policy = WalletAnalysisAgent.analyze("0x1111111111111111111111111111111111111111", db)
    assert policy is not None
    assert policy.get("max_spend_trade") <= 10.0
    assert policy.get("max_spend_week") <= 50.0
    assert "reasoning" in policy

def test_load_demo_scenarios_endpoint_all_four():
    """Verify all 4 canonical demo scenarios load through the API endpoint without 404."""
    from main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)

    for sc_id in [
        "demo-safe-001",
        "demo-policy-violation-002",
        "demo-insufficient-evidence-003",
        "demo-genlayer-rejection-004"
    ]:
        res = client.post(f"/api/agent/demo-scenarios/load?scenario_id={sc_id}")
        assert res.status_code == 200, f"Failed for scenario {sc_id}"
        data = res.json()
        assert data["id"] == sc_id
        assert data["isDemo"] is True
        assert data["execution"]["txHash"] is None  # Never an executed receipt on demo load

    # Invalid scenario returns 404
    bad_res = client.post("/api/agent/demo-scenarios/load?scenario_id=demo-nonexistent-999")
    assert bad_res.status_code == 404

def test_health_endpoints_production_ready():
    """Verify health endpoints exist on both /health and /api/health."""
    from main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)

    for path in ["/health", "/api/health"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "service" in data

def test_proposal_creation_and_alias_routes():
    """Verify proposal creation works on both /api/agent/proposals and /agent/proposals."""
    from main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)

    payload = {
        "actionType": "BUY",
        "asset": "LINK",
        "chain": "Sepolia",
        "chainId": 11155111,
        "amount": "1.0",
        "amountUsd": "15.0",
        "slippage": "0.5%",
        "route": "Uniswap V3 (USDC -> LINK)",
        "agentRationale": "Technical indicator support test.",
        "actorType": "human"
    }

    # Test primary endpoint
    res = client.post("/api/agent/proposals", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "proposal" in data
    assert data["isDemo"] is False
    assert data["proposal"]["isDemo"] is False
    assert data["state"] == "GENLAYER_NOT_SUBMITTED"
    assert data["genlayer"]["decision"] == "UNAVAILABLE"
    assert data["genlayer"]["txStatus"] == "NOT_APPLICABLE"
    assert data["genlayer"]["txHash"] is None
    assert data["execution"]["status"] == "WAITING_FOR_GENLAYER"
    assert data["execution"]["txHash"] is None
    assert data["policyResult"] == "PASS"

    # Test alias route /agent/proposals
    res_alias = client.post("/agent/proposals", json=payload)
    assert res_alias.status_code == 200
    data_alias = res_alias.json()
    assert "proposal" in data_alias
    assert data_alias["isDemo"] is False
    assert data_alias["proposal"]["isDemo"] is False
    assert data_alias["state"] == "GENLAYER_NOT_SUBMITTED"
    assert data_alias["genlayer"]["txStatus"] == "NOT_APPLICABLE"



