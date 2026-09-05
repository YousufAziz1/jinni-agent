from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field
import datetime

PolicyResult = Literal["PASS", "FAIL", "UNKNOWN"]
GenLayerDecision = Literal[
    "APPROVE",
    "REJECT",
    "DISPUTE",
    "INSUFFICIENT_DATA",
    "UNAVAILABLE"
]

ProposalState = Literal[
    "DRAFT",
    "PROPOSED",
    "POLICY_CHECKING",
    "POLICY_FAILED",
    "POLICY_PASSED",
    "SUBMITTING_TO_GENLAYER",
    "GENLAYER_PENDING",
    "GENLAYER_ACCEPTED",
    "GENLAYER_FINALIZED",
    "APPROVED",
    "REJECTED",
    "DISPUTED",
    "INSUFFICIENT_DATA",
    "READY_FOR_EXECUTION",
    "AWAITING_CONFIRMATION",
    "EXECUTING",
    "EXECUTED",
    "EXECUTION_FAILED",
    "CANCELLED"
]

ExecutionStatus = Literal[
    "BLOCKED",
    "WAITING_FOR_GENLAYER",
    "READY",
    "AWAITING_USER_CONFIRMATION",
    "EXECUTING",
    "EXECUTED",
    "FAILED"
]

class EvidenceItem(BaseModel):
    id: str
    source: str
    type: str  # PRICE_FEED, LIQUIDITY_CHECK, CONTRACT_VERIFICATION, RISK_SCORE, WALLET_BALANCE
    value: Optional[str] = None
    timestamp: Optional[str] = None
    status: Literal["VERIFIED", "UNAVAILABLE", "STALE", "DISPUTED"]
    details: Optional[str] = None

class GenLayerTelemetry(BaseModel):
    validatorCount: Optional[int] = None
    validators: Optional[List[str]] = None
    votes: Optional[Dict[str, str]] = None
    votePercentage: Optional[float] = None
    consensusPercentage: Optional[float] = None
    confidence: Optional[str] = None
    rounds: Optional[int] = None
    latencyMs: Optional[float] = None
    majorityAgreement: Optional[bool] = None
    resultName: Optional[str] = None

class GenLayerResult(BaseModel):
    network: str
    chainId: Optional[int] = None
    contractAddress: Optional[str] = None
    txHash: Optional[str] = None
    txStatus: Optional[Literal["PENDING", "ACCEPTED", "FINALIZED", "FAILED", "UNKNOWN"]] = None
    decision: GenLayerDecision
    reasoning: Optional[str] = None
    submittedAt: Optional[str] = None
    finalizedAt: Optional[str] = None
    telemetry: Optional[GenLayerTelemetry] = None
    rawReceipt: Optional[Dict[str, Any]] = None

class ExecutionState(BaseModel):
    status: ExecutionStatus
    requiresHumanConfirmation: bool = True
    userConfirmed: bool = False
    txHash: Optional[str] = None
    executedAt: Optional[str] = None
    error: Optional[str] = None
    mode: Literal["WALLET", "PREVIEW", "SIMULATION"] = "WALLET"

class AgentProposal(BaseModel):
    id: str
    createdAt: str
    source: str = "agent"
    actorType: Literal["human", "agent"] = "agent"
    originAgentId: Optional[str] = None
    destinationAgentId: Optional[str] = None
    actionType: Literal["BUY", "SELL", "SWAP", "PAY", "SERVICE_PAYMENT", "CONTRACT_INTERACTION"]
    asset: Optional[str] = None
    chain: Optional[str] = "Sepolia"
    chainId: Optional[int] = 11155111
    amount: Optional[str] = None
    amountUsd: Optional[str] = None
    slippage: Optional[str] = "0.5%"
    route: Optional[str] = "Uniswap V3"
    policyId: Optional[str] = "default-policy"
    policyVersion: Optional[str] = "1.0.0"
    policyResult: PolicyResult = "UNKNOWN"
    policyFailureReason: Optional[str] = None
    agentRationale: str = ""
    evidence: List[EvidenceItem] = Field(default_factory=list)
    genlayer: Optional[GenLayerResult] = None
    execution: ExecutionState = Field(default_factory=lambda: ExecutionState(status="WAITING_FOR_GENLAYER"))
    state: ProposalState = "DRAFT"
    isDemo: bool = False

class DecisionProof(BaseModel):
    proposalId: str
    action: str
    asset: Optional[str] = None
    chain: Optional[str] = None
    amountUsd: Optional[str] = None
    policyVersion: Optional[str] = None
    policyResult: PolicyResult
    evidenceSummary: Dict[str, int]
    genlayerContract: Optional[str] = None
    genlayerTxHash: Optional[str] = None
    txStatus: Optional[str] = None
    finalDecision: GenLayerDecision
    decisionTimestamp: Optional[str] = None
    decisionReasoning: Optional[str] = None
    executionStatus: ExecutionStatus
    executionTxHash: Optional[str] = None
    executedAt: Optional[str] = None
    auditTrail: List[Dict[str, str]] = Field(default_factory=list)

class PolicyRuleConfig(BaseModel):
    id: str = "default-policy"
    version: str = "1.0.0"
    name: str = "Standard JINNI Safety Guard"
    maxTransactionValue: float = 500.0
    maxDailySpend: float = 1000.0
    maxSlippage: float = 1.0
    allowedChains: List[int] = Field(default_factory=lambda: [11155111, 1, 61999])
    allowedTokens: List[str] = Field(default_factory=lambda: ["USDC", "LINK", "UNI", "WETH"])
    blockedTokens: List[str] = Field(default_factory=list)
    minLiquidityUsd: Optional[float] = 10000.0
    requireVerifiedContract: bool = True
    requireGenLayerApproval: bool = True
    automaticExecution: bool = False
    humanConfirmationThreshold: float = 0.0  # Any real value requires human confirmation
