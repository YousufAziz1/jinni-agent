import type { AgentProposal, DecisionProof } from '../types/agent';

const DEMO_TIMESTAMP = "2026-03-05T12:00:00.000Z";

/**
 * Single Canonical Registry for Reviewer Demo Scenarios.
 * Shared by Overview cards, Agent Core, Proposal Detail, Activity, Proofs, and Metrics.
 *
 * Guarantees zero runtime loading failures even when offline or during cold backend boots.
 */
export const CANONICAL_DEMO_SCENARIOS: Record<string, AgentProposal> = {
  "demo-safe-001": {
    id: "demo-safe-001",
    createdAt: DEMO_TIMESTAMP,
    source: "Autonomous Trading Agent",
    actorType: "agent",
    originAgentId: "agent-jinni-alpha",
    destinationAgentId: null,
    actionType: "BUY",
    asset: "LINK",
    chain: "Sepolia",
    chainId: 11155111,
    amount: "0.33",
    amountUsd: "5.00",
    slippage: "0.5%",
    route: "Uniswap V3 (USDC -> LINK)",
    policyId: "default-policy",
    policyVersion: "1.0.0",
    policyResult: "PASS",
    policyFailureReason: null,
    agentRationale:
      "Technical momentum for LINK indicates healthy consolidation above $14.80 support. 24h volume increased by 8.4% with positive RSI divergence. Proposed trade size ($5.00) is strictly within safety thresholds.",
    evidence: [
      {
        id: "ev-safe-1",
        source: "CryptoCompare Index",
        type: "PRICE_FEED",
        value: "$15.15 / LINK",
        timestamp: DEMO_TIMESTAMP,
        status: "VERIFIED",
        details: "Consensus oracle price matched against Uniswap V3 TWAP"
      },
      {
        id: "ev-safe-2",
        source: "Uniswap V3 Pool",
        type: "LIQUIDITY_CHECK",
        value: "450000.0",
        timestamp: DEMO_TIMESTAMP,
        status: "VERIFIED",
        details: "Pool depth sufficient: expected price impact 0.002%"
      },
      {
        id: "ev-safe-3",
        source: "Etherscan Sepolia",
        type: "CONTRACT_VERIFICATION",
        value: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        timestamp: DEMO_TIMESTAMP,
        status: "VERIFIED",
        details: "Verified Chainlink Token contract bytecode and ABI match"
      }
    ],
    genlayer: {
      network: "studionet",
      chainId: 61999,
      contractAddress: null,
      txHash: null,
      txStatus: "NOT_APPLICABLE",
      decision: "APPROVE",
      reasoning:
        "[DEMO FIXTURE] GenLayer adjudication simulation: Trade size ($5.00) adheres to user risk bounds, verified liquidity depth, and rationale is sound.",
      submittedAt: null,
      finalizedAt: null,
      telemetry: null // Telemetry strictly null when not returned by real node
    },
    execution: {
      status: "AWAITING_USER_CONFIRMATION",
      requiresHumanConfirmation: true,
      userConfirmed: false,
      txHash: null,
      executedAt: null,
      error: null,
      mode: "SIMULATION"
    },
    state: "AWAITING_CONFIRMATION",
    isDemo: true
  },

  "demo-policy-violation-002": {
    id: "demo-policy-violation-002",
    createdAt: DEMO_TIMESTAMP,
    source: "High Frequency Rebalancer Agent",
    actorType: "agent",
    originAgentId: "agent-whale-trader",
    destinationAgentId: null,
    actionType: "BUY",
    asset: "UNI",
    chain: "Sepolia",
    chainId: 11155111,
    amount: "350.0",
    amountUsd: "2500.00",
    slippage: "0.5%",
    route: "Uniswap V3 (USDC -> UNI)",
    policyId: "default-policy",
    policyVersion: "1.0.0",
    policyResult: "FAIL",
    policyFailureReason: "Amount $2,500.00 exceeds configured maximum limit of $500.00",
    agentRationale:
      "Urgent breakout signal detected on UNI/USDC 1-hour candle. Attempting immediate maximum fill of $2,500.",
    evidence: [
      {
        id: "ev-pol-1",
        source: "CryptoCompare Index",
        type: "PRICE_FEED",
        value: "$7.14 / UNI",
        timestamp: DEMO_TIMESTAMP,
        status: "VERIFIED",
        details: "Accurate reference price confirmed"
      },
      {
        id: "ev-pol-2",
        source: "Etherscan Sepolia",
        type: "CONTRACT_VERIFICATION",
        value: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        timestamp: DEMO_TIMESTAMP,
        status: "VERIFIED",
        details: "Uniswap Token verified"
      }
    ],
    genlayer: null, // Never submitted to GenLayer because policy evaluation failed
    execution: {
      status: "BLOCKED",
      requiresHumanConfirmation: true,
      userConfirmed: false,
      txHash: null,
      executedAt: null,
      error:
        "Execution gate blocked: Proposed spend of $2,500 exceeds maximum allowable single trade ceiling of $500.",
      mode: "SIMULATION"
    },
    state: "GENLAYER_NOT_SUBMITTED",
    isDemo: true
  },

  "demo-insufficient-evidence-003": {
    id: "demo-insufficient-evidence-003",
    createdAt: DEMO_TIMESTAMP,
    source: "DeFi Arbitrage Agent",
    actorType: "agent",
    originAgentId: "agent-arb-bot",
    destinationAgentId: null,
    actionType: "SWAP",
    asset: "UNKNOWN_MEME",
    chain: "Sepolia",
    chainId: 11155111,
    amount: "1000000.0",
    amountUsd: "50.00",
    slippage: "5.0%",
    route: "Direct DEX Pair",
    policyId: "default-policy",
    policyVersion: "1.0.0",
    policyResult: "UNKNOWN",
    policyFailureReason:
      "Missing critical policy data: Target contract is unverified; Missing liquidity evidence",
    agentRationale:
      "Identified potential cross-exchange arbitrage gap on low-cap token UNKNOWN_MEME.",
    evidence: [
      {
        id: "ev-ins-1",
        source: "DEX API",
        type: "PRICE_FEED",
        value: null,
        timestamp: null,
        status: "UNAVAILABLE",
        details: "No decentralized oracle or price feed available for token"
      },
      {
        id: "ev-ins-2",
        source: "Pool Inspector",
        type: "LIQUIDITY_CHECK",
        value: null,
        timestamp: null,
        status: "UNAVAILABLE",
        details: "Unable to query liquidity pool depth"
      },
      {
        id: "ev-ins-3",
        source: "Etherscan Sepolia",
        type: "CONTRACT_VERIFICATION",
        value: "0x000000000000000000000000000000000000dead",
        timestamp: DEMO_TIMESTAMP,
        status: "UNAVAILABLE",
        details: "Contract source code is unverified and unindexed"
      }
    ],
    genlayer: {
      network: "studionet",
      chainId: 61999,
      contractAddress: null,
      txHash: null,
      txStatus: "NOT_APPLICABLE",
      decision: "INSUFFICIENT_DATA",
      reasoning:
        "[DEMO FIXTURE] GenLayer adjudication simulation: Critical evidence missing or unverified: PRICE_FEED, LIQUIDITY_CHECK, CONTRACT_VERIFICATION. Adjudication cannot establish safety.",
      submittedAt: null,
      finalizedAt: null,
      telemetry: null
    },
    execution: {
      status: "BLOCKED",
      requiresHumanConfirmation: true,
      userConfirmed: false,
      txHash: null,
      executedAt: null,
      error:
        "Execution blocked: Insufficient verifiable evidence to justify financial commitment.",
      mode: "SIMULATION"
    },
    state: "INSUFFICIENT_DATA",
    isDemo: true
  },

  "demo-genlayer-rejection-004": {
    id: "demo-genlayer-rejection-004",
    createdAt: DEMO_TIMESTAMP,
    source: "Arbitrage Discovery Bot",
    actorType: "agent",
    originAgentId: "agent-flash-arb",
    destinationAgentId: null,
    actionType: "SWAP",
    asset: "WETH",
    chain: "Sepolia",
    chainId: 11155111,
    amount: "0.1",
    amountUsd: "260.00",
    slippage: "8.5%",
    route: "DEX Pair Spot Pool",
    policyId: "default-policy",
    policyVersion: "1.0.0",
    policyResult: "PASS",
    policyFailureReason: null,
    agentRationale:
      "Attempting rapid swap on low-liquidity pool with 8.5% slippage tolerance to capture fleeting arbitrage window.",
    evidence: [
      {
        id: "ev-rej-1",
        source: "DEX Spot Reserve",
        type: "DEX_SPOT_PRICE",
        value: "2250.0",
        timestamp: DEMO_TIMESTAMP,
        status: "VERIFIED",
        details: "AMM pool instantaneous spot execution price: $2,250.00"
      },
      {
        id: "ev-rej-2",
        source: "Slippage Monitor",
        type: "SLIPPAGE_ANALYSIS",
        value: "8.5%",
        timestamp: DEMO_TIMESTAMP,
        status: "DISPUTED",
        details: "Proposed slippage (8.5%) exceeds the strict safety ceiling of 1.0%"
      }
    ],
    genlayer: {
      network: "studionet",
      chainId: 61999,
      contractAddress: null,
      txHash: null,
      txStatus: "NOT_APPLICABLE",
      decision: "REJECT",
      reasoning:
        "[DEMO FIXTURE] GenLayer adjudication rule rejection: Proposed slippage of 8.5% exceeds the safety threshold (max 1.0%). High MEV sandwich risk detected.",
      submittedAt: null,
      finalizedAt: null,
      telemetry: null
    },
    execution: {
      status: "BLOCKED",
      requiresHumanConfirmation: true,
      userConfirmed: false,
      txHash: null,
      executedAt: null,
      error:
        "Execution blocked: GenLayer adjudication rejected the trade due to excessive slippage (8.5%).",
      mode: "SIMULATION"
    },
    state: "REJECTED",
    isDemo: true
  }
};

