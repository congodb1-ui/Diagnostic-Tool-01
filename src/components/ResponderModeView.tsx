import React, { useState, useEffect } from 'react';
import { EngineInterface, ResponderLogEntry } from '../engine/types';
import { 
  Radio, 
  Play, 
  Square, 
  Plus, 
  X, 
  Terminal, 
  CheckCircle2, 
  Activity
} from 'lucide-react';
import { EsxiCommandHelper } from './EsxiCommandHelper';

interface ResponderModeViewProps {
  engine: EngineInterface;
}

export const ResponderModeView: React.FC<ResponderModeViewProps> = ({ engine }) => {
  const [isListening, setIsListening] = useState(false);
  const [ports, setPorts] = useState<number[]>([4500, 8123, 5201, 6081]);
  const [newPortInput, setNewPortInput] = useState('');
  const [logs, setLogs] = useState<ResponderLogEntry[]>([]);
  const [filterPort, setFilterPort] = useState<string>('all');

  useEffect(() => {
    engine.getResponderLogs().then(setLogs);
    const interval = setInterval(() => {
      engine.getResponderLogs().then(setLogs);
    }, 2000);
    return () => clearInterval(interval);
  }, [engine]);

  const handleToggleListening = async () => {
    if (isListening) {
      await engine.stopResponder();
      setIsListening(false);
    } else {
      await engine.startResponder(ports);
      setIsListening(true);
    }
  };

  const handleAddPort = (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(newPortInput, 10);
    if (!isNaN(portNum) && portNum > 0 && portNum <= 65535 && !ports.includes(portNum)) {
      setPorts([...ports, portNum]);
      setNewPortInput('');
    }
  };

  const handleRemovePort = (portToRemove: number) => {
    if (ports.length > 1) {
      setPorts(ports.filter((p) => p !== portToRemove));
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterPort === 'all') return true;
    return log.port.toString() === filterPort;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controller */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <h2 className="text-sm font-semibold text-slate-100">
              Listen for Tests from Another Host (Responder Daemon)
            </h2>
            <span
              className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-bold ${
                isListening
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {isListening ? 'DAEMON ACTIVE' : 'STOPPED'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Run Zaboraa in responder mode on a target virtual machine or jumpbox inside AVS. This allows bidirectional UDP 4500, UDP 5201, and TCP handshake echo testing without requiring active production services.
          </p>
        </div>

        {/* Start / Stop Toggle */}
        <div className="flex items-center gap-3">
          {isListening ? (
            <button
              onClick={handleToggleListening}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors focus-visible:ring-2 focus-visible:ring-rose-400 focus:outline-none"
            >
              <Square className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Stop Listening</span>
            </button>
          ) : (
            <button
              onClick={handleToggleListening}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus:outline-none"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Start Responder</span>
            </button>
          )}
        </div>
      </section>

      {/* Port Configuration Strip */}
      <section className="bg-[#0b1329] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Configured Listening Ports:</span>
          </div>

          {/* Add Port Form */}
          <form onSubmit={handleAddPort} className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Port (1-65535)"
              value={newPortInput}
              onChange={(e) => setNewPortInput(e.target.value)}
              className="w-32 bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Port Chips */}
        <div className="flex flex-wrap gap-2">
          {ports.map((port) => (
            <div
              key={port}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] border border-slate-700 text-xs font-mono"
            >
              <span className="text-cyan-300 font-semibold">Port {port}</span>
              <span className="text-slate-300 text-xs">
                {port === 4500 ? '(UDP HCX-IX)' :
                 port === 8123 ? '(TCP Bulk Mgmt)' :
                 port === 5201 ? '(TCP/UDP Uplink)' :
                 port === 6081 ? '(UDP Geneve)' : '(Custom)'}
              </span>
              {ports.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePort(port)}
                  className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
                  aria-label={`Remove port ${port}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ESXi Command Helper Panel on Responder Screen (Requirement F) */}
      <EsxiCommandHelper targetMtu={1600} destinationTepPlaceholder="<destination TEP>" />

      {/* Incoming Packets Log Table */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
              Incoming Test Packet Stream Log
            </h3>
            {isListening && (
              <span className="flex items-center gap-1 text-xs font-mono text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Listening
              </span>
            )}
          </div>

          {/* Port Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300 font-mono text-xs">Filter:</span>
            <select
              value={filterPort}
              onChange={(e) => setFilterPort(e.target.value)}
              className="bg-[#020617] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Ports</option>
              {ports.map((p) => (
                <option key={p} value={p.toString()}>
                  Port {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" role="table">
            <thead className="bg-[#0b1329] text-slate-300 uppercase font-mono text-xs border-b border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-2.5">Timestamp</th>
                <th scope="col" className="px-4 py-2.5">Client IP Source</th>
                <th scope="col" className="px-4 py-2.5">Protocol</th>
                <th scope="col" className="px-4 py-2.5">Destination Port</th>
                <th scope="col" className="px-4 py-2.5">Probe Type</th>
                <th scope="col" className="px-4 py-2.5">Echo Status</th>
                <th scope="col" className="px-4 py-2.5 text-right">Echo Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-sans text-xs">
                    No packets captured yet. Start responder mode and transmit probes from the remote site.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 text-slate-300">{log.timestamp}</td>
                    <td className="px-4 py-2.5 text-slate-100 font-semibold">{log.clientIp}</td>
                    <td className="px-4 py-2.5 text-cyan-300 font-bold">{log.protocol}</td>
                    <td className="px-4 py-2.5 text-slate-200">{log.port}</td>
                    <td className="px-4 py-2.5 text-slate-300 font-sans text-xs">{log.probeType}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-200 border border-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                        <span>{log.handshakeStatus}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-200 tabular-nums font-semibold">
                      {log.latencyMs}ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
