import React, { useState } from 'react';
import { 
  DiagnosticProfile, 
  Finding, 
  HopResult, 
  CheckResult, 
  RunProgress, 
  TargetRole,
  TargetSource,
  SeverityLevel 
} from '../engine/types';
import { 
  Play, 
  Square, 
  RefreshCw, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Activity, 
  Clock, 
  Plus,
  Trash2,
  TrendingUp,
  Info,
  Radio,
  ChevronRight
} from 'lucide-react';
import { getCheckStatusClasses, getSeverityClasses } from '../utils/formatters';
import { AddressPlanCheck } from './AddressPlanCheck';

interface RunScreenProps {
  profiles: DiagnosticProfile[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  targetRoles: Partial<Record<TargetRole, string | string[]>>;
  onChangeTargetRole: (role: TargetRole, value: string | string[]) => void;
  targetSource: TargetSource;
  onToggleTargetSource: () => void;
  customMtuThreshold: number;
  onChangeMtuThreshold: (mtu: number) => void;
  runProgress: RunProgress | null;
  isRunning: boolean;
  onStartRun: () => void;
  onCancelRun: () => void;
  onSelectFinding: (finding: Finding) => void;
  viewMode: 'guided' | 'expert';
}

export const RunScreen: React.FC<RunScreenProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  targetRoles,
  onChangeTargetRole,
  targetSource,
  onToggleTargetSource,
  customMtuThreshold,
  onChangeMtuThreshold,
  runProgress,
  isRunning,
  onStartRun,
  onCancelRun,
  onSelectFinding,
  viewMode
}) => {
  const [hoveredHop, setHoveredHop] = useState<HopResult | null>(null);
  const [showMtuInfo, setShowMtuInfo] = useState(false);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const hops = runProgress?.hops || [];
  const checks = runProgress?.checks || [];
  const findings = runProgress?.findings || [];
  const percent = runProgress?.percent || 0;
  const elapsedMs = runProgress?.elapsedMs || 0;
  const state = runProgress?.state || 'idle';
  const taskDesc = runProgress?.currentTaskDescription || 'Ready to execute diagnostic path probe.';

  // Latency chart calculations
  const maxLatency = Math.max(...hops.map((h) => h.avgLatencyMs), 25);
  const chartHeight = 120;
  const chartWidth = 700;

  // Handle ESXi host list adding/removing
  const esxiList: string[] = Array.isArray(targetRoles['esxi-host'])
    ? (targetRoles['esxi-host'] as string[])
    : targetRoles['esxi-host']
    ? [targetRoles['esxi-host'] as string]
    : ['192.0.2.31'];

  const handleAddEsxiHost = () => {
    const nextOctet = 30 + esxiList.length + 1;
    onChangeTargetRole('esxi-host', [...esxiList, `192.0.2.${nextOctet}`]);
  };

  const handleRemoveEsxiHost = (index: number) => {
    if (esxiList.length > 1) {
      const nextList = esxiList.filter((_, i) => i !== index);
      onChangeTargetRole('esxi-host', nextList);
    }
  };

  const handleUpdateEsxiHost = (index: number, val: string) => {
    const nextList = [...esxiList];
    nextList[index] = val;
    onChangeTargetRole('esxi-host', nextList);
  };

  const getRoleDisplayName = (role: TargetRole): string => {
    switch (role) {
      case 'hcx-manager': return 'HCX Manager IP/FQDN';
      case 'hcx-interconnect': return 'HCX Interconnect (IX) IP';
      case 'esxi-host': return 'ESXi Host Target(s)';
      case 'vcenter': return 'vCenter Server IP/FQDN';
      case 'nsx-manager': return 'NSX Manager IP/FQDN';
      case 'dns-server': return 'DNS Server IP';
      case 'ad-controller': return 'Active Directory DC IP';
      case 'tep': return 'NSX TEP Endpoint IP';
      default: return 'Target Host IP';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Configuration & Control Bar */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex flex-col gap-3 flex-1">
            {/* Top row: Profile selector, Target source, and MTU */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Profile Dropdown */}
              <div className="flex flex-col gap-1 min-w-[240px]">
                <label className="text-xs font-mono uppercase text-slate-300 font-medium">
                  Diagnostic Profile:
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => onSelectProfile(e.target.value)}
                  disabled={isRunning}
                  className="bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Source Toggle */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-medium">
                  Target Source:
                </label>
                <button
                  type="button"
                  onClick={onToggleTargetSource}
                  disabled={isRunning}
                  className={`text-xs font-mono px-3 py-2 rounded-lg border uppercase transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                    targetSource === 'discovered'
                      ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700 font-semibold'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Source: 'typed' by user vs 'discovered' via planned VMware/NSX connector"
                >
                  src: {targetSource}
                </button>
              </div>

              {/* Editable MTU Threshold */}
              <div className="flex flex-col gap-1 min-w-[190px]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-slate-300 font-medium">
                    MTU Threshold:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMtuInfo(!showMtuInfo)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 focus-visible:ring-1 focus-visible:ring-cyan-400 focus:outline-none"
                    title="View MTU documentation note"
                    aria-label="View MTU documentation note"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>note</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customMtuThreshold}
                    onChange={(e) => onChangeMtuThreshold(Number(e.target.value))}
                    disabled={isRunning}
                    min={1280}
                    max={9000}
                    step={10}
                    className="w-24 bg-[#020617] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 text-right focus:outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-300 font-mono">bytes</span>
                </div>
              </div>
            </div>

            {/* Role-Specific Target Inputs */}
            <div className="p-3 rounded-lg bg-[#070d1e] border border-slate-800 space-y-2.5">
              <span className="text-xs font-mono uppercase text-cyan-400 font-semibold block">
                Profile Role Target Assignments:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeProfile.rolesUsed.map((role) => {
                  if (role === 'esxi-host') {
                    return (
                      <div key={role} className="space-y-1.5 col-span-1 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono text-slate-300 font-medium">
                            {getRoleDisplayName(role)}:
                          </label>
                          <button
                            type="button"
                            onClick={handleAddEsxiHost}
                            disabled={isRunning}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add host</span>
                          </button>
                        </div>
                        <div className="space-y-1">
                          {esxiList.map((host, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={host}
                                onChange={(e) => handleUpdateEsxiHost(idx, e.target.value)}
                                disabled={isRunning}
                                placeholder="e.g. 192.0.2.31"
                                className="flex-1 bg-[#020617] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                              />
                              {esxiList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEsxiHost(idx)}
                                  disabled={isRunning}
                                  className="p-1 text-slate-400 hover:text-rose-400"
                                  aria-label="Remove ESXi host"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  const curVal = typeof targetRoles[role] === 'string' ? (targetRoles[role] as string) : '';
                  return (
                    <div key={role} className="space-y-1">
                      <label className="text-xs font-mono text-slate-300 font-medium">
                        {getRoleDisplayName(role)}:
                      </label>
                      <input
                        type="text"
                        value={curVal}
                        onChange={(e) => onChangeTargetRole(role, e.target.value)}
                        disabled={isRunning}
                        placeholder="e.g. 192.0.2.10"
                        className="w-full bg-[#020617] border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Trigger / Stop Button */}
          <div className="flex flex-col items-end gap-2 shrink-0 pt-2 lg:pt-0">
            {isRunning ? (
              <button
                onClick={onCancelRun}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors focus-visible:ring-2 focus-visible:ring-rose-400 focus:outline-none"
              >
                <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Cancel Probe</span>
              </button>
            ) : (
              <button
                onClick={onStartRun}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Start Path Run</span>
              </button>
            )}
          </div>
        </div>

        {/* MTU Source & Verify note popout */}
        {showMtuInfo && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 bg-[#070d1e] p-3 rounded-lg flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-200 font-medium">
              <span>MTU Requirement Note:</span>
              <span className="text-xs font-mono text-amber-300">
                {activeProfile.mtuSettings?.thresholdNote || 'Unverified default, confirm for your design'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Source: {activeProfile.mtuSettings?.source || 'Zaboraa internal, to be verified'}
            </p>
            <p className="text-xs text-slate-400">
              {activeProfile.mtuSettings?.verifyAgainstVersion || 'Verify against your NSX version'}
            </p>
          </div>
        )}

        {/* Progress status ribbon */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            {isRunning ? (
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" aria-hidden="true" />
            ) : state === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <Activity className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <span className="text-slate-200 font-mono text-xs truncate">{taskDesc}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-slate-300 font-mono text-xs hidden sm:inline">
              Elapsed: <strong className="text-slate-100">{(elapsedMs / 1000).toFixed(1)}s</strong>
            </span>
            <div className="w-28 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-slate-100 font-mono text-xs w-8 text-right font-semibold">{percent}%</span>
          </div>
        </div>
      </section>

      {/* If ExpressRoute profile is selected, show Address Plan CIDR Check */}
      {selectedProfileId === 'expressroute-reachability' && (
        <AddressPlanCheck />
      )}

      {/* Main Grid: Centre Hop Table & Latency Line Chart (8 cols) + Right Diagnosis Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Centre: Live Hop Table & Latency Line Chart (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Latency Line Chart */}
          <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
                  Transit Path Latency Distribution (RTT)
                </h3>
              </div>
              <span className="text-xs text-slate-300 font-mono">
                {hops.length > 0 ? `${hops.length} Hops Traversed` : 'Awaiting execution'}
              </span>
            </div>

            {hops.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-xs font-mono">
                <span>Start path run to plot hop-by-hop latency and packet jitter</span>
              </div>
            ) : (
              <div className="relative pt-2 pb-1">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-28 overflow-visible"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = chartHeight - pct * (chartHeight - 20) - 10;
                    const val = (pct * maxLatency).toFixed(0);
                    return (
                      <g key={i}>
                        <line
                          x1="35"
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                        />
                        <text
                          x="2"
                          y={y + 4}
                          fill="#94a3b8"
                          fontSize="10"
                          fontFamily="JetBrains Mono"
                        >
                          {val}ms
                        </text>
                      </g>
                    );
                  })}

                  {/* Latency Line */}
                  {hops.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      points={hops
                        .map((hop, idx) => {
                          const x = 45 + (idx / (hops.length - 1)) * (chartWidth - 65);
                          const y =
                            chartHeight -
                            (hop.lossPercent === 100
                              ? 0
                              : (hop.avgLatencyMs / maxLatency) * (chartHeight - 20)) -
                            10;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  )}

                  {/* Hop Marker Points */}
                  {hops.map((hop, idx) => {
                    const x = 45 + (idx / Math.max(hops.length - 1, 1)) * (chartWidth - 65);
                    const y =
                      chartHeight -
                      (hop.lossPercent === 100
                        ? 0
                        : (hop.avgLatencyMs / maxLatency) * (chartHeight - 20)) -
                      10;

                    const isBlocked = hop.lossPercent === 100 || hop.status === 'BLOCKED';
                    const isWarning = hop.status === 'WARNING';
                    const pointColor = isBlocked ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981';

                    return (
                      <g
                        key={hop.hopNumber}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredHop(hop)}
                        onMouseLeave={() => setHoveredHop(null)}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={hoveredHop?.hopNumber === hop.hopNumber ? 6 : 4}
                          fill={pointColor}
                          stroke="#020617"
                          strokeWidth="2"
                        />
                        <text
                          x={x}
                          y={chartHeight + 12}
                          fill="#cbd5e1"
                          fontSize="10"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                        >
                          H{hop.hopNumber}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredHop && (
                  <div className="absolute top-0 right-4 bg-[#020617] border border-cyan-500/60 rounded p-2 text-xs font-mono shadow-lg text-slate-200">
                    <span className="text-cyan-400 font-semibold">Hop {hoveredHop.hopNumber}:</span>{' '}
                    {hoveredHop.ip} ({hoveredHop.hostname})
                    <div className="text-xs text-slate-300 mt-0.5">
                      RTT: {hoveredHop.avgLatencyMs}ms · Loss: {hoveredHop.lossPercent}% · Jitter:{' '}
                      {hoveredHop.jitterMs}ms
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Live Hop Table */}
          <section className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
                Live Hop Diagnostic Table
              </h3>
              <span className="text-xs text-slate-300 font-mono">
                ICMP / TCP Probing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" role="table">
                <thead className="bg-[#0b1329] text-slate-300 uppercase font-mono text-xs border-b border-slate-800">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 w-12 text-center">Hop</th>
                    <th scope="col" className="px-3 py-2.5">IP Address</th>
                    <th scope="col" className="px-3 py-2.5">Hostname / Gateway</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Loss %</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Avg ms</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Jitter</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {hops.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                        No active hop telemetry. Click "Start Path Run" to trace network path.
                      </td>
                    </tr>
                  ) : (
                    hops.map((hop) => {
                      const isBlocked = hop.status === 'BLOCKED' || hop.lossPercent === 100;
                      const isWarning = hop.status === 'WARNING';
                      return (
                        <tr
                          key={hop.hopNumber}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isBlocked ? 'bg-rose-950/20' : isWarning ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center text-slate-300 font-semibold">
                            {hop.hopNumber}
                          </td>
                          <td className="px-3 py-2.5 text-slate-100 font-semibold">
                            {hop.ip}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200 font-sans truncate max-w-[220px]" title={hop.hostname}>
                            {hop.hostname}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums ${hop.lossPercent > 0 ? 'text-rose-300 font-bold' : 'text-slate-300'}`}>
                            {hop.lossPercent}%
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-200 tabular-nums">
                            {hop.lossPercent === 100 ? '*' : `${hop.avgLatencyMs.toFixed(2)}`}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">
                            {hop.lossPercent === 100 ? '*' : `${hop.jitterMs.toFixed(2)}`}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-200 border border-rose-600">
                                <XCircle className="w-3.5 h-3.5 text-rose-300" aria-hidden="true" />
                                <span>BLOCKED</span>
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-200 border border-amber-600">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                                <span>WARNING</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-200 border border-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                                <span>OK</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Diagnosis Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
                  Diagnosis Findings
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-300">
                {findings.length} findings
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-mono my-auto">
                <p>No active findings yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Run diagnostics to analyze firewall filters, MTU overhead, and port connectivity.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[580px] pr-1">
                {findings.map((f) => {
                  const style = getSeverityClasses(f.severity);
                  return (
                    <div
                      key={f.id}
                      onClick={() => onSelectFinding(f)}
                      className={`p-3 rounded-lg border ${style.border} ${style.bg} hover:border-cyan-400 cursor-pointer transition-all group`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          {f.severity === 'BLOCKED' ? (
                            <XCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                          ) : f.severity === 'WARNING' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                          )}
                          <span className={`text-xs font-mono uppercase font-bold px-2 py-0.5 rounded ${style.badge}`}>
                            {f.severity}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-300">
                          Conf: {f.confidence}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors mb-1">
                        {f.title}
                      </h4>

                      <p className="text-xs text-slate-300 leading-snug line-clamp-2 mb-2">
                        {f.cause}
                      </p>

                      <div className="flex items-center justify-between text-xs text-cyan-400 font-mono pt-1.5 border-t border-slate-800">
                        <span>Inspect Evidence & Fix</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Below: Timeline of Checks as they complete */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
              Check Execution Timeline
            </h3>
          </div>
          <span className="text-xs text-slate-300 font-mono">
            {checks.length} Completed Checks
          </span>
        </div>

        {checks.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs font-mono border border-dashed border-slate-800 rounded-lg">
            Probes will stream chronologically into this execution timeline.
          </div>
        ) : (
          <div className="space-y-2">
            {checks.map((chk) => {
              const statusStyle = getCheckStatusClasses(chk.status);
              const isUdpInconclusive = chk.protocol === 'UDP' && chk.status === 'INCONCLUSIVE';
              const cannotBeTested = chk.status === 'CANNOT_BE_TESTED';

              return (
                <div
                  key={chk.id}
                  className="p-3 rounded-lg bg-[#020617] border border-slate-800 hover:border-slate-700 text-xs flex flex-col gap-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400 w-16">
                        {chk.timestamp}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {chk.protocol}/{chk.port}
                      </span>
                      <span className="font-medium text-slate-200">
                        {chk.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ({chk.flowSource} &rarr; {chk.flowDestination})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      {chk.latencyMs !== undefined && chk.latencyMs > 0 && (
                        <span className="text-xs font-mono text-slate-300">
                          {chk.latencyMs}ms
                        </span>
                      )}
                      <span className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded font-bold ${statusStyle.badge}`}>
                        {chk.status}
                      </span>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="text-xs text-slate-300 font-mono pl-0 sm:pl-20 flex flex-col gap-1">
                    <span>{chk.details}</span>

                    {/* Inline prompt when UDP requires responder (Requirement D.2) */}
                    {isUdpInconclusive && (
                      <div className="mt-1 p-2 rounded bg-indigo-950/60 border border-indigo-800/80 text-indigo-200 text-xs flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Run responder mode on the far-end host to verify this UDP flow.</span>
                      </div>
                    )}

                    {/* Cannot be tested note (Requirement C.3) */}
                    {cannotBeTested && (
                      <div className="mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs flex items-center gap-2 font-sans">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Cannot be tested from this machine: confirm on the source side. Included as unverified in firewall requests.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
