import React, { useState } from 'react';
import { Award, Copy, Check, Download, Cpu, AlertTriangle } from 'lucide-react';
import type { DecisionProof } from '../types/agent';
import { getDecisionBadgeProps } from '../lib/genlayer';

interface DecisionProofViewProps {
  proof: DecisionProof;
}

export const DecisionProofView: React.FC<DecisionProofViewProps> = ({ proof }) => {
  const [copied, setCopied] = useState(false);
  const decisionBadge = getDecisionBadgeProps(proof.finalDecision);
  const isDemo = proof.proposalId.startsWith('demo-') || proof.genlayerTxHash?.startsWith('0xd3m0');

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision-proof-${proof.proposalId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Demo Fixture Warning Banner */}
      {isDemo && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">DEMO FIXTURE</span>
            This decision proof is a deterministic simulation for hackathon presentation and evaluation. It is isolated from live on-chain execution.
          </div>
        </div>
      )}

      {/* Proof Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white font-display">Decision Audit Proof</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-purple-300 border border-white/10">
                v{proof.policyVersion || '1.0.0'}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Proposal ID: {proof.proposalId} • Verifiable Execution Receipt
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
            title="Copy Proof JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
            title="Download Certificate"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Decision Status Hero */}
      <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-purple-400" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Adjudication Outcome</span>
            <p className="text-sm font-bold text-white">{proof.action}</p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${decisionBadge.bgClass} ${decisionBadge.textClass} ${decisionBadge.borderClass}`}>
          {decisionBadge.label}
        </span>
      </div>

      {/* Proof Properties Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-xs">
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Target Asset / Chain</span>
          <p className="font-semibold text-white mt-1">
            {proof.asset || 'Unavailable'} ({proof.chain || 'Sepolia (11155111)'})
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Amount / USD</span>
          <p className="font-semibold text-emerald-400 mt-1">
            ${proof.amountUsd || 'Unavailable'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Policy Result</span>
          <p className={`font-semibold mt-1 ${proof.policyResult === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {proof.policyResult} (Policy v{proof.policyVersion || '1.0.0'})
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Evidence Summary</span>
          <p className="font-semibold text-white mt-1">
            {proof.evidenceSummary.verifiedItems} Verified / {proof.evidenceSummary.totalItems} Total
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">GenLayer Contract</span>
          <p className="font-mono text-gray-300 mt-1 truncate">
            {proof.genlayerContract || 'NOT CONFIGURED'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">GenLayer Transaction</span>
          <p className="font-mono text-gray-300 mt-1 truncate">
            {proof.genlayerTxHash || 'Unavailable'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Consensus Status</span>
          <p className="font-semibold text-purple-300 mt-1">
            {proof.txStatus || 'Unavailable'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Adjudication Timestamp</span>
          <p className="text-gray-300 mt-1">
            {proof.decisionTimestamp || 'Unavailable'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-[10px] uppercase font-bold text-gray-400">Execution Status</span>
          <p className="font-semibold text-white mt-1">
            {proof.executionStatus} {proof.executionTxHash ? `(Tx: ${proof.executionTxHash.slice(0, 8)}...)` : ''}
          </p>
        </div>
      </div>

      {/* Decision Reasoning */}
      <div className="mb-6">
        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Contract Decision Rationale</span>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-gray-300 leading-relaxed font-mono">
          {proof.decisionReasoning || 'Unavailable'}
        </div>
      </div>

      {/* Audit Trail Timeline */}
      <div>
        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Lifecycle Audit Trail</span>
        <div className="space-y-2">
          {proof.auditTrail.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span className="font-bold text-white">{item.stage}</span>
                <span className="text-gray-400 truncate max-w-md">{item.details}</span>
              </div>
              <span className="text-gray-500 font-mono text-[10px] shrink-0">{item.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
