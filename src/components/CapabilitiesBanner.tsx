import React, { useState } from 'react';
import { EngineCapabilities } from '../engine/types';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface CapabilitiesBannerProps {
  capabilities: EngineCapabilities | null;
}

export const CapabilitiesBanner: React.FC<CapabilitiesBannerProps> = ({ capabilities }) => {
  const [expanded, setExpanded] = useState(false);

  if (!capabilities) return null;

  return (
    <div className="bg-[#0b1329] border-b border-slate-800 text-xs text-slate-300">
      <div className="max-w-[1920px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Core summary status items */}
        <div className="flex items-center flex-wrap gap-5">
          {/* Admin Rights */}
          <div className="flex items-center gap-1.5">
            {capabilities.isAdmin ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium text-slate-200">
              {capabilities.isAdmin
                ? 'Elevated Administrator (Raw Sockets Active)'
                : 'Running without admin: TCP/UDP traceroute and MTR unavailable'}
            </span>
            {!capabilities.isAdmin && (
              <span className="text-slate-400 hidden lg:inline">
                · Run as Administrator to enable raw sockets
              </span>
            )}
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Internet Gateway */}
          <div className="flex items-center gap-1.5">
            {capabilities.internetAccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            )}
            <span>Internet access: <span className="font-semibold text-slate-200">{capabilities.internetAccess ? 'Yes' : 'No'}</span></span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Responder Mode */}
          <div className="flex items-center gap-1.5">
            {capabilities.responderModeAvailable ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            )}
            <span>Responder mode available</span>
          </div>
        </div>

        {/* Action to view details */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-300 hidden xl:inline">
            Host: {capabilities.platform} (API v{capabilities.apiVersion})
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700 focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            aria-expanded={expanded}
            aria-label="Toggle environment diagnostics details"
          >
            <span>{expanded ? 'Hide Details' : 'View Remediation'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded diagnostic breakdown */}
      {expanded && (
        <div className="border-t border-slate-800 bg-[#070d1e] px-4 py-3">
          <div className="max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {capabilities.capabilitiesList.map((item) => {
              const isOk = item.status === 'AVAILABLE';
              const isDegraded = item.status === 'DEGRADED';
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#0f172a] border border-slate-800 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-medium text-slate-200 text-xs">{item.name}</span>
                    <span
                      className={`text-xs font-mono uppercase px-2 py-0.5 rounded ${
                        isOk
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isDegraded
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">{item.detail}</p>
                  {item.remediation && (
                    <div className="mt-1 pt-1.5 border-t border-slate-800 text-xs text-cyan-300 font-mono flex items-start gap-1.5">
                      <Terminal className="w-3.5 h-3.5 mt-0.5 text-cyan-400 shrink-0" />
                      <span>{item.remediation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
