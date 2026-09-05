import React, { useState } from 'react';
import { Search, Clock, ExternalLink } from 'lucide-react';
import type { ActivityLogItem } from '../lib/agentApi';

interface ActivityViewProps {
  logs: ActivityLogItem[];
  loading: boolean;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ logs, loading }) => {
  const [filterAgent, setFilterAgent] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const agents = ['ALL', 'AI Agent', 'Guard', 'GenLayer', 'Execution', 'Wallet', 'Monitoring'];

  const filteredLogs = logs.filter((log) => {
    if (filterAgent !== 'ALL' && log.agent !== filterAgent) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.tx_hash || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Agent Activity & Audit Logs
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Real-time event feed of all autonomous operations, policy checks, and adjudication events.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
          {agents.map((ag) => (
            <button
              key={ag}
              onClick={() => setFilterAgent(ag)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterAgent === ag ? 'bg-[var(--accent)] text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              {ag}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search activity events by action, details, or tx hash..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:border-[var(--accent)] outline-none"
        />
      </div>

      {/* Activity Timeline List */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-3">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            let agentBadge = "bg-white/10 text-gray-300 border-white/10";
            if (log.agent === "GenLayer") agentBadge = "bg-purple-500/20 text-purple-300 border-purple-500/30";
            else if (log.agent === "Guard") agentBadge = "bg-blue-500/20 text-blue-300 border-blue-500/30";
            else if (log.agent === "Execution") agentBadge = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

            return (
              <div 
                key={log.id} 
                className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${agentBadge}`}>
                        {log.agent}
                      </span>
                      <span className="font-bold text-white text-xs">{log.action}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{log.details}</p>
                    {log.tx_hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${log.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] text-purple-400 hover:underline flex items-center gap-1 mt-1"
                      >
                        <span>Tx: {log.tx_hash.slice(0, 16)}...</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono shrink-0 sm:self-center">
                  <Clock className="w-3 h-3" />
                  <span>{log.timestamp}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-gray-500 italic text-xs">
            {loading ? "Loading activity logs..." : "No activity events match your criteria."}
          </div>
        )}
      </div>

    </div>
  );
};
