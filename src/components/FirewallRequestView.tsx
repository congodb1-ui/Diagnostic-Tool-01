import React, { useState } from 'react';
import { FirewallRequestRule, SavedRunSummary } from '../engine/types';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Terminal,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info
} from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';
import { 
  deduplicateFirewallRules, 
  generateFirewallTextTable, 
  generateFirewallCsv, 
  generateFirewallCliSnippets 
} from '../utils/firewallExport';

interface FirewallRequestViewProps {
  currentRun: SavedRunSummary | null;
  allSavedRuns: SavedRunSummary[];
}

export const FirewallRequestView: React.FC<FirewallRequestViewProps> = ({
  currentRun,
  allSavedRuns
}) => {
  const activeRun = currentRun || allSavedRuns[0] || null;

  // Source comes from engine localHost or user input
  const defaultEngineSource = activeRun?.localHost?.ipv4Address
    ? `${activeRun.localHost.ipv4Address}/${activeRun.localHost.prefixLength || 24}`
    : '';

  const [customSource, setCustomSource] = useState(defaultEngineSource);
  const [filterStatus, setFilterStatus] = useState<'all' | 'blocked' | 'inconclusive' | 'unverified'>('all');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Build raw list from findings and checks
  const rawRules: FirewallRequestRule[] = [];

  if (activeRun) {
    // 1. From findings
    for (const f of activeRun.findings) {
      if (f.firewallRequest) {
        rawRules.push(f.firewallRequest);
      }
    }

    // 2. From checks (failed, inconclusive, or cannot be tested)
    for (const c of activeRun.checks) {
      const isFailed = c.status === 'BLOCKED' || c.status === 'CLOSED';
      const isInconclusive = c.status === 'INCONCLUSIVE';
      const isCannotBeTested = c.status === 'CANNOT_BE_TESTED';

      if (isFailed || isInconclusive || isCannotBeTested) {
        rawRules.push({
          id: `fw-rule-${c.id}`,
          source: customSource || activeRun.localHost?.ipv4Address || 'Source not set',
          destination: c.targetHost,
          protocol: c.protocol,
          port: c.port,
          direction: `${c.flowSource} -> ${c.flowDestination}`,
          purpose: c.label,
          status: isFailed ? 'blocked' : isInconclusive ? 'inconclusive' : 'unverified',
          suggestedAction: isFailed ? 'ALLOW' : isInconclusive ? 'ADD_RESPONDER' : 'CONFIRM_ON_SOURCE',
          ruleRef: c.ruleId
        });
      }
    }
  }

  // Deduplicate strictly by PROTOCOL + PORT + DESTINATION (Requirement B.3)
  const deduplicated = deduplicateFirewallRules(rawRules);

  const effectiveRules = deduplicated.map((r) => ({
    ...r,
    source: customSource?.trim() ? customSource.trim() : (activeRun?.localHost?.ipv4Address ? `${activeRun.localHost.ipv4Address}/${activeRun.localHost.prefixLength || 24}` : 'Source not set')
  }));

  const filteredRules = effectiveRules.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const sourceForExport = customSource?.trim() || activeRun?.localHost?.ipv4Address || '';

  const handleCopyAsText = async () => {
    if (filteredRules.length === 0) return;
    const text = generateFirewallTextTable(filteredRules, sourceForExport, activeRun?.primaryTarget || 'AVS Endpoint');
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedFormat('text');
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  const handleCopyAsCsv = async () => {
    if (filteredRules.length === 0) return;
    const csv = generateFirewallCsv(filteredRules, sourceForExport);
    const success = await copyToClipboard(csv);
    if (success) {
      setCopiedFormat('csv');
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  const handleDownloadCsv = () => {
    if (filteredRules.length === 0) return;
    const csv = generateFirewallCsv(filteredRules, sourceForExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zaboraa_firewall_request_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const cliSnippetText = generateFirewallCliSnippets(filteredRules, sourceForExport);

  return (
    <div className="space-y-4">
      {/* View Header with Source Subnet Input and Action Buttons */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Firewall Change Request Specification
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Synthesized access rules required for unblocking traffic. Flow directions are derived directly from profile rule specifications.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyAsText}
              disabled={filteredRules.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-40"
              aria-label="Copy firewall rules as formatted plain text"
            >
              {copiedFormat === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFormat === 'text' ? 'Copied Text!' : 'Copy as Text'}</span>
            </button>

            <button
              onClick={handleCopyAsCsv}
              disabled={filteredRules.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-40"
              aria-label="Copy firewall rules as sanitized CSV"
            >
              {copiedFormat === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{copiedFormat === 'csv' ? 'Copied CSV!' : 'Copy as CSV'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={filteredRules.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
              aria-label="Export firewall rules to CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Source Address / Subnet Input Strip (Requirement B.2) */}
        <div className="p-3 rounded-lg bg-[#070d1e] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex-1 max-w-xl space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="source-subnet-input" className="font-mono text-xs text-slate-200 font-semibold">
                Source Address / Subnet:
              </label>
              {activeRun?.localHost && (
                <span className="text-xs font-mono text-cyan-300">
                  (Detected: {activeRun.localHost.ipv4Address}/{activeRun.localHost.prefixLength})
                </span>
              )}
            </div>
            <input
              id="source-subnet-input"
              type="text"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              placeholder="Enter the source subnet your firewall team should allow"
              className="w-full bg-[#020617] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-[#020617] rounded-lg p-1 border border-slate-700 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterStatus === 'all' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-300'
              }`}
            >
              All ({effectiveRules.length})
            </button>
            <button
              onClick={() => setFilterStatus('blocked')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterStatus === 'blocked' ? 'bg-rose-950 text-rose-200 font-semibold' : 'text-slate-300'
              }`}
            >
              Blocked
            </button>
            <button
              onClick={() => setFilterStatus('inconclusive')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterStatus === 'inconclusive' ? 'bg-indigo-950 text-indigo-200 font-semibold' : 'text-slate-300'
              }`}
            >
              Inconclusive
            </button>
            <button
              onClick={() => setFilterStatus('unverified')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterStatus === 'unverified' ? 'bg-slate-900 text-slate-200 font-semibold' : 'text-slate-400'
              }`}
            >
              Unverified
            </button>
          </div>
        </div>
      </section>

      {/* Rules Table */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" role="table">
            <thead className="bg-[#0b1329] text-slate-300 uppercase font-mono text-xs border-b border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3">Source Allowed</th>
                <th scope="col" className="px-4 py-3">Destination Target</th>
                <th scope="col" className="px-4 py-3">Proto</th>
                <th scope="col" className="px-4 py-3">Port / Service</th>
                <th scope="col" className="px-4 py-3">Traffic Direction</th>
                <th scope="col" className="px-4 py-3">Purpose</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-sans text-xs">
                    No matching security rules for selected filter. All verified endpoints are open or nominal.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const isBlocked = rule.status === 'blocked';
                  const isInconclusive = rule.status === 'inconclusive';
                  const isUnverified = rule.status === 'unverified';

                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isBlocked ? 'bg-rose-950/20' : isInconclusive ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-200 font-semibold">
                        {rule.source}
                      </td>
                      <td className="px-4 py-3 text-slate-200 font-semibold">
                        {rule.destination}
                      </td>
                      <td className="px-4 py-3 text-cyan-300 font-bold">
                        {rule.protocol}
                      </td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">
                        {rule.port}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-sans text-xs">
                        {rule.direction}
                      </td>
                      <td className="px-4 py-3 text-slate-200 font-sans text-xs">
                        {rule.purpose}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-200 border border-rose-600">
                            <XCircle className="w-3.5 h-3.5 text-rose-300" aria-hidden="true" />
                            <span>BLOCKED</span>
                          </span>
                        ) : isInconclusive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-950 text-indigo-200 border border-indigo-600">
                            <AlertTriangle className="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
                            <span>INCONCLUSIVE</span>
                          </span>
                        ) : isUnverified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700">
                            <Info className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span>UNVERIFIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-200 border border-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                            <span>OPEN</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded font-bold text-xs bg-slate-800 text-cyan-300 border border-slate-700">
                          {rule.suggestedAction}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLI Snippets Box (Requirement B.4) */}
      <section className="bg-[#0b1329] border border-slate-800 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 font-mono uppercase tracking-wide text-xs">
              Template, review before use
            </h3>
          </div>
          <span className="text-xs font-mono text-amber-300 bg-amber-950/70 border border-amber-800 px-2 py-0.5 rounded">
            Generated from table rows above
          </span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          The CLI snippets below use placeholders <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-cyan-300">&lt;RESOURCE_GROUP&gt;</code>, <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-cyan-300">&lt;NSG_NAME&gt;</code>, and <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-cyan-300">&lt;ACL_NAME&gt;</code>. Review before running in production.
        </p>
        <pre className="p-3 rounded-lg bg-[#020617] border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-all">
          {cliSnippetText}
        </pre>
      </section>
    </div>
  );
};
