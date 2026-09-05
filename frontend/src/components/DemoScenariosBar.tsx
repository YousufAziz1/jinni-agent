import React from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

interface DemoScenariosBarProps {
  onSelectScenario: (scenarioId: string) => void;
  loading?: boolean;
}

export const DemoScenariosBar: React.FC<DemoScenariosBarProps> = ({
  onSelectScenario,
  loading = false
}) => {
  const scenarios = [
    {
      id: "demo-safe-001",
      title: "1. Safe Proposal",
      subtitle: "Passes Policy → GenLayer Approved",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      tagColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    },
    {
      id: "demo-policy-violation-002",
      title: "2. Policy Violation",
      subtitle: "$2,500 Trade exceeds $500 Limit → Blocked",
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      tagColor: "border-amber-500/30 bg-amber-500/10 text-amber-300"
    },
    {
      id: "demo-insufficient-evidence-003",
      title: "3. Insufficient Evidence",
      subtitle: "Oracle feed missing → Insufficient Data",
      icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
      tagColor: "border-purple-500/30 bg-purple-500/10 text-purple-300"
    },
    {
      id: "demo-genlayer-rejection-004",
      title: "4. GenLayer Rejection",
      subtitle: "8.5% slippage flagged by Consensus → Rejected",
      icon: <XCircle className="w-4 h-4 text-rose-400" />,
      tagColor: "border-rose-500/30 bg-rose-500/10 text-rose-300"
    }
  ];

  return (
    <div className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display">
            GenLayer Agent Tank Demo Scenarios
          </h4>
        </div>
        <span className="text-[10px] font-semibold text-gray-400">
          Deterministic review fixtures — clearly isolated from production logic
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            id={`demo-btn-${sc.id}`}
            disabled={loading}
            onClick={() => onSelectScenario(sc.id)}
            className="flex flex-col text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                {sc.title}
              </span>
              <span>{sc.icon}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">
              {sc.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
