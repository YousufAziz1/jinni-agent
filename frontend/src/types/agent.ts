export type PolicyResult = "PASS" | "FAIL" | "UNKNOWN";

export type GenLayerDecision =
  | "APPROVE"
  | "REJECT"
  | "DISPUTE"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE";

export type ProposalState =
  | "DRAFT"
  | "PROPOSED"
  | "POLICY_CHECKING"
  | "POLICY_FAILED"
  | "POLICY_PASSED"
  | "SUBMITTING_TO_GENLAYER"
  | "GENLAYER_NOT_SUBMITTED"
  | "GENLAYER_PENDING"
  | "GENLAYER_ACCEPTED"
  | "GENLAYER_FINALIZED"
  | "APPROVED"
  | "REJECTED"
  | "DISPUTED"
  | "INSUFFICIENT_DATA"
  | "READY_FOR_EXECUTION"
  | "AWAITING_CONFIRMATION"
  | "EXECUTING"
  | "EXECUTED"
  | "EXECUTION_FAILED"
  | "CANCELLED";

export type ExecutionStatus =
  | "BLOCKED"
  | "WAITING_FOR_GENLAYER"
  | "READY"
  | "AWAITING_USER_CONFIRMATION"
  | "EXECUTING"
  | "EXECUTED"
  | "FAILED";

export interface EvidenceItem {
  id: string;
  source: string;
  type: string;
  value: string | null;
  timestamp: string | null;
  status: "VERIFIED" | "UNAVAILABLE" | "STALE" | "DISPUTED";
  details?: string | null;
}

export interface GenLayerTelemetry {
  validatorCount: number | null;
  validators: string[] | null;
  votes: Record<string, string> | null;
  votePercentage: number | null;
  consensusPercentage: number | null;
  confidence: string | null;
  rounds: number | null;
  latencyMs: number | null;
  majorityAgreement: boolean | null;
  resultName: string | null;
}

export interface GenLayerResult {
  network: string;
  chainId: number | null;
  contractAddress: string | null;
  txHash: string | null;
  txStatus: "PENDING" | "ACCEPTED" | "FINALIZED" | "FAILED" | "UNKNOWN" | "NOT_APPLICABLE" | null;
  decision: GenLayerDecision;
  reasoning: string | null;
  submittedAt: string | null;
  finalizedAt: string | null;
  telemetry: GenLayerTelemetry | null;
  rawReceipt?: Record<string, unknown> | null;
}

export interface ExecutionState {
  status: ExecutionStatus;
  requiresHumanConfirmation: boolean;
  userConfirmed: boolean;
  txHash: string | null;
  executedAt: string | null;
  error: string | null;
  mode: "WALLET" | "PREVIEW" | "SIMULATION";
}

export interface AgentProposal {
  id: string;
  createdAt: string;
  source: string;
  actorType: "human" | "agent";
  originAgentId: string | null;
  destinationAgentId: string | null;
  actionType: "BUY" | "SELL" | "SWAP" | "PAY" | "SERVICE_PAYMENT" | "CONTRACT_INTERACTION";
  asset: string | null;
  chain: string | null;
  chainId: number | null;
  amount: string | null;
  amountUsd: string | null;
  slippage: string | null;
  route: string | null;
  policyId: string | null;
  policyVersion: string | null;
  policyResult: PolicyResult;
  policyFailureReason: string | null;
  agentRationale: string;
  evidence: EvidenceItem[];
  genlayer: GenLayerResult | null;
  execution: ExecutionState;
  state: ProposalState;
  isDemo?: boolean;
}

export interface DecisionProof {
  proposalId: string;
  action: string;
  asset: string | null;
  chain: string | null;
  amountUsd: string | null;
  policyVersion: string | null;
  policyResult: PolicyResult;
  evidenceSummary: {
    totalItems: number;
    verifiedItems: number;
    unavailableItems: number;
  };
  genlayerContract: string | null;
  genlayerTxHash: string | null;
  txStatus: string | null;
  finalDecision: GenLayerDecision;
  decisionTimestamp: string | null;
  decisionReasoning: string | null;
  executionStatus: ExecutionStatus;
  executionTxHash: string | null;
  executedAt: string | null;
  auditTrail: {
    stage: string;
    timestamp: string;
    details: string;
  }[];
}

export interface PolicyRuleConfig {
  id: string;
  version: string;
  name: string;
  maxTransactionValue: number;
  maxDailySpend: number;
  maxSlippage: number;
  allowedChains: number[];
  allowedTokens: string[];
  blockedTokens: string[];
  minLiquidityUsd: number | null;
  requireVerifiedContract: boolean;
  requireGenLayerApproval: boolean;
  automaticExecution: boolean;
  humanConfirmationThreshold: number;
}
