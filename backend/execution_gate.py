from typing import Tuple, Optional
from agent_domain import (
    AgentProposal,
    ExecutionStatus,
    ProposalState,
    ExecutionState
)

class ExecutionGate:
    """
    Dedicated Execution Gate for JINNI Agent.
    Evaluates policy state and GenLayer adjudication to enforce execution permissions.
    """

    @staticmethod
    def evaluate_gate(proposal: AgentProposal) -> Tuple[ExecutionStatus, ProposalState, Optional[str]]:
        """
        Calculates execution status and proposal state according to strict rules:
        - Policy FAIL -> BLOCKED
        - GenLayer REJECT / DISPUTE / INSUFFICIENT_DATA -> BLOCKED
        - GenLayer UNAVAILABLE / missing -> WAITING_FOR_GENLAYER / not executable
        - Policy PASS + GenLayer APPROVE:
            - If requires human confirmation and not confirmed -> AWAITING_USER_CONFIRMATION
            - If confirmed or auto-execution allowed -> READY
        """
        # 1. Policy check gating
        if proposal.policyResult == "FAIL":
            reason = f"Execution blocked: Policy violation ({proposal.policyFailureReason or 'Criteria not satisfied'})"
            return "BLOCKED", "POLICY_FAILED", reason

        if proposal.policyResult == "UNKNOWN":
            reason = "Execution blocked: Policy evaluation returned UNKNOWN. Data is insufficient."
            return "BLOCKED", "POLICY_CHECKING", reason

        # 2. GenLayer Adjudication Gating
        if not proposal.genlayer or proposal.genlayer.decision == "UNAVAILABLE":
            if proposal.state == "SUBMITTING_TO_GENLAYER":
                return "WAITING_FOR_GENLAYER", "SUBMITTING_TO_GENLAYER", "Submitted to GenLayer; awaiting consensus receipt."
            return "WAITING_FOR_GENLAYER", "GENLAYER_NOT_SUBMITTED", "Policy passed. GenLayer adjudication not submitted."

        genlayer_dec = proposal.genlayer.decision

        if genlayer_dec == "REJECT":
            reason = f"Execution blocked: GenLayer Intelligent Contract rejected proposal. {proposal.genlayer.reasoning or ''}"
            return "BLOCKED", "REJECTED", reason

        if genlayer_dec == "DISPUTE":
            reason = f"Execution blocked: GenLayer consensus resulted in DISPUTE. {proposal.genlayer.reasoning or ''}"
            return "BLOCKED", "DISPUTED", reason

        if genlayer_dec == "INSUFFICIENT_DATA":
            reason = f"Execution blocked: GenLayer reported INSUFFICIENT_DATA. {proposal.genlayer.reasoning or ''}"
            return "BLOCKED", "INSUFFICIENT_DATA", reason

        # 3. Approved Path: Policy PASS and GenLayer APPROVE
        if proposal.policyResult == "PASS" and genlayer_dec == "APPROVE":
            # Check Human Confirmation Requirement
            if proposal.execution.requiresHumanConfirmation and not proposal.execution.userConfirmed:
                reason = "GenLayer approved this action, but your policy requires human confirmation before wallet execution."
                return "AWAITING_USER_CONFIRMATION", "AWAITING_CONFIRMATION", reason
            
            # User confirmed or human confirmation bypassed
            return "READY", "READY_FOR_EXECUTION", "Proposal approved by GenLayer and cleared for execution."

        return "BLOCKED", "POLICY_FAILED", "Undefined approval state: Execution safely blocked."
