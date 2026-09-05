import React from 'react';
import { Shield, Wallet, Cpu, AlertTriangle, CheckCircle, Network, ArrowRight } from 'lucide-react';
import type { RuntimeCapability } from '../lib/runtimeCapability';
import { switchToSepolia } from '../lib/web3';

interface RuntimeCapabilityBarProps {
  capability: RuntimeCapability;
  onConnectWallet?: () => void;
  onSwitchNetwork?: () => void;
  compact?: boolean;
}

export const RuntimeCapabilityBar: React.FC<RuntimeCapabilityBarProps> = ({
  capability,
  onConnectWallet,
  compact = false
}) => {
  const handleSwitch = async () => {
    await switchToSepolia();
  };

  // Execution mode pill styling & iconography
  let modeBadgeClass = "bg-purple-500/10 border-purple-500/30 text-purple-300";
  let modeIcon = <Shield className="w-3.5 h-3.5" />;
  if (capability.executionMode === "LIVE_WALLET") {
    modeBadgeClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
    modeIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (capability.executionMode === "UNAVAILABLE") {
    modeBadgeClass = "bg-rose-500/10 border-rose-500/30 text-rose-300";
    modeIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
  } else if (capability.executionMode === "SIMULATION") {
    modeBadgeClass = "bg-amber-500/10 border-amber-500/30 text-amber-300";
    modeIcon = <Shield className="w-3.5 h-3.5 text-amber-400" />;
  }

  return (
    <div className={`w-full bg-white/[0.03] border border-white/10 rounded-2xl ${compact ? 'p-3' : 'p-4'} text-xs text-gray-200 transition-all`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Capability indicators */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* 1. Wallet Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-medium">
            <Wallet className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">Wallet:</span>
            {capability.walletConnected && capability.walletAddress ? (
              <span className="font-mono font-bold text-white">
                {capability.walletAddress.substring(0, 6)}...{capability.walletAddress.substring(capability.walletAddress.length - 4)}
              </span>
            ) : (
              <span className="font-bold text-amber-300">WALLET NOT CONNECTED</span>
            )}
          </div>

          {/* 2. Network Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium ${
            !capability.walletConnected 
              ? 'bg-white/5 border-white/10 text-gray-400'
              : capability.walletChainId === capability.expectedChainId
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 animate-pulse'
          }`}>
            <Network className="w-3.5 h-3.5" />
            <span className="text-gray-400">Network:</span>
            {!capability.walletConnected ? (
              <span className="text-gray-400">Unconnected (Target: Sepolia 11155111)</span>
            ) : capability.walletChainId === capability.expectedChainId ? (
              <span className="font-bold text-blue-300">Sepolia (11155111)</span>
            ) : (
              <span className="font-bold text-rose-300">WRONG NETWORK ({capability.walletChainId || 'Unknown'})</span>
            )}
          </div>

          {/* 3. GenLayer Integration */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium ${
            capability.genlayerConfigured
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-gray-400">GenLayer Guard:</span>
            {capability.genlayerConfigured ? (
              <span className="font-bold text-purple-300 font-mono">
                Studionet ({capability.genlayerContractAddress ? `${capability.genlayerContractAddress.slice(0, 6)}...` : 'Configured'})
              </span>
            ) : (
              <span className="font-bold text-amber-300">NOT CONFIGURED</span>
            )}
          </div>

          {/* 4. Truthful Execution Mode Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${modeBadgeClass}`}>
            {modeIcon}
            <span>Execution Mode: {capability.statusLabel}</span>
          </div>

        </div>

        {/* Right: Quick Action if action is needed */}
        {!capability.walletConnected && onConnectWallet && (
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[11px] font-bold text-white shadow-md shadow-[var(--accent)]/20 transition-all ml-auto"
          >
            <span>Connect Wallet</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {capability.walletConnected && capability.walletChainId !== capability.expectedChainId && (
          <button
            onClick={handleSwitch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white shadow-md shadow-rose-600/20 transition-all ml-auto"
          >
            <span>Switch to Sepolia</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

      </div>

      {/* Block reason message if blocked */}
      {capability.isExecutionBlocked && capability.blockReason && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center gap-2 text-[11px] text-gray-400">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{capability.blockReason}</span>
        </div>
      )}
    </div>
  );
};
