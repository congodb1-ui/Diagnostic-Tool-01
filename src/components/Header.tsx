import React from 'react';
import { 
  Activity, 
  Terminal, 
  ShieldCheck, 
  GitCompare, 
  FileText, 
  Radio, 
  Layers, 
  Sliders, 
  Compass,
  Cpu,
  Shield
} from 'lucide-react';

export type ScreenTab = 
  | 'scenarios' 
  | 'run' 
  | 'firewall' 
  | 'compare' 
  | 'reports' 
  | 'responder' 
  | 'connections' 
  | 'settings';

interface HeaderProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  viewMode: 'guided' | 'expert';
  onToggleViewMode: (mode: 'guided' | 'expert') => void;
  onSelectMockScenario: (scenario: 'scenario-a' | 'scenario-b' | 'scenario-c') => void;
  activeMockScenario: 'scenario-a' | 'scenario-b' | 'scenario-c';
  isMock: boolean;
  isAirGapped: boolean;
  isRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  viewMode,
  onToggleViewMode,
  onSelectMockScenario,
  activeMockScenario,
  isMock,
  isAirGapped,
  isRunning
}) => {
  return (
    <header className="bg-[#020617] border-b border-slate-800 text-slate-100 select-none">
      {/* Top Application Bar */}
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-inner border border-cyan-400/30">
            <Activity className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
                Zaboraa Network Path Analyzer
              </span>
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                v1.2 Win64
              </span>
            </div>
            <span className="text-xs text-slate-300">
              Hybrid Transit Diagnostics · On-Prem VMware to Azure VMware Solution
            </span>
          </div>
        </div>

        {/* Center: Mock Scenarios Buttons (Only rendered when isMock is true) */}
        {isMock && (
          <div className="hidden xl:flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Mock Scenarios:
            </span>
            <button
              onClick={() => onSelectMockScenario('scenario-a')}
              className={`px-2.5 py-1 text-xs rounded font-mono border transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                activeMockScenario === 'scenario-a'
                  ? 'bg-amber-950 text-amber-200 border-amber-600 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-900/60'
              }`}
              title="Scenario A: ICMP blocked at hop 4 (192.0.2.4) but TCP 443 succeeds"
              aria-label="Select Scenario A: ICMP blocked at hop 4"
            >
              Scenario A (Hop 4 ICMP)
            </button>
            <button
              onClick={() => onSelectMockScenario('scenario-b')}
              className={`px-2.5 py-1 text-xs rounded font-mono border transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                activeMockScenario === 'scenario-b'
                  ? 'bg-rose-950 text-rose-200 border-rose-600 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-rose-900/60'
              }`}
              title="Scenario B: HCX pre-check: UDP 4500 inconclusive, TCP 8123 filtered"
              aria-label="Select Scenario B: HCX pre-check"
            >
              Scenario B (HCX 8123/4500)
            </button>
            <button
              onClick={() => onSelectMockScenario('scenario-c')}
              className={`px-2.5 py-1 text-xs rounded font-mono border transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                activeMockScenario === 'scenario-c'
                  ? 'bg-cyan-950 text-cyan-200 border-cyan-600 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-900/60'
              }`}
              title="Scenario C: MTU probe: 1472 passes, 1500 fails, requires 1600"
              aria-label="Select Scenario C: MTU probe"
            >
              Scenario C (MTU 1500 vs 1600)
            </button>
          </div>
        )}

        {/* Right Zone: Air-Gapped badge (shown only when offline/airgapped) and Guided/Expert toggle */}
        <div className="flex items-center gap-3">
          {/* Air-Gapped Local Engine Badge: ONLY appears when isAirGapped is true */}
          {isAirGapped && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-700/80 px-2.5 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" aria-hidden="true" />
              <span>Air-Gapped Local Engine</span>
            </div>
          )}

          {/* Guided / Expert View Toggle */}
          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-slate-800" role="group" aria-label="View Mode">
            <button
              onClick={() => onToggleViewMode('guided')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                viewMode === 'guided'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              aria-pressed={viewMode === 'guided'}
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Guided</span>
            </button>
            <button
              onClick={() => onToggleViewMode('expert')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                viewMode === 'expert'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              aria-pressed={viewMode === 'expert'}
            >
              <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Expert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Row */}
      <nav className="border-t border-slate-800/80 bg-[#070d1e] px-4 flex items-center gap-1 overflow-x-auto" aria-label="Workspace Tabs">
        <button
          onClick={() => onSelectTab('scenarios')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'scenarios'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Scenario Launcher</span>
        </button>

        <button
          onClick={() => onSelectTab('run')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'run'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <Activity className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Run Screen & Trace</span>
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" aria-label="Running" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('firewall')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'firewall'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Firewall Requests</span>
        </button>

        <button
          onClick={() => onSelectTab('compare')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'compare'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Compare Runs</span>
        </button>

        <button
          onClick={() => onSelectTab('reports')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'reports'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reports & Evidence</span>
        </button>

        <button
          onClick={() => onSelectTab('responder')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'responder'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <Radio className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Responder Mode</span>
        </button>

        <button
          onClick={() => onSelectTab('connections')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'connections'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Connections</span>
          <span className="text-xs uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
            Planned
          </span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ml-auto focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
            currentTab === 'settings'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-900/30'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Settings</span>
        </button>
      </nav>
    </header>
  );
};
