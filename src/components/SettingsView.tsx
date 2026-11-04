import React, { useState } from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  HardDrive, 
  Check, 
  Gauge, 
  Palette,
  RotateCcw
} from 'lucide-react';

interface SettingsViewProps {
  viewMode: 'guided' | 'expert';
  onToggleViewMode: (mode: 'guided' | 'expert') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  viewMode,
  onToggleViewMode
}) => {
  const [theme, setTheme] = useState<'dark-default' | 'high-contrast'>('dark-default');
  const [latencyUnit, setLatencyUnit] = useState<'ms' | 'us'>('ms');
  const [tcpTimeoutMs, setTcpTimeoutMs] = useState(3000);
  const [icmpTimeoutMs, setIcmpTimeoutMs] = useState(1000);
  const [rateLimitProbesPerSec, setRateLimitProbesPerSec] = useState(20);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = () => {
    localStorage.setItem(
      'zaboraa_analyzer_settings',
      JSON.stringify({
        theme,
        latencyUnit,
        tcpTimeoutMs,
        icmpTimeoutMs,
        rateLimitProbesPerSec,
        viewMode
      })
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetDefaults = () => {
    setTheme('dark-default');
    setLatencyUnit('ms');
    setTcpTimeoutMs(3000);
    setIcmpTimeoutMs(1000);
    setRateLimitProbesPerSec(20);
    onToggleViewMode('expert');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Settings Header */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Workstation Engine & Operational Settings
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Configure local probe timing, IDS rate dampening, display units, and operational safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedSuccess ? 'Settings Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </section>

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safe-Use Notice Card (Prominent requirement) */}
        <div className="bg-amber-950/20 border border-amber-700/60 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="uppercase font-mono">Safe-Use Operational Notice</span>
            </div>
            <p className="text-xs text-amber-200 leading-relaxed font-sans">
              <strong>Use only on infrastructure you are authorised to test.</strong> Active network probing generates synthetic TCP SYN packets, UDP datagrams, and ICMP Don't-Fragment payload sweeps. Unauthorized probing may trigger corporate Security Information and Event Management (SIEM) detections or Intrusion Prevention System (IPS) shunning.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-900/60 text-xs font-mono text-amber-400">
            Enforced policy: Fail-closed local execution only.
          </div>
        </div>

        {/* No Data Leaves This Computer Statement (Prominent requirement) */}
        <div className="bg-cyan-950/20 border border-cyan-800/60 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="uppercase font-mono">Strict Local-First Privacy Statement</span>
            </div>
            <p className="text-xs text-cyan-200 leading-relaxed font-sans">
              <strong>No data leaves this computer.</strong> Zaboraa Network Path Analyzer operates in an air-gapped architecture. All probe statistics, IP routing tables, hostnames, and generated firewall change requests remain stored exclusively on your local machine. Zero telemetry or analytical metadata is dispatched to the cloud.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-cyan-900/60 text-xs font-mono text-cyan-400">
            Verification: 0 external analytics or third-party endpoints.
          </div>
        </div>

        {/* Operational View & Theme */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-100 font-mono uppercase">
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>Interface & Display</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* View Mode default */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-medium block">Default Navigation Mode:</span>
                <span className="text-xs text-slate-400">Expert shows raw tables by default</span>
              </div>
              <div className="flex items-center bg-[#020617] rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => onToggleViewMode('guided')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    viewMode === 'guided' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300'
                  }`}
                >
                  Guided
                </button>
                <button
                  type="button"
                  onClick={() => onToggleViewMode('expert')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    viewMode === 'expert' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300'
                  }`}
                >
                  Expert
                </button>
              </div>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-medium block">Visual Theme:</span>
                <span className="text-xs text-slate-400">Dark #020617 with cyan & emerald accents</span>
              </div>
              <select
                value={theme}
                onChange={(e: any) => setTheme(e.target.value)}
                className="bg-[#020617] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="dark-default">Workstation Dark (Default)</option>
                <option value="high-contrast">High Contrast Dark</option>
              </select>
            </div>

            {/* Units */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-medium block">Latency Precision:</span>
                <span className="text-xs text-slate-400">Time representation in tables and charts</span>
              </div>
              <select
                value={latencyUnit}
                onChange={(e: any) => setLatencyUnit(e.target.value)}
                className="bg-[#020617] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="ms">Milliseconds (ms)</option>
                <option value="us">Microseconds (µs)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Engine Probe Rates & Default Timeouts */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-100 font-mono uppercase">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Timeouts & IDS Rate Limiting</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Rate Limit Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-200 font-medium">Probe Rate Limiting:</span>
                <span className="font-mono text-cyan-400 font-semibold">{rateLimitProbesPerSec} probes/sec</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={rateLimitProbesPerSec}
                onChange={(e) => setRateLimitProbesPerSec(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-mono block mt-0.5">
                Lower rates prevent tripping IDS/IPS heuristic thresholds on transit routers.
              </span>
            </div>

            {/* TCP Timeout */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-medium block">TCP Connect Timeout:</span>
                <span className="text-xs text-slate-400">Maximum SYN-ACK wait duration</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  value={tcpTimeoutMs}
                  onChange={(e) => setTcpTimeoutMs(Number(e.target.value))}
                  className="w-24 bg-[#020617] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-100 text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-slate-300 font-mono">ms</span>
              </div>
            </div>

            {/* ICMP Timeout */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-medium block">ICMP Echo Timeout:</span>
                <span className="text-xs text-slate-400">Hop timeout per round-trip echo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={250}
                  max={5000}
                  step={250}
                  value={icmpTimeoutMs}
                  onChange={(e) => setIcmpTimeoutMs(Number(e.target.value))}
                  className="w-24 bg-[#020617] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-100 text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-slate-300 font-mono">ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
