from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

# Core Status Types
PolicyResult = Literal["PASS", "FAIL", "UNKNOWN"]
GenLayerDecision = Literal["APPROVE", "REJECT", "DISPUTE", "INSUFFICIENT_DATA", "UNAVAILABLE"]

ProposalState = Literal[
    "DRAFT",
    "POLICY_CHECKING",
    "POLICY_PASSED",
    "POLICY_FAILED",
    "GENLAYER_PENDING",
    "GENLAYER_ACCEPTED",
    "GENLAYER_FINALIZED",
    "AWAITING_CONFIRMATION",
    "READY_FOR_EXECUTION",
    "EXECUTING",
    "EXECUTED",
    "REJECTED",
    "DISPUTED",
    "INSUFFICIENT_DATA"
]

ExecutionStatus = Literal[
    "IDLE",
    "WAITING_FOR_POLICY",
    "WAITING_FOR_GENLAYER",
    "AWAITING_USER_CONFIRMATION",
    "READY",
    "EXECUTING",
    "EXECUTED",
    "BLOCKED",
    "REJECTED",
    "FAILED"
]

class EvidenceItem(BaseModel):
    id: str
    source: str
    type: Literal[
        "PRICE_FEED",
        "DEX_SPOT_PRICE",
        "ORACLE_PRICE",
        "REFERENCE_PRICE",
        "LIQUIDITY_CHECK",
        "CONTRACT_VERIFICATION",
        "SIMULATION",
        "PYTH_FEED",
        "CHAINLINK_FEED"
    ]
    value: Optional[Any] = None
    timestamp: Optional[str] = None
    status: Literal["VERIFIED", "UNAVAILABLE", "DISPUTED", "STALE"] = "VERIFIED"
    details: Optional[str] = None

class GenLayerTelemetry(BaseModel):
    validatorCount: Optional[int] = None
    validators: Optional[List[str]] = None
    votes: Optional[Dict[str, str]] = None
    votePercentage: Optional[float] = None
    consensusPercentage: Optional[float] = None
    confidence: Optional[str] = None
    rounds: Optional[int] = None
    latencyMs: Optional[int] = None
    majorityAgreement: Optional[bool] = None
    resultName: Optional[str] = None

class GenLayerResult(BaseModel):
    network: str = "studionet"
    chainId: int = 61999
    contractAddress: Optional[str] = None
    txHash: Optional[str] = None
    txStatus: Optional[Literal["PENDING", "ACCEPTED", "FINALIZED", "FAILED", "UNKNOWN"]] = None
    decision: GenLayerDecision = "UNAVAILABLE"
    reasoning: Optional[str] = None
    submittedAt: Optional[str] = None
    finalizedAt: Optional[str] = None
    telemetry: Optional[GenLayerTelemetry] = None

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
    # Active live wallet execution is exclusively supported on Ethereum Sepolia (11155111)
    # Other chains (e.g. Base 8453, Base Sepolia 84532) are reserved for future roadmap
    allowedChains: List[int] = Field(default_factory=lambda: [11155111])
    allowedTokens: List[str] = Field(default_factory=lambda: ["USDC", "LINK", "UNI", "WETH"])
    blockedTokens: List[str] = Field(default_factory=list)
    minLiquidityUsd: Optional[float] = 10000.0
    requireVerifiedContract: bool = True
    requireGenLayerApproval: bool = True
    automaticExecution: bool = False
    humanConfirmationThreshold: float = 0.0  # Any real value requires human confirmation
