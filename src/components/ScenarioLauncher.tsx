import React, { useState } from 'react';
import { DiagnosticProfile, TargetSource } from '../engine/types';
import { 
  Play, 
  Layers, 
  Search, 
  Zap,
  Sparkles
} from 'lucide-react';

interface ScenarioLauncherProps {
  profiles: DiagnosticProfile[];
  onSelectAndRunProfile: (profileId: string) => void;
  onRunQuickTest: (testType: string, target: string) => void;
  viewMode: 'guided' | 'expert';
}

export const ScenarioLauncher: React.FC<ScenarioLauncherProps> = ({
  profiles,
  onSelectAndRunProfile,
  onRunQuickTest,
  viewMode
}) => {
  const [quickTarget, setQuickTarget] = useState('192.0.2.10');
  const [quickSource, setQuickSource] = useState<TargetSource>('typed');

  return (
    <div className="space-y-6">
      {/* Quick Test Bar */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
                Quick Test Bar
              </span>
            </div>

            {/* Target Input with Typed vs Discovered badge toggle */}
            <div className="relative flex-1 max-w-md flex items-center">
              <input
                type="text"
                value={quickTarget}
                onChange={(e) => setQuickTarget(e.target.value)}
                placeholder="IP Address or FQDN (e.g. 192.0.2.10)"
                className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 pl-8 pr-24"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />

              {/* Source Badge with switch */}
              <button
                type="button"
                onClick={() => setQuickSource(quickSource === 'typed' ? 'discovered' : 'typed')}
                className={`absolute right-1.5 px-2 py-0.5 text-xs font-mono rounded border uppercase transition-colors ${
                  quickSource === 'discovered'
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700 font-semibold'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Toggle between user-typed and planned NSX/vCenter discovered target source"
              >
                src: {quickSource}
              </button>
            </div>
          </div>

          {/* Quick Probe Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ping', label: 'Ping (ICMP)' },
              { id: 'tcp-ping', label: 'TCP Ping (443)' },
              { id: 'traceroute', label: 'Traceroute' },
              { id: 'port-check', label: 'Port Check' },
              { id: 'dns', label: 'DNS Resolve' },
              { id: 'mtu', label: 'MTU Probe' },
              { id: 'https-tls', label: 'HTTPS / TLS' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => onRunQuickTest(btn.id, quickTarget)}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500 transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Guided vs Expert Welcome Banner */}
      {viewMode === 'guided' && (
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-800/60 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-1">
              Guided Diagnostic Mode Active
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              Select one of the pre-configured infrastructure scenarios below. The analyzer will evaluate connectivity, hop latency, MTU sizing, and firewall accessibility between on-premises and your Azure VMware Solution private cloud.
            </p>
          </div>
        </div>
      )}

      {/* Scenario Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Select Diagnostic Scenario</span>
          </h2>
          <span className="text-xs text-slate-300 font-mono">
            {profiles.length} Production Profiles Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const roleCount = profile.rolesUsed?.length || 1;
            const primaryTarget = profile.defaultRoleTargets[profile.rolesUsed[0]] || '192.0.2.10';
            const displayTarget = Array.isArray(primaryTarget) ? primaryTarget[0] : primaryTarget;

            return (
              <div
                key={profile.id}
                className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  {/* Category & Source Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wide font-semibold">
                      {profile.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {profile.rules.length} checks
                      </span>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded border uppercase ${
                          profile.targetSource === 'discovered'
                            ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                        title="Source badge: typed vs discovered"
                      >
                        {profile.targetSource}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-semibold text-slate-100 mb-1.5">
                    {profile.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {profile.description}
                  </p>

                  {/* Target and MTU Baseline info */}
                  <div className="bg-[#020617] p-3 rounded-lg border border-slate-800 mb-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-mono text-xs">Primary Target:</span>
                      <span className="font-mono text-slate-100 font-semibold">{displayTarget}</span>
                    </div>
                    {profile.defaultTargetLabel && (
                      <div className="flex items-center justify-between text-slate-300 text-xs">
                        <span className="text-slate-400 font-mono">Host Label:</span>
                        <span className="font-mono text-slate-300 truncate max-w-[200px]">
                          {profile.defaultTargetLabel}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-300 text-xs pt-1.5 border-t border-slate-800">
                      <span className="font-mono text-slate-400">Path MTU:</span>
                      <span className="font-mono text-cyan-300 font-semibold">
                        {profile.mtuSettings?.defaultPathMtu || 1500} bytes
                      </span>
                    </div>
                    <div className="text-xs text-amber-300/90 font-mono">
                      {profile.mtuSettings?.thresholdNote || 'Unverified default, confirm for your design'}
                    </div>
                  </div>

                  {/* Expert View Rules breakdown */}
                  {viewMode === 'expert' && (
                    <div className="mb-4">
                      <div className="text-xs font-mono text-slate-300 mb-1.5 font-semibold">Key Port Probes:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.rules.slice(0, 5).map((rule) => (
                          <span
                            key={rule.id}
                            className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700"
                            title={`${rule.protocol}/${rule.port}: ${rule.purpose}`}
                          >
                            {rule.protocol}/{rule.port}
                          </span>
                        ))}
                        {profile.rules.length > 5 && (
                          <span className="text-xs font-mono px-2 py-0.5 text-slate-400">
                            +{profile.rules.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 font-mono">
                    {roleCount} Role Target{roleCount > 1 ? 's' : ''}
                  </div>
                  <button
                    onClick={() => onSelectAndRunProfile(profile.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Diagnostic</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
