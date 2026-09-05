import datetime
from typing import List
from agent_domain import (
    AgentProposal,
    EvidenceItem,
    GenLayerResult,
    ExecutionState
)

def get_demo_scenarios() -> List[AgentProposal]:
    """
    Returns the 4 deterministic, demo-safe scenarios for the GenLayer Agent Tank Hackathon.
    Visibly tagged with isDemo=True, transparent fixture hashes, and completely isolated
    from live on-chain production execution.
    """
    now = datetime.datetime.utcnow().isoformat()

    # 1. Valid Trade — Approved (Passes Policy + Approved by GenLayer Guard)
    safe_approved = AgentProposal(
        id="demo-safe-approved-001",
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
            reasoning="[DEMO FIXTURE] GenLayer multi-validator consensus simulation: Trade size ($5) adheres to user risk bounds, verified liquidity depth, and rationale is sound.",
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
            mode="WALLET"
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
            error="Policy rule violation: Proposed spend of $2,500 exceeds maximum allowable single trade ceiling of $500."
        ),
        state="POLICY_FAILED",
        isDemo=True
    )

    # 3. Conflicting Oracle — Disputed (DEX spot price diverges 14% from Reference Oracle -> Disputed on GenLayer)
    conflicting_oracle = AgentProposal(
        id="demo-conflicting-oracle-003",
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
        slippage="0.8%",
        route="DEX Pair Spot Pool",
        policyId="default-policy",
        policyVersion="1.0.0",
        policyResult="PASS",
        policyFailureReason=None,
        agentRationale="Detected deep discount on DEX spot pool for WETH compared to major centralized exchange feeds.",
        evidence=[
            EvidenceItem(
                id="ev-disp-1",
                source="DEX Spot Reserve",
                type="DEX_SPOT_PRICE",
                value="2250.0",
                timestamp=now,
                status="VERIFIED",
                details="AMM pool instantaneous spot execution price: $2,250.00"
            ),
            EvidenceItem(
                id="ev-disp-2",
                source="Chainlink Reference Feed",
                type="ORACLE_PRICE",
                value="2620.0",
                timestamp=now,
                status="VERIFIED",
                details="Chainlink consolidated oracle price: $2,620.00 (14.1% divergence)"
            ),
            EvidenceItem(
                id="ev-disp-3",
                source="Pool Depth Inspector",
                type="LIQUIDITY_CHECK",
                value="125000.0",
                timestamp=now,
                status="VERIFIED",
                details="Pool depth satisfies minimum liquidity threshold"
            )
        ],
        genlayer=GenLayerResult(
            network="studionet",
            chainId=61999,
            contractAddress="0x0000000000000000000000000000000000000000 (DEMO FIXTURE)",
            txHash="0xd3m0_fixture_disputed_tx_hash_00000000000000000000000000000000001",
            txStatus="FINALIZED",
            decision="DISPUTE",
            reasoning="[DEMO FIXTURE] GenLayer multi-validator consensus simulation: DEX spot price ($2,250.00) diverges by 14.1% from reference oracle ($2,620.00), exceeding 5.0% tolerance. Flagged as oracle manipulation risk.",
            submittedAt=now,
            finalizedAt=now,
            telemetry=None
        ),
        execution=ExecutionState(
            status="BLOCKED",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            error="Execution blocked: GenLayer flagged an on-chain price dispute between DEX pool and reference oracle."
        ),
        state="DISPUTED",
        isDemo=True
    )

    # 4. Insufficient Evidence — Insufficient Data (Critical price/liquidity missing -> Blocked)
    insufficient_evidence = AgentProposal(
        id="demo-insufficient-evidence-004",
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
            reasoning="[DEMO FIXTURE] GenLayer multi-validator consensus simulation: Critical evidence missing or unverified: PRICE_FEED, LIQUIDITY_CHECK, CONTRACT_VERIFICATION. Adjudication cannot establish safety.",
            submittedAt=now,
            finalizedAt=now,
            telemetry=None
        ),
        execution=ExecutionState(
            status="BLOCKED",
            requiresHumanConfirmation=True,
            userConfirmed=False,
            error="Execution blocked: Insufficient verifiable evidence to justify financial commitment."
        ),
        state="INSUFFICIENT_DATA",
        isDemo=True
    )

    return [safe_approved, policy_violation, conflicting_oracle, insufficient_evidence]
