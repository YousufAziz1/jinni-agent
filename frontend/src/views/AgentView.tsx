import React, { useState } from 'react';
import { 
  Brain, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle, 
  Zap,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
  Network
} from 'lucide-react';
import type { AgentProposal } from '../types/agent';
import type { RuntimeCapability } from '../lib/runtimeCapability';
import { TradeGuardPipeline } from '../components/TradeGuardPipeline';
import { DemoScenariosBar } from '../components/DemoScenariosBar';
import { RuntimeCapabilityBar } from '../components/RuntimeCapabilityBar';
import { switchToSepolia } from '../lib/web3';

interface AgentViewProps {
  proposals: AgentProposal[];
  activeProposal: AgentProposal | null;
  capability: RuntimeCapability;
  scenarioLoadingState?: "IDLE" | "LOADING_SCENARIO" | "LOADED" | "LOAD_ERROR";
  scenarioError?: string | null;
  onSelectProposal: (proposal: AgentProposal) => void;
  onCreateProposal: (params: {
    actionType: string;
    asset: string;
    amount: string;
    amountUsd: string;
    slippage: string;
    route: string;
    agentRationale: string;
  }) => Promise<void>;
  onSubmitToGenLayer: (proposalId: string) => Promise<void>;
  onConfirmExecution: (proposalId: string) => Promise<void>;
  onSelectScenario: (scenarioId: string) => void;
  onRetryScenario?: () => void;
  onConnectWallet?: () => void;
  loading: boolean;
  submitting: boolean;
  confirming: boolean;
}

