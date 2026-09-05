import React, { useState } from 'react';
import { 
  Coins, 
  Database, 
  Shield, 
  Brain, 
  TrendingUp, 
  Zap, 
  RefreshCw, 
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  depositToken, 
  withdrawToken, 
  grantSelfDelegation,
  executeSwapTrade,
  revokeAgentDelegation,
  mintTestTokens,
  getPublicClient,
  deployTestToken,
  persistTokenAddresses
} from '../lib/web3';
import { api, type TokenScore, type Position } from '../lib/api';

interface VaultViewProps {
  address: string;
  walletConnected: boolean;
  balances: Record<string, { wallet: string; vault: string }>;
  delegationState: any;
  positions: Position[];
  mockInitialized: boolean;
  onRefreshData: (addr: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  address,
  walletConnected,
  balances,
  delegationState,
  positions,
  mockInitialized,
  onRefreshData,
  showToast
}) => {
  // Faucet state
  const [faucetLoading, setFaucetLoading] = useState<string | null>(null);

  // Vault deposit/withdraw
  const [vaultAmount, setVaultAmount] = useState<string>('');
  const [vaultToken, setVaultToken] = useState<string>('USDC');
  const [vaultLoading, setVaultLoading] = useState<boolean>(false);

  // Spending Policy
  const [maxSpendTrade, setMaxSpendTrade] = useState<string>('5');
  const [maxSpendWeek, setMaxSpendWeek] = useState<string>('20');
  const [durationDays, setDurationDays] = useState<string>('7');
  const [policyLoading, setPolicyLoading] = useState<boolean>(false);
  const [, setPolicy] = useState<any>(null);
  const [delegationLoading, setDelegationLoading] = useState<boolean>(false);

  // Research State
  const [searchSymbol, setSearchSymbol] = useState<string>('LINK');
  const [researchLoading, setResearchLoading] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<TokenScore | null>(null);

  // Trade State
  const [tradeAmount, setTradeAmount] = useState<string>('5');
  const [tradeLoading, setTradeLoading] = useState<boolean>(false);
  const [monitoringLoading, setMonitoringLoading] = useState<boolean>(false);

  // 1. Initialize Mock Tokens
  const handleInitializeMocks = async () => {
    if (!address) return;
    setFaucetLoading('INITIALIZING');
    try {
      showToast('Deploying Mock USDC on Sepolia...', 'info');
      const usdcAddr = await deployTestToken('Mock USDC', 'USDC', 6);
      showToast(`USDC deployed: ${usdcAddr.substring(0, 10)}... Deploying LINK...`, 'info');

      const linkAddr = await deployTestToken('Mock LINK', 'LINK', 18);
      showToast(`LINK deployed: ${linkAddr.substring(0, 10)}... Deploying UNI...`, 'info');

      const uniAddr = await deployTestToken('Mock UNI', 'UNI', 18);
      showToast(`UNI deployed: ${uniAddr.substring(0, 10)}... Syncing backend...`, 'info');

      const newAddresses = { USDC: usdcAddr, LINK: linkAddr, UNI: uniAddr };
      persistTokenAddresses(newAddresses);

      try {
        await api.updateTokens(usdcAddr, linkAddr, uniAddr);
      } catch (backendErr) {
        console.warn('Backend updateTokens skipped:', backendErr);
      }

      showToast('Mock tokens deployed & registered successfully!', 'success');
      confetti({ particleCount: 150, spread: 80, colors: ['#6c63ff', '#00ff66'] });
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Initialization failed', 'error');
    } finally {
      setFaucetLoading(null);
    }
  };

  // 2. Faucet Claim
  const handleFaucetClaim = async (tokenSymbol: string) => {
    if (!address) return;
    setFaucetLoading(tokenSymbol);
    try {
      showToast(`Minting 1,000 ${tokenSymbol} via MetaMask...`, 'info');
      const txHash = await mintTestTokens(address, tokenSymbol);
      showToast(`1,000 ${tokenSymbol} claimed! Tx: ${txHash.substring(0, 10)}...`, 'success');
      confetti({ particleCount: 80, spread: 60 });
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Faucet claim failed', 'error');
    } finally {
      setFaucetLoading(null);
    }
  };

  // 3. Deposit to Vault
  const handleDeposit = async () => {
    if (!address || !vaultAmount) return;
    setVaultLoading(true);
    try {
      showToast(`Depositing ${vaultAmount} ${vaultToken} to vault...`, 'info');
      const txHash = await depositToken(address, vaultToken, vaultAmount);
      showToast(`Deposit confirmed! Tx: ${txHash.substring(0, 10)}...`, 'success');
      setVaultAmount('');
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Deposit failed', 'error');
    } finally {
      setVaultLoading(false);
    }
  };

  // 4. Withdraw from Vault
  const handleWithdraw = async () => {
    if (!address || !vaultAmount) return;
    setVaultLoading(true);
    try {
      const txHash = await withdrawToken(address, vaultToken, vaultAmount);
      showToast(`Withdrawal submitted! Tx: ${txHash.substring(0, 10)}...`, 'success');
      setVaultAmount('');
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Withdrawal failed', 'error');
    } finally {
      setVaultLoading(false);
    }
  };

  // 5. Analyze Wallet via Venice AI
  const handleAnalyzeWallet = async () => {
    if (!address) return;
    setPolicyLoading(true);
    try {
      const pol = await api.analyzeWallet(address);
      setPolicy(pol);
      setMaxSpendTrade(pol.max_spend_trade.toString());
      setMaxSpendWeek(pol.max_spend_week.toString());
      setDurationDays(pol.duration_days.toString());
      showToast('Venice AI Recommended Spending Policy generated!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Analysis failed', 'error');
    } finally {
      setPolicyLoading(false);
    }
  };

  // 6. Grant Self-Delegation
  const handleGrantDelegation = async () => {
    if (!address) return;
    const tradeLimit = Number(maxSpendTrade) || 5;
    const weekLimit = Number(maxSpendWeek) || 20;
    const daysLimit = Number(durationDays) || 7;

    setDelegationLoading(true);
    try {
      showToast('Granting self-delegation on-chain via MetaMask...', 'info');
      const txHash = await grantSelfDelegation(address, tradeLimit, weekLimit, daysLimit);
      const publicClient = getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      try {
        await api.updateDelegation(address, tradeLimit, weekLimit, daysLimit);
      } catch (err) {
        console.error('Failed to sync delegation settings with backend:', err);
      }

      await api.logAction('Wallet', 'Delegation Granted', `Self-delegation granted. Max trade: $${tradeLimit}, Weekly: $${weekLimit}`, txHash);
      showToast(`Delegation granted on-chain! Tx: ${txHash.substring(0, 10)}...`, 'success');
      confetti({ particleCount: 120, spread: 80 });
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Delegation failed', 'error');
    } finally {
      setDelegationLoading(false);
    }
  };

  // 7. Revoke Permissions
  const handleRevoke = async () => {
    if (!address) return;
    setDelegationLoading(true);
    try {
      await revokeAgentDelegation(address);
      showToast(`Revoked on-chain! Deactivating backend...`, 'info');
      await api.revokePermission(address);
      showToast('Delegation revoked successfully.', 'success');
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Revocation failed', 'error');
    } finally {
      setDelegationLoading(false);
    }
  };

  // 8. Score Token via Venice AI
  const handleScoreToken = async () => {
    if (!searchSymbol) return;
    setResearchLoading(true);
    try {
      const score = await api.scoreToken(searchSymbol);
      setScoreResult(score);
      showToast(`${searchSymbol.toUpperCase()} research evaluation complete!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Scoring failed', 'error');
    } finally {
      setResearchLoading(false);
    }
  };

  // 9. Execute Direct Agent Swap
  const handleAgentSwap = async () => {
    if (!address || !scoreResult) return;
    setTradeLoading(true);
    try {
      showToast('Initiating swap via MetaMask...', 'info');
      const txHash = await executeSwapTrade(
        address,
        'USDC',
        scoreResult.symbol,
        parseFloat(tradeAmount),
        1.0
      );
      showToast('Transaction submitted. Waiting for confirmation...', 'info');
      const publicClient = getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      await api.recordTrade(
        address,
        'USDC',
        scoreResult.symbol,
        parseFloat(tradeAmount),
        txHash,
        10,
        5
      );

      showToast(`Agent Swap Executed! Tx: ${txHash.substring(0, 10)}...`, 'success');
      confetti({ particleCount: 150, spread: 80 });
      await onRefreshData(address);
    } catch (e: any) {
      showToast(e.message || 'Trade execution failed', 'error');
    } finally {
      setTradeLoading(false);
    }
  };

  // 10. Position Monitoring Check
  const handleManualMonitorCheck = async () => {
    if (!address) {
      showToast('Connect wallet to check positions', 'error');
      return;
    }
    setMonitoringLoading(true);
    try {
      const res = await api.monitorPositions();
      const exitSignals = res.results.filter(r => r.action === 'EXIT');
      if (exitSignals.length === 0) {
        showToast('Agent check completed! No positions need exit.', 'success');
      } else {
        showToast(`Exit triggered for ${exitSignals.length} positions. Please confirm on MetaMask...`, 'info');
        const publicClient = getPublicClient();
        for (const pos of exitSignals) {
          try {
            const txHash = await executeSwapTrade(
              address,
              pos.symbol,
              'USDC',
              pos.amount * pos.current_price,
              pos.current_price
            );
            await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
            await api.recordExit(pos.id, pos.current_price, txHash);
            showToast(`Exited position in ${pos.symbol}!`, 'success');
          } catch (err: any) {
            showToast(`Failed to exit ${pos.symbol}: ${err.message}`, 'error');
          }
        }
      }
      await onRefreshData(address);
    } catch (e: any) {
      showToast('Monitoring check failed', 'error');
    } finally {
      setMonitoringLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
          DeFi Vault & Venice AI Core
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Non-custodial Sepolia escrow vault, EIP-712 session approvals, Venice AI risk evaluation, and Uniswap V3 execution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Faucet & Vault Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Sepolia Faucet */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Sepolia Test Faucet
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Mint 1,000 mock testing tokens directly to your connected address.
            </p>

            {!mockInitialized && (
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 mb-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-300 text-xs">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Setup Mock Tokens Environment</span>
                </div>
                <p className="text-[11px] text-purple-200/80">
                  Deploy custom Mock USDC, LINK, and UNI contracts to Sepolia to enable unlimited faucet minting.
                </p>
                <button
                  disabled={!walletConnected || faucetLoading !== null}
                  onClick={handleInitializeMocks}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md"
                >
                  {faucetLoading === 'INITIALIZING' ? 'Deploying Contracts...' : 'Deploy Mock Tokens (MetaMask)'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {['USDC', 'LINK', 'UNI'].map((tok) => (
                <button
                  key={tok}
                  disabled={!walletConnected || faucetLoading !== null || !mockInitialized}
                  onClick={() => handleFaucetClaim(tok)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all disabled:opacity-40"
                >
                  {faucetLoading === tok ? 'Minting...' : `Claim ${tok}`}
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Vault Deposit & Withdraw */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                  Escrow Vault Balances
                </h3>
              </div>
              <button
                onClick={() => address && onRefreshData(address)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                title="Refresh Balances"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Balances Display */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
              <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-gray-400 pb-1 border-b border-white/10">
                <span>Token</span>
                <span>Wallet</span>
                <span className="text-right text-[var(--accent)]">Vault</span>
              </div>
              {['USDC', 'LINK', 'UNI', 'ETH'].map((tok) => (
                <div key={tok} className="grid grid-cols-3 font-mono text-gray-300">
                  <span className="font-bold text-white">{tok}</span>
                  <span>{parseFloat(balances[tok]?.wallet || '0').toFixed(2)}</span>
                  <span className="text-right text-[var(--accent)] font-semibold">
                    {parseFloat(balances[tok]?.vault || '0').toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Deposit & Withdraw Inputs */}
            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={vaultAmount}
                  disabled={!walletConnected}
                  onChange={(e) => setVaultAmount(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono outline-none"
                />
                <select
                  value={vaultToken}
                  disabled={!walletConnected}
                  onChange={(e) => setVaultToken(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded-xl px-4 text-white font-bold"
                >
                  <option value="USDC">USDC</option>
                  <option value="LINK">LINK</option>
                  <option value="UNI">UNI</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDeposit}
                  disabled={!walletConnected || vaultLoading || !vaultAmount}
                  className="py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-600 font-bold text-white disabled:opacity-40"
                >
                  {vaultLoading ? 'Processing...' : 'Deposit to Vault'}
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={!walletConnected || vaultLoading || !vaultAmount}
                  className="py-3 rounded-xl border border-white/20 hover:bg-white/5 font-bold text-white disabled:opacity-40"
                >
                  {vaultLoading ? 'Processing...' : 'Withdraw to Wallet'}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Venice AI & Trading Execution (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 3: Venice AI Spending Policy */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                  EIP-712 Agent Delegation (Venice AI)
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                delegationState?.active 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}>
                {delegationState?.active ? 'DELEGATION ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Max Single Trade Limit:</span>
                <span className="font-bold text-white font-mono">${delegationState?.max_spend_trade || maxSpendTrade}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Max Weekly Budget:</span>
                <span className="font-bold text-white font-mono">${delegationState?.max_spend_week || maxSpendWeek}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                onClick={handleAnalyzeWallet}
                disabled={!walletConnected || policyLoading}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-white flex items-center justify-center gap-2"
              >
                <Brain className="w-4 h-4 text-purple-400" />
                <span>{policyLoading ? 'Evaluating...' : 'Venice AI Recommend'}</span>
              </button>

              {delegationState?.active ? (
                <button
                  onClick={handleRevoke}
                  disabled={delegationLoading}
                  className="py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
                >
                  {delegationLoading ? 'Revoking...' : 'Revoke Delegation'}
                </button>
              ) : (
                <button
                  onClick={handleGrantDelegation}
                  disabled={!walletConnected || delegationLoading}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {delegationLoading ? 'Signing...' : 'Grant Delegation (MetaMask)'}
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Venice AI Momentum Research & Swap */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Token Research & Swapping
              </h3>
            </div>

            <div className="flex gap-2">
              <select
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold"
              >
                <option value="LINK">LINK</option>
                <option value="UNI">UNI</option>
                <option value="WETH">WETH</option>
              </select>

              <button
                onClick={handleScoreToken}
                disabled={researchLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-600 font-bold text-white text-xs"
              >
                {researchLoading ? 'Evaluating...' : `Score ${searchSymbol} with Venice AI`}
              </button>
            </div>

            {scoreResult && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{scoreResult.symbol} Score: {scoreResult.decision.score}/100</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                    VERDICT: {scoreResult.decision.verdict}
                  </span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{scoreResult.decision.reasoning}</p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Amount ($):</span>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAgentSwap}
                    disabled={!walletConnected || tradeLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{tradeLoading ? 'Swapping...' : `Swap USDC → ${scoreResult.symbol}`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Position Monitoring */}
          <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                Active Positions ({positions.filter(p => p.status === 'ACTIVE').length})
              </h3>
              <button
                onClick={handleManualMonitorCheck}
                disabled={monitoringLoading || !walletConnected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${monitoringLoading ? 'animate-spin' : ''}`} />
                <span>Run Position Check</span>
              </button>
            </div>

            <div className="space-y-2">
              {positions.filter(p => p.status === 'ACTIVE').length > 0 ? (
                positions.filter(p => p.status === 'ACTIVE').map((pos) => (
                  <div key={pos.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white font-mono">{pos.token_symbol} Position #{pos.id}</span>
                      <p className="text-gray-400 text-[11px]">Bought at ${pos.buy_price.toFixed(2)} | Target TP: ${pos.take_profit.toFixed(2)}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic py-2">No active positions currently open in vault.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
