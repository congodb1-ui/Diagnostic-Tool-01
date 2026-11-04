import React from 'react';
import { 
  Server, 
  Shield, 
  Cpu
} from 'lucide-react';
import { ConnectionDefinition } from '../engine/types';

export const ConnectionsView: React.FC = () => {
  const plannedConnections: ConnectionDefinition[] = [
    {
      id: 'conn-nsx-01',
      kind: 'nsx',
      name: 'NSX-T Manager Cluster',
      host: '192.0.2.12',
      readOnlyAccount: true,
      credentialsStoredLocally: true,
      status: 'planned'
    },
    {
      id: 'conn-vc-01',
      kind: 'vcenter',
      name: 'vCenter Server Appliance',
      host: '192.0.2.11',
      readOnlyAccount: true,
      credentialsStoredLocally: true,
      status: 'planned'
    },
    {
      id: 'conn-hcx-01',
      kind: 'hcx',
      name: 'HCX Cloud Manager',
      host: '192.0.2.10',
      readOnlyAccount: true,
      credentialsStoredLocally: true,
      status: 'planned'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner Notice */}
      <section className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/60 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Infrastructure Connectors (Planned Feature)
            </h2>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
              PLANNED / ROADMAP
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Direct API integration with VMware vCenter Server, NSX Manager, and HCX Cloud appliances to discover management endpoints, inventory vmkernel TEPs, and correlate configured MTU against actual measured network path limits.
          </p>
        </div>

        {/* Security / Credential Isolation Box */}
        <div className="bg-[#020617] p-3 rounded-lg border border-slate-800 flex items-start gap-2.5 max-w-md shrink-0">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-snug">
            <strong className="text-white block mb-0.5">Local Credential Security:</strong>
            Requires read-only service accounts. All tokens are encrypted using Windows DPAPI (Data Protection API) and stored strictly on this computer. Zero credentials ever leave this machine.
          </div>
        </div>
      </section>

      {/* Planned Connector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plannedConnections.map((conn) => (
          <div
            key={conn.id}
            className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between opacity-95"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono text-cyan-400 font-semibold uppercase">
                  {conn.kind.toUpperCase()} Connector
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Planned
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">
                {conn.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Reads infrastructure inventory, vmkernel interfaces, and overlay configuration directly via local read-only session.
              </p>

              <div className="space-y-2 text-xs font-mono text-slate-300 bg-[#020617] p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between">
                  <span>Host Target:</span>
                  <span className="text-slate-100 font-bold">{conn.host}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auth Mode:</span>
                  <span className="text-slate-200">Read-Only Role</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage:</span>
                  <span className="text-emerald-400">Windows DPAPI</span>
                </div>
              </div>
            </div>

            <button
              disabled
              className="mt-4 w-full py-2.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono font-medium border border-slate-700 cursor-not-allowed text-center"
            >
              Configure Connection (Planned)
            </button>
          </div>
        ))}
      </div>

      {/* Mock "Configured vs Measured" Panel */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Configured vs. Measured Telemetry Correlation (Future Value Demonstration)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Demonstrates the architectural value of combining VMware configuration manifests with real path probe telemetry.
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800 px-2.5 py-1 rounded">
            Future Value Demonstration
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MTU Mismatch card */}
          <div className="p-4 rounded-xl bg-[#020617] border border-amber-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-amber-300 mb-2">
                <span className="font-semibold uppercase">MTU Overhead Audit</span>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700 font-bold">
                  Mismatch
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>NSX Configured MTU:</span>
                  <span className="text-slate-100 font-bold">1700 bytes</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Measured Path MTU:</span>
                  <span className="text-rose-300 font-bold">1500 bytes</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-200 mt-3 pt-3 border-t border-slate-800 leading-relaxed font-sans">
              Warning: Underlay physical switches enforce 1500 bytes, causing overlay Geneve packets (1700) to fragment or drop silently.
            </p>
          </div>

          {/* vCenter Uplink Capacity */}
          <div className="p-4 rounded-xl bg-[#020617] border border-emerald-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-emerald-300 mb-2">
                <span className="font-semibold uppercase">Uplink Health</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-700 font-bold">
                  Nominal
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>vDS Configured Uplink:</span>
                  <span className="text-slate-100 font-bold">10 Gbps Active</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Measured Path Jitter:</span>
                  <span className="text-emerald-300 font-bold">0.35 ms</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Measured Packet Loss:</span>
                  <span className="text-emerald-300 font-bold">0.0 %</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-emerald-200 mt-3 pt-3 border-t border-slate-800 leading-relaxed font-sans">
              Interconnect jitter is well within the threshold required for seamless VMware vSphere vMotion migration.
            </p>
          </div>

          {/* HCX Pairing */}
          <div className="p-4 rounded-xl bg-[#020617] border border-cyan-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300 mb-2">
                <span className="font-semibold uppercase">HCX Mesh Status</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-700 font-bold">
                  Synced
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>HCX Service Mesh:</span>
                  <span className="text-slate-100 font-bold">SM-AVS-01</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Measured AVS Latency:</span>
                  <span className="text-cyan-300 font-bold">14.6 ms</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Replication Bandwidth:</span>
                  <span className="text-slate-100 font-bold">940 Mbps</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-cyan-200 mt-3 pt-3 border-t border-slate-800 leading-relaxed font-sans">
              Path latency satisfies standard thresholds for HCX Cold/Bulk migration and long-distance vMotion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
