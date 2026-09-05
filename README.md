# JINNI Agent

**Autonomous actions. Independent judgment.**  
*AI agents can propose. GenLayer decides.*

---

## One-line Pitch

JINNI Agent provides an autonomous agentic commerce guardrail system where AI trading agents can analyze and propose on-chain actions, but cannot execute until evaluated by deterministic policy rules and independently adjudicated by a GenLayer Intelligent Contract.

---

## Problem

AI agents can analyze market liquidity, monitor wallet health, and propose economically meaningful actions. However, granting an AI agent direct, unconstrained signing authority creates an existential trust boundary failure:

1. **Prompt Injection & Adversarial Exploits**: Agents exposed to unvetted web inputs or manipulated tokens can be coerced into draining balances.
2. **Hallucinated Market Assumptions**: An LLM can miscalculate slippage, trade against depleted pools, or execute upon stale or manipulated oracle feeds.
3. **Absence of Independent Oversight**: Allowing the same autonomous system that proposes a trade to unilaterally approve and execute it violates the core security principle of separation of duties.

---

## Solution

JINNI Agent introduces **independent policy enforcement and GenLayer intelligent adjudication** between agent intent and blockchain execution.

* An agent can formulate proposals and articulate rationale.
* The local **Policy Engine** deterministically enforces hard budget, slippage, and security boundaries.
* The **Evidence Layer** aggregates verifiable DEX prices, reference oracles, and verified contract checks.
* The **GenLayer Intelligent Contract** (`JinniAgentGuard.py`) operates as a decentralized, non-partisan judge using multi-validator AI consensus.
* The **Execution Gate** strictly permits wallet transactions only when both policy passes and GenLayer approves.

---

## Core Principle

> **"An AI agent must not be allowed to approve its own economically meaningful action."**

Autonomous systems must operate within verifiable governance boundaries. Proposing is an agent's task; deciding is the blockchain's prerogative.

---

## Architecture

```
User / Agent Intent
        ↓
   AI Proposal          (Formulates structured action, amount, slippage & rationale)
        ↓
  Policy Engine         (Deterministic rules: spend limits, slippage caps, whitelist)
        ↓
  Evidence Layer        (Verifiable price feeds, contract verification, pool liquidity)
        ↓
GenLayer Intelligent    (contracts/JinniAgentGuard.py deployed on Studionet)
     Contract
        ↓
   Adjudication         (Multi-validator AI consensus via Equivalence Principle)
        ↓
  Execution Gate        (Strict gate: READY | AWAITING_USER_CONFIRMATION | BLOCKED)
        ↓
 Sepolia Wallet Action  (EIP-1193 MetaMask execution via JinniDelegator on Sepolia)
        ↓
 Decision Audit Proof   (Auditable verifiable execution receipt & lifecycle record)
```

### Stage Breakdown

1. **User / Agent Intent**: Trade triggers or autonomous balancing requests are captured by the system.
2. **AI Proposal**: The proposal engine compiles an immutable JSON payload containing proposal ID, action type, asset, target chain, slippage, evidence items, and agent rationale.
3. **Policy Engine**: Evaluates the proposal against local guardrail rules: maximum spend per trade, weekly budgets, slippage caps, and asset whitelists. Outputs `PASS`, `FAIL`, or `UNKNOWN`.
4. **Evidence Layer**: Cross-examines multiple independent data points (DEX spot price vs reference oracle, contract verification bytecode, pool liquidity depth). Flagged discrepancies prevent execution.
5. **GenLayer Intelligent Contract**: Dispatched to `JinniAgentGuard.py` on GenLayer Studionet.
6. **Adjudication**: Multi-validator committee processes the contract logic using `gl.eq_principle.prompt_non_comparative` to inspect economics, rationale, and prompt-injection risks.
7. **Execution Gate**: Evaluates `policyResult` + GenLayer `decision` + human confirmation thresholds. Only `PASS` + `APPROVE` can reach `READY`.
8. **Sepolia Wallet Execution**: Connected EIP-1193 MetaMask wallet executes the approved trade on Ethereum Sepolia.
9. **Decision Audit Proof**: Generates a unified, structured audit record binding proposal parameters, policy evaluation, verifiable evidence bundle, GenLayer transaction hash, and execution outcome.

---

## Why GenLayer

