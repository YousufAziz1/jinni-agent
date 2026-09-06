import React from 'react';
import { 
  X, 
  Shield, 
  CheckCircle, 
  Cpu, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import type { AgentProposal } from '../types/agent';
import { getDecisionBadgeProps, formatTelemetryField } from '../lib/genlayer';

interface ProposalDetailModalProps {
  proposal: AgentProposal | null;
  onClose: () => void;
  onConfirmExecution?: (proposalId: string) => void;
  confirming?: boolean;
}

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  proposal,
  onClose,
  onConfirmExecution,
  confirming = false
}) => {
  if (!proposal) return null;

  const isLiveTx = !proposal.isDemo && Boolean(proposal.genlayer?.txHash);
  const decisionBadge = proposal.genlayer?.decision 
    ? getDecisionBadgeProps(proposal.genlayer.decision, proposal.isDemo, isLiveTx)
    : null;

  const telemetry = proposal.genlayer?.telemetry;
  const hasRealTelemetry = Boolean(
    telemetry && 
    (telemetry.validatorCount != null || telemetry.consensusPercentage != null)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-display">Proposal Details</h3>
                {proposal.isDemo ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    DEMO FIXTURE — NOT A LIVE TRANSACTION
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE PROPOSAL
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">ID: {proposal.id}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Warning Banner if Demo */}
        {proposal.isDemo && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                DEMO FIXTURE — NOT A LIVE TRANSACTION
              </span>
              This proposal is a deterministic reviewer fixture. Results are isolated from on-chain transactions and consensus telemetry is not fabricated.
            </div>
          </div>
        )}

        {/* Transaction Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Action</span>
            <p className="text-sm font-bold text-white mt-0.5">{proposal.actionType}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Asset & Amount</span>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">{proposal.amount || '-'} {proposal.asset || '-'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Est. USD Value</span>
            <p className="text-sm font-bold text-white mt-0.5">${proposal.amountUsd || '-'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Max Slippage</span>
            <p className="text-sm font-bold text-white mt-0.5">{proposal.slippage || '0.5%'}</p>
          </div>
        </div>

        {/* Agent Rationale */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Agent Rationale</h4>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs leading-relaxed text-gray-300">
            {proposal.agentRationale || "No explicit agent rationale recorded."}
          </div>
        </div>

        {/* Evidence Breakdown */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Verifiable Evidence ({proposal.evidence?.length || 0} items)
          </h4>
          <div className="space-y-2">
            {proposal.evidence && proposal.evidence.length > 0 ? (
              proposal.evidence.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{ev.type}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{ev.source}</span>
                    </div>
                    <p className="text-gray-400 text-[11px] mt-1">{ev.details || ev.value || 'Data provided'}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    ev.status === 'VERIFIED' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {ev.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No evidence items recorded for this proposal.</p>
            )}
          </div>
        </div>

        {/* GenLayer Adjudication & Telemetry */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            GenLayer Independent Adjudication
          </h4>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            {proposal.genlayer ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-white">Adjudication Decision</span>
                  </div>
                  {decisionBadge && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${decisionBadge.bgClass} ${decisionBadge.textClass} ${decisionBadge.borderClass}`}>
                      {decisionBadge.label}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  {proposal.genlayer.reasoning || "No reasoning returned by GenLayer contract."}
                </p>

                {/* Telemetry Status: strictly display only real fields if returned */}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Consensus Telemetry Status
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {hasRealTelemetry ? "Reported by node" : "TELEMETRY NOT RETURNED"}
                    </span>
                  </div>

                  {hasRealTelemetry ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">Validators</span>
                        <p className="font-semibold text-gray-300 mt-0.5">
                          {formatTelemetryField(telemetry?.validatorCount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">Consensus %</span>
                        <p className="font-semibold text-gray-300 mt-0.5">
                          {formatTelemetryField(telemetry?.consensusPercentage, '%')}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">Confidence</span>
                        <p className="font-semibold text-gray-300 mt-0.5">
                          {formatTelemetryField(telemetry?.confidence)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">Rounds</span>
                        <p className="font-semibold text-gray-300 mt-0.5">
                          {formatTelemetryField(telemetry?.rounds)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic">
                      Telemetry not returned by the current contract response. No simulated validator counts are fabricated.
                    </p>
                  )}
                </div>

                {proposal.genlayer.txHash && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                    <span className="font-mono text-[11px] truncate">
                      Tx: {proposal.genlayer.txHash} {proposal.isDemo && "(Demo Fixture)"}
                    </span>
                    <span className="text-purple-400 font-semibold">{proposal.genlayer.txStatus || 'Pending'}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Not yet submitted to GenLayer Intelligent Contract.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-gray-300 transition-colors"
          >
            Close
          </button>

          {proposal.execution.status === "AWAITING_USER_CONFIRMATION" && onConfirmExecution && (
            <button
              id="confirm-execution-btn"
              onClick={() => onConfirmExecution(proposal.id)}
              disabled={confirming}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {confirming
                  ? "Processing..."
                  : proposal.isDemo
                  ? "CONFIRM DEMO EXECUTION (PREVIEW)"
                  : "CONFIRM EXECUTION ON SEPOLIA"}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
