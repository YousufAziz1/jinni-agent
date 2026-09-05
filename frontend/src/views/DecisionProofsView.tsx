import React, { useState } from 'react';
import { Award, Search } from 'lucide-react';
import type { DecisionProof } from '../types/agent';
import { DecisionProofView } from '../components/DecisionProofView';
import { getDecisionBadgeProps } from '../lib/genlayer';

interface DecisionProofsViewProps {
  proofs: DecisionProof[];
  loading: boolean;
}

export const DecisionProofsView: React.FC<DecisionProofsViewProps> = ({ proofs, loading }) => {
  const [selectedProof, setSelectedProof] = useState<DecisionProof | null>(
    proofs.length > 0 ? proofs[0] : null
  );
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Decision Proofs Explorer
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Verifiable, reproducible records of intent, evidence, policy results, and GenLayer multi-validator consensus.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300">
          {proofs.length} PROOFS RECORDED
        </span>
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
              placeholder="Search proofs by ID, action, token..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[var(--accent)] outline-none"
            />
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProofs.length > 0 ? (
              filteredProofs.map((p) => {
                const isSelected = selectedProof?.proposalId === p.proposalId;
                const badge = getDecisionBadgeProps(p.finalDecision);

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
                      <span className="font-mono text-[11px] font-bold text-white">{p.proposalId}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}>
                        {p.finalDecision}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-200 truncate">{p.action}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Amount: ${p.amountUsd || '-'} | Policy: {p.policyResult}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 italic">
                {loading ? "Loading decision proofs..." : "No proofs recorded yet."}
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
              <h4 className="text-base font-bold text-white font-display mb-1">No Proof Selected</h4>
              <p className="text-xs text-gray-400 max-w-sm">
                Select a decision proof from the list on the left to inspect its cryptographic verification data.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