export const AgentView: React.FC<AgentViewProps> = ({
  proposals,
  activeProposal,
  capability,
  scenarioLoadingState = "IDLE",
  scenarioError = null,
  onSelectProposal,
  onCreateProposal,
  onSubmitToGenLayer,
  onConfirmExecution,
  onSelectScenario,
  onRetryScenario,
  onConnectWallet,
  loading,
  submitting,
  confirming
}) => {
  // Form State for new proposal
  const [actionType, setActionType] = useState<string>('BUY');
  const [asset, setAsset] = useState<string>('LINK');
  const [amount, setAmount] = useState<string>('1.0');
  const [amountUsd, setAmountUsd] = useState<string>('15.0');
  const [slippage, setSlippage] = useState<string>('0.5%');
  const [route, setRoute] = useState<string>('Uniswap V3 (USDC -> LINK)');
  const [rationale, setRationale] = useState<string>(
    'Technical indicators show 1-hour consolidation with RSI 44 above major support. Low volume breakout potential.'
  );

  // Agent Controls State
  const [agentActive, setAgentActive] = useState<boolean>(true);
  const [guardEnabled, setGuardEnabled] = useState<boolean>(true);
  const [humanConfirmRequired, setHumanConfirmRequired] = useState<boolean>(true);

  const handleAssetChange = (newAsset: string) => {
    setAsset(newAsset);
    if (newAsset === 'LINK') {
      setAmount('1.0');
      setAmountUsd('15.0');
      setRoute('Uniswap V3 (USDC -> LINK)');
    } else if (newAsset === 'UNI') {
      setAmount('2.0');
      setAmountUsd('14.0');
      setRoute('Uniswap V3 (USDC -> UNI)');
    } else if (newAsset === 'WETH') {
      setAmount('0.005');
      setAmountUsd('17.5');
      setRoute('Uniswap V3 (USDC -> WETH)');
    } else {
      setAmount('10.0');
      setAmountUsd('10.0');
      setRoute('Direct USDC Pool');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateProposal({
      actionType,
      asset,
      amount,
      amountUsd,
      slippage,
      route,
      agentRationale: rationale
    });
  };

  const isDemo = activeProposal?.isDemo ?? false;
  const isSepolia = capability.walletConnected && capability.walletChainId === capability.expectedChainId;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Live Capability Strip */}
      <RuntimeCapabilityBar 
        capability={capability} 
        onConnectWallet={onConnectWallet} 
      />

      {/* Scenario Error Notification with Retry */}
      {scenarioLoadingState === "LOAD_ERROR" && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{scenarioError || "Failed to load demo scenario."}</span>
          </div>
          {onRetryScenario && (
            <button
              onClick={onRetryScenario}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white transition-all shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          )}
        </div>
      )}

      {/* Title & Agent Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            AI Proposal Studio & Guard
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Agents propose financial operations. Policy validates bounds. GenLayer provides independent adjudication.
          </p>
        </div>

        {/* Control Badges / Toggles */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
          <button
            onClick={() => setAgentActive(!agentActive)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              agentActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400 bg-white/5'
            }`}
          >
            Agent: {agentActive ? 'ACTIVE' : 'PAUSED'}
          </button>

          <button
            onClick={() => setGuardEnabled(!guardEnabled)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              guardEnabled ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 bg-white/5'
            }`}
          >
            GenLayer Guard: {guardEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setHumanConfirmRequired(!humanConfirmRequired)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              humanConfirmRequired ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400 bg-white/5'
            }`}
          >
            Human Confirm: {humanConfirmRequired ? 'REQUIRED' : 'AUTO'}
          </button>

          {/* Truthful Runtime Mode Pill */}
          <div 
            className={`px-3 py-1.5 rounded-xl font-bold border ${
              capability.executionMode === "LIVE_WALLET"
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : capability.executionMode === "UNAVAILABLE"
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-white/10 text-gray-300 border-white/10'
            }`}
            title="Runtime execution capability strictly conditional on verified wallet and network"
          >
            Mode: {capability.statusLabel}
          </div>
        </div>
      </div>

      {/* Demo Scenarios Bar */}
      <DemoScenariosBar 
        onSelectScenario={onSelectScenario} 
        loading={scenarioLoadingState === "LOADING_SCENARIO"} 
      />

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Proposal Creator Form (5 cols) */}
        <div className="lg:col-span-5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
            <Brain className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Synthesize Agent Proposal
            </h3>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Action Type</label>
              <select
                id="proposal-action-select"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-[var(--accent)] outline-none"
              >
                <option value="BUY" className="bg-neutral-900">BUY (Token Purchase)</option>
                <option value="SELL" className="bg-neutral-900">SELL (Token Liquidation)</option>
                <option value="SWAP" className="bg-neutral-900">SWAP (DEX Pool Exchange)</option>
                <option value="PAY" className="bg-neutral-900">PAY (Agent-to-Agent Payment)</option>
                <option value="SERVICE_PAYMENT" className="bg-neutral-900">SERVICE_PAYMENT (Indexing / Compute)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Target Asset</label>
                <select
                  id="proposal-asset-select"
                  value={asset}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-[var(--accent)] outline-none"
                >
                  <option value="LINK" className="bg-neutral-900">LINK</option>
                  <option value="USDC" className="bg-neutral-900">USDC</option>
                  <option value="UNI" className="bg-neutral-900">UNI</option>
                  <option value="WETH" className="bg-neutral-900">WETH</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Trade Amount</label>
                <input
                  id="proposal-amount-input"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-[var(--accent)] outline-none"
                  placeholder="e.g. 1.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Est. Value (USD)</label>
                <input
                  id="proposal-usd-input"
                  type="text"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-[var(--accent)] outline-none"
                  placeholder="e.g. 15.0"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Max Slippage</label>
                <input
                  id="proposal-slippage-input"
                  type="text"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-[var(--accent)] outline-none"
                  placeholder="e.g. 0.5%"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Execution Route</label>
              <input
                id="proposal-route-input"
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-[var(--accent)] outline-none"
                placeholder="e.g. Uniswap V3 (USDC -> LINK)"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px]">Agent Rationale</label>
              <textarea
                id="proposal-rationale-input"
                rows={3}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-[var(--accent)] outline-none resize-none leading-relaxed text-xs"
                placeholder="Explain the technical and risk justification for this action..."
              />
            </div>

            <button
              id="create-proposal-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:opacity-90 font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Evaluating Policy..." : "Propose & Evaluate Policy"}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Active Proposal Pipeline & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeProposal ? (
            <div className="space-y-6">
              
              {/* Pipeline Tracker */}
              <TradeGuardPipeline proposal={activeProposal} />

              {/* Action Card: Submit to GenLayer or Execute */}
              <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white uppercase text-xs tracking-wider">
                    Execution Gate & Adjudication Controls
                  </h4>
                  <div className="flex items-center gap-2">
                    {isDemo && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                        DEMO FIXTURE
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      activeProposal.state === 'READY_FOR_EXECUTION' || activeProposal.state === 'EXECUTED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : activeProposal.state === 'AWAITING_CONFIRMATION'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      {activeProposal.state}
                    </span>
                  </div>
                </div>

                {/* Submitting to GenLayer Button */}
                {activeProposal.policyResult === "PASS" && (!activeProposal.genlayer || activeProposal.genlayer.decision === "UNAVAILABLE") && (
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3">
                    <p className="text-purple-200">
                      Policy checks passed! Ready for decentralized adjudication by the GenLayer Intelligent Contract.
                    </p>
                    <button
                      id="submit-genlayer-btn"
                      disabled={submitting}
                      onClick={() => onSubmitToGenLayer(activeProposal.id)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-600/25 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? "Submitting to GenLayer RPC..." : "Submit to GenLayer Guard"}</span>
                    </button>
                  </div>
                )}

                {/* Human Confirmation / Execution Button */}
                {activeProposal.execution.status === "AWAITING_USER_CONFIRMATION" && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-start gap-2 text-emerald-200">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p>
                          Adjudication concluded with <strong>APPROVE</strong>. 
                          {isDemo ? (
                            <span className="block mt-0.5 text-amber-300">
                              (Demo fixture: clicking below simulates reviewer confirmation without sending a live Sepolia transaction).
                            </span>
                          ) : (
                            <span className="block mt-0.5">
                              Policy requires explicit human confirmation before executing on Sepolia.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {isDemo ? (
                      <button
                        id="execute-trade-btn"
                        disabled={confirming}
                        onClick={() => onConfirmExecution(activeProposal.id)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:opacity-95 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        <span>{confirming ? "Simulating..." : "SIMULATE DEMO CONFIRMATION (PREVIEW)"}</span>
                      </button>
                    ) : !capability.walletConnected ? (
                      <button
                        onClick={onConnectWallet}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-600 text-white font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>CONNECT WALLET TO EXECUTE ON SEPOLIA</span>
                      </button>
                    ) : !isSepolia ? (
                      <button
                        onClick={switchToSepolia}
                        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Network className="w-4 h-4" />
                        <span>SWITCH METAMASK TO SEPOLIA TO EXECUTE</span>
                      </button>
                    ) : (
                      <button
                        id="execute-trade-btn"
                        disabled={confirming}
                        onClick={() => onConfirmExecution(activeProposal.id)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-white font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{confirming ? "Signing via MetaMask..." : "CONFIRM EXECUTION ON SEPOLIA"}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Blocked Notification */}
                {activeProposal.execution.status === "BLOCKED" && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-1">
                    <span className="font-bold block text-rose-300">Action Strictly Blocked</span>
                    <p>
                      {activeProposal.policyFailureReason || 
                       activeProposal.genlayer?.reasoning || 
                       activeProposal.execution.error || 
                       "Execution gate blocked transaction due to safety or consensus rejection."}
                    </p>
                  </div>
                )}

                {/* Executed Receipt */}
                {activeProposal.execution.status === "EXECUTED" && (
                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-teal-300">
                      <CheckCircle className="w-4 h-4 text-teal-400" />
                      <span>
                        {isDemo ? "Demo Fixture Simulation Recorded" : "Transaction Executed & Settled on Sepolia"}
                      </span>
                    </div>
                    {activeProposal.execution.txHash && !isDemo && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${activeProposal.execution.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] truncate text-purple-300 hover:underline flex items-center gap-1"
                      >
                        <span>Sepolia Tx: {activeProposal.execution.txHash}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-black/40 border border-white/10 text-center flex flex-col items-center justify-center min-h-[350px]">
              <Brain className="w-12 h-12 text-gray-600 mb-4" />
              <h4 className="text-base font-bold text-white font-display mb-1">No Active Proposal Selected</h4>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                Use the proposal synthesizer on the left, or select one of the 4 demo scenarios above to begin.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => onSelectScenario('demo-safe-001')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-emerald-300 border border-emerald-500/30"
                >
                  Load 1. Safe Proposal
                </button>
                <button
                  onClick={() => onSelectScenario('demo-policy-violation-002')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-amber-300 border border-amber-500/30"
                >
                  Load 2. Policy Violation
                </button>
              </div>
            </div>
          )}

          {/* Quick List of Recent Proposals */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display mb-4">
              Stored Proposals ({proposals.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {proposals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProposal(p)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                    activeProposal?.id === p.id 
                      ? 'bg-white/10 border-white/30' 
                      : 'bg-white/[0.02] hover:bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-white">{p.actionType} {p.asset}</span>
                    <span className="text-[11px] text-gray-400 font-mono">${p.amountUsd}</span>
                    {p.isDemo && (
                      <span className="text-[9px] font-semibold text-amber-400/80 px-1.5 py-0.2 rounded bg-amber-500/10">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    p.execution.status === 'EXECUTED'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : p.execution.status === 'BLOCKED'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  }`}>
                    {p.execution.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
