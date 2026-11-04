import React, { useState } from 'react';
import { Terminal, Copy, Check, Info } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface EsxiCommandHelperProps {
  targetMtu?: number;
  destinationTepPlaceholder?: string;
  className?: string;
}

export const EsxiCommandHelper: React.FC<EsxiCommandHelperProps> = ({
  targetMtu = 1600,
  destinationTepPlaceholder = '<destination TEP>',
  className = ''
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Compute payload size from target MTU minus 28 bytes (20 bytes IPv4 + 8 bytes ICMP header)
  const payloadSize = Math.max(targetMtu - 28, 1472);

  const commands = [
    {
      title: 'MTU Verification (Don\'t Fragment)',
      cmd: `vmkping -d -s ${payloadSize} ${destinationTepPlaceholder} -I <vmk>`,
      desc: `Tests path MTU using ${payloadSize} bytes payload (+28 IP/ICMP = ${targetMtu} MTU) via vmkernel TEP interface.`
    },
    {
      title: 'Geneve UDP 6081 Port Reachability',
      cmd: `nc -z -v -u ${destinationTepPlaceholder} 6081`,
      desc: 'Validates UDP 6081 Geneve overlay transport packet delivery to remote TEP.'
    },
    {
      title: 'BFD UDP 3784 Port Reachability',
      cmd: `nc -z -v -u ${destinationTepPlaceholder} 3784`,
      desc: 'Validates UDP 3784 Bidirectional Forwarding Detection (BFD) keepalive port.'
    }
  ];

  const handleCopy = async (text: string, index: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className={`p-4 rounded-xl bg-[#0b1329] border border-cyan-800/40 text-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h4 className="font-semibold text-slate-100 font-mono text-xs uppercase tracking-wide">
            Run these on an ESXi host
          </h4>
        </div>
        <span className="text-xs font-mono text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded">
          Verify syntax for your ESXi version
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        TEP-to-TEP encapsulation (Geneve 6081, BFD) runs inside the isolated transport vlan. Execute these commands directly via SSH on an ESXi host to verify overlay MTU and reachability:
      </p>

      <div className="space-y-2.5">
        {commands.map((c, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-[#020617] border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-cyan-300 font-mono">{c.title}</span>
              <button
                type="button"
                onClick={() => handleCopy(c.cmd, i)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                aria-label={`Copy ${c.title} command`}
              >
                {copiedIndex === i ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="block p-1.5 rounded bg-slate-950 text-cyan-200 font-mono text-xs overflow-x-auto select-all">
              {c.cmd}
            </code>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
