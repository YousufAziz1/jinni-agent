import type { GenLayerDecision } from '../types/agent';
import { createClient, chains, createAccount, generatePrivateKey } from 'genlayer-js';

export interface GenLayerConfig {
  network: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  explorerBaseUrl: string;
}

export async function submitProposalToGenLayerOnChain(
  contractAddress: string,
  proposalPayload: any
): Promise<string> {
  const pk = generatePrivateKey();
  const account = createAccount(pk);
  const client = createClient({ chain: chains.studionet, account });
  const txHash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'adjudicate_proposal',
    args: [typeof proposalPayload === 'string' ? proposalPayload : JSON.stringify(proposalPayload)],
    value: 0n
  });
  return txHash;
}

const STORAGE_KEY = "jinni_agent_genlayer_config";

export function getStoredGenLayerConfig(): GenLayerConfig {
  const defaults: GenLayerConfig = {
    network: "studionet",
    chainId: 61999,
    rpcUrl: "https://studio.genlayer.com/api",
    contractAddress: "0xa54cF1bBCfe4456b6194658699aab540fBeF046c",
    explorerBaseUrl: "https://explorer-studio.genlayer.com"
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaults, ...JSON.parse(saved) };
    }
  } catch {}
  return defaults;
}

export function saveGenLayerConfig(config: Partial<GenLayerConfig>) {
  const current = getStoredGenLayerConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function isGenLayerConfigured(config?: GenLayerConfig): boolean {
  const conf = config || getStoredGenLayerConfig();
  if (!conf.contractAddress || conf.contractAddress.trim() === "") return false;
  // If address is just 0x000... dummy address, it is not configured
  const clean = conf.contractAddress.toLowerCase().replace(/^0x/, '').replace(/0/g, '');
  return clean.length > 0;
}

/**
 * Returns user-friendly UI formatting for GenLayer decision states.
 * Respects strict truthfulness: distinguishes demo fixtures from live contract responses.
 */
export function getDecisionBadgeProps(
  decision: GenLayerDecision,
  isDemo?: boolean,
  hasLiveTx?: boolean
): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  iconName: string;
} {
  switch (decision) {
    case "APPROVE":
      return {
        label: isDemo ? "DEMO APPROVE — FIXTURE" : hasLiveTx ? "APPROVE — LIVE CONTRACT RESPONSE" : "DEMO APPROVE",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-400",
        borderClass: "border-emerald-500/30",
        iconName: "CheckCircle"
      };
    case "REJECT":
      return {
        label: isDemo ? "DEMO REJECT — FIXTURE RULE" : hasLiveTx ? "REJECT — LIVE CONTRACT RESPONSE" : "DEMO REJECTED",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-400",
        borderClass: "border-rose-500/30",
        iconName: "XCircle"
      };
    case "DISPUTE":
      return {
        label: isDemo ? "DEMO DISPUTE — FIXTURE" : hasLiveTx ? "DISPUTE — LIVE CONTRACT RESPONSE" : "CONSENSUS DISPUTED",
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-400",
        borderClass: "border-amber-500/30",
        iconName: "AlertTriangle"
      };
    case "INSUFFICIENT_DATA":
      return {
        label: isDemo ? "DEMO INSUFFICIENT EVIDENCE — FIXTURE" : "INSUFFICIENT DATA",
        bgClass: "bg-purple-500/10",
        textClass: "text-purple-400",
        borderClass: "border-purple-500/30",
        iconName: "HelpCircle"
      };
    case "UNAVAILABLE":
    default:
      return {
        label: "GENLAYER DECISION — UNAVAILABLE",
        bgClass: "bg-gray-500/10",
        textClass: "text-gray-400",
        borderClass: "border-gray-500/30",
        iconName: "Clock"
      };
  }
}

/**
 * Renders telemetry with strict truthfulness.
 * If telemetry field is null, undefined, or missing, returns "TELEMETRY NOT RETURNED".
 * Never fabricates or infers consensus metrics.
 */
export function formatTelemetryField(value: string | number | boolean | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || value === "") {
    return "TELEMETRY NOT RETURNED";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return `${value}${suffix}`;
}