GenLayer provides a decentralized consensus environment capable of executing Python-based Intelligent Contracts connected to non-deterministic intelligence (LLMs) and real-world inputs via the **Equivalence Principle**.

In JINNI Agent, GenLayer acts as the **independent adjudication layer**:
* **Separation of Concerns**: The proposing AI agent is decoupled from the adjudicating consensus committee.
* **Non-Deterministic Reasoning On-Chain**: Validates qualitative rationale, checks for social engineering/prompt injection, and verifies that the agent's justification aligns with numerical market evidence.
* **On-Chain State Persistence**: Stores all adjudicated proposals and explicit decisions on-chain for complete auditability.

*Truthfulness Note*: JINNI Agent reports only the transaction receipt and consensus outcome directly returned by the GenLayer JSON-RPC. If the network receipt omits validator vote counts or confidence distributions, they remain strictly `null` (`"Unavailable"` in the UI) without simulation or fabrication.

---

## Key Features

* **AI Action Proposals**: Structured transaction proposals binding economic parameters and agent rationale.
* **Deterministic Policy Engine**: Fast, local enforcement of financial limits before blockchain dispatch.
* **Evidence-Aware Checks**: Compares DEX spot prices against reference oracles (flagging >5% divergences as `DISPUTE`) and checks contract verification status.
* **GenLayer Intelligent Adjudication**: Python-powered intelligent contract evaluating consensus on Studionet.
* **Strict Execution Gate**: Enforces that AI output alone can never unlock execution.
* **Human Confirmation Thresholds**: Configurable threshold requiring human sign-off prior to MetaMask wallet execution.
* **Decision Audit Proofs**: Exportable JSON certificates containing full lifecycle audit trails.
* **Agent Activity History**: Real-time event log tracking proposals, adjudications, and wallet actions.
* **Deterministic Demo Scenarios**: Interactive testing sandbox showcasing all 4 pipeline outcomes (`APPROVE`, `REJECT`, `DISPUTE`, `INSUFFICIENT_DATA`).
* **Sepolia DeFi Vault Execution**: Integrated non-custodial delegation and automated position monitoring on Sepolia.

---

## Policy Engine

The server-side Policy Engine evaluates transactions before they reach GenLayer:

| Parameter | Type | Default Value | Description |
|---|---|---|---|
| `maxTransactionValue` | `float` | `$500.00` | Maximum allowed value for a single proposal. |
| `maxDailySpend` | `float` | `$1,000.00` | Maximum cumulative spend allowed in 24 hours. |
| `maxSlippage` | `float` | `1.0%` | Maximum allowed price slippage tolerance. |
| `allowedChains` | `List[int]` | `[11155111]` | Active wallet execution is strictly scoped to **Ethereum Sepolia**. |
| `allowedTokens` | `List[str]` | `["USDC", "LINK", "UNI", "WETH"]` | Whitelisted tokens permitted for trading. |
| `blockedTokens` | `List[str]` | `[]` | Explicit blacklisted tokens. |
| `minLiquidityUsd` | `float` | `$10,000.00` | Minimum pool liquidity required; missing liquidity defaults to `UNKNOWN`. |
| `requireVerifiedContract` | `bool` | `True` | Target contract bytecode must be verified on Etherscan. |
| `requireGenLayerApproval` | `bool` | `True` | GenLayer `APPROVE` verdict mandatory for execution. |
| `humanConfirmationThreshold` | `float` | `$0.00` | Any trade >= this value requires explicit user confirmation. |
| `automaticExecution` | `bool` | `False` | Unassisted wallet execution disabled by default. |

*Active Network Scope*: Active wallet execution is supported exclusively on **Ethereum Sepolia (`chainId: 11155111`)**. Other networks (Base, Arbitrum) represent future roadmap scope and are marked as unsupported in active execution.

---

## GenLayer Integration

JINNI Agent is deployed and verified on the official GenLayer Studionet:

