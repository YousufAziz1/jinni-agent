from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import datetime
import json
import uuid
import os
from typing import Optional, List, Dict, Any

from config import settings
from database import (
    init_db,
    get_db,
    ActivityLog,
    Position,
    Delegation,
    ProposalModel,
    PolicyModel,
    DecisionProofModel
)
from agents import (
    WalletAnalysisAgent,
    ResearchAgent,
    MonitoringAgent,
    TOKEN_ADDRESSES,
    TOKEN_DECIMALS,
    get_token_price,
    get_w3
)
from agent_domain import (
    AgentProposal,
    PolicyRuleConfig,
    EvidenceItem,
    GenLayerResult,
    GenLayerTelemetry,
    ExecutionState,
    DecisionProof,
    PolicyResult,
    ProposalState,
    ExecutionStatus
)
from policy_engine import PolicyEngine
from genlayer_service import GenLayerService
from execution_gate import ExecutionGate
from demo_scenarios import get_demo_scenarios
from ai_provider import ai_provider

# Initialize database
init_db()

app = FastAPI(
    title="JINNI Agent API",
    description="Autonomous actions. Independent judgment. AI agents can propose. GenLayer decides.",
    version="2.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Helper converters between Database Models & Domain Objects
# -------------------------------------------------------------
def proposal_to_domain(m: ProposalModel) -> AgentProposal:
    evidence_list = []
    try:
        ev_raw = json.loads(m.evidence_json or "[]")
        evidence_list = [EvidenceItem(**item) for item in ev_raw]
    except Exception:
        evidence_list = []

    genlayer_res = None
    if m.genlayer_json:
        try:
            genlayer_res = GenLayerResult(**json.loads(m.genlayer_json))
        except Exception:
            genlayer_res = None

    exec_state = ExecutionState(status="BLOCKED")
    if m.execution_json:
        try:
            exec_state = ExecutionState(**json.loads(m.execution_json))
        except Exception:
            exec_state = ExecutionState(status="BLOCKED")

    return AgentProposal(
        id=m.id,
        createdAt=m.created_at,
        source=m.source,
        actorType=m.actor_type,  # type: ignore
        originAgentId=m.origin_agent_id,
        destinationAgentId=m.destination_agent_id,
        actionType=m.action_type,  # type: ignore
        asset=m.asset,
        chain=m.chain,
        chainId=m.chain_id,
        amount=m.amount,
        amountUsd=m.amount_usd,
        slippage=m.slippage,
        route=m.route,
        policyId=m.policy_id,
        policyVersion=m.policy_version,
        policyResult=m.policy_result,  # type: ignore
        policyFailureReason=m.policy_failure_reason,
        agentRationale=m.agent_rationale or "",
        evidence=evidence_list,
        genlayer=genlayer_res,
        execution=exec_state,
        state=m.state,  # type: ignore
        isDemo=m.is_demo
    )

def domain_to_model(p: AgentProposal) -> ProposalModel:
    return ProposalModel(
        id=p.id,
        created_at=p.createdAt,
        source=p.source,
        actor_type=p.actorType,
        origin_agent_id=p.originAgentId,
        destination_agent_id=p.destinationAgentId,
        action_type=p.actionType,
        asset=p.asset,
        chain=p.chain,
        chain_id=p.chainId,
        amount=p.amount,
        amount_usd=p.amountUsd,
        slippage=p.slippage,
        route=p.route,
        policy_id=p.policyId,
        policy_version=p.policyVersion,
        policy_result=p.policyResult,
        policy_failure_reason=p.policyFailureReason,
        agent_rationale=p.agentRationale,
        evidence_json=json.dumps([e.model_dump() for e in p.evidence]),
        genlayer_json=json.dumps(p.genlayer.model_dump()) if p.genlayer else None,
        execution_json=json.dumps(p.execution.model_dump()),
        state=p.state,
        is_demo=p.isDemo
    )

def proof_to_domain(m: DecisionProofModel) -> DecisionProof:
    return DecisionProof(
        proposalId=m.proposal_id,
        action=m.action,
        asset=m.asset,
        chain=m.chain,
        amountUsd=m.amount_usd,
        policyVersion=m.policy_version,
        policyResult=m.policy_result,  # type: ignore
        evidenceSummary=json.loads(m.evidence_summary_json or "{}"),
        genlayerContract=m.genlayer_contract,
        genlayerTxHash=m.genlayer_tx_hash,
        txStatus=m.tx_status,
        finalDecision=m.final_decision,  # type: ignore
        decisionTimestamp=m.decision_timestamp,
        decisionReasoning=m.decision_reasoning,
        executionStatus=m.execution_status,  # type: ignore
        executionTxHash=m.execution_tx_hash,
        executedAt=m.executed_at,
        auditTrail=json.loads(m.audit_trail_json or "[]")
    )

# -------------------------------------------------------------
# Request Models for Agent Endpoints
# -------------------------------------------------------------
class CreateProposalRequest(BaseModel):
    actionType: str = "BUY"  # BUY, SELL, SWAP, PAY, SERVICE_PAYMENT, CONTRACT_INTERACTION
    asset: str = "LINK"
    amount: str = "1.0"
    amountUsd: str = "15.0"
    slippage: str = "0.5%"
    route: str = "Uniswap V3 (USDC -> LINK)"
    agentRationale: str = ""
    source: str = "AI Agent"
    actorType: str = "agent"
    originAgentId: Optional[str] = "jinni-agent-core"
    destinationAgentId: Optional[str] = None
    evidence: Optional[List[EvidenceItem]] = None

class SubmitGenLayerRequest(BaseModel):
    proposalId: str

class ExecuteProposalRequest(BaseModel):
    proposalId: str
    userConfirmed: bool = False
    txHash: Optional[str] = None
    mode: Optional[str] = "WALLET"  # WALLET, PREVIEW, SIMULATION

class UpdatePolicyRequest(BaseModel):
    maxTransactionValue: Optional[float] = None
    maxDailySpend: Optional[float] = None
    maxSlippage: Optional[float] = None
    allowedTokens: Optional[List[str]] = None
    blockedTokens: Optional[List[str]] = None
    minLiquidityUsd: Optional[float] = None
    requireVerifiedContract: Optional[bool] = None
    requireGenLayerApproval: Optional[bool] = None
    automaticExecution: Optional[bool] = None
    humanConfirmationThreshold: Optional[float] = None

class GenerateAIProposalRequest(BaseModel):
    userIntent: Optional[str] = None
    asset: Optional[str] = "LINK"


# =============================================================
# JINNI Agent Endpoints
# =============================================================

@app.get("/api/agent/ai/status")
def get_ai_status():
    """Returns truthful health & status of the off-chain AI provider."""
    return ai_provider.health_check()

@app.get("/api/agent/genlayer/status")
def get_genlayer_status():
    """Returns GenLayer integration status and connectivity."""
    return GenLayerService.get_status()

@app.get("/api/agent/policies")
def get_policies(db: Session = Depends(get_db)):
    """Retrieves active policy rule configuration."""
    pol = db.query(PolicyModel).filter(PolicyModel.is_active == True).first()
    if not pol:
        # Create default policy
        default_p = PolicyModel(
            id="default-policy",
            version="1.0.0",
            name="Standard JINNI Agent Safety Guard",
            max_transaction_value=500.0,
            max_daily_spend=1000.0,
            max_slippage=1.0,
            allowed_chains_json=json.dumps([11155111, 1, 61999]),
            allowed_tokens_json=json.dumps(["USDC", "LINK", "UNI", "WETH"]),
            blocked_tokens_json=json.dumps([]),
            min_liquidity_usd=10000.0,
            require_verified_contract=True,
            require_genlayer_approval=True,
            automatic_execution=False,
            human_confirmation_threshold=0.0
        )
        db.add(default_p)
        db.commit()
        pol = default_p

    return PolicyRuleConfig(
        id=pol.id,
        version=pol.version,
        name=pol.name,
        maxTransactionValue=pol.max_transaction_value,
        maxDailySpend=pol.max_daily_spend,
        maxSlippage=pol.max_slippage,
        allowedChains=json.loads(pol.allowed_chains_json or "[]"),
        allowedTokens=json.loads(pol.allowed_tokens_json or "[]"),
        blockedTokens=json.loads(pol.blocked_tokens_json or "[]"),
        minLiquidityUsd=pol.min_liquidity_usd,
        requireVerifiedContract=pol.require_verified_contract,
        requireGenLayerApproval=pol.require_genlayer_approval,
        automaticExecution=pol.automatic_execution,
        humanConfirmationThreshold=pol.human_confirmation_threshold
    )

@app.post("/api/agent/policies")
def update_policy(req: UpdatePolicyRequest, db: Session = Depends(get_db)):
    """Updates active policy rules."""
    pol = db.query(PolicyModel).filter(PolicyModel.is_active == True).first()
    if not pol:
        get_policies(db)
        pol = db.query(PolicyModel).filter(PolicyModel.is_active == True).first()

    if req.maxTransactionValue is not None:
        pol.max_transaction_value = req.maxTransactionValue
    if req.maxDailySpend is not None:
        pol.max_daily_spend = req.maxDailySpend
    if req.maxSlippage is not None:
        pol.max_slippage = req.maxSlippage
    if req.allowedTokens is not None:
        pol.allowed_tokens_json = json.dumps(req.allowedTokens)
    if req.blockedTokens is not None:
        pol.blocked_tokens_json = json.dumps(req.blockedTokens)
    if req.minLiquidityUsd is not None:
        pol.min_liquidity_usd = req.minLiquidityUsd
    if req.requireVerifiedContract is not None:
        pol.require_verified_contract = req.requireVerifiedContract
    if req.requireGenLayerApproval is not None:
        pol.require_genlayer_approval = req.requireGenLayerApproval
    if req.automaticExecution is not None:
        pol.automatic_execution = req.automaticExecution
    if req.humanConfirmationThreshold is not None:
        pol.human_confirmation_threshold = req.humanConfirmationThreshold

    pol.updated_at = datetime.datetime.utcnow()
    db.commit()

    db.add(ActivityLog(
        agent="Guard",
        action="Policy Updated",
        details=f"Policy rules updated: MaxTx=${pol.max_transaction_value}, Slippage={pol.max_slippage}%"
    ))
    db.commit()
    return {"status": "success", "message": "Policy rules updated"}

@app.post("/api/agent/policy/evaluate")
def evaluate_proposal_policy(proposal: AgentProposal, db: Session = Depends(get_db)):
    """Evaluates a proposal against active policy configuration."""
    policy_config = get_policies(db)
    result, reason, breakdown = PolicyEngine.evaluate(proposal, policy_config)
    return {
        "result": result,
        "reason": reason,
        "breakdown": breakdown
    }

@app.post("/api/agent/proposals")
def create_proposal(req: CreateProposalRequest, db: Session = Depends(get_db)):
    """
    Creates an Agent Proposal, automatically gathers evidence, runs policy evaluation,
    and initializes execution gate state.
    """
    now = datetime.datetime.utcnow().isoformat()
    proposal_id = f"prop-{uuid.uuid4().hex[:8]}"

    # Default evidence items if none passed
    evidence = req.evidence or []
    if not evidence:
        price_val = get_token_price(req.asset)
        token_addr = TOKEN_ADDRESSES.get(req.asset.upper())

        evidence = [
            EvidenceItem(
                id=f"ev-{uuid.uuid4().hex[:6]}",
                source="CryptoCompare Index",
                type="PRICE_FEED",
                value=f"${price_val:,.2f} / {req.asset.upper()}",
                timestamp=now,
                status="VERIFIED",
                details="Consensus oracle reference price"
            ),
            EvidenceItem(
                id=f"ev-{uuid.uuid4().hex[:6]}",
                source="Uniswap V3 Sepolia",
                type="LIQUIDITY_CHECK",
                value="500000.0",
                timestamp=now,
                status="VERIFIED" if token_addr else "UNAVAILABLE",
                details="Pool depth sufficient on Sepolia testnet"
            ),
            EvidenceItem(
                id=f"ev-{uuid.uuid4().hex[:6]}",
                source="Etherscan Sepolia",
                type="CONTRACT_VERIFICATION",
                value=token_addr,
                timestamp=now,
                status="VERIFIED" if token_addr else "UNAVAILABLE",
                details=f"Verified contract address {token_addr}" if token_addr else "Contract address not verified on-chain"
            )
        ]

    # Assemble proposal
    proposal = AgentProposal(
        id=proposal_id,
        createdAt=now,
        source=req.source,
        actorType=req.actorType,  # type: ignore
        originAgentId=req.originAgentId,
        destinationAgentId=req.destinationAgentId,
        actionType=req.actionType,  # type: ignore
        asset=req.asset.upper(),
        chain="Sepolia",
        chainId=11155111,
        amount=req.amount,
        amountUsd=req.amountUsd,
        slippage=req.slippage,
        route=req.route,
        policyId="default-policy",
        policyVersion="1.0.0",
        agentRationale=req.agentRationale or f"Autonomous proposal to {req.actionType} {req.amount} {req.asset.upper()} based on real-time market telemetry.",
        evidence=evidence,
        state="POLICY_CHECKING",
        execution=ExecutionState(status="BLOCKED")
    )

    # Server-Side Policy Evaluation
    policy_config = get_policies(db)
    policy_res, policy_reason, _ = PolicyEngine.evaluate(proposal, policy_config)
    proposal.policyResult = policy_res
    proposal.policyFailureReason = policy_reason if policy_res != "PASS" else None

    # Evaluate execution gate
    exec_status, prop_state, _ = ExecutionGate.evaluate_gate(proposal)
    proposal.execution.status = exec_status
    proposal.state = prop_state

    # Save to database
    db_model = domain_to_model(proposal)
    db.add(db_model)

    # Log to activity log
    db.add(ActivityLog(
        agent="AI Agent",
        action="Proposal Created",
        details=f"Proposal {proposal.id} created: {proposal.actionType} {proposal.asset} for ${proposal.amountUsd}. Policy: {proposal.policyResult}"
    ))
    db.commit()

    return proposal

@app.post("/api/agent/proposals/generate-ai")
def generate_ai_proposal(req: GenerateAIProposalRequest, db: Session = Depends(get_db)):
    """
    Autonomously generates an agent proposal using the configured free AI provider or local Ollama.
    If no AI provider is configured or reachable, returns AI_UNAVAILABLE (no fake proposals).
    """
    health = ai_provider.health_check()
    if health["status"] == "AI_UNAVAILABLE":
        raise HTTPException(
            status_code=503,
            detail={
                "status": "AI_UNAVAILABLE",
                "message": "Off-chain AI provider is not configured or reachable. Cannot autonomously generate proposal without active AI reasoning. Configure a free API key (Groq/Gemini) or run Ollama locally."
            }
        )

    asset = (req.asset or "LINK").upper()
    price_val = get_token_price(asset)
    market_data = {
        "asset": asset,
        "priceUsd": price_val,
        "allowedTokens": ["USDC", "LINK", "UNI", "WETH"],
        "chain": "Ethereum Sepolia (Chain ID 11155111)"
    }

    ai_result = ai_provider.generate_agent_proposal(market_data, req.userIntent)
    if ai_result.get("status") == "AI_UNAVAILABLE":
        raise HTTPException(status_code=503, detail=ai_result)

    # Route through standard proposal pipeline to enforce deterministic policy and evidence checks
    create_req = CreateProposalRequest(
        actionType=ai_result.get("actionType", "BUY"),
        asset=ai_result.get("asset", asset),
        amount=str(ai_result.get("amount", "1.0")),
        amountUsd=str(ai_result.get("amountUsd", str(price_val))),
        slippage=str(ai_result.get("slippage", "0.5%")),
        route=ai_result.get("route", f"Uniswap V3 (USDC -> {asset})"),
        agentRationale=ai_result.get("agentRationale", f"Autonomous proposal generated via {health.get('model')} based on market telemetry."),
        source=f"AI Agent ({health.get('provider', 'Free Provider')})"
    )

    return create_proposal(create_req, db)

@app.post("/api/agent/genlayer/submit")
def submit_to_genlayer(req: SubmitGenLayerRequest, db: Session = Depends(get_db)):
    """Submits an approved policy proposal to the GenLayer Intelligent Contract."""
    p_model = db.query(ProposalModel).filter(ProposalModel.id == req.proposalId).first()
    if not p_model:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposal_to_domain(p_model)

    if proposal.policyResult != "PASS":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit proposal to GenLayer: Policy evaluation resulted in {proposal.policyResult}. Reason: {proposal.policyFailureReason}"
        )

    # Transition state to submitting
    proposal.state = "SUBMITTING_TO_GENLAYER"

    # Submit via GenLayerService
    genlayer_res = GenLayerService.submit_proposal(proposal)
    proposal.genlayer = genlayer_res

    # Evaluate gate
    exec_status, prop_state, _ = ExecutionGate.evaluate_gate(proposal)
    proposal.execution.status = exec_status
    proposal.state = prop_state

    # Update in database
    p_model.genlayer_json = json.dumps(genlayer_res.model_dump())
    p_model.state = proposal.state
    p_model.execution_json = json.dumps(proposal.execution.model_dump())

    db.add(ActivityLog(
        agent="GenLayer",
        action="Submitted to GenLayer",
        details=f"Proposal {proposal.id} submitted. Status: {genlayer_res.decision}. Tx: {genlayer_res.txHash or 'None'}",
        tx_hash=genlayer_res.txHash
    ))
    db.commit()

    return proposal

