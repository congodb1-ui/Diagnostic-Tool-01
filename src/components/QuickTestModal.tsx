import React, { useState, useEffect } from 'react';
import { X, Terminal, RefreshCw, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../utils/formatters';

interface QuickTestModalProps {
  isOpen: boolean;
  testType: string;
  target: string;
  onClose: () => void;
}

export const QuickTestModal: React.FC<QuickTestModalProps> = ({
  isOpen,
  testType,
  target,
  onClose
}) => {
  const [running, setRunning] = useState(true);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setRunning(true);
    setOutputLines([`[Zaboraa Engine] Initializing ${testType.toUpperCase()} probe to ${target}...`]);

    const timer1 = setTimeout(() => {
      setOutputLines((prev) => [
        ...prev,
        `Resolved interface: 192.0.2.25 on adapter Ethernet 1 (On-Premises Gateway)`,
        `Target endpoint: ${target} [Source: typed]`
      ]);
    }, 250);

    const timer2 = setTimeout(() => {
      if (testType === 'ping') {
        setOutputLines((prev) => [
          ...prev,
          `Sending 4 standard echo requests (32 bytes payload):`,
          `Reply from ${target}: bytes=32 time=14.82ms TTL=58`,
          `Reply from ${target}: bytes=32 time=14.65ms TTL=58`,
          `Reply from ${target}: bytes=32 time=15.01ms TTL=58`,
          `Reply from ${target}: bytes=32 time=14.79ms TTL=58`,
          `Echo statistics for ${target}: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`,
          `Round-trip times: Minimum = 14.65ms, Maximum = 15.01ms, Average = 14.81ms`
        ]);
      } else if (testType === 'tcp-ping') {
        setOutputLines((prev) => [
          ...prev,
          `Connecting to ${target}:443 (TCP SYN probe)...`,
          `Probing ${target}:443/tcp - Connection established in 14.75ms`,
          `Probing ${target}:443/tcp - Connection established in 14.61ms`,
          `Probing ${target}:443/tcp - Connection established in 14.90ms`,
          `TCP Ping completed: 3/3 successful handshakes (0% loss), avg RTT 14.75ms`
        ]);
      } else if (testType === 'traceroute') {
        setOutputLines((prev) => [
          ...prev,
          `Tracing route to ${target} over a maximum of 30 hops:`,
          `  1     0.42 ms     0.38 ms     0.45 ms  192.0.2.1 [gw-onprem.example]`,
          `  2     1.15 ms     0.98 ms     1.20 ms  192.0.2.2 [spine01.example]`,
          `  3     4.80 ms     4.62 ms     4.75 ms  192.0.2.3 [er-cpe.example]`,
          `  4        *           *           *     Request timed out [192.0.2.4 Filtered]`,
          `  5    14.85 ms    14.20 ms    14.50 ms  192.0.2.5 [edge-avs.example]`,
          `  6    15.22 ms    14.80 ms    15.10 ms  ${target} [Destination Reached]`,
          `Trace complete.`
        ]);
      } else if (testType === 'port-check') {
        setOutputLines((prev) => [
          ...prev,
          `Checking standard AVS hybrid ports against ${target}:`,
          `  Port 443 (HTTPS)      : OPEN (14.8ms)`,
          `  Port 9443 (VAMI)      : OPEN (15.2ms)`,
          `  Port 8123 (Bulk Mgmt) : FILTERED (ETIMEDOUT after 3000ms)`,
          `  Port 80 (HTTP)        : OPEN (14.6ms)`,
          `  Port 902 (NFC)        : OPEN (14.9ms)`,
          `Summary: 4 Open, 1 Filtered.`
        ]);
      } else if (testType === 'dns') {
        setOutputLines((prev) => [
          ...prev,
          `Querying DNS forwarder for ${target}:`,
          `Server: 192.0.2.53 (dns01.example)`,
          `Address: 192.0.2.53#53`,
          `Non-authoritative answer:`,
          `Name: ${target}`,
          `Canonical Name: vcsa.example`,
          `Address: 192.0.2.11`,
          `Response time: 2.1ms (Query OK, NXDOMAIN = 0)`
        ]);
      } else if (testType === 'mtu') {
        setOutputLines((prev) => [
          ...prev,
          `Executing Don't-Fragment (DF) MTU Sweep against ${target}:`,
          `Testing payload 1472 (+28 bytes IP/ICMP = 1500 MTU): OK (14.2ms)`,
          `Testing payload 1500 (+28 bytes IP/ICMP = 1528 MTU): PACKET NEEDS FRAGMENTATION (DF set)`,
          `ICMP Type 3, Code 4 received from router 192.0.2.2`,
          `Discovered Path MTU: 1500 bytes`,
          `WARNING: Overlay transport requires 1600+ bytes MTU.`
        ]);
      } else if (testType === 'https-tls') {
        setOutputLines((prev) => [
          ...prev,
          `Initiating TLS handshake to https://${target}:443:`,
          `TLS Version: TLSv1.3 (Cipher: TLS_AES_256_GCM_SHA384)`,
          `Certificate Common Name (CN): *.example`,
          `Issuer: Example Internal CA`,
          `Validity: Active`,
          `ALPN negotiated: h2, http/1.1`,
          `Handshake latency: 28.4ms. Status: VALID`
        ]);
      }
      setRunning(false);
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, testType, target]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(outputLines.join('\n'));
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
    >
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0b1329]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wide">
              Quick Test: {testType.toUpperCase()} &rarr; {target}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Console Body */}
        <div className="p-4 bg-[#020617] text-xs font-mono text-cyan-300 overflow-y-auto max-h-[400px] space-y-1 select-all">
          {outputLines.map((line, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap">
              {line}
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-slate-400 pt-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Transmitting synthetic probe packets...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-[#0b1329] flex items-center justify-between">
          <span className="text-xs font-mono text-slate-300">
            {running ? 'Probe in progress...' : 'Completed with 0 packet leakage'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus:outline-none"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Output'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
