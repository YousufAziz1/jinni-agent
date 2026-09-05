import React from 'react';
import { 
  Brain, 
  Award, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Sparkles,
  Zap,
  Cpu,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import type { AgentProposal, DecisionProof } from '../types/agent';
import type { RuntimeCapability } from '../lib/runtimeCapability';
import { DemoScenariosBar } from '../components/DemoScenariosBar';
import { TradeGuardPipeline } from '../components/TradeGuardPipeline';
import { RuntimeCapabilityBar } from '../components/RuntimeCapabilityBar';

interface OverviewViewProps {
  proposals: AgentProposal[];
  proofs: DecisionProof[];
  capability: RuntimeCapability;
  onSelectProposal: (proposal: AgentProposal) => void;
  onNavigateTab: (tab: any) => void;
  onSelectScenario: (scenarioId: string) => void;
  onConnectWallet?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  proposals,
  proofs,
  capability,
  onSelectProposal,
  onNavigateTab,
  onSelectScenario,
  onConnectWallet
}) => {
  const totalCount = proposals.length;
  const approvedCount = proposals.filter(p => p.genlayer?.decision === 'APPROVE').length;
  const blockedCount = proposals.filter(p => p.execution.status === 'BLOCKED').length;
  const executedCount = proposals.filter(p => p.execution.status === 'EXECUTED' && !p.isDemo).length;

  const latestProposal = proposals[0] || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Live Runtime Capability Strip */}
      <RuntimeCapabilityBar 
        capability={capability} 
        onConnectWallet={onConnectWallet} 
      />

      {/* Hero Banner (Compact & High Impact — Primary Actions Above Fold) */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-white/[0.08] via-black/40 to-black/70 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent)]/15 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-purple-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Built for the GenLayer Agent Tank Hackathon</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mb-3 leading-tight">
            Autonomous actions.<br />
            <span className="bg-gradient-to-r from-[var(--accent)] via-purple-300 to-teal-300 bg-clip-text text-transparent">
              Independent judgment.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6 font-body">
            AI agents can propose high-frequency commerce and trading operations. 
            JINNI can submit proposals to a configured GenLayer Intelligent Contract. 
            Live adjudication status is shown only when returned by the configured integration. 
            No agent is permitted to self-authorize financial commitments.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* Primary CTA (Significantly Stronger) */}
            <button
              id="hero-launch-studio-btn"
              onClick={() => onNavigateTab('agent')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--accent)] via-purple-600 to-teal-500 hover:opacity-95 text-xs font-extrabold text-white shadow-xl shadow-[var(--accent)]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Brain className="w-4 h-4" />
              <span>Launch Proposal Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary CTA */}
            <button
              id="hero-inspect-proofs-btn"
              onClick={() => onNavigateTab('proofs')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-gray-200 hover:text-white transition-all"
            >
              <Award className="w-4 h-4 text-purple-400" />
              <span>Inspect Decision Proofs ({proofs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reviewer Demo Quickstart Guide Card */}
      <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Reviewer Demo Walkthrough & Verification Guide
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-gray-400">
            Click any scenario below to immediately load a complete deterministic fixture
          </span>
        </div>

        {/* 4-Step Review Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div 
            onClick={() => onSelectScenario('demo-safe-001')}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/10 cursor-pointer transition-all hover:border-emerald-500/40 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-emerald-400">1. Safe Proposal</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">PASS</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Safe size ($5.00) passes policy bounds and receives demo approval. Requires human confirmation before execution.
            </p>
            <div className="mt-2 text-[10px] font-bold text-[var(--accent)] group-hover:underline flex items-center gap-1">
              <span>Load Safe Scenario</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div 
            onClick={() => onSelectScenario('demo-policy-violation-002')}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/10 cursor-pointer transition-all hover:border-rose-500/40 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-400">2. Policy Violation</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">BLOCKED</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              $2,500 trade exceeds $500 ceiling. Strictly blocked at the policy gate before GenLayer submission.
            </p>
            <div className="mt-2 text-[10px] font-bold text-[var(--accent)] group-hover:underline flex items-center gap-1">
              <span>Load Policy Violation</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div 
            onClick={() => onSelectScenario('demo-insufficient-evidence-003')}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/10 cursor-pointer transition-all hover:border-purple-500/40 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-purple-400">3. Missing Evidence</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">UNKNOWN</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Missing oracle and pool depth data. Policy and adjudication mark as Insufficient Evidence. Execution blocked.
            </p>
            <div className="mt-2 text-[10px] font-bold text-[var(--accent)] group-hover:underline flex items-center gap-1">
              <span>Load Missing Evidence</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div 
            onClick={() => onSelectScenario('demo-genlayer-rejection-004')}
            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/10 cursor-pointer transition-all hover:border-rose-500/40 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-rose-400">4. GenLayer Rejection</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">REJECTED</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              8.5% slippage on DEX swap violates guard risk limits. Adjudication returns REJECT. Execution gate blocks.
            </p>
            <div className="mt-2 text-[10px] font-bold text-[var(--accent)] group-hover:underline flex items-center gap-1">
              <span>Load GenLayer Rejection</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Demo Scenarios Bar */}
      <DemoScenariosBar onSelectScenario={onSelectScenario} />

      {/* Key Metrics Grid (Truthfully Formatted) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Proposals</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-display">{totalCount}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Stored in local & backend repository</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Approved Decisions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">{approvedCount}</div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Live & fixture approvals recorded</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Safely Blocked</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-display">{blockedCount}</div>
          <span className="text-[11px] text-rose-400/80 mt-1 block">Policy or adjudication blocks</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Executed on Sepolia</span>
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-400 font-display">{executedCount}</div>
          <span className="text-[11px] text-teal-400/80 mt-1 block">
            {executedCount === 0 ? "0 live receipts verified" : "Confirmed on Sepolia"}
          </span>
        </div>
      </div>

      {/* "How to Verify" Transparency Panel */}
      <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 sm:p-6 shadow-xl text-xs space-y-3">
        <div className="flex items-center gap-2 text-white font-bold font-display">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span className="uppercase tracking-wider text-xs">How to Independently Verify</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">GenLayer Intelligent Contract</span>
              {capability.genlayerConfigured ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Studionet Active
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {capability.genlayerConfigured ? (
                <span>
                  Contract: <code className="text-purple-300 font-mono">{capability.genlayerContractAddress}</code> on GenLayer Studionet. Read adjudication decisions via <code className="text-gray-300 font-mono">get_decision(proposal_id)</code>.
                </span>
              ) : (
                <span>Deploy <code className="font-mono text-gray-300">contracts/JinniAgentGuard.py</code> on GenLayer Studio and set address in Settings.</span>
              )}
            </p>
            {capability.genlayerConfigured && (
              <a
                href={`https://studio.genlayer.com`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:underline pt-1"
              >
                <span>Open GenLayer Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Ethereum Sepolia Settlement</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Chain ID: 11155111
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Real execution receipts require an active MetaMask connection to Sepolia. Only transactions with confirmed receipts on Etherscan are tagged as Executed.
            </p>
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline pt-1"
            >
              <span>View Sepolia Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Featured Live Pipeline Snapshot */}
      {latestProposal && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <span>Latest Proposal Snapshot</span>
            </h3>
            <button
              onClick={() => onSelectProposal(latestProposal)}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <span>Inspect Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <TradeGuardPipeline proposal={latestProposal} />
        </div>
      )}

    </div>
  );
};
