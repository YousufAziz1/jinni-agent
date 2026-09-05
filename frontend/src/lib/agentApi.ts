import { API_BASE } from './api';
import type {
  AgentProposal,
  PolicyRuleConfig,
  DecisionProof
} from '../types/agent';

export interface BackendAgentStatus {
  configured: boolean;
  network: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  explorerBaseUrl: string;
  rpcReachable: boolean;
  mode: "LIVE" | "CONFIGURATION_BLOCKED";
}

export interface ActivityLogItem {
  id: number;
  timestamp: string;
  agent: string;
  action: string;
  details: string;
  tx_hash?: string | null;
}

export const agentApi = {
  async getGenLayerStatus(): Promise<BackendAgentStatus> {
    const res = await fetch(`${API_BASE}/agent/genlayer/status`);
    if (!res.ok) throw new Error("Failed to fetch GenLayer status");
    return res.json();
  },

  async getPolicies(): Promise<PolicyRuleConfig> {
    const res = await fetch(`${API_BASE}/agent/policies`);
    if (!res.ok) throw new Error("Failed to fetch policies");
    return res.json();
  },

  async updatePolicies(rules: Partial<PolicyRuleConfig>): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/agent/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules)
    });
    if (!res.ok) throw new Error("Failed to update policy configuration");
    return res.json();
  },

  async evaluatePolicy(proposal: Partial<AgentProposal>): Promise<{
    result: "PASS" | "FAIL" | "UNKNOWN";
    reason: string;
    breakdown: Record<string, unknown>;
  }> {
    const res = await fetch(`${API_BASE}/agent/policy/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal)
    });
    if (!res.ok) throw new Error("Policy evaluation request failed");
    return res.json();
  },

  async createProposal(params: {
    actionType: string;
    asset: string;
    amount: string;
    amountUsd: string;
    slippage: string;
    route: string;
    agentRationale: string;
    source?: string;
  }): Promise<AgentProposal> {
    const res = await fetch(`${API_BASE}/agent/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Proposal creation failed" }));
      throw new Error(err.detail || "Proposal creation failed");
    }
    return res.json();
  },

  async submitToGenLayer(proposalId: string): Promise<AgentProposal> {
    const res = await fetch(`${API_BASE}/agent/genlayer/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Submission failed" }));
      throw new Error(err.detail || "GenLayer submission failed");
    }
    return res.json();
  },

  async listProposals(status?: string, includeDemo: boolean = true): Promise<AgentProposal[]> {
    const url = new URL(`${API_BASE}/agent/proposals`);
    if (status) url.searchParams.set("status", status);
    url.searchParams.set("include_demo", String(includeDemo));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Failed to load proposals");
    return res.json();
  },

  async getProposalDetail(proposalId: string): Promise<AgentProposal> {
    const res = await fetch(`${API_BASE}/agent/proposals/${proposalId}`);
    if (!res.ok) throw new Error(`Proposal ${proposalId} not found`);
    return res.json();
  },

  async executeProposal(params: {
    proposalId: string;
    userConfirmed: boolean;
    txHash?: string | null;
    mode?: "WALLET" | "PREVIEW" | "SIMULATION";
  }): Promise<{ proposal: AgentProposal; decisionProof: DecisionProof }> {
    const res = await fetch(`${API_BASE}/agent/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Execution failed" }));
      throw new Error(err.detail || "Execution failed");
    }
    return res.json();
  },

  async listDecisionProofs(): Promise<DecisionProof[]> {
    const res = await fetch(`${API_BASE}/agent/decision-proofs`);
    if (!res.ok) throw new Error("Failed to load decision proofs");
    return res.json();
  },

  async getDecisionProof(proposalId: string): Promise<DecisionProof> {
    const res = await fetch(`${API_BASE}/agent/decision-proofs/${proposalId}`);
    if (!res.ok) throw new Error(`Decision proof for ${proposalId} not found`);
    return res.json();
  },

  async getAgentActivity(): Promise<ActivityLogItem[]> {
    const res = await fetch(`${API_BASE}/agent/activity`);
    if (!res.ok) throw new Error("Failed to load agent activity");
    return res.json();
  },

  async getDemoScenarios(): Promise<AgentProposal[]> {
    const res = await fetch(`${API_BASE}/agent/demo-scenarios`);
    if (!res.ok) throw new Error("Failed to load demo scenarios");
    return res.json();
  },

  async loadDemoScenario(scenarioId: string): Promise<AgentProposal> {
    const res = await fetch(`${API_BASE}/agent/demo-scenarios/load?scenario_id=${encodeURIComponent(scenarioId)}`, {
      method: "POST"
    });
    if (!res.ok) throw new Error(`Failed to load scenario ${scenarioId}`);
    return res.json();
  }
};
