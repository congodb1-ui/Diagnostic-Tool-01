import React, { useState, useEffect } from 'react';
import { SavedRunSummary, EngineInterface } from '../engine/types';
import { 
  FileText, 
  Download, 
  Eye, 
  EyeOff, 
  Check, 
  Copy, 
  Shield, 
  RefreshCw 
} from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface ReportsViewProps {
  engine: EngineInterface;
  savedRuns: SavedRunSummary[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ engine, savedRuns }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(savedRuns[0]?.runId || '');
  const [maskIps, setMaskIps] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedRunId && savedRuns.length > 0) {
      setSelectedRunId(savedRuns[0].runId);
    }
  }, [savedRuns, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId) return;

    let isMounted = true;
    setLoading(true);

    engine
      .exportReport(selectedRunId, 'pdf', maskIps)
      .then((res) => {
        if (isMounted) {
          try {
            // Decode binary-safe base64 text
            const decoded = decodeURIComponent(escape(window.atob(res.dataBase64)));
            setReportContent(decoded);
          } catch (e) {
            setReportContent(window.atob(res.dataBase64));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error generating report preview:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [engine, selectedRunId, maskIps]);

  const handleDownload = async (format: 'json' | 'csv' | 'pdf') => {
    if (!selectedRunId) return;
    try {
      const res = await engine.exportReport(selectedRunId, format, maskIps);
      const byteCharacters = window.atob(res.dataBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: res.mimeType });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Download report failed:', e);
    }
  };

  const handleCopyPreview = async () => {
    const success = await copyToClipboard(reportContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeRun = savedRuns.find((r) => r.runId === selectedRunId) || savedRuns[0];

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Audit & Escalation Evidence Pack
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Generate formal documentation for Microsoft Azure Support, VMware escalation, or Change Advisory Boards (CAB).
          </p>
        </div>

        {/* Options & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Run Selection Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-slate-300">Run:</span>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 max-w-[280px]"
            >
              {savedRuns.map((r) => (
                <option key={r.runId} value={r.runId}>
                  [{r.overallStatus}] {r.profileName} ({new Date(r.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>

          {/* Mask IP Addresses Toggle */}
          <button
            type="button"
            onClick={() => setMaskIps(!maskIps)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus:outline-none ${
              maskIps
                ? 'bg-indigo-950/90 text-indigo-200 border-indigo-600 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Sanitize sensitive private IPv4/IPv6 addresses and hostnames prior to sharing with vendors"
          >
            {maskIps ? <EyeOff className="w-4 h-4 text-indigo-300" /> : <Eye className="w-4 h-4 text-slate-400" />}
            <span>Mask IP Addresses: {maskIps ? 'ON' : 'OFF'}</span>
          </button>

          {/* Copy Report */}
          <button
            onClick={handleCopyPreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Export Formats */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleDownload('pdf')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              title="Download formatted printable text document"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
              title="Download raw machine-readable JSON structure"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
              title="Download comma-separated tabular metrics"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Masking Status Callout */}
      {maskIps && (
        <div className="bg-indigo-950/40 border border-indigo-700/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Consistent Token Masking Active:</strong> All IPv4, IPv6 addresses and hostnames replaced with consistent tokens (e.g. <code className="bg-indigo-900/60 px-1 py-0.5 rounded font-mono">[MASKED_IP_1]</code>). Safe for public vendor tickets.
            </span>
          </div>
          <button
            onClick={() => setMaskIps(false)}
            className="text-cyan-300 hover:underline font-mono text-xs"
          >
            Disable Mask
          </button>
        </div>
      )}

      {/* Report Preview Terminal */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-[#0b1329] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>
              Report Preview: {activeRun?.profileName} ({maskIps ? 'Masked' : 'Raw'})
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Monospace Tabular Audit Output
          </span>
        </div>

        <div className="p-4 bg-[#020617] overflow-x-auto min-h-[460px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 text-xs font-mono gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Compiling evidence pack and diagnostic metrics...</span>
            </div>
          ) : (
            <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre select-all">
              {reportContent}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
};
