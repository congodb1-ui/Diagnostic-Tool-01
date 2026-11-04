import React, { useState } from 'react';
import { SavedRunSummary, CheckStatus } from '../engine/types';
import { 
  GitCompare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Minus,
  Info
} from 'lucide-react';
import { getCheckStatusClasses } from '../utils/formatters';

interface CompareRunsViewProps {
  savedRuns: SavedRunSummary[];
}

export const CompareRunsView: React.FC<CompareRunsViewProps> = ({ savedRuns }) => {
  const [runAId, setRunAId] = useState<string>(
    savedRuns.find((r) => r.runId.includes('baseline'))?.runId || savedRuns[1]?.runId || savedRuns[0]?.runId || ''
  );
  const [runBId, setRunBId] = useState<string>(
    savedRuns.find((r) => r.runId.includes('postchange'))?.runId || savedRuns[0]?.runId || ''
  );

  const runA = savedRuns.find((r) => r.runId === runAId) || savedRuns[0];
  const runB = savedRuns.find((r) => r.runId === runBId) || savedRuns[1] || savedRuns[0];

  if (!runA || !runB) {
    return (
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-8 text-center text-slate-300 text-xs font-mono">
        At least two diagnostic runs are required to perform a diff comparison.
      </div>
    );
  }

  interface DiffItem {
    id: string;
    label: string;
    protocol: string;
    port: string;
    statusA: CheckStatus;
    statusB: CheckStatus;
    latencyA?: number;
    latencyB?: number;
    deltaVerdict: 'FIXED' | 'REGRESSION' | 'UNCHANGED';
    notes: string;
  }

  const diffItems: DiffItem[] = [];
  const checkMapA = new Map(runA.checks.map((c) => [`${c.protocol}_${c.port}_${c.targetHost}`, c]));

  for (const cb of runB.checks) {
    const key = `${cb.protocol}_${cb.port}_${cb.targetHost}`;
    const ca = checkMapA.get(key);

    const statusA: CheckStatus = ca ? ca.status : 'PENDING';
    const statusB: CheckStatus = cb.status;

    let deltaVerdict: 'FIXED' | 'REGRESSION' | 'UNCHANGED' = 'UNCHANGED';

    if ((statusA === 'BLOCKED' || statusA === 'WARNING' || statusA === 'CLOSED') && (statusB === 'OPEN' || statusB === 'RESPONDER_CONFIRMED')) {
      deltaVerdict = 'FIXED';
    } else if ((statusA === 'OPEN' || statusA === 'RESPONDER_CONFIRMED') && (statusB === 'BLOCKED' || statusB === 'CLOSED' || statusB === 'WARNING')) {
      deltaVerdict = 'REGRESSION';
    } else if (statusA !== statusB) {
      deltaVerdict = (statusB === 'OPEN' || statusB === 'RESPONDER_CONFIRMED') ? 'FIXED' : 'REGRESSION';
    }

    diffItems.push({
      id: cb.id,
      label: cb.label,
      protocol: cb.protocol,
      port: cb.port,
      statusA,
      statusB,
      latencyA: ca?.latencyMs,
      latencyB: cb.latencyMs,
      deltaVerdict,
      notes: cb.details
    });
  }

  const fixedCount = diffItems.filter((d) => d.deltaVerdict === 'FIXED').length;
  const regressionCount = diffItems.filter((d) => d.deltaVerdict === 'REGRESSION').length;
  const unchangedCount = diffItems.filter((d) => d.deltaVerdict === 'UNCHANGED').length;

  return (
    <div className="space-y-4">
      {/* Run Selection & Summary Bar */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Compare Diagnostic Runs (Before vs After Change)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Select a pre-change baseline and a post-change verification run to validate firewall rules, MTU fixes, and routing shifts.
            </p>
          </div>

          {/* Diff Metrics Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600 text-emerald-200 text-xs font-mono font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{fixedCount} Fixed</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/70 border border-rose-600 text-rose-200 text-xs font-mono font-bold">
              <XCircle className="w-4 h-4 text-rose-300" />
              <span>{regressionCount} Regressions</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono">
              <Minus className="w-4 h-4 text-slate-400" />
              <span>{unchangedCount} Unchanged</span>
            </div>
          </div>
        </div>

        {/* Run Selector Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Baseline Run A */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center justify-between">
              <span>Run A: Baseline (Pre-Change)</span>
              <span className="text-slate-400">{new Date(runA.timestamp).toLocaleString()}</span>
            </label>
            <select
              value={runAId}
              onChange={(e) => setRunAId(e.target.value)}
              className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {savedRuns.map((r) => (
                <option key={r.runId} value={r.runId}>
                  [{r.overallStatus}] {r.profileName} - {r.primaryTarget} ({new Date(r.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Run B */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-cyan-300 font-semibold flex items-center justify-between">
              <span>Run B: Verification (Post-Change)</span>
              <span className="text-slate-400">{new Date(runB.timestamp).toLocaleString()}</span>
            </label>
            <select
              value={runBId}
              onChange={(e) => setRunBId(e.target.value)}
              className="w-full bg-[#020617] border border-cyan-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {savedRuns.map((r) => (
                <option key={r.runId} value={r.runId}>
                  [{r.overallStatus}] {r.profileName} - {r.primaryTarget} ({new Date(r.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Diff Table */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Check-by-Check Status & Latency Diff
          </h3>
          <span className="text-xs text-slate-300 font-mono">
            {diffItems.length} Probed Rules Compared
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" role="table">
            <thead className="bg-[#0b1329] text-slate-300 uppercase font-mono text-xs border-b border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3">Rule / Port Probe</th>
                <th scope="col" className="px-4 py-3">Protocol</th>
                <th scope="col" className="px-4 py-3 text-center">Run A Baseline</th>
                <th scope="col" className="px-4 py-3 text-center">Run B Post-Change</th>
                <th scope="col" className="px-4 py-3 text-right">Latency Delta</th>
                <th scope="col" className="px-4 py-3 text-center">Change Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {diffItems.map((item) => {
                const styleA = getCheckStatusClasses(item.statusA);
                const styleB = getCheckStatusClasses(item.statusB);

                const latencyDiff =
                  item.latencyA !== undefined && item.latencyB !== undefined
                    ? +(item.latencyB - item.latencyA).toFixed(2)
                    : null;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      item.deltaVerdict === 'FIXED'
                        ? 'bg-emerald-950/20'
                        : item.deltaVerdict === 'REGRESSION'
                        ? 'bg-rose-950/20'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100 font-sans">{item.label}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">Port {item.port}</div>
                    </td>
                    <td className="px-4 py-3 text-cyan-300 font-bold">
                      {item.protocol}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded ${styleA.badge}`}>
                        {item.statusA}
                        {item.latencyA ? ` (${item.latencyA}ms)` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded ${styleB.badge}`}>
                        {item.statusB}
                        {item.latencyB ? ` (${item.latencyB}ms)` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {latencyDiff !== null ? (
                        <span
                          className={
                            latencyDiff < 0
                              ? 'text-emerald-300 font-semibold'
                              : latencyDiff > 0
                              ? 'text-amber-300'
                              : 'text-slate-300'
                          }
                        >
                          {latencyDiff > 0 ? `+${latencyDiff}ms` : `${latencyDiff}ms`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.deltaVerdict === 'FIXED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-200 border border-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>FIXED</span>
                        </span>
                      ) : item.deltaVerdict === 'REGRESSION' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-200 border border-rose-600">
                          <XCircle className="w-3.5 h-3.5 text-rose-300" />
                          <span>REGRESSION</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs text-slate-300 bg-slate-900 border border-slate-800">
                          <span>UNCHANGED</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
