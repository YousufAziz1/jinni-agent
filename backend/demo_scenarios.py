import datetime
from typing import List, Optional
from agent_domain import (
    AgentProposal,
    EvidenceItem,
    GenLayerResult,
    ExecutionState
)

def get_demo_scenarios() -> List[AgentProposal]:
    """
    Returns the 4 canonical deterministic, demo-safe scenarios for the GenLayer Agent Tank Hackathon.
    Visibly tagged with isDemo=True, transparent fixture hashes, and completely isolated
    from live on-chain production execution.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Safe Proposal — Approved (Passes Policy + Approved by GenLayer Guard Simulation)
    safe_approved = AgentProposal(
        id="demo-safe-001",
        createdAt=now,
        source="Autonomous Trading Agent",
        actorType="agent",
        originAgentId="agent-jinni-alpha",
        destinationAgentId=None,
        actionType="BUY",
        asset="LINK",
        chain="Sepolia",
        chainId=11155111,
        amount="0.33",
        amountUsd="5.0",
        slippage="0.5%",
        route="Uniswap V3 (USDC -> LINK)",
        policyId="default-policy",
        policyVersion="1.0.0",
        policyResult="PASS",
        policyFailureReason=None,
        agentRationale=(
            "Technical momentum for LINK indicates healthy consolidation above $14.80 support. "
            "24h volume increased by 8.4% with positive RSI divergence. Proposed trade size is well within safety thresholds."
        ),
        evidence=[
            EvidenceItem(
                id="ev-safe-1",
                source="CryptoCompare Index",
                type="PRICE_FEED",
                value="$15.15 / LINK",
                timestamp=now,
                status="VERIFIED",
                details="Consensus oracle price matched against Uniswap V3 TWAP"
            ),
            EvidenceItem(
                id="ev-safe-2",
                source="Uniswap V3 Pool",
                type="LIQUIDITY_CHECK",
                value="450000.0",
                timestamp=now,
                status="VERIFIED",
                details="Pool depth sufficient: expected price impact 0.002%"
            ),
            EvidenceItem(
                id="ev-safe-3",
                source="Etherscan Sepolia",
                type="CONTRACT_VERIFICATION",
                value="0x779877A7B0D9E8603169DdbD7836e478b4624789",
                timestamp=now,
                status="VERIFIED",
                details="Verified Chainlink Token contract bytecode and ABI match"
            )
        ],
        genlayer=GenLayerResult(
            network="studionet",
            chainId=61999,
            contractAddress="0x0000000000000000000000000000000000000000 (DEMO FIXTURE)",
            txHash="0xd3m0_fixture_approved_tx_hash_00000000000000000000000000000000001",
            txStatus="FINALIZED",
            decision="APPROVE",
            reasoning="[DEMO FIXTURE] GenLayer adjudication simulation: Trade size ($5) adheres to user risk bounds, verified liquidity depth, and rationale is sound.",
            submittedAt=now,
            finalizedAt=now,
            telemetry=None  # Telemetry stays None when not returned by real receipt; never fabricated
        ),
        execution=ExecutionState(
            status="AWAITING_USER_CONFIRMATION",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            txHash=None,
            executedAt=None,
            mode="SIMULATION"
        ),
        state="AWAITING_CONFIRMATION",
        isDemo=True
    )

    # 2. Policy Violation — Blocked (Exceeds $500 Max Trade Limit -> Blocked at Policy Stage)
    policy_violation = AgentProposal(
        id="demo-policy-violation-002",
        createdAt=now,
        source="High Frequency Rebalancer Agent",
        actorType="agent",
        originAgentId="agent-whale-trader",
        destinationAgentId=None,
        actionType="BUY",
        asset="UNI",
        chain="Sepolia",
        chainId=11155111,
        amount="350.0",
        amountUsd="2500.0",
        slippage="0.5%",
        route="Uniswap V3 (USDC -> UNI)",
        policyId="default-policy",
        policyVersion="1.0.0",
        policyResult="FAIL",
        policyFailureReason="Amount $2,500.00 exceeds limit of $500.00",
        agentRationale="Urgent breakout signal detected on UNI/USDC 1-hour candle. Attempting immediate maximum fill of $2,500.",
        evidence=[
            EvidenceItem(
                id="ev-pol-1",
                source="CryptoCompare Index",
                type="PRICE_FEED",
                value="$7.14 / UNI",
                timestamp=now,
                status="VERIFIED",
                details="Accurate reference price confirmed"
            ),
            EvidenceItem(
                id="ev-pol-2",
                source="Etherscan Sepolia",
                type="CONTRACT_VERIFICATION",
                value="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                timestamp=now,
                status="VERIFIED",
                details="Uniswap Token verified"
            )
        ],
        genlayer=None,  # Never submitted to GenLayer because policy evaluation failed
        execution=ExecutionState(
            status="BLOCKED",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            error="Policy rule violation: Proposed spend of $2,500 exceeds maximum allowable single trade ceiling of $500.",
            mode="SIMULATION"
        ),
        state="POLICY_FAILED",
        isDemo=True
    )

    # 3. Insufficient Evidence — Insufficient Data (Critical price/liquidity missing -> Blocked)
    insufficient_evidence = AgentProposal(
        id="demo-insufficient-evidence-003",
        createdAt=now,
        source="DeFi Arbitrage Agent",
        actorType="agent",
        originAgentId="agent-arb-bot",
        destinationAgentId=None,
        actionType="SWAP",
        asset="UNKNOWN_MEME",
        chain="Sepolia",
        chainId=11155111,
        amount="1000000.0",
        amountUsd="50.0",
        slippage="5.0%",
        route="Direct DEX Pair",
        policyId="default-policy",
        policyVersion="1.0.0",
        policyResult="UNKNOWN",
        policyFailureReason="Missing critical policy data: Target contract is not verified; Missing liquidity evidence",
        agentRationale="Identified potential cross-exchange arbitrage gap on low-cap token UNKNOWN_MEME.",
        evidence=[
            EvidenceItem(
                id="ev-ins-1",
                source="DEX API",
                type="PRICE_FEED",
                value=None,
                timestamp=None,
                status="UNAVAILABLE",
                details="No decentralized oracle or price feed available for token"
            ),
            EvidenceItem(
                id="ev-ins-2",
                source="Pool Inspector",
                type="LIQUIDITY_CHECK",
                value=None,
                timestamp=None,
                status="UNAVAILABLE",
                details="Unable to query liquidity pool depth"
            ),
            EvidenceItem(
                id="ev-ins-3",
                source="Etherscan Sepolia",
                type="CONTRACT_VERIFICATION",
                value="0x000000000000000000000000000000000000dead",
                timestamp=now,
                status="UNAVAILABLE",
                details="Contract source code is unverified and unindexed"
            )
        ],
        genlayer=GenLayerResult(
            network="studionet",
            chainId=61999,
            contractAddress="0x0000000000000000000000000000000000000000 (DEMO FIXTURE)",
            txHash="0xd3m0_fixture_insufficient_tx_hash_00000000000000000000000000000000001",
            txStatus="FINALIZED",
            decision="INSUFFICIENT_DATA",
            reasoning="[DEMO FIXTURE] GenLayer adjudication simulation: Critical evidence missing or unverified: PRICE_FEED, LIQUIDITY_CHECK, CONTRACT_VERIFICATION. Adjudication cannot establish safety.",
            submittedAt=now,
            finalizedAt=now,
            telemetry=None
        ),
        execution=ExecutionState(
            status="BLOCKED",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            error="Execution blocked: Insufficient verifiable evidence to justify financial commitment.",
            mode="SIMULATION"
        ),
        state="INSUFFICIENT_DATA",
        isDemo=True
    )

    # 4. GenLayer Rejection — Excessive Slippage (8.5% slippage -> Blocked & Rejected)
    genlayer_rejection = AgentProposal(
        id="demo-genlayer-rejection-004",
        createdAt=now,
        source="Arbitrage Discovery Bot",
        actorType="agent",
        originAgentId="agent-flash-arb",
        destinationAgentId=None,
        actionType="SWAP",
        asset="WETH",
        chain="Sepolia",
        chainId=11155111,
        amount="0.1",
        amountUsd="260.0",
        slippage="8.5%",
        route="DEX Pair Spot Pool",
        policyId="default-policy",
        policyVersion="1.0.0",
        policyResult="PASS",
        policyFailureReason=None,
        agentRationale="Attempting rapid swap on low-liquidity pool with 8.5% slippage tolerance to capture fleeting arbitrage window.",
        evidence=[
            EvidenceItem(
                id="ev-rej-1",
                source="DEX Spot Reserve",
                type="DEX_SPOT_PRICE",
                value="2250.0",
                timestamp=now,
                status="VERIFIED",
                details="AMM pool instantaneous spot execution price: $2,250.00"
            ),
            EvidenceItem(
                id="ev-rej-2",
                source="Slippage Monitor",
                type="SLIPPAGE_ANALYSIS",
                value="8.5%",
                timestamp=now,
                status="DISPUTED",
                details="Proposed slippage (8.5%) exceeds the maximum allowable safety threshold of 1.0%"
            )
        ],
        genlayer=GenLayerResult(
            network="studionet",
            chainId=61999,
            contractAddress="0x0000000000000000000000000000000000000000 (DEMO FIXTURE)",
            txHash="0xd3m0_fixture_rejected_tx_hash_00000000000000000000000000000000001",
            txStatus="FINALIZED",
            decision="REJECT",
            reasoning="[DEMO FIXTURE] GenLayer adjudication rule rejection: Proposed slippage of 8.5% exceeds the safety threshold (max 1.0%). High MEV sandwich risk detected.",
            submittedAt=now,
            finalizedAt=now,
            telemetry=None
        ),
        execution=ExecutionState(
            status="BLOCKED",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            error="Execution blocked: GenLayer adjudication rejected the trade due to excessive slippage (8.5%).",
            mode="SIMULATION"
        ),
        state="REJECTED",
        isDemo=True
    )

    return [safe_approved, policy_violation, insufficient_evidence, genlayer_rejection]


SCENARIO_ALIASES = {
    "demo-safe-approved-001": "demo-safe-001",
    "demo-conflicting-oracle-003": "demo-genlayer-rejection-004",
    "demo-insufficient-evidence-004": "demo-insufficient-evidence-003",
}

def get_demo_scenario_by_id(scenario_id: str) -> Optional[AgentProposal]:
    """Resolves scenario ID using canonical ID or legacy alias."""
    norm_id = SCENARIO_ALIASES.get(scenario_id, scenario_id)
    for s in get_demo_scenarios():
        if s.id == norm_id:
            return s
    return None
