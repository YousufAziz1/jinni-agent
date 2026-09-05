# 🧞 JINNI Agent — Autonomous Actions. Independent Judgment.

> 🏆 Built for the [GenLayer Agent Tank Hackathon](https://portal.genlayer.foundation/agent-tank/hackathon)  
> 💡 **Core Thesis:** *AI agents can propose. GenLayer decides.*

<div align="center">
  <img src="frontend/public/logo.jpg" alt="JINNI Agent Logo" width="120" style="border-radius: 20px; border: 2px solid #6c63ff;" />
  <h3>AI-Assisted Autonomous Commerce with Independent Adjudication</h3>
  <p>Enforcing separation of powers between AI intent, deterministic risk policies, decentralized GenLayer consensus, and user execution.</p>

  [![GenLayer Studionet](https://img.shields.io/badge/GenLayer-Studionet%20(61999)-purple?style=for-the-badge&logo=ethereum)](https://studio.genlayer.com/)
  [![Network Sepolia](https://img.shields.io/badge/Sepolia-Connected-blue?style=for-the-badge&logo=ethereum&color=454a75)](https://sepolia.etherscan.io/)
  [![Powered by Venice AI](https://img.shields.io/badge/Venice%20AI-Llama3.3--70b-orange?style=for-the-badge&logo=openai&color=e6643c)](https://venice.ai/)
  [![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&color=2e8c58)](./LICENSE)
</div>

---

## 🔗 Live Resources & Deployments

* **Live Web App**: [https://jinni-omega.vercel.app/](https://jinni-omega.vercel.app/)
* **Backend API**: `http://localhost:8000/api` (Local) / [https://jinni-6wfe.onrender.com/api/status](https://jinni-6wfe.onrender.com/api/status)
* **Demo Video**: [https://youtu.be/skp-PdfZ4Ko](https://youtu.be/skp-PdfZ4Ko)
* **Sepolia Escrow Vault**: [`0x5462D420CEf200c8704Db6b48BE9Db3A000A231C`](https://sepolia.etherscan.io/address/0x5462D420CEf200c8704Db6b48BE9Db3A000A231C)
* **GenLayer Intelligent Contract Code**: [`contracts/JinniAgentGuard.py`](./contracts/JinniAgentGuard.py)
* **GenLayer Deployer & Verifier**: [`contracts/deploy_genlayer.py`](./contracts/deploy_genlayer.py)

---

## 1. What JINNI Agent Is

**JINNI Agent** is an on-chain commerce and trading guard designed for the agentic economy. It prevents economic loss and malicious prompt manipulation by establishing an immutable rule:

> **An AI agent must not be allowed to approve its own economically meaningful action.**

In JINNI Agent, an AI agent may evaluate market indicators, analyze user wallet holdings, and formulate an actionable proposal with a concise user-facing rationale. However, the AI agent **cannot write the approval state**. Final approval is strictly adjudicated by an independent **GenLayer Intelligent Contract** or held in an isolated, configuration-blocked state when unconfigured.

---

## 2. Problem & Solution

### The Agent Alignment Dilemma
* Autonomous agents have access to private keys or smart account session delegations.
* Prompt injection, hallucinated liquidity, stale oracle feeds, and flash loan attacks can manipulate an AI model into authorizing catastrophic trades.
* Existing tools rely on centralized backends or client-only checks that can be bypassed.

### The JINNI Agent Solution
1. **Separation of Concerns**: AI proposes → Policy checks bounds → Evidence collected → GenLayer multi-validator consensus adjudicates → Execution gate controls fund release → User signs via MetaMask on Sepolia → Verifiable Decision Audit Proof recorded.
2. **Strict Truthfulness**: Missing telemetry remains `null`, `UNKNOWN`, or `UNAVAILABLE`. It is never synthesized into safe or approved results.
3. **Multi-Validator Equivalence Consensus**: Non-deterministic AI verification is wrapped in GenLayer's Equivalence Principle (`gl.eq_principle.strict_eq`), using `gl.nondet.exec_prompt` to ensure validators reach consensus on trade safety and rationale integrity.
4. **On-Chain Evidence Evaluation**: The intelligent contract computes real numeric price deviations between DEX spot reserves and reference oracles (flagging >5% discrepancy as `DISPUTE`), verifies destination contracts, and validates liquidity minimums.

---

## 3. Why GenLayer?

Traditional smart contracts (EVM) are deterministic and cannot understand natural language or evaluate agent rationales. Off-chain LLMs are centralized, single points of failure.

**GenLayer Intelligent Contracts** combine Python smart contract execution with decentralized AI validator consensus:
* **Natural Language Interpretation**: Contracts evaluate structured agent rationales and detect prompt injections or deviations from safety policies.
* **Equivalence Principle**: Multiple independent validators run non-deterministic prompts (`gl.nondet.exec_prompt`) and achieve consensus on outcomes (`APPROVE`, `REJECT`, `DISPUTE`, `INSUFFICIENT_DATA`).
* **Web & Oracle Integration**: Intelligent Contracts can inspect live web oracles and verify data independently.

---

## 4. System Architecture

```
User / Agent Intent
  ↓
JINNI Agent
  ↓
Proposal Engine (Formats typed proposal with verifiable evidence & rationale)
  ↓
Policy Engine (Server-side deterministic checks: PASS | FAIL | UNKNOWN)
  ↓
Evidence Layer (Verifiable price feeds, contract verification, pool liquidity)
  ↓
GenLayer Intelligent Contract (JinniAgentGuard.py on Studionet / Localnet)
  ↓
Independent Adjudication (Multi-validator AI consensus via Equivalence Principle)
  ↓
Decision (APPROVE | REJECT | DISPUTE | INSUFFICIENT_DATA)
  ↓
Execution Gate (READY | AWAITING_USER_CONFIRMATION | BLOCKED)
  ↓
Wallet / On-chain Action (EIP-1193 MetaMask execution on Sepolia)
  ↓
Decision Audit Proof (Verifiable execution receipt & lifecycle audit trail)
```

---

## 5. Core Platform Features

### 🛡️ GenLayer Trade Guard Pipeline
A visual 7-stage state machine that inspects every proposal in real-time:
1. **Proposed**: Action type, asset, amount, and rationale formulated.
2. **Policy Check**: Evaluates spending limits, slippage caps, allowed tokens, and Sepolia execution scope.
3. **Submitted to GenLayer**: Dispatched to `JinniAgentGuard.py` via GenLayer RPC.
4. **Consensus Transaction**: Monitors state (`PENDING` → `ACCEPTED` → `FINALIZED`).
5. **Final Decision**: Explicit verdict (`APPROVE` | `REJECT` | `DISPUTE` | `INSUFFICIENT_DATA`).
6. **Execution Gate**: Gated by policy and human confirmation threshold.
7. **Execution Result**: Settled on Sepolia via MetaMask/Viem or cleanly marked as `SIMULATION` / `PREVIEW`.

### 📊 Server-Side Policy Engine
Enforces strict boundaries before any transaction reaches the blockchain:
* **Max Single Transaction Value**: Ceiling limit (default `$500.00`).
* **Max Daily Cumulative Spend**: Rate-limiting limit (default `$1,000.00`).
* **Max Slippage Tolerance**: MEV protection (default `1.0%`).
* **Active Execution Chain**: Ethereum Sepolia (`chainId: 11155111`). Base and Base Sepolia are reserved for future roadmap expansion.
* **Allowed Tokens**: Whitelist (`USDC`, `LINK`, `UNI`, `WETH`).
* **Minimum Pool Liquidity**: Missing liquidity remains `UNKNOWN` and is never assumed safe.
* **Verified Contract Requirement**: Requires on-chain verified source code.

### 📜 Verifiable Decision Audit Proofs
Every finalized proposal produces an auditable Decision Proof:
* Proposal ID, Action, Asset, and Amount USD.
* Policy Version and Evaluation Result.
* Evidence Summary (total items, verified items, unavailable items).
* GenLayer Contract Address, Transaction Hash, and Transaction Status.
* Final Decision Verdict and Consensus Reasoning.
* Execution Transaction Hash and Timestamp.
* Complete lifecycle audit trail binding proposal, adjudication, and execution.
* Exportable as JSON certificate.

### 🏛️ Preserved JINNI DeFi Vault (Legacy)
100% backward-compatible preservation of original hackathon features:
* **Non-Custodial Escrow Vault**: Users deposit Sepolia ETH, USDC, LINK, or UNI.
* **MetaMask EIP-712 Session Signatures**: Delegated execution permissions.
* **Venice AI Reasoning Core**: Wallet analysis and token momentum research.
* **Sepolia Test Faucet**: Unlimited minting of Mock USDC, LINK, and UNI.
* **Automated Position Monitoring**: Real-time exit signal generation.

---

## 6. Deterministic Demo Scenarios

JINNI Agent provides 4 deterministically labeled demo fixtures to demonstrate each gate outcome:

| Scenario | Action | Policy Evaluation | GenLayer Adjudication | Execution Gate |
| :--- | :--- | :--- | :--- | :--- |
| **1. Valid Trade (Approved)** | BUY $5 LINK | `PASS` | `APPROVE` | `AWAITING_USER_CONFIRMATION` (Requires human click to execute) |
| **2. Policy Violation** | BUY $2,500 UNI | `FAIL` (Exceeds $500 max) | Bypassed | `BLOCKED` (Exceeds trade ceiling) |
| **3. Conflicting Oracle** | SWAP $260 WETH | `PASS` | `DISPUTE` (14% price gap) | `BLOCKED` (Flagged as oracle manipulation risk) |
| **4. Insufficient Evidence** | SWAP $50 MEME | `UNKNOWN` (Oracle missing) | `INSUFFICIENT_DATA` | `BLOCKED` (Data missing, never assumed safe) |

*Demo fixtures are visibly marked with `[DEMO FIXTURE]` banners and synthetic `0xd3m0_...` transaction hashes to guarantee zero ambiguity with live on-chain operations.*

---

## 7. Tech Stack

* **Intelligent Contract**: Python (`py-genlayer:latest`), GenLayer VM (GenVM), `gl.nondet.exec_prompt`, `gl.eq_principle.strict_eq`.
* **Frontend**: React 18, Vite 5, TypeScript 5.6, TailwindCSS 3.4, Viem 2.52, Lucide React, Framer Motion.
* **Backend**: FastAPI, Uvicorn, SQLAlchemy, Web3.py, Pydantic V2, Requests.
* **AI Reasoning**: Venice AI (`llama-3.3-70b`) & GenLayer Equivalence Principle AI validators.
* **Smart Contracts (EVM)**: Solidity 0.8.20 (`JinniDelegator.sol`), Sepolia Uniswap V3.

---

## 8. Local Development & Installation

### Prerequisites
* **Node.js v18+** & `pnpm` (or `npm`)
* **Python 3.10+**
* **MetaMask browser extension** (Sepolia network)

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest tests/test_agent_system.py -v
python main.py
```
Backend runs at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
pnpm install
npm run build
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 9. Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `GENLAYER_NETWORK` | GenLayer network identifier | `studionet` |
| `GENLAYER_CHAIN_ID` | GenLayer network chain ID | `61999` |
| `GENLAYER_RPC` | GenLayer JSON-RPC endpoint | `https://studio.genlayer.com/api` |
| `JINNI_AGENT_CONTRACT_ADDRESS` | Deployed `JinniAgentGuard` contract | *(Leave blank for isolated adapter mode)* |
| `GENLAYER_EXPLORER_BASE_URL` | GenLayer Explorer URL | `https://explorer-studio.genlayer.com` |
| `SEPOLIA_RPC_URL` | Ethereum Sepolia RPC URL | `https://rpc.ankr.com/eth_sepolia/...` |
| `DELEGATOR_CONTRACT_ADDRESS` | Deployed JinniDelegator on Sepolia | `0x5462D420CEf200c8704Db6b48BE9Db3A000A231C` |
| `VENICE_API_KEY` | Venice AI API Key (optional) | `your_venice_api_key` |
| `DATABASE_URL` | SQLAlchemy Database URI | `sqlite:///./jinni.db` |
| `PORT` | Backend server port | `8000` |

---

## 10. Security & Non-Negotiable Guarantees

1. **Zero Private Key Exposure**: Private keys and seed phrases are never stored, logged, or requested. All execution uses connected EIP-1193 MetaMask wallets.
2. **No Data Fabrication**: Validator votes, consensus percentages, confidence metrics, and round counts are never fabricated. If telemetry is not returned by the GenLayer receipt, it displays `Unavailable` or `Not returned by GenLayer`.
3. **Execution Gate Immutability**: No AI agent output can directly invoke the execution gate. Transactions require policy clearance and GenLayer approval.
4. **Separation of Finality from Decision**: A transaction status of `FINALIZED` signifies only that consensus execution succeeded; the adjudication decision (`APPROVE`, `REJECT`, `DISPUTE`, `INSUFFICIENT_DATA`) is inspected independently.

---

## 11. Known Limitations & Hackathon Status

* **GenLayer Deployment**: When live GenLayer deployment credentials or local simulators are absent, the application operates in **isolated adapter mode** (`CONFIGURATION_BLOCKED`). The contract code ([`contracts/JinniAgentGuard.py`](./contracts/JinniAgentGuard.py)) and deployer ([`contracts/deploy_genlayer.py`](./contracts/deploy_genlayer.py)) are fully implemented and verified against GenLayer specifications.
* **Sepolia Testnet**: Test transactions execute against Sepolia Uniswap V3 mock pairs.
* **Chain Support Scope**: Active wallet execution is implemented on Ethereum Sepolia (11155111). Support for other L2s (Base, Arbitrum) is part of the future roadmap.

---

## 12. Roadmap

* [ ] Multi-agent negotiation and cross-agent service payment escrow on GenLayer.
* [ ] Automated fallback arbitration when GenLayer consensus returns `DISPUTE`.
* [ ] Zero-knowledge proof generation for decision verification across EVM rollups.
* [ ] Native GenLayer ERC-7715 session account delegation support.
