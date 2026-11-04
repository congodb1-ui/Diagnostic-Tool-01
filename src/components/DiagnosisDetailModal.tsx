import React, { useState } from 'react';
import { Finding } from '../engine/types';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  ListOrdered
} from 'lucide-react';
import { copyToClipboard, getSeverityClasses } from '../utils/formatters';
import { EsxiCommandHelper } from './EsxiCommandHelper';

interface DiagnosisDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
}

export const DiagnosisDetailModal: React.FC<DiagnosisDetailModalProps> = ({
  finding,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!finding) return null;

  const style = getSeverityClasses(finding.severity);

  const handleCopyFirewallRequest = async () => {
    let textToCopy = '';
    if (finding.firewallRequest) {
      const fw = finding.firewallRequest;
      textToCopy = `FIREWALL CHANGE REQUEST\n=======================\nAction      : PERMIT / ${fw.suggestedAction}\nSource      : ${fw.source || 'Source not set'}\nDestination : ${fw.destination}\nProtocol    : ${fw.protocol}\nPort        : ${fw.port}\nDirection   : ${fw.direction}\nPurpose     : ${fw.purpose}\nFinding Ref : ${finding.title}\nEvidence    : ${finding.evidence}`;
    } else {
      textToCopy = `FIREWALL RECOMMENDATION\n=======================\nIssue    : ${finding.title}\nSeverity : ${finding.severity}\nEvidence : ${finding.evidence}\nAction   : ${finding.fixSteps.join('; ')}`;
    }

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-finding-title"
    >
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-[#0b1329]">
          <div className="flex items-center gap-3">
            {finding.severity === 'BLOCKED' ? (
              <XCircle className="w-5 h-5 text-rose-300 shrink-0" aria-hidden="true" />
            ) : finding.severity === 'WARNING' ? (
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" aria-hidden="true" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono uppercase font-bold px-2.5 py-0.5 rounded ${style.badge}`}>
                  {finding.severity}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Confidence: <strong className="text-slate-100">{finding.confidence}</strong>
                </span>
              </div>
              <h3 id="modal-finding-title" className="text-sm font-semibold text-slate-100 mt-1">
                {finding.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-200">
          {/* Probabilistic Cause */}
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Plain-Language Probable Cause:
            </span>
            <div className="p-3 rounded-lg bg-[#020617] border border-slate-800 leading-relaxed text-slate-200">
              {finding.cause}
            </div>
          </div>

          {/* Raw Evidence */}
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Diagnostic Raw Evidence:</span>
            </span>
            <div className="p-3 rounded-lg bg-[#020617] border border-slate-800 font-mono text-xs text-cyan-300 whitespace-pre-wrap leading-relaxed select-all">
              {finding.evidence}
            </div>
          </div>

          {/* If overlay issue, show ESXi Command Helper (Requirement F) */}
          {finding.isOverlayIssue && (
            <EsxiCommandHelper targetMtu={1600} destinationTepPlaceholder="<destination TEP>" />
          )}

          {/* Remediation & Fix Steps */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <ListOrdered className="w-4 h-4 text-cyan-400" />
              <span>Recommended Remediation Steps:</span>
            </span>
            <div className="space-y-2">
              {finding.fixSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#0b1329] border border-slate-800 flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-slate-200 text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge Base Link */}
          {finding.kbUrl && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">Architecture Reference:</span>
              <a
                href={finding.kbUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
              >
                <span>{finding.kbUrl}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#0b1329] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-300 font-mono hidden sm:inline">
            Inference Engine · Probabilistic Verdict
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleCopyFirewallRequest}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Request!' : 'Copy Firewall Request'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
