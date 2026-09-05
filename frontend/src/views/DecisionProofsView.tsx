import React, { useState } from 'react';
import { Award, Search, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import type { DecisionProof } from '../types/agent';
import { DecisionProofView } from '../components/DecisionProofView';
import { getDecisionBadgeProps } from '../lib/genlayer';

interface DecisionProofsViewProps {
  proofs: DecisionProof[];
  loading: boolean;
  onSelectScenario?: (scenarioId: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const DecisionProofsView: React.FC<DecisionProofsViewProps> = ({ 
  proofs, 
  loading,
  onSelectScenario,
  onNavigateTab 
}) => {
  const [selectedProof, setSelectedProof] = useState<DecisionProof | null>(() => 
    proofs.length > 0 ? proofs[0] : null
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Keep selected proof in sync if proofs change
  React.useEffect(() => {
    if (!selectedProof && proofs.length > 0) {
      setSelectedProof(proofs[0]);
    }
  }, [proofs, selectedProof]);

  const filteredProofs = proofs.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.proposalId.toLowerCase().includes(q) ||
      p.action.toLowerCase().includes(q) ||
      (p.asset || '').toLowerCase().includes(q) ||
      p.finalDecision.toLowerCase().includes(q)
    );
  });

  const liveProofsCount = proofs.filter(p => !p.proposalId.startsWith('demo-') && !p.genlayerTxHash?.startsWith('0xd3m0')).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Decision Proofs Explorer
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Verifiable records of intent, evidence, policy outcomes, and GenLayer contract adjudication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-gray-300">
            {proofs.length} TOTAL PROOFS
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300">
            {liveProofsCount} LIVE RECORDED
          </span>
        </div>
      </div>

      {/* Main Grid: List on Left (4 cols), Inspection Card on Right (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Proofs Selection List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search proofs by ID, token, action..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[var(--accent)] outline-none"
            />
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProofs.length > 0 ? (
              filteredProofs.map((p) => {
                const isSelected = selectedProof?.proposalId === p.proposalId;
                const isDemo = p.proposalId.startsWith('demo-') || (p.genlayerTxHash?.startsWith('0xd3m0') ?? false);
                const badge = getDecisionBadgeProps(p.finalDecision, isDemo, !isDemo && Boolean(p.genlayerTxHash));

                return (
                  <button
                    key={p.proposalId}
                    onClick={() => setSelectedProof(p)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white/10 border-white/30 shadow-md'
                        : 'bg-white/[0.02] hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-white truncate max-w-[140px]">
                        {p.proposalId}
                      </span>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}>
                        {p.finalDecision}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-200 truncate">{p.action}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                      <span>${p.amountUsd || '-'}</span>
                      {isDemo ? (
                        <span className="text-amber-400/80 font-mono">Fixture</span>
                      ) : (
                        <span className="text-emerald-400/80 font-mono">Live</span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center space-y-3">
                <p className="text-xs text-gray-400">
                  {loading ? "Loading decision proofs..." : "0 live proofs recorded"}
                </p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Decision proofs are generated when proposals complete evaluation. Load a demo scenario to inspect a working proof structure.
                </p>
                {onSelectScenario && (
                  <button
                    onClick={() => onSelectScenario('demo-safe-001')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[11px] font-bold text-white transition-all shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Load Demo Safe Proof</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Proof Inspection Detail (8 cols) */}
        <div className="lg:col-span-8">
          {selectedProof ? (
            <DecisionProofView proof={selectedProof} />
          ) : (
            <div className="p-12 rounded-3xl bg-black/40 border border-white/10 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Award className="w-12 h-12 text-gray-600 mb-4" />
              <h4 className="text-base font-bold text-white font-display mb-1">
                {proofs.length === 0 ? "0 Live Proofs Recorded" : "No Proof Selected"}
              </h4>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                Decision proofs record verifiable execution traces with evidence items, policy results, and contract adjudication outcomes.
              </p>
              <div className="flex items-center gap-2">
                {onSelectScenario && (
                  <button
                    onClick={() => onSelectScenario('demo-safe-001')}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/15 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Inspect Demo Safe Proof</span>
                  </button>
                )}
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('agent')}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <span>Create Proposal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
