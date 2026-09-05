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
  Shield
} from 'lucide-react';
import type { AgentProposal, DecisionProof } from '../types/agent';
import { DemoScenariosBar } from '../components/DemoScenariosBar';
import { TradeGuardPipeline } from '../components/TradeGuardPipeline';

interface OverviewViewProps {
  proposals: AgentProposal[];
  proofs: DecisionProof[];
  onSelectProposal: (proposal: AgentProposal) => void;
  onNavigateTab: (tab: any) => void;
  onSelectScenario: (scenarioId: string) => void;
  genlayerConfigured?: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  proposals,
  proofs,
  onSelectProposal,
  onNavigateTab,
  onSelectScenario
}) => {
  const totalCount = proposals.length;
  const approvedCount = proposals.filter(p => p.genlayer?.decision === 'APPROVE').length;
  const blockedCount = proposals.filter(p => p.execution.status === 'BLOCKED').length;
  const executedCount = proposals.filter(p => p.execution.status === 'EXECUTED').length;

  const latestProposal = proposals[0] || null;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-white/[0.08] to-black/60 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent)]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-purple-200 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Built for the GenLayer Agent Tank Hackathon</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-4 leading-tight">
            Autonomous actions.<br />
            <span className="bg-gradient-to-r from-[var(--accent)] via-purple-300 to-teal-300 bg-clip-text text-transparent">
              Independent judgment.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-6 font-body">
            AI agents can propose high-frequency commerce and trading operations. 
            <strong className="text-white font-semibold"> GenLayer decides</strong> via multi-validator Intelligent Contract consensus. 
            No agent is permitted to approve its own financial commitments.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('agent')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:opacity-95 text-xs font-bold text-white shadow-xl shadow-[var(--accent)]/25 transition-all"
            >
              <Brain className="w-4 h-4" />
              <span>Launch Proposal Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab('proofs')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition-all"
            >
              <Award className="w-4 h-4 text-purple-400" />
              <span>Inspect Decision Proofs ({proofs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Scenarios Bar */}
      <DemoScenariosBar onSelectScenario={onSelectScenario} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Proposals</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-display">{totalCount}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Recorded agent requests</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">GenLayer Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">{approvedCount}</div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Independent consensus cleared</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Safely Blocked</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-display">{blockedCount}</div>
          <span className="text-[11px] text-rose-400/80 mt-1 block">Policy or consensus violations</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Confirmed Executed</span>
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-400 font-display">{executedCount}</div>
          <span className="text-[11px] text-teal-400/80 mt-1 block">Settled on Sepolia</span>
        </div>
      </div>

      {/* Featured Live Pipeline */}
      {latestProposal && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <span>Active Adjudication Snapshot</span>
            </h3>
            <button
              onClick={() => onSelectProposal(latestProposal)}
              className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <span>Inspect Detail</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <TradeGuardPipeline proposal={latestProposal} />
        </div>
      )}

      {/* Architecture Flow Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>The Separation of Powers Architecture</span>
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          How JINNI Agent prevents rogue AI spending through independent policy enforcement and GenLayer intelligent adjudication.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">1</div>
            <h4 className="font-bold text-white mb-1">AI Agent Proposes</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Agent evaluates wallet, liquidity, and token metrics to generate a structured trade proposal and user-facing rationale.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">2</div>
            <h4 className="font-bold text-white mb-1">Policy Engine Checks</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Deterministic limits (max spend, allowed tokens, max slippage, verified contracts) are strictly validated server-side.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">3</div>
            <h4 className="font-bold text-white mb-1">GenLayer Adjudicates</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              The Intelligent Contract runs decentralized multi-validator consensus using the Equivalence Principle to reach an independent verdict.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">4</div>
            <h4 className="font-bold text-white mb-1">Gate & Audit Proof</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Only approved actions clear the execution gate. User confirms execution on Sepolia and generates an auditable Decision Audit Proof.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
