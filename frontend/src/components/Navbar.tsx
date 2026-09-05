import React from 'react';
import { 
  Shield, 
  Brain, 
  Sliders, 
  FileText, 
  Activity, 
  Award, 
  Vault, 
  Settings as SettingsIcon,
  Wallet
} from 'lucide-react';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  address,
  walletConnected,
  onConnectWallet,
  genlayerConfigured,
  sepoliaConnected
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'agent', label: 'Agent', icon: <Brain className="w-4 h-4" />, badge: 'Core' },
    { id: 'policies', label: 'Policies', icon: <Sliders className="w-4 h-4" /> },
    { id: 'proposals', label: 'Proposals', icon: <FileText className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'proofs', label: 'Decision Proofs', icon: <Award className="w-4 h-4" /> },
    { id: 'vault', label: 'DeFi Vault', icon: <Vault className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Product Title */}
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => onTabChange('overview')}>
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 border border-white/20 overflow-hidden">
                <img src="/logo.jpg" alt="JINNI Agent" className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }} />
                <Shield className="w-6 h-6 text-white absolute" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black" title="System Online" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-display font-extrabold tracking-tight text-white">
                  JINNI <span className="bg-gradient-to-r from-[var(--accent)] via-purple-300 to-[var(--accent-2)] bg-clip-text text-transparent">Agent</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[var(--accent)]/20 text-purple-300 border border-[var(--accent)]/30">
                  GenLayer Guard
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Autonomous actions. Independent judgment.
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
          </nav>

          {/* Right Action: Network Badges & Wallet Connect */}
          <div className="flex items-center gap-3">
            {/* GenLayer Guard Badge */}
            <div 
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                genlayerConfigured 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
              title={genlayerConfigured ? "GenLayer Studionet Active" : "GenLayer Contract Not Configured (Adapter Active)"}
            >
              <div className={`w-2 h-2 rounded-full ${genlayerConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{genlayerConfigured ? "GenLayer Guard" : "GenLayer: Adapter"}</span>
            </div>

            {/* Sepolia Badge */}
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-300"
              title="Ethereum Sepolia Network"
            >
              <div className={`w-2 h-2 rounded-full ${sepoliaConnected ? 'bg-blue-400' : 'bg-gray-400'}`} />
              <span>Sepolia</span>
            </div>

            {/* Wallet Connect Button */}
            {walletConnected && address ? (
              <button
                id="wallet-connected-btn"
                onClick={onConnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
              </button>
            ) : (
              <button
                id="connect-wallet-btn"
                onClick={onConnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] hover:opacity-90 text-xs font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Sub-Navigation */}
        <div className="lg:hidden flex overflow-x-auto py-2.5 gap-1.5 no-scrollbar border-t border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)] text-white font-semibold'
                  : 'text-gray-400 hover:text-white bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

      </div>
    </header>
  );
};
