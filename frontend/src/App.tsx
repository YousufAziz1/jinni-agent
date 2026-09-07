import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

import { 
  connectWallet, 
  getWalletChainId,
  getBalances, 
  executeSwapTrade, 
  getPublicClient,
  areMockTokensInitialized
} from './lib/web3';
import { api } from './lib/api';
import { agentApi, type ActivityLogItem } from './lib/agentApi';
import { isGenLayerConfigured, getStoredGenLayerConfig, submitProposalToGenLayerOnChain } from './lib/genlayer';
import { 
  getCanonicalDemoScenarios, 
  getCanonicalDemoProofs,
  createDecisionProofFromProposal 
} from './lib/demoScenarios';
import { getRuntimeCapability, type RuntimeCapability } from './lib/runtimeCapability';
import { useTheme } from './lib/theme';
import type { 
  AgentProposal, 
  DecisionProof, 
  PolicyRuleConfig 
} from './types/agent';
import type { Position, BackendStatus } from './lib/api';

import { Navbar, type NavTab } from './components/Navbar';
import { ProposalDetailModal } from './components/ProposalDetailModal';

// Views
import { OverviewView } from './views/OverviewView';
import { AgentView } from './views/AgentView';
import { PoliciesView } from './views/PoliciesView';
import { ProposalsView } from './views/ProposalsView';
import { ActivityView } from './views/ActivityView';
import { DecisionProofsView } from './views/DecisionProofsView';
import { VaultView } from './views/VaultView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  // Theme State (Day / Night Mode)
  const { theme, toggleTheme, setTheme } = useTheme();

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Authentication & Web3 State
  const [address, setAddress] = useState<string>('');
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [balances, setBalances] = useState<Record<string, { wallet: string; vault: string }>>({});
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [sepoliaConnected, setSepoliaConnected] = useState<boolean>(false);

  // GenLayer Guard & Backend Status
  const [genlayerConfigured, setGenlayerConfigured] = useState<boolean>(() => isGenLayerConfigured());
  const [, setBackendStatus] = useState<BackendStatus | null>(null);

  // Core Data (Initialize with canonical fixtures so demo is instantly reviewable)
  const [proposals, setProposals] = useState<AgentProposal[]>(() => getCanonicalDemoScenarios());
  const [activeProposal, setActiveProposal] = useState<AgentProposal | null>(() => getCanonicalDemoScenarios()[0]);
  const [inspectModalProposal, setInspectModalProposal] = useState<AgentProposal | null>(null);
  const [proofs, setProofs] = useState<DecisionProof[]>(() => getCanonicalDemoProofs());
  const [policies, setPolicies] = useState<PolicyRuleConfig | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [delegationState, setDelegationState] = useState<any>(null);

  // Async UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Scenario loading state machine: IDLE | LOADING_SCENARIO | LOADED | LOAD_ERROR
  const [scenarioLoadingState, setScenarioLoadingState] = useState<"IDLE" | "LOADING_SCENARIO" | "LOADED" | "LOAD_ERROR">("IDLE");
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [lastScenarioId, setLastScenarioId] = useState<string | null>(null);

  const [mockInitialized, setMockInitialized] = useState<boolean>(() => areMockTokensInitialized());
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Compute single source of truth for runtime capability
  const capability: RuntimeCapability = getRuntimeCapability({
    walletConnected,
    walletAddress: address,
    walletChainId,
    genlayerConfigured,
    genlayerContractAddress: getStoredGenLayerConfig().contractAddress,
    executionAdapterConfigured: true
  });

  // Track wallet chain and account changes live
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Initial check if already connected
      getWalletChainId().then(cid => {
        if (cid) setWalletChainId(cid);
      }).catch(() => {});

      const handleChainChanged = (chainIdHex: string) => {
        const cid = parseInt(chainIdHex, 16);
        setWalletChainId(cid);
        setSepoliaConnected(cid === 11155111);
      };

      const handleAccountsChanged = (accs: string[]) => {
        if (!accs || accs.length === 0) {
          setWalletConnected(false);
          setAddress('');
          setWalletChainId(null);
          setSepoliaConnected(false);
        } else {
          setAddress(accs[0]);
          setWalletConnected(true);
          getWalletChainId().then(cid => {
            setWalletChainId(cid);
            setSepoliaConnected(cid === 11155111);
          }).catch(() => {});
        }
      };

      window.ethereum.on?.('chainChanged', handleChainChanged);
      window.ethereum.on?.('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener?.('chainChanged', handleChainChanged);
        window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Refresh all core application state
  const refreshAppData = useCallback(async () => {
    try {
      // 1. Backend Status
      try {
        const st = await api.getStatus();
        setBackendStatus(st);
        if (st.sepolia_connected) setSepoliaConnected(true);
      } catch {}

      // 2. GenLayer Status
      try {
        const glSt = await agentApi.getGenLayerStatus();
        setGenlayerConfigured(glSt.configured && glSt.rpcReachable);
      } catch {
        setGenlayerConfigured(isGenLayerConfigured());
      }

      // 3. Active Policy
      try {
        const pol = await agentApi.getPolicies();
        setPolicies(pol);
      } catch {}

      // 4. Proposals
      try {
        const props = await agentApi.listProposals(undefined, true);
        if (props && props.length > 0) {
          // Merge with canonical fixtures so demo scenarios remain permanently selectable
          const canonical = getCanonicalDemoScenarios();
          const merged = [...props];
          for (const c of canonical) {
            if (!merged.some(p => p.id === c.id)) {
              merged.push(c);
            }
          }
          setProposals(merged);
        }
      } catch {}

      // 5. Decision Proofs
      try {
        const prfs = await agentApi.listDecisionProofs();
        if (prfs && prfs.length > 0) {
          setProofs(prfs);
        }
      } catch {}

      // 6. Activity Logs
      try {
        const logs = await agentApi.getAgentActivity();
        setActivityLogs(logs);
      } catch {}

      // 7. Wallet specific data if connected
      if (address) {
        try {
          const bals = await getBalances(address);
          setBalances(bals);
        } catch {}

        try {
          const deleg = await api.getDelegation(address);
          setDelegationState(deleg);
        } catch {}

        try {
          const pos = await api.getPositions(address);
          setPositions(pos);
        } catch {}
      }

      setMockInitialized(areMockTokensInitialized());
    } catch (err) {
      console.error("Failed to refresh app data:", err);
    }
  }, [address]);

  // Initial load & Polling loop
  useEffect(() => {
    refreshAppData();

    pollingTimerRef.current = setInterval(() => {
      refreshAppData();
    }, 8000);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [refreshAppData]);

  // Handle Wallet Connection
  const handleConnectWallet = async () => {
    try {
      const { address: userAddr, chainId } = await connectWallet();
      setAddress(userAddr);
      setWalletConnected(true);
      setWalletChainId(chainId);
      setSepoliaConnected(chainId === 11155111);
      showToast(`Connected: ${userAddr.substring(0, 6)}...${userAddr.substring(userAddr.length - 4)}`, 'success');
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'MetaMask connection failed', 'error');
    }
  };

  // Create Proposal
  const handleCreateProposal = async (params: {
    actionType: string;
    asset: string;
    amount: string;
    amountUsd: string;
    slippage: string;
    route: string;
    agentRationale: string;
  }) => {
    setLoading(true);
    // Unselect stale demo proposal so a failed submission does not leave a demo selected
    setActiveProposal(null);
    try {
      const newProp = await agentApi.createProposal({
        ...params,
        chain: 'Sepolia',
        chainId: 11155111,
        actorType: 'human'
      });
      // Explicitly mark as live proposal
      newProp.isDemo = false;
      setActiveProposal(newProp);
      setProposals(prev => [newProp, ...prev.filter(p => p.id !== newProp.id)]);
      showToast(`Proposal ${newProp.id} created! Policy: ${newProp.policyResult}`, 'success');
      await refreshAppData();
    } catch (e: any) {
      console.error("[App] Proposal creation error:", e);
      const errMsg = e.message || 'Failed to create proposal';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit to GenLayer
  const handleSubmitToGenLayer = async (proposalId: string) => {
    setSubmitting(true);
    try {
      const target = proposals.find(p => p.id === proposalId) || activeProposal;
      let onChainTxHash: string | undefined;

      // Attempt live submission via genlayer-js directly from client browser
      const config = getStoredGenLayerConfig();
      if (isGenLayerConfigured(config) && target) {
        try {
          const payload = {
            id: target.id,
            actionType: target.actionType,
            asset: target.asset,
            chain: target.chain,
            amountUsd: target.amountUsd,
            slippage: target.slippage,
            route: target.route,
            policyVersion: target.policyVersion,
            agentRationale: target.agentRationale,
            timestamp: new Date().toISOString()
          };
          onChainTxHash = await submitProposalToGenLayerOnChain(config.contractAddress, payload);
        } catch (clientErr: any) {
          console.warn("[App] Direct client GenLayer write fallback:", clientErr.message);
        }
      }

      const updated = await agentApi.submitToGenLayer(proposalId, onChainTxHash);
      setActiveProposal(updated);
      setProposals(prev => prev.map(p => p.id === updated.id ? updated : p));

      if (updated.genlayer?.txHash) {
        showToast(`Submitted to GenLayer! Tx: ${updated.genlayer.txHash.slice(0, 10)}...`, 'success');
      } else if (updated.genlayer?.decision && updated.genlayer.decision !== "UNAVAILABLE") {
        showToast(`GenLayer Adjudication: ${updated.genlayer.decision}`, 'info');
      } else {
        const infoMsg = updated.genlayer?.reasoning || 'GenLayer Intelligent Contract is deployed on Studionet. Transactions must be dispatched with an active client signature.';
        showToast(infoMsg, 'info');
      }
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'GenLayer submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Execution
  const handleConfirmExecution = async (proposalId: string) => {
    setConfirming(true);
    try {
      const target = proposals.find(p => p.id === proposalId) || activeProposal;
      if (!target) throw new Error("Proposal not found");

      // Handle Demo Fixture Execution (Deterministic preview simulation only)
      if (target.isDemo) {
        // Update local proposal preview state
        const updated: AgentProposal = {
          ...target,
          state: "EXECUTED",
          execution: {
            ...target.execution,
            status: "EXECUTED",
            userConfirmed: true,
            executedAt: new Date().toISOString(),
            txHash: null // Never fabricate a blockchain transaction receipt for fixtures
          }
        };

        setActiveProposal(updated);
        setProposals(prev => prev.map(p => p.id === updated.id ? updated : p));
        if (inspectModalProposal?.id === proposalId) {
          setInspectModalProposal(updated);
        }

        // Add or update corresponding proof
        const proof = createDecisionProofFromProposal(updated);
        setProofs(prev => [proof, ...prev.filter(pr => pr.proposalId !== proof.proposalId)]);

        showToast("Demo simulation completed! (Not an on-chain Sepolia transaction)", "info");
        confetti({ particleCount: 100, spread: 60, colors: ['#a855f7', '#3b82f6'] });
        return;
      }

      // Live On-Chain Execution Path
      if (!walletConnected || !address) {
        showToast("Wallet not connected. Connect MetaMask to execute on Sepolia.", "error");
        return;
      }

      if (walletChainId !== 11155111) {
        showToast("Wrong network. Please switch MetaMask to Sepolia (11155111) to execute.", "error");
        return;
      }

      showToast("Initiating swap transaction on MetaMask...", "info");
      const tradeAmt = parseFloat(target.amount || "1.0");
      const txHash = await executeSwapTrade(address, "USDC", target.asset || "LINK", tradeAmt, 1.0);
      showToast(`Transaction submitted on Sepolia! Tx: ${txHash.slice(0, 10)}...`, "info");

      const publicClient = getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      const res = await agentApi.executeProposal({
        proposalId,
        userConfirmed: true,
        txHash,
        mode: 'WALLET'
      });

      setActiveProposal(res.proposal);
      setProposals(prev => prev.map(p => p.id === res.proposal.id ? res.proposal : p));
      if (inspectModalProposal?.id === proposalId) {
        setInspectModalProposal(res.proposal);
      }

      showToast(`Execution confirmed on Sepolia! Tx verified.`, 'success');
      confetti({ particleCount: 150, spread: 80, colors: ['#10b981', '#06b6d4'] });
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'Execution confirmation failed', 'error');
    } finally {
      setConfirming(false);
    }
  };

  // Update Policy
  const handleUpdatePolicy = async (updated: Partial<PolicyRuleConfig>) => {
    setSavingPolicy(true);
    try {
      await agentApi.updatePolicies(updated);
      showToast("Policy rules updated successfully!", "success");
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update policy', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Reviewer Demo Scenario Loader (P0 - Never fails on reviewers)
  const handleSelectScenario = async (scenarioId: string) => {
    setScenarioLoadingState("LOADING_SCENARIO");
    setScenarioError(null);
    setLastScenarioId(scenarioId);

    try {
      const loaded = await agentApi.loadDemoScenario(scenarioId);
      setActiveProposal(loaded);

      // Ensure loaded proposal exists in proposals list
      setProposals((prev) => {
        const exists = prev.some(p => p.id === loaded.id);
        if (exists) return prev.map(p => p.id === loaded.id ? loaded : p);
        return [loaded, ...prev];
      });

      // Ensure corresponding decision proof is present
      const demoProof = createDecisionProofFromProposal(loaded);
      setProofs((prev) => {
        const exists = prev.some(prf => prf.proposalId === demoProof.proposalId);
        if (exists) return prev.map(prf => prf.proposalId === demoProof.proposalId ? demoProof : prf);
        return [demoProof, ...prev];
      });

      setScenarioLoadingState("LOADED");
      setActiveTab('agent');
      showToast(`Demo Scenario "${loaded.actionType} ${loaded.asset}" loaded!`, 'info');
    } catch (e: any) {
      setScenarioLoadingState("LOAD_ERROR");
      setScenarioError(e.message || `Failed to load scenario ${scenarioId}`);
      showToast(e.message || 'Failed to load demo scenario', 'error');
    }
  };

  const handleRetryScenario = () => {
    if (lastScenarioId) {
      handleSelectScenario(lastScenarioId);
    }
  };

  return (
    <div className="min-h-screen bg-mesh bg-grid relative text-gray-100 font-body pb-16 overflow-x-hidden">
      
      {/* Floating Ambient Orbs */}
      <div className="absolute top-12 left-10 w-[500px] h-[500px] bg-[var(--accent)]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        address={address}
        walletConnected={walletConnected}
        onConnectWallet={handleConnectWallet}
        genlayerConfigured={genlayerConfigured}
        sepoliaConnected={sepoliaConnected}
        walletChainId={walletChainId}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main App Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {activeTab === 'overview' && (
          <OverviewView
            proposals={proposals}
            proofs={proofs}
            capability={capability}
            onSelectProposal={(p) => {
              setActiveProposal(p);
              setInspectModalProposal(p);
            }}
            onNavigateTab={setActiveTab}
            onSelectScenario={handleSelectScenario}
            onConnectWallet={handleConnectWallet}
          />
        )}

        {activeTab === 'agent' && (
          <AgentView
            proposals={proposals}
            activeProposal={activeProposal}
            capability={capability}
            scenarioLoadingState={scenarioLoadingState}
            scenarioError={scenarioError}
            onSelectProposal={(p) => setActiveProposal(p)}
            onCreateProposal={handleCreateProposal}
            onSubmitToGenLayer={handleSubmitToGenLayer}
            onConfirmExecution={handleConfirmExecution}
            onSelectScenario={handleSelectScenario}
            onRetryScenario={handleRetryScenario}
            onConnectWallet={handleConnectWallet}
            loading={loading}
            submitting={submitting}
            confirming={confirming}
          />
        )}

        {activeTab === 'policies' && (
          <PoliciesView
            policies={policies}
            onUpdatePolicy={handleUpdatePolicy}
            saving={savingPolicy}
          />
        )}

        {activeTab === 'proposals' && (
          <ProposalsView
            proposals={proposals}
            onSelectProposal={(p) => setInspectModalProposal(p)}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityView
            logs={activityLogs}
            loading={loading}
          />
        )}

        {activeTab === 'proofs' && (
          <DecisionProofsView
            proofs={proofs}
            loading={loading}
            onSelectScenario={handleSelectScenario}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'vault' && (
          <VaultView
            address={address}
            walletConnected={walletConnected}
            balances={balances}
            delegationState={delegationState}
            positions={positions}
            mockInitialized={mockInitialized}
            onRefreshData={refreshAppData}
            showToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onRefreshStatus={refreshAppData}
            showToast={showToast}
            capability={capability}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}

      </main>

      {/* Proposal Detail Inspection Modal */}
      {inspectModalProposal && (
        <ProposalDetailModal
          proposal={inspectModalProposal}
          onClose={() => setInspectModalProposal(null)}
          onConfirmExecution={handleConfirmExecution}
          confirming={confirming}
        />
      )}

      {/* Floating Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs font-semibold flex items-center gap-2 animate-bounce ${
          toast.type === 'success' 
            ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/25' 
            : toast.type === 'error'
            ? 'bg-rose-500/90 border-rose-400 text-white shadow-rose-500/25'
            : 'bg-purple-600/90 border-purple-400 text-white shadow-purple-600/25'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