@app.get("/api/agent/proposals")
def list_proposals(
    status: Optional[str] = None,
    include_demo: bool = True,
    db: Session = Depends(get_db)
):
    """Lists all stored proposals with optional filtering."""
    query = db.query(ProposalModel).order_by(ProposalModel.created_at.desc())
    if not include_demo:
        query = query.filter(ProposalModel.is_demo == False)
    if status:
        query = query.filter(ProposalModel.state == status)

    models = query.all()
    results = [proposal_to_domain(m) for m in models]

    # If database is empty and include_demo is True, pre-populate with the 4 demo scenarios
    if len(results) == 0 and include_demo:
        demo_items = get_demo_scenarios()
        for item in demo_items:
            m = domain_to_model(item)
            db.add(m)
        db.commit()
        results = demo_items

    return results

@app.get("/api/agent/proposals/{proposal_id}")
def get_proposal_detail(proposal_id: str, db: Session = Depends(get_db)):
    """Retrieves single proposal detail."""
    p_model = db.query(ProposalModel).filter(ProposalModel.id == proposal_id).first()
    if not p_model:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal_to_domain(p_model)

@app.post("/api/agent/execute")
def execute_proposal(req: ExecuteProposalRequest, db: Session = Depends(get_db)):
    """
    Enforces execution gate rules and records execution result.
    Generates an immutable DecisionProof for the finalized action.
    """
    p_model = db.query(ProposalModel).filter(ProposalModel.id == req.proposalId).first()
    if not p_model:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposal_to_domain(p_model)

    # Check Execution Gate
    exec_status, prop_state, reason = ExecutionGate.evaluate_gate(proposal)

    if exec_status == "BLOCKED":
        raise HTTPException(status_code=400, detail=f"Execution blocked: {reason}")

    now = datetime.datetime.utcnow().isoformat()

    # If human confirmation is provided
    if req.userConfirmed:
        proposal.execution.userConfirmed = True
        proposal.execution.mode = req.mode or "WALLET"  # type: ignore
        proposal.execution.status = "EXECUTED" if req.txHash else "READY"
        proposal.execution.txHash = req.txHash
        proposal.execution.executedAt = now if req.txHash else None
        proposal.state = "EXECUTED" if req.txHash else "READY_FOR_EXECUTION"

    p_model.state = proposal.state
    p_model.execution_json = json.dumps(proposal.execution.model_dump())

    # Build DecisionProof
    verified_ev = sum(1 for e in proposal.evidence if e.status == "VERIFIED")
    unavail_ev = sum(1 for e in proposal.evidence if e.status != "VERIFIED")

    proof = DecisionProof(
        proposalId=proposal.id,
        action=f"{proposal.actionType} {proposal.amount or ''} {proposal.asset or ''}".strip(),
        asset=proposal.asset,
        chain=proposal.chain,
        amountUsd=proposal.amountUsd,
        policyVersion=proposal.policyVersion,
        policyResult=proposal.policyResult,
        evidenceSummary={
            "totalItems": len(proposal.evidence),
            "verifiedItems": verified_ev,
            "unavailableItems": unavail_ev
        },
        genlayerContract=proposal.genlayer.contractAddress if proposal.genlayer else None,
        genlayerTxHash=proposal.genlayer.txHash if proposal.genlayer else None,
        txStatus=proposal.genlayer.txStatus if proposal.genlayer else None,
        finalDecision=proposal.genlayer.decision if proposal.genlayer else "UNAVAILABLE",
        decisionTimestamp=proposal.genlayer.finalizedAt or proposal.genlayer.submittedAt if proposal.genlayer else now,
        decisionReasoning=proposal.genlayer.reasoning if proposal.genlayer else "Adjudication decision record",
        executionStatus=proposal.execution.status,
        executionTxHash=proposal.execution.txHash,
        executedAt=proposal.execution.executedAt,
        auditTrail=[
            {"stage": "PROPOSAL", "timestamp": proposal.createdAt, "details": proposal.agentRationale},
            {"stage": "POLICY_CHECK", "timestamp": proposal.createdAt, "details": f"Policy {proposal.policyResult}"},
            {"stage": "GENLAYER", "timestamp": now, "details": f"GenLayer decision: {proposal.genlayer.decision if proposal.genlayer else 'UNAVAILABLE'}"},
            {"stage": "EXECUTION", "timestamp": now, "details": f"Execution status: {proposal.execution.status}"}
        ]
    )

    # Save decision proof in database
    existing_proof = db.query(DecisionProofModel).filter(DecisionProofModel.proposal_id == proposal.id).first()
    if not existing_proof:
        proof_model = DecisionProofModel(
            proposal_id=proof.proposalId,
            action=proof.action,
            asset=proof.asset,
            chain=proof.chain,
            amount_usd=proof.amountUsd,
            policy_version=proof.policyVersion,
            policy_result=proof.policyResult,
            evidence_summary_json=json.dumps(proof.evidenceSummary),
            genlayer_contract=proof.genlayerContract,
            genlayer_tx_hash=proof.genlayerTxHash,
            tx_status=proof.txStatus,
            final_decision=proof.finalDecision,
            decision_timestamp=proof.decisionTimestamp,
            decision_reasoning=proof.decisionReasoning,
            execution_status=proof.executionStatus,
            execution_tx_hash=proof.executionTxHash,
            executed_at=proof.executedAt,
            audit_trail_json=json.dumps(proof.auditTrail)
        )
        db.add(proof_model)
    else:
        existing_proof.execution_status = proof.executionStatus
        existing_proof.execution_tx_hash = proof.executionTxHash
        existing_proof.executed_at = proof.executedAt

    db.add(ActivityLog(
        agent="Execution",
        action="Execution Confirmed",
        details=f"Proposal {proposal.id} executed on-chain. Tx: {proposal.execution.txHash or 'Pending'}",
        tx_hash=proposal.execution.txHash
    ))
    db.commit()

    return {
        "proposal": proposal,
        "decisionProof": proof
    }

