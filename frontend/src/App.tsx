import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

import { 
  connectWallet, 
  getBalances, 
  executeSwapTrade, 
  getPublicClient,
  areMockTokensInitialized
} from './lib/web3';
import { api } from './lib/api';
import { agentApi, type ActivityLogItem } from './lib/agentApi';
import { isGenLayerConfigured } from './lib/genlayer';
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
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Authentication & Web3 State
  const [address, setAddress] = useState<string>('');
  const [balances, setBalances] = useState<Record<string, { wallet: string; vault: string }>>({});
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [sepoliaConnected, setSepoliaConnected] = useState<boolean>(false);

  // GenLayer Guard & Backend Status
  const [genlayerConfigured, setGenlayerConfigured] = useState<boolean>(() => isGenLayerConfigured());
  const [, setBackendStatus] = useState<BackendStatus | null>(null);

  // Core Data
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [activeProposal, setActiveProposal] = useState<AgentProposal | null>(null);
  const [inspectModalProposal, setInspectModalProposal] = useState<AgentProposal | null>(null);
  const [proofs, setProofs] = useState<DecisionProof[]>([]);
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

  const [mockInitialized, setMockInitialized] = useState<boolean>(() => areMockTokensInitialized());

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Refresh all core application state
  const refreshAppData = useCallback(async () => {
    try {
      // 1. Backend Status
      try {
        const st = await api.getStatus();
        setBackendStatus(st);
        setSepoliaConnected(st.sepolia_connected);
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
        setProposals(props);
        if (!activeProposal && props.length > 0) {
          setActiveProposal(props[0]);
        }
      } catch {}

      // 5. Decision Proofs
      try {
        const prfs = await agentApi.listDecisionProofs();
        setProofs(prfs);
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
  }, [address, activeProposal]);

  // Initial load & Polling loop
  useEffect(() => {
    refreshAppData();

    // Canonical Polling: poll status and proposals every 8 seconds
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
      const userAddr = await connectWallet();
      setAddress(userAddr);
      setWalletConnected(true);
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
    try {
      const newProp = await agentApi.createProposal(params);
      setActiveProposal(newProp);
      showToast(`Proposal ${newProp.id} created! Policy: ${newProp.policyResult}`, 'success');
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'Failed to create proposal', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit to GenLayer
  const handleSubmitToGenLayer = async (proposalId: string) => {
    setSubmitting(true);
    try {
      const updated = await agentApi.submitToGenLayer(proposalId);
      setActiveProposal(updated);
      showToast(`Submitted to GenLayer! Decision: ${updated.genlayer?.decision}`, 'success');
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'GenLayer submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Execution on Sepolia
  const handleConfirmExecution = async (proposalId: string) => {
    setConfirming(true);
    try {
      const target = proposals.find(p => p.id === proposalId) || activeProposal;
      let txHash: string | null = null;

      // If connected to wallet, execute the actual trade swap on Sepolia (unless it is a demo fixture)
      if (walletConnected && address && target?.asset && !target.isDemo) {
        showToast("Initiating swap transaction on MetaMask...", "info");
        try {
          const tradeAmt = parseFloat(target.amount || "1.0");
          txHash = await executeSwapTrade(address, "USDC", target.asset, tradeAmt, 1.0);
          showToast(`Transaction submitted on Sepolia! Tx: ${txHash.slice(0, 10)}...`, "info");
          const publicClient = getPublicClient();
          await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        } catch (walletErr: any) {
          console.warn("Wallet execution aborted or reverted:", walletErr);
          throw new Error(`Wallet execution failed: ${walletErr.message || 'Signature rejected'}`, { cause: walletErr });
        }
      } else {
        // Preview or demo fixture mode execution
        txHash = target?.isDemo ? `0xd3m0_demo_execution_${Date.now()}` : `0xsim_${Date.now()}`;
      }

      const res = await agentApi.executeProposal({
        proposalId,
        userConfirmed: true,
        txHash,
        mode: walletConnected ? 'WALLET' : 'SIMULATION'
      });

      setActiveProposal(res.proposal);
      if (inspectModalProposal?.id === proposalId) {
        setInspectModalProposal(res.proposal);
      }

      showToast(`Execution confirmed! Decision Proof recorded.`, 'success');
      confetti({ particleCount: 150, spread: 80, colors: ['#6c63ff', '#00ff66'] });
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

  // Load Demo Scenario
  const handleSelectScenario = async (scenarioId: string) => {
    try {
      const loaded = await agentApi.loadDemoScenario(scenarioId);
      setActiveProposal(loaded);
      setActiveTab('agent');
      showToast(`Demo Scenario "${loaded.actionType} ${loaded.asset}" loaded!`, 'info');
      await refreshAppData();
    } catch (e: any) {
      showToast(e.message || 'Failed to load demo scenario', 'error');
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
      />

      {/* Main App Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {activeTab === 'overview' && (
          <OverviewView
            proposals={proposals}
            proofs={proofs}
            onSelectProposal={(p) => {
              setActiveProposal(p);
              setInspectModalProposal(p);
            }}
            onNavigateTab={setActiveTab}
            onSelectScenario={handleSelectScenario}
            genlayerConfigured={genlayerConfigured}
          />
        )}

        {activeTab === 'agent' && (
          <AgentView
            proposals={proposals}
            activeProposal={activeProposal}
            onSelectProposal={(p) => setActiveProposal(p)}
            onCreateProposal={handleCreateProposal}
            onSubmitToGenLayer={handleSubmitToGenLayer}
            onConfirmExecution={handleConfirmExecution}
            onSelectScenario={handleSelectScenario}
            loading={loading}
            submitting={submitting}
            confirming={confirming}
            walletConnected={walletConnected}
            address={address}
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
