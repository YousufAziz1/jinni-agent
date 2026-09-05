import React, { useState, useEffect } from 'react';
import { Sliders, Save, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import type { PolicyRuleConfig } from '../types/agent';

interface PoliciesViewProps {
  policies: PolicyRuleConfig | null;
  onUpdatePolicy: (updated: Partial<PolicyRuleConfig>) => Promise<void>;
  saving: boolean;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({
  policies,
  onUpdatePolicy,
  saving
}) => {
  const [maxTxVal, setMaxTxVal] = useState<string>('500');
  const [maxDailySpend, setMaxDailySpend] = useState<string>('1000');
  const [maxSlippage, setMaxSlippage] = useState<string>('1.0');
  const [minLiquidity, setMinLiquidity] = useState<string>('10000');
  const [requireVerified, setRequireVerified] = useState<boolean>(true);
  const [requireGenLayer, setRequireGenLayer] = useState<boolean>(true);
  const [humanThreshold, setHumanThreshold] = useState<string>('0.0');

  useEffect(() => {
    if (policies) {
      setMaxTxVal(policies.maxTransactionValue.toString());
      setMaxDailySpend(policies.maxDailySpend.toString());
      setMaxSlippage(policies.maxSlippage.toString());
      setMinLiquidity(policies.minLiquidityUsd ? policies.minLiquidityUsd.toString() : '10000');
      setRequireVerified(policies.requireVerifiedContract);
      setRequireGenLayer(policies.requireGenLayerApproval);
      setHumanThreshold(policies.humanConfirmationThreshold.toString());
    }
  }, [policies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePolicy({
      maxTransactionValue: parseFloat(maxTxVal) || 500,
      maxDailySpend: parseFloat(maxDailySpend) || 1000,
      maxSlippage: parseFloat(maxSlippage) || 1.0,
      minLiquidityUsd: parseFloat(minLiquidity) || 10000,
      requireVerifiedContract: requireVerified,
      requireGenLayerApproval: requireGenLayer,
      humanConfirmationThreshold: parseFloat(humanThreshold) || 0.0
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
          Agent Policy Engine
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Configure deterministic risk limits and guardrails enforced prior to GenLayer submission and wallet execution.
        </p>
      </div>

      {/* Network Execution Scope Truthfulness Card */}
      <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <Globe className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-bold text-white font-display">Target Network & Chain Execution Scope</h3>
            <p className="text-xs text-gray-400">Strict truthfulness: Only chains with live verified execution adapters are enabled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white text-xs block">Ethereum Sepolia (Chain ID: 11155111)</span>
              <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block mt-0.5">Active Execution Adapter</span>
              <p className="text-[11px] text-gray-400 mt-1">
                MetaMask / Viem client-side swap execution supported when connected to Sepolia.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white text-xs block">Base / Arbitrum / Mainnet</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">Unsupported / Roadmap</span>
              <p className="text-[11px] text-gray-500 mt-1">
                Reserved for future multi-chain account abstraction. Transactions on these networks are blocked.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Active Policy Configuration</h3>
              <p className="text-xs text-gray-400">Version {policies?.version || '1.0.0'}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            POLICY ENGINE ACTIVE
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                Max Single Transaction Value (USD)
              </label>
              <input
                type="number"
                value={maxTxVal}
                onChange={(e) => setMaxTxVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-[var(--accent)] outline-none text-xs"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Trades exceeding this ceiling are automatically blocked at the policy check stage.
              </span>
            </div>

            <div>
              <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                Max Slippage Tolerance (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={maxSlippage}
                onChange={(e) => setMaxSlippage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-[var(--accent)] outline-none text-xs"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Protects against sandwich attacks and abnormal DEX pool slippage.
              </span>
            </div>

            <div>
              <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                Max 24h Cumulative Spend (USD)
              </label>
              <input
                type="number"
                value={maxDailySpend}
                onChange={(e) => setMaxDailySpend(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-[var(--accent)] outline-none text-xs"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Prevents infinite draining loops or runaway automated transactions.
              </span>
            </div>

            <div>
              <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                Minimum Pool Liquidity (USD)
              </label>
              <input
                type="number"
                value={minLiquidity}
                onChange={(e) => setMinLiquidity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-[var(--accent)] outline-none text-xs"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Missing liquidity is never assumed safe. Missing data evaluates to UNKNOWN.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <div>
                <span className="font-bold text-white text-xs block">Require Verified Smart Contract</span>
                <span className="text-[11px] text-gray-400">Rejects tokens with unverified source code or missing contract ABI.</span>
              </div>
              <input
                type="checkbox"
                checked={requireVerified}
                onChange={(e) => setRequireVerified(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <div>
                <span className="font-bold text-white text-xs block">Require GenLayer Independent Adjudication</span>
                <span className="text-[11px] text-gray-400">All proposals must achieve GenLayer multi-validator consensus approval before execution.</span>
              </div>
              <input
                type="checkbox"
                checked={requireGenLayer}
                onChange={(e) => setRequireGenLayer(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button
              id="save-policy-btn"
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:opacity-95 font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all text-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Policy..." : "Update Policy Rules"}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