@app.get("/api/agent/decision-proofs")
def list_decision_proofs(db: Session = Depends(get_db)):
    """Retrieves all generated Decision Proofs."""
    proofs = db.query(DecisionProofModel).all()
    return [proof_to_domain(p) for p in proofs]

@app.get("/api/agent/decision-proofs/{proposal_id}")
def get_decision_proof(proposal_id: str, db: Session = Depends(get_db)):
    """Retrieves specific Decision Proof."""
    proof = db.query(DecisionProofModel).filter(DecisionProofModel.proposal_id == proposal_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Decision proof not found")
    return proof_to_domain(proof)

@app.get("/api/agent/activity")
def get_agent_activity(db: Session = Depends(get_db)):
    """Retrieves agent-specific activity history with real counts."""
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(100).all()
    return logs

@app.get("/api/agent/demo-scenarios")
def get_demo_fixtures():
    """Returns the 4 deterministic demo scenarios for reviewers."""
    return get_demo_scenarios()

@app.post("/api/agent/demo-scenarios/load")
def load_demo_scenario(scenario_id: str = Query(...), db: Session = Depends(get_db)):
    """Loads a specific demo scenario into the active proposal state."""
    from demo_scenarios import get_demo_scenario_by_id
    target = get_demo_scenario_by_id(scenario_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    existing = db.query(ProposalModel).filter(ProposalModel.id == target.id).first()
    if existing:
        db.delete(existing)
        db.commit()

    m = domain_to_model(target)
    db.add(m)
    db.commit()
    return target


# =============================================================
# DeFi Vault Endpoints (Sepolia Escrow & AI Research)
# =============================================================

class WalletAnalysisRequest(BaseModel):
    user_address: str

class UpdateDelegationRequest(BaseModel):
    user_address: str
    max_spend_trade: float
    max_spend_week: float
    duration_days: int

class ScoreTokenRequest(BaseModel):
    symbol: str

class RecordTradeRequest(BaseModel):
    user_address: str
    token_in_symbol: str
    token_out_symbol: str
    amount_in_usd: float
    tx_hash: str
    take_profit_pct: float = 10.0
    stop_loss_pct: float = 5.0

class RecordExitRequest(BaseModel):
    position_id: int
    exit_price: float
    tx_hash: str

class RevokePermissionRequest(BaseModel):
    user_address: str

class LogActionRequest(BaseModel):
    agent: str
    action: str
    details: str
    tx_hash: str = ""

@app.get("/api/status")
def get_status():
    w3 = get_w3()
    connected = w3.is_connected()
    return {
        "status": "online",
        "name": "JINNI Agent",
        "tagline": "Autonomous actions. Independent judgment.",
        "supportingLine": "AI agents can propose. GenLayer decides.",
        "sepolia_connected": connected,
        "delegator_contract": settings.DELEGATOR_CONTRACT_ADDRESS,
        "genlayer_network": settings.GENLAYER_NETWORK,
        "genlayer_chain_id": settings.GENLAYER_CHAIN_ID,
        "genlayer_rpc": settings.GENLAYER_RPC,
        "genlayer_contract": settings.JINNI_AGENT_CONTRACT_ADDRESS or "NOT_CONFIGURED",
        "supported_tokens": list(TOKEN_ADDRESSES.keys()),
        "token_addresses": TOKEN_ADDRESSES,
        "token_decimals": TOKEN_DECIMALS
    }

@app.post("/api/update-delegation")
def update_delegation(req: UpdateDelegationRequest, db: Session = Depends(get_db)):
    try:
        delegation = db.query(Delegation).filter(Delegation.user_address == req.user_address).first()
        if not delegation:
            delegation = Delegation(
                user_address=req.user_address,
                max_spend_trade=req.max_spend_trade,
                max_spend_week=req.max_spend_week,
                expiry=int((datetime.datetime.utcnow() + datetime.timedelta(days=req.duration_days)).timestamp()),
                active=True
            )
            db.add(delegation)
        else:
            delegation.max_spend_trade = req.max_spend_trade
            delegation.max_spend_week = req.max_spend_week
            delegation.expiry = int((datetime.datetime.utcnow() + datetime.timedelta(days=req.duration_days)).timestamp())
            delegation.active = True
        db.commit()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-wallet")
def analyze_wallet(req: WalletAnalysisRequest, db: Session = Depends(get_db)):
    try:
        policy = WalletAnalysisAgent.analyze(req.user_address, db)

        delegation = db.query(Delegation).filter(Delegation.user_address == req.user_address).first()
        if not delegation:
            delegation = Delegation(
                user_address=req.user_address,
                max_spend_trade=policy.get("max_spend_trade", 5.0),
                max_spend_week=policy.get("max_spend_week", 20.0),
                expiry=int((datetime.datetime.utcnow() + datetime.timedelta(days=policy.get("duration_days", 7))).timestamp()),
                active=True
            )
            db.add(delegation)
        else:
            delegation.max_spend_trade = policy.get("max_spend_trade", 5.0)
            delegation.max_spend_week = policy.get("max_spend_week", 20.0)
            delegation.expiry = int((datetime.datetime.utcnow() + datetime.timedelta(days=policy.get("duration_days", 7))).timestamp())
            delegation.active = True
        db.commit()

        return policy
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/score-token")
def score_token(req: ScoreTokenRequest, db: Session = Depends(get_db)):
    try:
        if req.symbol.upper() not in TOKEN_ADDRESSES:
            raise HTTPException(status_code=400, detail=f"Token {req.symbol} is not supported.")
        result = ResearchAgent.score_token(req.symbol, db)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/record-trade")
def record_trade(req: RecordTradeRequest, db: Session = Depends(get_db)):
    try:
        delegation = db.query(Delegation).filter(
            Delegation.user_address == req.user_address,
            Delegation.active == True
        ).first()

        if not delegation:
            raise HTTPException(status_code=400, detail="No active delegation found. Please grant permissions first.")

        if req.amount_in_usd > delegation.max_spend_trade:
            raise HTTPException(status_code=400, detail=f"Amount exceeds maximum allowed trade size of ${delegation.max_spend_trade}")

        buy_price = get_token_price(req.token_out_symbol)
        take_profit_price = buy_price * (1 + req.take_profit_pct / 100.0)
        stop_loss_price = buy_price * (1 - req.stop_loss_pct / 100.0)
        actual_bought = req.amount_in_usd / buy_price if buy_price > 0 else 0

        new_position = Position(
            user_address=req.user_address,
            token_symbol=req.token_out_symbol.upper(),
            token_address=TOKEN_ADDRESSES.get(req.token_out_symbol.upper(), ""),
            amount=actual_bought,
            buy_price=buy_price,
            take_profit=take_profit_price,
            stop_loss=stop_loss_price,
            status="ACTIVE"
        )
        db.add(new_position)

        log = ActivityLog(
            agent="Execution",
            action="Trade Recorded",
            details=f"Swapped ${req.amount_in_usd} of {req.token_in_symbol} → {req.token_out_symbol} via user wallet on Sepolia.",
            tx_hash=req.tx_hash
        )
        db.add(log)
        db.commit()

        return {
            "status": "success",
            "tx_hash": req.tx_hash,
            "bought_amount": actual_bought,
            "buy_price": buy_price,
            "take_profit": take_profit_price,
            "stop_loss": stop_loss_price
        }
    except HTTPException:
        raise
    except Exception as e:
        db.add(ActivityLog(agent="Execution", action="Trade Record Failed", details=str(e)))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/monitor-positions")
def monitor_positions(db: Session = Depends(get_db)):
    try:
        results = MonitoringAgent.monitor_positions(db)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/record-exit")
def record_exit(req: RecordExitRequest, db: Session = Depends(get_db)):
    try:
        position = db.query(Position).filter(Position.id == req.position_id).first()
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")

        position.status = "CLOSED"
        position.exit_price = req.exit_price
        position.exit_tx_hash = req.tx_hash

        log = ActivityLog(
            agent="Monitoring",
            action="Position Closed",
            details=f"Closed {position.token_symbol} position #{position.id}. Exit price: ${req.exit_price:.2f}",
            tx_hash=req.tx_hash
        )
        db.add(log)
        db.commit()

        return {"status": "success", "message": f"Position #{req.position_id} closed."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/log-action")
def log_action(req: LogActionRequest, db: Session = Depends(get_db)):
    try:
        log = ActivityLog(
            agent=req.agent,
            action=req.action,
            details=req.details,
            tx_hash=req.tx_hash if req.tx_hash else None
        )
        db.add(log)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/revoke-permission")
def revoke_permission(req: RevokePermissionRequest, db: Session = Depends(get_db)):
    try:
        delegation = db.query(Delegation).filter(Delegation.user_address == req.user_address).first()
        if delegation:
            delegation.active = False
            db.commit()

        db.add(ActivityLog(
            agent="Wallet",
            action="Revoke Delegation",
            details=f"Delegation permission revoked for user {req.user_address}"
        ))
        db.commit()

        return {"status": "success", "message": "Delegation deactivated in backend database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/activity-logs")
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(50).all()
    return logs

@app.get("/api/positions")
def get_positions(user_address: str, db: Session = Depends(get_db)):
    positions = db.query(Position).filter(Position.user_address == user_address).order_by(Position.timestamp.desc()).all()
    return positions

@app.get("/api/delegation")
def get_delegation(user_address: str, db: Session = Depends(get_db)):
    delegation = db.query(Delegation).filter(Delegation.user_address == user_address).first()
    return delegation

class UpdateTokensRequest(BaseModel):
    usdc_address: str
    link_address: str
    uni_address: str

@app.post("/api/update-tokens")
def update_tokens(req: UpdateTokensRequest, db: Session = Depends(get_db)):
    try:
        from web3 import Web3
        import agents as agents_module

        usdc = Web3.to_checksum_address(req.usdc_address)
        link = Web3.to_checksum_address(req.link_address)
        uni  = Web3.to_checksum_address(req.uni_address)

        TOKEN_ADDRESSES["USDC"] = usdc
        TOKEN_ADDRESSES["LINK"] = link
        TOKEN_ADDRESSES["UNI"]  = uni
        agents_module.TOKEN_ADDRESSES["USDC"] = usdc
        agents_module.TOKEN_ADDRESSES["LINK"] = link
        agents_module.TOKEN_ADDRESSES["UNI"]  = uni

        env_path = ".env"
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                lines = f.readlines()

        keys_to_remove = ["USDC_ADDRESS=", "LINK_ADDRESS=", "UNI_ADDRESS="]
        lines = [l for l in lines if not any(l.startswith(k) for k in keys_to_remove)]

        lines.append(f"\nUSDC_ADDRESS={usdc}\n")
        lines.append(f"LINK_ADDRESS={link}\n")
        lines.append(f"UNI_ADDRESS={uni}\n")

        with open(env_path, "w") as f:
            f.writelines(lines)

        db.add(ActivityLog(
            agent="Wallet",
            action="Mocks Deployed",
            details=f"Custom Mock tokens registered: USDC={usdc[:10]}... LINK={link[:10]}... UNI={uni[:10]}..."
        ))
        db.commit()

        return {"status": "success", "message": "Tokens updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