/** Alias map to smoothly support previous or alternative ID spellings */
const SCENARIO_ALIASES: Record<string, string> = {
  "demo-safe-approved-001": "demo-safe-001",
  "demo-conflicting-oracle-003": "demo-genlayer-rejection-004",
  "demo-insufficient-evidence-004": "demo-insufficient-evidence-003"
};

export function getCanonicalDemoScenarios(): AgentProposal[] {
  return Object.values(CANONICAL_DEMO_SCENARIOS);
}

export function getDemoScenarioById(scenarioId: string): AgentProposal | null {
  const normalized = SCENARIO_ALIASES[scenarioId] || scenarioId;
  const fixture = CANONICAL_DEMO_SCENARIOS[normalized];
  if (!fixture) return null;
  // Return deep copy to prevent in-place mutation of the static fixtures
  return JSON.parse(JSON.stringify(fixture));
}

/**
 * Creates a truthful DecisionProof object matching a demo scenario
 */
export function createDecisionProofFromProposal(p: AgentProposal): DecisionProof {
  const verifiedCount = p.evidence.filter(e => e.status === "VERIFIED").length;
  const unavailableCount = p.evidence.filter(e => e.status === "UNAVAILABLE").length;
  const isDemo = p.isDemo === true;

  return {
    proposalId: p.id,
    action: `${p.actionType} ${p.asset || ""}`,
    asset: p.asset,
    chain: p.chain,
    amountUsd: p.amountUsd,
    policyVersion: p.policyVersion || "1.0.0",
    policyResult: p.policyResult,
    evidenceSummary: {
      totalItems: p.evidence.length,
      verifiedItems: verifiedCount,
      unavailableItems: unavailableCount
    },
    // Demo fixtures must never surface fake contract or tx hash values
    genlayerContract: isDemo ? null : (p.genlayer?.contractAddress || null),
    genlayerTxHash: isDemo ? null : (p.genlayer?.txHash || null),
    txStatus: isDemo ? "NOT_APPLICABLE" : (p.genlayer?.txStatus || null),
    finalDecision: p.genlayer?.decision || "UNAVAILABLE",
    decisionTimestamp: isDemo ? null : (p.genlayer?.finalizedAt || null),
    decisionReasoning: p.genlayer?.reasoning || null,
    executionStatus: p.execution.status,
    executionTxHash: isDemo ? null : p.execution.txHash,
    executedAt: isDemo ? null : p.execution.executedAt,
    auditTrail: [
      {
        stage: "PROPOSED",
        timestamp: p.createdAt,
        details: `Synthesized proposal by ${p.source} (${p.originAgentId || "agent"}).`
      },
      {
        stage: "POLICY_EVALUATION",
        timestamp: p.createdAt,
        details: `Policy check: ${p.policyResult}. ${p.policyFailureReason || "All bounds satisfied."}`
      },
      ...(p.genlayer ? [{
        stage: "GENLAYER_ADJUDICATION",
        timestamp: p.createdAt,
        details: isDemo
          ? `[DEMO FIXTURE] Decision: ${p.genlayer.decision}. No live transaction.`
          : `GenLayer decision: ${p.genlayer.decision}. Tx: ${p.genlayer.txHash || "N/A"}`
      }] : []),
      {
        stage: "EXECUTION_GATE",
        timestamp: p.createdAt,
        details: isDemo
          ? `Status: ${p.execution.status}. Demo fixture — execution not applicable.`
          : `Status: ${p.execution.status}. Confirmation required: ${p.execution.requiresHumanConfirmation}`
      }
    ]
  };
}

export function getCanonicalDemoProofs(): DecisionProof[] {
  return getCanonicalDemoScenarios().map(createDecisionProofFromProposal);
}