* **Deployed Contract Address**: [`0xa54cF1bBCfe4456b6194658699aab540fBeF046c`](https://explorer-studio.genlayer.com/address/0xa54cF1bBCfe4456b6194658699aab540fBeF046c)
* **Deployment Transaction**: `0xceb57ad95d7b1a2d63de6b2826b58988943f8a691c53a0582081815ce62448bc`
* **Verified Adjudication Transaction**: `0xae013f22fbea2affccfd90ddca90c2ad65711001c9b090c3fb955402b31acb4b`
* **Network**: GenLayer Studionet
* **Chain ID**: `61999`
* **RPC Endpoint**: `https://studio.genlayer.com/api`
* **Block Explorer**: [https://explorer-studio.genlayer.com](https://explorer-studio.genlayer.com)

---

## Contract Interface

The deployed Intelligent Contract ([`contracts/JinniAgentGuard.py`](contracts/JinniAgentGuard.py)) exposes four public methods:

```python
@gl.public.write
def adjudicate_proposal(self, proposal_json: str) -> str:
    """
    Evaluates policy limits, numerical evidence, and multi-validator AI consensus.
    Persists decision and proposal in contract storage.
    Returns: JSON string with decision, proposal_id, reasoning, and policy_version.
    """

@gl.public.view
def get_decision(self, proposal_id: str) -> str:
    """
    Returns stored adjudication decision JSON for a given proposal ID.
    """

@gl.public.view
def get_proposal(self, proposal_id: str) -> str:
    """
    Returns raw proposal JSON for a given proposal ID.
    """

@gl.public.view
def get_proposal_count(self) -> u64:
    """
    Returns total number of adjudicated proposals on-chain.
    """
```

---

## Execution Model

JINNI Agent maintains a strict separation of concerns between consensus adjudication and wallet execution:

* **GenLayer decision precedes Sepolia wallet execution.**
* **GenLayer adjudicates**: Evaluates policy adherence, evidence integrity, and AI consensus on Studionet.
* **Sepolia wallet executes**: Settles swaps on Ethereum Sepolia via MetaMask and `JinniDelegator.sol`.
* **GenLayer does NOT execute or settle Uniswap swaps directly.**

---

## Decision States

| Decision | Meaning | Execution Gate Action |
|---|---|---|
| `APPROVE` | Policy rules satisfied, evidence verified, AI consensus passed. | Cleared for execution (pending human confirmation). |
| `REJECT` | Policy exceeded, contract unverified, or consensus rejected. | **BLOCKED** from execution. |
| `DISPUTE` | DEX vs Oracle price divergence >5% or contradictory data. | **BLOCKED** from execution. |
| `INSUFFICIENT_DATA` | Mandatory evidence missing or unverified. | **BLOCKED** from execution. |

*Missing telemetry*: If the RPC node does not provide validator voting distributions or confidence scores, the UI truthfully displays `Unavailable`.

---

## Transaction States

GenLayer transaction lifecycle:
* `PENDING`: Transaction submitted to GenLayer mempool.
* `ACCEPTED`: Transaction accepted into round proposal.
* `FINALIZED`: Consensus round complete and state transition committed.
* `FAILED`: Transaction canceled or timed out.

**Crucial Distinction**: `transaction finality ≠ approval`. A transaction status of `FINALIZED` confirms only that the consensus round completed without errors; the substantive outcome (`APPROVE` vs `REJECT`) is read independently from `get_decision()`.

---

## Decision Audit Proof

Each adjudicated trade generates a **Decision Audit Proof** binding the complete lifecycle into an auditable record:
* **Proposal Parameters**: ID, action, asset, chain ID, and amount.
* **Policy Evaluation**: Policy version, individual check statuses, and failure reasons.
* **Evidence References**: Source names, verification statuses, and observed numerical values.
* **GenLayer Transaction Record**: Transaction hash, block status, and contract address.
* **Consensus Verdict**: Adjudication decision and consensus rationale.
* **Execution Record**: Sepolia transaction hash, timestamp, and execution status.
* **Audit Trail**: Timestamped event sequence from creation to settlement.

---

## Demo Scenarios

JINNI Agent provides four deterministic demo fixtures labeled as **`[DEMO FIXTURE]`**:

1. **Valid Trade (Approved)**: $5 LINK buy within thresholds with verified feeds. Evaluates to Policy `PASS`, GenLayer `APPROVE`, and enters `AWAITING_USER_CONFIRMATION`.
2. **Policy Violation (Rejected)**: $2,500 UNI trade exceeding the $500 ceiling. Evaluates to Policy `FAIL` and is immediately `BLOCKED`.
3. **Conflicting Oracle (Disputed)**: $260 WETH swap where DEX spot diverges 14% from reference oracle. Evaluates to GenLayer `DISPUTE` and is `BLOCKED`.
4. **Insufficient Evidence (Blocked)**: Trade with unverified contract and missing liquidity. Evaluates to `INSUFFICIENT_DATA` and is `BLOCKED`.

*Demo fixtures use distinct synthetic hashes (`0xd3m0_...`) and cannot trigger MetaMask transactions.*

---

## Security

* **Zero Private Key Exposure**: Private keys and seed phrases are never stored, logged, or requested.
* **Client-Side Wallet Execution**: Transactions are executed exclusively through the user's EIP-1193 MetaMask wallet.
* **Independent Adjudication**: AI agents cannot authorize their own transactions.
* **Conservative Default Posture**: Missing evidence is never assumed safe (`UNKNOWN` = `BLOCKED`).
* **Rate & Slippage Limiting**: Hard caps on single transactions and daily budgets.

---

## Tech Stack

* **Frontend**: Vite, React 18, TypeScript 5.6, TailwindCSS 3.4, viem 2.21, MetaMask, genlayer-js 1.1.8, Framer Motion, Lucide React.
* **Backend**: FastAPI, Uvicorn, SQLAlchemy, Web3.py, Pydantic V2, Python 3.12, Free AI Provider Adapter (Groq / Gemini / Ollama).
* **Smart Contracts**:
  * GenLayer Intelligent Contract: Python (`py-genlayer:latest`), GenVM on Studionet.
  * EVM Escrow Vault: Solidity 0.8.20 (`JinniDelegator.sol`) on Ethereum Sepolia.

---

## Local Development

### Prerequisites
* Node.js v18+ & `pnpm`
* Python 3.10+
* MetaMask browser extension configured for Ethereum Sepolia

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```
Backend runs at `http://localhost:8000` (API documentation at `/docs`).

### 2. Frontend Setup
```bash
cd frontend
pnpm install
pnpm run dev
```
Frontend runs at `http://localhost:5173`.

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
# GenLayer Intelligent Contract Network
GENLAYER_NETWORK=studionet
GENLAYER_CHAIN_ID=61999
GENLAYER_RPC=https://studio.genlayer.com/api
JINNI_AGENT_CONTRACT_ADDRESS=0xa54cF1bBCfe4456b6194658699aab540fBeF046c
GENLAYER_EXPLORER_BASE_URL=https://explorer-studio.genlayer.com

# Ethereum Sepolia Execution
SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia/...
DELEGATOR_CONTRACT_ADDRESS=0x5462D420CEf200c8704Db6b48BE9Db3A000A231C
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
LINK_ADDRESS=0x779877A7B0D9E8603169DdbD7836e478b4624789
UNI_ADDRESS=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984

# Off-Chain AI Provider (Free Cloud Tier: Google Gemini 3.8 Flash, Groq, or Local Ollama)
# Note: Off-chain AI strictly proposes actions. GenLayer independently adjudicates.
AI_PROVIDER=gemini
AI_API_KEY=your_free_gemini_api_key_here
AI_MODEL=gemini-3.8-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2

# Server Configuration
DATABASE_URL=sqlite:///./jinni.db
PORT=8000
```

---

## Project Structure

```
jinni-agent/
├── contracts/
│   ├── JinniAgentGuard.py        # GenLayer Intelligent Contract (Python)
│   ├── JinniDelegator.sol        # EVM Delegation & Vault Contract (Solidity)
│   └── deploy_genlayer.py        # GenLayer Deployment & Schema Validator
├── backend/
│   ├── agent_domain.py           # Typed domain models (Pydantic V2)
│   ├── agents.py                 # Wallet analysis & research agents
│   ├── ai_provider.py            # Free AI provider adapter (Groq / Gemini / Ollama)
│   ├── config.py                 # Application settings
│   ├── database.py               # SQLite / SQLAlchemy persistence
│   ├── demo_scenarios.py         # 4 deterministic demo fixtures
│   ├── execution_gate.py         # Separation of powers gatekeeper
│   ├── genlayer_bridge.js        # Node.js bridge to official genlayer-js SDK
│   ├── genlayer_service.py       # GenLayer RPC adapter & status poller
│   ├── main.py                   # FastAPI application & REST endpoints
│   ├── policy_engine.py          # Deterministic policy check engine
│   └── tests/
│       ├── test_agent_system.py  # 18 domain, policy, gate & telemetry unit tests
│       └── test_live_studionet_adjudication.py  # 7 live on-chain Studionet tests
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── DecisionProofView.tsx     # Decision Audit Proof inspector
    │   │   ├── DemoScenariosBar.tsx      # Sandbox scenario selector
    │   │   ├── Navbar.tsx                # Navigation & wallet status
    │   │   ├── ProposalDetailModal.tsx   # Detailed proposal & evidence modal
    │   │   └── TradeGuardPipeline.tsx    # 7-stage visual state machine
    │   ├── lib/
    │   │   ├── agentApi.ts               # REST API client for backend
    │   │   ├── genlayer.ts               # GenLayer client & telemetry formatters
    │   │   └── web3.ts                   # Viem / MetaMask Sepolia interactions
    │   ├── views/
    │   │   ├── ActivityView.tsx          # Real-time event log
    │   │   ├── AgentView.tsx             # AI trading agent dashboard
    │   │   ├── DecisionProofsView.tsx    # Decision proof certificate gallery
    │   │   ├── OverviewView.tsx          # High-level architecture & pipeline view
    │   │   ├── PoliciesView.tsx          # Policy engine rules editor
    │   │   ├── ProposalsView.tsx         # Proposal adjudication list
    │   │   ├── SettingsView.tsx          # Network & RPC configuration
    │   │   └── VaultView.tsx             # Sepolia DeFi vault & delegation
    │   └── App.tsx                       # Main application shell & routing
    ├── package.json
    └── index.html
```

---

## Testing

All tests are verified against active code and the live GenLayer Studionet RPC:

```bash
# 1. Run Core Domain, Policy & Gate Test Suite (18 tests)
python -m pytest backend/tests/test_agent_system.py -v

# 2. Run Live GenLayer Studionet Adjudication Suite (7 tests)
python -m pytest backend/tests/test_live_studionet_adjudication.py -v

# 3. Run Frontend Linter
pnpm --dir frontend run lint

# 4. Run Frontend Production Build
pnpm --dir frontend run build
```

### Verified Test Results
* **Core Backend Tests**: **24/24 passed** (including Policy Engine, Gate, Off-chain AI Provider & Offline Fallbacks)
* **Live Studionet Adjudication**: **7/7 passed** (Tx: `0xae013f22fbea2affccfd90ddca90c2ad65711001c9b090c3fb955402b31acb4b`)
* **Frontend Lint**: **0 errors, 0 warnings**
* **Frontend Build**: **Passed** (Vite production bundle compiled in 3.32s)

---

## Live Contract

* **Network**: GenLayer Studionet (Chain ID `61999`)
* **Contract Address**: [`0xa54cF1bBCfe4456b6194658699aab540fBeF046c`](https://explorer-studio.genlayer.com/address/0xa54cF1bBCfe4456b6194658699aab540fBeF046c)
* **RPC**: `https://studio.genlayer.com/api`
* **Explorer**: [https://explorer-studio.genlayer.com](https://explorer-studio.genlayer.com)

---

## Limitations

* **Execution Scope**: Active live wallet execution is supported exclusively on Ethereum Sepolia (`chainId: 11155111`). Multi-chain execution (Base, Arbitrum) is future roadmap scope.
* **Telemetry Reporting**: Detailed validator distributions are displayed only when returned by the node RPC receipt.
* **Demo Sandbox**: Pre-seeded demo fixtures are clearly badged as simulations and use mock transaction hashes (`0xd3m0_...`) to ensure full transparency.

---

## Hackathon Positioning

* **Competition**: [GenLayer Agent Tank Hackathon](https://portal.genlayer.foundation/agent-tank/hackathon)
* **Track**: **Agentic Commerce Infrastructure**
* **Submission Role**: Decentralized trust-boundary and adjudication layer for autonomous economic agents.

---

## Future Roadmap

* [ ] Multi-agent cross-chain negotiation and escrow contracts on GenLayer.
* [ ] Automated fallback arbitration when consensus returns `DISPUTE`.
* [ ] Native ERC-7715 advanced permission delegation integration.
* [ ] Zero-knowledge proof verification across EVM rollups.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
