import React, { useState, useEffect } from 'react';
import { Save, Cpu, AlertTriangle, Sparkles, Database, Bot, Sun, Moon } from 'lucide-react';
import { getStoredGenLayerConfig, saveGenLayerConfig, type GenLayerConfig } from '../lib/genlayer';
import { API_BASE, setApiBase } from '../lib/api';
import { agentApi, type AIProviderStatus } from '../lib/agentApi';

import type { RuntimeCapability } from '../lib/runtimeCapability';
import { RuntimeCapabilityBar } from '../components/RuntimeCapabilityBar';

interface SettingsViewProps {
  onRefreshStatus: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  capability?: RuntimeCapability;
  theme?: 'dark' | 'light';
  onThemeChange?: (theme: 'dark' | 'light') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onRefreshStatus, 
  showToast, 
  capability,
  theme = 'dark',
  onThemeChange 
}) => {
  const [config, setConfig] = useState<GenLayerConfig>(() => getStoredGenLayerConfig());
  const [apiUrl, setApiUrl] = useState<string>(API_BASE);
  const [testing, setTesting] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIProviderStatus | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    loadAiStatus();
  }, []);

  const loadAiStatus = async () => {
    setLoadingAi(true);
    try {
      const st = await agentApi.getAIStatus();
      setAiStatus(st);
    } catch {
      setAiStatus({
        provider: 'none',
        model: 'None',
        status: 'AI_UNAVAILABLE',
        apiKeyConfigured: false,
        ollamaAvailable: false,
        message: 'Could not fetch AI status from backend API.'
      });
    } finally {
      setLoadingAi(false);
    }
  };

  const isConfigured = Boolean(
    config.contractAddress &&
    config.contractAddress.trim() !== '' &&
    config.contractAddress.replace(/0/g, '').replace(/x/g, '') !== ''
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveGenLayerConfig(config);
    setApiBase(apiUrl);
    showToast("Settings updated successfully!", "success");
    onRefreshStatus();
  };

  const handleTestRpc = async () => {
    setTesting(true);
    try {
      const res = await fetch(config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          showToast(`Connected to GenLayer RPC! Latest block: ${data.result}`, "success");
        } else {
          showToast(`RPC reachable but returned error: ${JSON.stringify(data.error)}`, "info");
        }
      } else {
        showToast(`RPC returned HTTP status ${res.status}`, "info");
      }
    } catch (err: any) {
      showToast(`Could not connect to GenLayer RPC: ${err.message}`, "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
          Platform Configuration & Capability Audit
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Centralize GenLayer network parameters, RPC endpoints, and runtime capabilities with strict truthfulness.
        </p>
      </div>

      {/* Prominent Live Status Strip */}
      {capability && <RuntimeCapabilityBar capability={capability} />}

      {/* Appearance & Theme (Day / Night Mode) Panel */}
      <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Appearance & Theme (Day / Night Mode)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Current: {theme === 'dark' ? 'Night (Dark)' : 'Day (Light)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Night Mode Option */}
          <button
            type="button"
            onClick={() => onThemeChange && onThemeChange('dark')}
            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
              theme === 'dark'
                ? 'bg-purple-600/15 border-purple-500/50 shadow-lg shadow-purple-500/10'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className={`p-3 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Night Mode (Dark)</span>
                {theme === 'dark' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Deep space midnight backdrop with neon glowing accents and glassmorphism. Optimized for low-light environments.
              </p>
            </div>
          </button>

          {/* Day Mode Option */}
          <button
            type="button"
            onClick={() => onThemeChange && onThemeChange('light')}
            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
              theme === 'light'
                ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className={`p-3 rounded-xl flex-shrink-0 ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Day Mode (Light)</span>
                {theme === 'light' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Crisp daylight palette with clean white surfaces, subtle slate grid, and electric royal blue branding.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* System Capability Breakdown Panel */}
      <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Runtime Capability Audit Status
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-400">Strict Truthfulness Model</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">Agent Proposal Studio</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">LIVE</span>
            </div>
            <p className="text-[11px] text-gray-400">Synthesizes actions and bundles verifiable market/oracle evidence.</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">Policy Engine</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">LIVE</span>
            </div>
            <p className="text-[11px] text-gray-400">Deterministic check for spend limits, max slippage, and allowed tokens.</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">GenLayer Adjudication</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                isConfigured 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {isConfigured ? 'LIVE (STUDIONET)' : 'PREVIEW'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Submits to Intelligent Contract and polls decision on Studionet.</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">Sepolia Wallet Execution</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                capability?.executionMode === "LIVE_WALLET" 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {capability?.executionMode === "LIVE_WALLET" ? 'LIVE WALLET' : 'PREVIEW / BLOCKED'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">MetaMask execution requires human confirmation and verified receipt.</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">Demo Reviewer Scenarios</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">DEMO FIXTURES</span>
            </div>
            <p className="text-[11px] text-gray-400">Deterministic review fixtures clearly isolated from live spending.</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">Consensus Telemetry</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-gray-300 border border-white/15">REPORTED ONLY</span>
            </div>
            <p className="text-[11px] text-gray-400">Displays real returned telemetry only; never infers or fabricates counts.</p>
          </div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          
          {/* GenLayer Section */}
          <div className="pb-6 border-b border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                GenLayer Intelligent Contract Configuration
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                  GenLayer Intelligent Contract Address
                </label>
                <input
                  type="text"
                  value={config.contractAddress}
                  onChange={(e) => setConfig({ ...config, contractAddress: e.target.value.trim() })}
                  placeholder="0x... (e.g. deployed JinniAgentGuard address)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono focus:border-[var(--accent)] outline-none text-xs"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Address of deployed JinniAgentGuard on GenLayer Studionet. If left blank or all-zeros, system operates in truthful NOT CONFIGURED mode.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                    GenLayer RPC URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.rpcUrl}
                      onChange={(e) => setConfig({ ...config, rpcUrl: e.target.value.trim() })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono focus:border-[var(--accent)] outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleTestRpc}
                      disabled={testing}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white shrink-0"
                    >
                      {testing ? "Testing..." : "Test RPC"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                    GenLayer Network & Chain ID
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={config.network}
                      onChange={(e) => setConfig({ ...config, network: e.target.value.trim() })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-xs"
                      placeholder="studionet"
                    />
                    <input
                      type="number"
                      value={config.chainId}
                      onChange={(e) => setConfig({ ...config, chainId: parseInt(e.target.value) || 61999 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-xs"
                      placeholder="61999"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase text-[10px] mb-1">
                  GenLayer Explorer Base URL
                </label>
                <input
                  type="text"
                  value={config.explorerBaseUrl}
                  onChange={(e) => setConfig({ ...config, explorerBaseUrl: e.target.value.trim() })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-xs"
                  placeholder="https://explorer-studio.genlayer.com"
                />
              </div>
            </div>
          </div>

          {/* Backend API Configuration */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                JINNI Agent Backend API URL
              </h3>
            </div>

            <div>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value.trim())}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-xs"
                placeholder="http://localhost:8000/api"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Local development default: http://localhost:8000/api
              </span>
            </div>
          </div>

          {/* Off-Chain AI Provider & Reasoning Engine Section */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                  Off-Chain AI Provider (Proposal & Reasoning)
                </h3>
              </div>
              <button
                type="button"
                onClick={loadAiStatus}
                disabled={loadingAi}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-gray-300 hover:text-white"
              >
                {loadingAi ? 'Checking...' : 'Refresh AI Status'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">AI Provider</span>
                  <span className="text-xs font-bold text-white font-mono capitalize">
                    {aiStatus ? aiStatus.provider : 'Loading...'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">AI Model</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {aiStatus ? aiStatus.model : 'Loading...'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">AI Status</span>
                  {aiStatus?.status === 'CONNECTED' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      CONNECTED
                    </span>
                  )}
                  {aiStatus?.status === 'OLLAMA_LOCAL' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      OLLAMA_LOCAL
                    </span>
                  )}
                  {(!aiStatus || aiStatus.status === 'AI_UNAVAILABLE') && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      AI_UNAVAILABLE
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-gray-400 flex items-start gap-2 pt-1">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  {aiStatus?.message || "Checking off-chain AI provider status..."}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[11px] text-purple-200/80">
                <strong>Architectural Note:</strong> The off-chain AI provider (Groq, Gemini, or local Ollama) strictly proposes actions. It has <strong>zero execution authority</strong>. The GenLayer Intelligent Contract on Studionet independently adjudicates every action using on-chain consensus.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button
              id="save-settings-btn"
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:opacity-95 font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
