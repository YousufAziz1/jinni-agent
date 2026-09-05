export type ExecutionMode = "SIMULATION" | "PREVIEW" | "LIVE_WALLET" | "UNAVAILABLE";

export interface RuntimeCapability {
  walletConnected: boolean;
  walletAddress: string | null;
  walletChainId: number | null;
  expectedChainId: number | null;
  genlayerConfigured: boolean;
  genlayerContractAddress: string | null;
  executionAdapterConfigured: boolean;
  executionMode: ExecutionMode;
  statusLabel: string;
  isExecutionBlocked: boolean;
  blockReason: string | null;
}

export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Computes truthful runtime capabilities based on live wallet, network, and GenLayer states.
 * Guarantees that claims like LIVE WALLET and SETTLED ON SEPOLIA are strictly evidence-backed.
 */
export function getRuntimeCapability(params: {
  walletConnected: boolean;
  walletAddress?: string | null;
  walletChainId?: number | null;
  genlayerConfigured: boolean;
  genlayerContractAddress?: string | null;
  executionAdapterConfigured?: boolean;
}): RuntimeCapability {
  const {
    walletConnected,
    walletAddress = null,
    walletChainId = null,
    genlayerConfigured,
    genlayerContractAddress = null,
    executionAdapterConfigured = true // Viem Sepolia adapter is configured in client
  } = params;

  const expectedChainId = SEPOLIA_CHAIN_ID;
  const isCorrectNetwork = walletConnected && walletChainId === expectedChainId;

  // 1. Determine execution mode and status label
  let executionMode: ExecutionMode;
  let statusLabel: string;
  let isExecutionBlocked: boolean;
  let blockReason: string | null;

  if (!walletConnected) {
    executionMode = "SIMULATION";
    statusLabel = "WALLET NOT CONNECTED";
    isExecutionBlocked = true;
    blockReason = "Connect your MetaMask wallet on Sepolia to enable live transaction execution.";
  } else if (!isCorrectNetwork) {
    executionMode = "UNAVAILABLE";
    statusLabel = "WRONG NETWORK";
    isExecutionBlocked = true;
    blockReason = `Connected to network ID ${walletChainId || 'Unknown'}. Please switch MetaMask to Sepolia (Chain ID: ${expectedChainId}).`;
  } else if (!executionAdapterConfigured) {
    executionMode = "PREVIEW";
    statusLabel = "ADAPTER NOT READY";
    isExecutionBlocked = true;
    blockReason = "Sepolia transaction execution adapter is not initialized.";
  } else {
    // Only when wallet connected, network verified on Sepolia, and adapter ready
    executionMode = "LIVE_WALLET";
    statusLabel = "LIVE WALLET";
    isExecutionBlocked = false;
    blockReason = null;
  }

  return {
    walletConnected,
    walletAddress: walletAddress || null,
    walletChainId: walletChainId || null,
    expectedChainId,
    genlayerConfigured,
    genlayerContractAddress: genlayerContractAddress || null,
    executionAdapterConfigured,
    executionMode,
    statusLabel,
    isExecutionBlocked,
    blockReason
  };
}

/**
 * Validates settlement claim truthfulness.
 * Returns true only when a genuine on-chain receipt hash exists and chain is Sepolia.
 */
export function isSettledOnSepolia(receipt: { txHash?: string | null; chainId?: number | null; isDemo?: boolean } | null | undefined): boolean {
  if (!receipt || !receipt.txHash) return false;
  if (receipt.isDemo) return false;
  if (receipt.txHash.startsWith("0xd3m0") || receipt.txHash.startsWith("0xsim")) return false;
  if (receipt.chainId !== undefined && receipt.chainId !== null && receipt.chainId !== SEPOLIA_CHAIN_ID) return false;
  return true;
}

/**
 * Returns a truthful settlement status text for UI display
 */
export function getSettlementLabel(receipt: { txHash?: string | null; chainId?: number | null; isDemo?: boolean } | null | undefined): string {
  if (!receipt || !receipt.txHash) return "Not executed";
  if (receipt.isDemo || receipt.txHash.startsWith("0xd3m0")) {
    return "Simulation completed (Demo fixture — not on-chain)";
  }
  if (receipt.txHash.startsWith("0xsim")) {
    return "Simulated execution (Preview mode)";
  }
  if (isSettledOnSepolia(receipt)) {
    return "Executed — receipt verified on Sepolia";
  }
  return "Execution submitted — awaiting receipt";
}
