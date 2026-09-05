import React, { useState } from 'react';
import { 
  Shield, 
  Brain, 
  Sliders, 
  FileText, 
  Activity, 
  Award, 
  Settings as SettingsIcon,
  Wallet,
  Menu,
  X,
  Vault,
  Network
} from 'lucide-react';
import { switchToSepolia } from '../lib/web3';

export type NavTab = 
  | 'overview' 
  | 'agent' 
  | 'policies' 
  | 'proposals' 
  | 'activity' 
  | 'proofs' 
  | 'vault' 
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  address: string;
  walletConnected: boolean;
  onConnectWallet: () => void;
  genlayerConfigured: boolean;
  sepoliaConnected: boolean;
  walletChainId?: number | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  address,
  walletConnected,
  onConnectWallet,
  genlayerConfigured,
  walletChainId
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSepolia = walletConnected && walletChainId === 11155111;

  // Core visible tabs (DeFi Vault moved to secondary navigation)
  const coreTabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'agent', label: 'Agent Core', icon: <Brain className="w-4 h-4" />, badge: 'Studio' },
    { id: 'policies', label: 'Policies', icon: <Sliders className="w-4 h-4" /> },
    { id: 'proposals', label: 'Proposals', icon: <FileText className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'proofs', label: 'Decision Proofs', icon: <Award className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Product Branding */}
          <div 
            className="flex items-center gap-3 sm:gap-4 cursor-pointer" 
            onClick={() => onTabChange('overview')}
          >
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-purple-600 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 border border-white/20 overflow-hidden">
                <img 
                  src="/logo.jpg" 
                  alt="JINNI Agent" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }} 
                />
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white absolute" />
              </div>
              <div 
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" 
                title="System Operational" 
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-display font-extrabold tracking-tight text-white">
                  JINNI <span className="bg-gradient-to-r from-[var(--accent)] via-purple-300 to-teal-300 bg-clip-text text-transparent">Agent</span>
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[var(--accent)]/20 text-purple-300 border border-[var(--accent)]/30">
                  GenLayer Guard
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                Autonomous actions. Independent judgment.
              </p>
            </div>
          </div>

          {/* Desktop Core Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
            {coreTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25 font-bold'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Secondary Option: DeFi Vault */}
            <button
              id="nav-tab-vault"
              onClick={() => onTabChange('vault')}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'vault'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Secondary Feature: Sepolia Vault & Token Management"
            >
              <Vault className="w-3.5 h-3.5" />
              <span>Vault</span>
            </button>
          </nav>

          {/* Right Action: Network Badges & Wallet Connect */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* GenLayer Guard Status */}
            <div 
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                genlayerConfigured 
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
              title={genlayerConfigured ? "GenLayer Studionet Active" : "GenLayer Contract Not Configured"}
            >
              <div className={`w-2 h-2 rounded-full ${genlayerConfigured ? 'bg-purple-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{genlayerConfigured ? "GenLayer Guard" : "GenLayer: Unconfigured"}</span>
            </div>

            {/* Network Indicator */}
            {walletConnected ? (
              <div 
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  isSepolia 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300 cursor-pointer animate-pulse'
                }`}
                onClick={() => { if (!isSepolia) switchToSepolia(); }}
                title={isSepolia ? "Connected to Ethereum Sepolia" : "Wrong Network! Click to switch to Sepolia"}
              >
                <Network className="w-3 h-3" />
                <span>{isSepolia ? "Sepolia" : `Wrong Chain (${walletChainId || '?'})`}</span>
              </div>
            ) : null}

            {/* Wallet Connect Button */}
            {walletConnected && address ? (
              <button
                id="wallet-connected-btn"
                onClick={onConnectWallet}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
              </button>
            ) : (
              <button
                id="connect-wallet-btn"
                onClick={onConnectWallet}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:opacity-90 text-xs font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Mobile / Tablet Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile / Narrow Screen Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t border-white/10 animate-fadeIn space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
              {coreTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[var(--accent)] text-white font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  onTabChange('vault');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'vault'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Vault className="w-4 h-4" />
                <span>DeFi Vault</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
