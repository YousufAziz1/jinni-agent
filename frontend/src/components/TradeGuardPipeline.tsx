import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Send, 
  Cpu, 
  Scale, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle
} from 'lucide-react';
import type { AgentProposal } from '../types/agent';

interface TradeGuardPipelineProps {
  proposal: AgentProposal | null;
}

export const TradeGuardPipeline: React.FC<TradeGuardPipelineProps> = ({ proposal }) => {
  if (!proposal) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
        <p className="text-sm text-gray-400">Select or create an agent proposal to inspect the GenLayer Trade Guard pipeline.</p>
      </div>
    );
  }

  // Determine stage states: "completed" | "active" | "blocked" | "pending"
  // Stage 1: Proposed
  const stage1Status = "completed";

  // Stage 2: Policy Check
  let stage2Status: "completed" | "active" | "blocked" | "pending" = "pending";
  if (proposal.policyResult === "PASS") stage2Status = "completed";
  else if (proposal.policyResult === "FAIL") stage2Status = "blocked";
  else if (proposal.state === "POLICY_CHECKING") stage2Status = "active";

  // Stage 3: Submitted to GenLayer
  let stage3Status: "completed" | "active" | "blocked" | "pending" = "pending";
  if (proposal.isDemo && proposal.genlayer) stage3Status = "completed"; // Demo fixture with genlayer block = simulated submission
  else if (proposal.genlayer && proposal.genlayer.txHash) stage3Status = "completed";
  else if (proposal.state === "SUBMITTING_TO_GENLAYER") stage3Status = "active";
  else if (stage2Status === "blocked") stage3Status = "blocked";

  // Stage 4: GenLayer Transaction Status
  let stage4Status: "completed" | "active" | "blocked" | "pending" = "pending";
  const genTxStatus = proposal.genlayer?.txStatus;
  if (proposal.isDemo && proposal.genlayer) {
    stage4Status = "completed"; // Demo fixture = simulation complete
  } else if (proposal.genlayer?.txHash) {
    if (genTxStatus === "FINALIZED" || genTxStatus === "ACCEPTED") stage4Status = "completed";
    else if (genTxStatus === "PENDING") stage4Status = "active";
    else if (genTxStatus === "FAILED") stage4Status = "blocked";
  }

  // Stage 5: Final Decision
  let stage5Status: "completed" | "active" | "blocked" | "pending" = "pending";
  const decision = proposal.genlayer?.decision;
  if (decision === "APPROVE") stage5Status = "completed";
  else if (decision === "REJECT" || decision === "DISPUTE" || decision === "INSUFFICIENT_DATA") stage5Status = "blocked";
  else if (decision === "UNAVAILABLE" && proposal.genlayer?.txHash && proposal.genlayer?.txStatus === "FINALIZED") stage5Status = "blocked";

  // Stage 6: Execution Gate
  let stage6Status: "completed" | "active" | "blocked" | "pending" = "pending";
  const execGate = proposal.execution.status;
  if (execGate === "EXECUTED" || execGate === "READY") stage6Status = "completed";
  else if (execGate === "AWAITING_USER_CONFIRMATION") stage6Status = "active";
  else if (execGate === "BLOCKED" || execGate === "FAILED") stage6Status = "blocked";

  // Stage 7: Execution Result
  let stage7Status: "completed" | "active" | "blocked" | "pending" = "pending";
  if (proposal.execution.status === "EXECUTED" && !proposal.isDemo) stage7Status = "completed";
  else if (proposal.execution.status === "EXECUTING") stage7Status = "active";
  else if (stage6Status === "blocked" || proposal.execution.status === "FAILED") stage7Status = "blocked";

  const stages = [
    {
      step: 1,
      title: "Proposed",
      desc: `${proposal.actionType} ${proposal.asset || ""}${proposal.amountUsd ? ` ($${proposal.amountUsd})` : ""}`,
      status: stage1Status,
      icon: <FileText className="w-4 h-4" />
    },
    {
      step: 2,
      title: "Policy Check",
      desc: proposal.policyResult === "PASS" ? "Policy Passed" : proposal.policyResult === "FAIL" ? "Policy Blocked" : "Checking Policy",
      status: stage2Status,
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      step: 3,
      title: "Submission",
      desc: proposal.isDemo 
        ? (proposal.genlayer ? "Simulated" : "Not Submitted")
        : (proposal.genlayer?.txHash ? `${proposal.genlayer.txHash.slice(0, 8)}...` : (proposal.state === "SUBMITTING_TO_GENLAYER" ? "Submitting..." : "Not Submitted")),
      status: stage3Status,
      icon: <Send className="w-4 h-4" />
    },
    {
      step: 4,
      title: "GenLayer Tx",
      desc: proposal.isDemo 
        ? (proposal.genlayer ? "Simulated Consensus" : "Not Applicable")
        : (proposal.genlayer?.txHash ? (proposal.genlayer?.txStatus || "Pending") : "Not Applicable"),
      status: stage4Status,
      icon: <Cpu className="w-4 h-4" />
    },
    {
      step: 5,
      title: "Decision",
      desc: proposal.isDemo 
        ? (proposal.genlayer?.decision ? `Simulated ${proposal.genlayer.decision}` : "Unavailable")
        : (proposal.genlayer?.txHash ? (proposal.genlayer?.decision || "Pending Consensus") : "Unavailable"),
      status: stage5Status,
      icon: <Scale className="w-4 h-4" />
    },
    {
      step: 6,
      title: "Execution Gate",
      desc: proposal.execution.status === "AWAITING_USER_CONFIRMATION" 
        ? "Human Signoff Required"
        : proposal.execution.status === "READY" 
        ? "Ready for Wallet"
        : proposal.execution.status === "EXECUTED" 
        ? "Executed"
        : proposal.execution.status === "BLOCKED" 
        ? "Execution Blocked"
        : proposal.execution.status === "WAITING_FOR_GENLAYER" 
        ? "Awaiting GenLayer Guard"
        : (proposal.execution.status || "Awaiting Guard"),
      status: stage6Status,
      icon: <Lock className="w-4 h-4" />
    },
    {
      step: 7,
      title: "Execution",
      desc: proposal.execution.txHash && !proposal.isDemo 
        ? "Sepolia Confirmed" 
        : proposal.isDemo 
        ? (proposal.execution.status === "EXECUTED" ? "Simulated Preview" : "Demo Fixture")
        : (proposal.execution.status === "EXECUTED" ? "Executed" : "Not Executed"),
      status: stage7Status,
      icon: <CheckCircle2 className="w-4 h-4" />
    }
  ];

  return (
    <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-xl">
      {/* Persistent Demo Fixture Banner */}
      {proposal.isDemo && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>DEMO FIXTURE — NOT A LIVE TRANSACTION</span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">Isolated deterministic simulation</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-ping" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-white font-display">
            GenLayer Trade Guard Pipeline
          </h3>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          ID: {proposal.id}
        </span>
      </div>

      {/* Pipeline Stages Grid (Clean 4-column responsive layout preventing truncation) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-2.5 relative">
        {stages.map((stage) => {
          let badgeBg = "bg-white/5 border-white/10 text-gray-400";
          let iconColor = "text-gray-400";

          if (stage.status === "completed") {
            badgeBg = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
            iconColor = "text-emerald-400";
          } else if (stage.status === "active") {
            badgeBg = "bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10";
            iconColor = "text-purple-400 animate-pulse";
          } else if (stage.status === "blocked") {
            badgeBg = "bg-rose-500/10 border-rose-500/30 text-rose-300";
            iconColor = "text-rose-400";
          }

          return (
            <div 
              key={stage.step}
              className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-300 min-h-[96px] ${badgeBg}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Step 0{stage.step}
                  </span>
                  <span className={iconColor}>{stage.icon}</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1 leading-snug">{stage.title}</h4>
              </div>
              <p className="text-[11px] font-medium opacity-90 leading-tight break-words">{stage.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Explanatory Banner if Blocked or Awaiting User Confirmation */}
      {proposal.execution.status === "AWAITING_USER_CONFIRMATION" && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Human Confirmation Required: </span>
            {proposal.isDemo ? (
              <span>Demo scenario approved by GenLayer simulation rule. In production, this step requires explicit MetaMask signature.</span>
            ) : (
              <span>GenLayer approved this action. Policy requires explicit human confirmation before funds can move on Sepolia.</span>
            )}
          </div>
        </div>
      )}

      {proposal.execution.status === "BLOCKED" && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-200 text-xs">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-rose-300">Execution Blocked: </span>
            {proposal.policyFailureReason || proposal.genlayer?.reasoning || proposal.execution.error || "Policy safety checks failed."}
          </div>
        </div>
      )}
    </div>
  );
};
