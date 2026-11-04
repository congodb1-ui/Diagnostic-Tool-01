import React, { useState } from 'react';
import { Network, AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert } from 'lucide-react';

interface CidrBlock {
  cidr: string;
  start: number;
  end: number;
}

function parseIpv4(ipStr: string): number | null {
  const parts = ipStr.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

function parseCidr(cidrStr: string): CidrBlock | null {
  const [ipPart, maskPart] = cidrStr.trim().split('/');
  const ip = parseIpv4(ipPart);
  if (ip === null) return null;
  const mask = maskPart !== undefined ? parseInt(maskPart, 10) : 32;
  if (isNaN(mask) || mask < 0 || mask > 32) return null;

  const netmask = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
  const start = (ip & netmask) >>> 0;
  const end = (start | ~netmask) >>> 0;

  return { cidr: `${ipPart}/${mask}`, start, end };
}

function rangesOverlap(a: CidrBlock, b: CidrBlock): boolean {
  return a.start <= b.end && b.start <= a.end;
}

const RESERVED_AVS_RANGES: Array<{ cidr: string; reason: string }> = [
  { cidr: '169.254.0.0/24', reason: 'Link-Local internal peering reservation' },
  { cidr: '169.254.2.0/23', reason: 'Azure platform link-local reservation' },
  { cidr: '100.64.0.0/16', reason: 'Carrier-Grade NAT (RFC 6598) reserved by Microsoft platform' },
  { cidr: '172.17.0.0/16', reason: 'Azure internal service routing reservation' }
];

export const AddressPlanCheck: React.FC = () => {
  const [onPremText, setOnPremText] = useState('10.0.0.0/16, 10.10.0.0/20');
  const [avsManagementCidr, setAvsManagementCidr] = useState('10.220.0.0/22');

  const avsBlock = parseCidr(avsManagementCidr);

  const onPremBlocks: CidrBlock[] = onPremText
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseCidr)
    .filter((b): b is CidrBlock => b !== null);

  // Check 1: Overlaps with AVS management /22
  const overlaps: string[] = [];
  if (avsBlock) {
    for (const op of onPremBlocks) {
      if (rangesOverlap(avsBlock, op)) {
        overlaps.push(`On-premises range ${op.cidr} overlaps with AVS management network ${avsBlock.cidr}`);
      }
    }
  }

  // Check 2: Reserved range collisions
  const reservedViolations: string[] = [];
  const allBlocks = avsBlock ? [...onPremBlocks, avsBlock] : onPremBlocks;

  for (const block of allBlocks) {
    for (const res of RESERVED_AVS_RANGES) {
      const parsedRes = parseCidr(res.cidr);
      if (parsedRes && rangesOverlap(block, parsedRes)) {
        reservedViolations.push(
          `${block.cidr} collides with prohibited Azure AVS reserved range ${res.cidr} (${res.reason})`
        );
      }
    }
  }

  const hasErrors = overlaps.length > 0 || reservedViolations.length > 0;

  return (
    <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wide">
            Address Plan CIDR & Reserved Range Check
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          RFC 1918 / RFC 6598 Verification
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Azure VMware Solution requires a dedicated <strong>/22 address block</strong> that must not overlap with on-premises routes, Azure Virtual Networks, or prohibited platform ranges.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* On-Prem Ranges */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-slate-300 font-medium">
            On-Premises Subnets (Comma-separated CIDRs):
          </label>
          <input
            type="text"
            value={onPremText}
            onChange={(e) => setOnPremText(e.target.value)}
            placeholder="e.g. 10.0.0.0/16, 172.16.0.0/12"
            className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* AVS Management CIDR */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-slate-300 font-medium">
            AVS Private Cloud Management Block (/22):
          </label>
          <input
            type="text"
            value={avsManagementCidr}
            onChange={(e) => setAvsManagementCidr(e.target.value)}
            placeholder="e.g. 10.220.0.0/22"
            className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Validation Results Banner */}
      <div className="pt-2">
        {hasErrors ? (
          <div className="space-y-2">
            {overlaps.map((msg, idx) => (
              <div
                key={`ov-${idx}`}
                className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-700/80 text-rose-300 text-xs flex items-start gap-2"
              >
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-mono">{msg}</span>
              </div>
            ))}
            {reservedViolations.map((msg, idx) => (
              <div
                key={`res-${idx}`}
                className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/80 text-amber-300 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="font-mono">{msg}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Address Plan Verified: No routing collisions with AVS management network or reserved blocks.</span>
          </div>
        )}
      </div>
    </section>
  );
};
