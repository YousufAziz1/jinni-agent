import React, { useState } from 'react';
import { Search, Eye } from 'lucide-react';
import type { AgentProposal } from '../types/agent';
import { getDecisionBadgeProps } from '../lib/genlayer';

interface ProposalsViewProps {
  proposals: AgentProposal[];
  onSelectProposal: (proposal: AgentProposal) => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  onSelectProposal
}) => {
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'DEMO' | 'APPROVED' | 'BLOCKED' | 'EXECUTED'>('ALL');
  const [search, setSearch] = useState('');

  const liveCount = proposals.filter(p => !p.isDemo).length;
  const demoCount = proposals.filter(p => p.isDemo).length;

  const filtered = proposals.filter((p) => {
    if (filter === 'LIVE' && p.isDemo) return false;
    if (filter === 'DEMO' && !p.isDemo) return false;
    if (filter === 'APPROVED' && p.genlayer?.decision !== 'APPROVE') return false;
    if (filter === 'BLOCKED' && p.execution.status !== 'BLOCKED') return false;
    if (filter === 'EXECUTED' && p.execution.status !== 'EXECUTED') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = p.id.toLowerCase().includes(q);
      const matchAsset = (p.asset || '').toLowerCase().includes(q);
      const matchAction = p.actionType.toLowerCase().includes(q);
      return matchId || matchAsset || matchAction;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Agent Proposals Repository
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Complete audit trail of all AI-initiated operations and their multi-stage adjudication status.
          </p>
        </div>

        {/* Counters & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              {liveCount} LIVE
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {demoCount} DEMO FIXTURES
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
            {(['ALL', 'LIVE', 'DEMO', 'APPROVED', 'BLOCKED', 'EXECUTED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filter === f ? 'bg-[var(--accent)] text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter proposals by token, action, or proposal ID..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:border-[var(--accent)] outline-none"
        />
      </div>

      {/* Proposals List Table */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-white/5 text-[10px] uppercase font-bold text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-3.5">Proposal ID</th>
                <th className="px-5 py-3.5">Action & Asset</th>
                <th className="px-5 py-3.5">Amount (USD)</th>
                <th className="px-5 py-3.5">Policy Result</th>
                <th className="px-5 py-3.5">GenLayer Adjudication</th>
                <th className="px-5 py-3.5">Execution Gate</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length > 0 ? (
                filtered.map((p) => {
                  const isLiveTx = !p.isDemo && Boolean(p.genlayer?.txHash);
                  const decisionBadge = p.genlayer?.decision 
                    ? getDecisionBadgeProps(p.genlayer.decision, p.isDemo, isLiveTx)
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 font-mono font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{p.id}</span>
                          {p.isDemo ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              DEMO
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              LIVE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-white">
                        {p.actionType} <span className="text-[var(--accent)]">{p.asset}</span>
                      </td>

                      <td className="px-5 py-4 font-mono font-medium text-emerald-400">
                        ${p.amountUsd || '-'}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.policyResult === 'PASS' 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : p.policyResult === 'FAIL'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                          {p.policyResult}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {p.isDemo && decisionBadge ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${decisionBadge.bgClass} ${decisionBadge.textClass} ${decisionBadge.borderClass}`}>
                            {decisionBadge.label}
                          </span>
                        ) : isLiveTx && decisionBadge ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${decisionBadge.bgClass} ${decisionBadge.textClass} ${decisionBadge.borderClass}`}>
                            {p.genlayer?.decision}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                            NOT SUBMITTED
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.execution.status === 'EXECUTED'
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                            : p.execution.status === 'BLOCKED'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : p.execution.status === 'AWAITING_USER_CONFIRMATION'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}>
                          {p.execution.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => onSelectProposal(p)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 hover:text-white transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500 italic">
                    No proposals match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
