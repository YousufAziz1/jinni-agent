import React, { useState } from 'react';
import { Save, Cpu, Database } from 'lucide-react';
import { getStoredGenLayerConfig, saveGenLayerConfig, type GenLayerConfig } from '../lib/genlayer';
import { API_BASE, setApiBase } from '../lib/api';

interface SettingsViewProps {
  onRefreshStatus: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshStatus, showToast }) => {
  const [config, setConfig] = useState<GenLayerConfig>(() => getStoredGenLayerConfig());
  const [apiUrl, setApiUrl] = useState<string>(API_BASE);
  const [testing, setTesting] = useState(false);

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
        body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 })
      });
      if (res.ok) {
        showToast("Successfully connected to GenLayer RPC!", "success");
      } else {
        showToast(`RPC reachable but returned status ${res.status}`, "info");
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
          Platform Configuration & Settings
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Centralize GenLayer network parameters, RPC endpoints, and contract addresses.
        </p>
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
                  placeholder="e.g. 0x498b9C23C91079Dda25c48dE1E90E9e68b3568F5"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono focus:border-[var(--accent)] outline-none text-xs"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Address of deployed JinniAgentGuard on GenLayer Studionet. If left blank, system operates in isolated adapter mode.
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
                      {testing ? "Testing..." : "Test"}
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
                  placeholder="https://studio.genlayer.com/explorer"
                />
              </div>
            </div>
          </div>

          {/* Backend API Configuration */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                JINNI Backend API URL
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
