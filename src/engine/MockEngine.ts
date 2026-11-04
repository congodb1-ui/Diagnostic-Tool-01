/**
 * Zaboraa Network Path Analyzer - Mock Engine Implementation
 * 
 * Implements EngineInterface with incremental events, factual VMware/AVS profile checks,
 * consistent token IP masking, binary-safe Base64 export, and strict UDP honesty.
 */

import profilesData from '../data/profiles.json';
import {
  DiagnosticProfile,
  EngineCapabilities,
  EngineInterface,
  FirewallRequestRule,
  Finding,
  HopResult,
  MtuProbeResult,
  CheckResult,
  ResponderLogEntry,
  RunEventCallback,
  RunOptions,
  RunProgress,
  SavedRunSummary,
  LocalHostInfo,
  RunEvent
} from './types';

export class MockEngine implements EngineInterface {
  public readonly isMock = true;
  private currentScenario: 'scenario-a' | 'scenario-b' | 'scenario-c' = 'scenario-b';
  private profiles: DiagnosticProfile[] = [];
  private activeRuns = new Map<string, { timer: any; listeners: Set<RunEventCallback>; progress: RunProgress }>();
  private savedRuns = new Map<string, SavedRunSummary>();
  private responderActive = false;
  private responderLogs: ResponderLogEntry[] = [];
  private responderTimer: any = null;

  // Local workstation network interface context
  private localHost: LocalHostInfo = {
    hostname: 'workstation-admin01.corp.example',
    interfaceName: 'Ethernet 1',
    ipv4Address: '192.0.2.25',
    prefixLength: 24
  };

  constructor() {
    this.profiles = (profilesData.profiles || []) as DiagnosticProfile[];
    this.seedInitialRuns();
    this.seedResponderLogs();
  }

  public setScenario(scenario: 'scenario-a' | 'scenario-b' | 'scenario-c') {
    this.currentScenario = scenario;
  }

  public getScenario(): 'scenario-a' | 'scenario-b' | 'scenario-c' {
    return this.currentScenario;
  }

  public async getCapabilities(): Promise<EngineCapabilities> {
    return {
      apiVersion: '1.2.0',
      isAdmin: false,
      rawSocketsAvailable: false,
      internetAccess: false, // Air-gapped offline environment
      responderModeAvailable: true,
      platform: 'Windows 11 Enterprise x64 (User Mode / Standard Privileges)',
      capabilitiesList: [
        {
          id: 'admin_rights',
          name: 'Administrative Privileges',
          status: 'DEGRADED',
          detail: 'Running without admin: TCP/UDP traceroute and MTR unavailable.',
          remediation: 'Right-click the executable and choose "Run as Administrator" to enable raw socket injection.'
        },
        {
          id: 'raw_sockets',
          name: 'Raw Sockets (requires administrator)',
          status: 'UNAVAILABLE',
          detail: 'Direct Layer-2/3 packet synthesis and DF flag control require administrative rights.',
          remediation: 'Elevate process privileges by running as Administrator.'
        },
        {
          id: 'internet_access',
          name: 'Internet Gateway Reachability',
          status: 'UNAVAILABLE',
          detail: 'No outbound public internet route detected. Operating in air-gapped isolated mode.'
        },
        {
          id: 'responder_mode',
          name: 'Local Responder Daemon',
          status: 'AVAILABLE',
          detail: 'Responder mode available on unprivileged user ports and standard allowed interfaces.'
        },
        {
          id: 'icmp_ping',
          name: 'Standard Echo',
          status: 'AVAILABLE',
          detail: 'Standard user-mode echo probe API available.'
        }
      ]
    };
  }

  public async listProfiles(): Promise<DiagnosticProfile[]> {
    return JSON.parse(JSON.stringify(this.profiles));
  }

  public async saveCustomProfile(profile: DiagnosticProfile): Promise<void> {
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = { ...profile, isCustom: true };
    } else {
      this.profiles.push({ ...profile, isCustom: true });
    }
  }

  public async deleteCustomProfile(profileId: string): Promise<boolean> {
    const idx = this.profiles.findIndex((p) => p.id === profileId);
    if (idx >= 0 && this.profiles[idx].isCustom) {
      this.profiles.splice(idx, 1);
      return true;
    }
    return false;
  }

  public async startRun(options: RunOptions): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const profile = this.profiles.find((p) => p.id === options.profileId) || this.profiles[0];

    const initialProgress: RunProgress = {
      runId,
      state: 'running',
      percent: 5,
      elapsedMs: 0,
      currentTaskDescription: `Initializing diagnostic run for "${profile.name}"...`,
      localHost: this.localHost,
      hops: [],
      checks: [],
      findings: []
    };

    const listeners = new Set<RunEventCallback>();
    this.activeRuns.set(runId, {
      timer: null,
      listeners,
      progress: initialProgress
    });

    this.executeIncrementalRun(runId, profile, options);

    return runId;
  }

  public async cancelRun(runId: string): Promise<boolean> {
    const run = this.activeRuns.get(runId);
    if (!run) return false;

    if (run.timer) clearTimeout(run.timer);
    run.progress.state = 'cancelled';
    run.progress.currentTaskDescription = 'Diagnostic run was cancelled by operator.';

    this.emitEvent(runId, {
      type: 'progress',
      runId,
      percent: run.progress.percent,
      elapsedMs: run.progress.elapsedMs,
      taskDescription: 'Diagnostic run cancelled.'
    });
    return true;
  }

  public subscribeToRunEvents(runId: string, callback: RunEventCallback): () => void {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.listeners.add(callback);
      // Emit initial baseline progress
      callback({
        type: 'progress',
        runId,
        percent: run.progress.percent,
        elapsedMs: run.progress.elapsedMs,
        taskDescription: run.progress.currentTaskDescription,
        localHost: this.localHost
      });
      return () => {
        run.listeners.delete(callback);
      };
    }
    return () => {};
  }

  public async getRunResult(runId: string): Promise<SavedRunSummary | null> {
    return this.savedRuns.get(runId) || null;
  }

  public async listSavedRuns(): Promise<SavedRunSummary[]> {
    return Array.from(this.savedRuns.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public async exportReport(
    runId: string,
    format: 'json' | 'csv' | 'pdf',
    maskIps: boolean = false
  ): Promise<{ dataBase64: string; filename: string; mimeType: string }> {
    const run = await this.getRunResult(runId);
    if (!run) throw new Error(`Run ID ${runId} not found`);

    const timestampStr = run.timestamp.replace(/[:.]/g, '-');
    const baseFilename = `zaboraa_report_${run.profileId}_${timestampStr}${maskIps ? '_masked' : ''}`;

    // Token mapping for consistent masking
    const tokenMap = new Map<string, string>();
    let ipCounter = 1;

    const getToken = (raw: string): string => {
      if (!raw) return raw;
      if (!tokenMap.has(raw)) {
        tokenMap.set(raw, `[MASKED_IP_${ipCounter++}]`);
      }
      return tokenMap.get(raw)!;
    };

    const maskString = (text: string): string => {
      if (!maskIps || !text) return text;
      // Match IPv4 and IPv6
      return text.replace(
        /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b|(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}\b|[a-zA-Z0-9-]+\.example\b/g,
        (match) => getToken(match)
      );
    };

    let textOutput = '';
    let mimeType = 'text/plain';
    let fileExt = 'txt';

    if (format === 'json') {
      const dataObj = {
        meta: {
          system: 'Zaboraa Network Path Analyzer',
          apiVersion: '1.2.0',
          airGapped: true,
          exportTimestamp: new Date().toISOString(),
          ipMasked: maskIps
        },
        run: maskIps ? JSON.parse(maskString(JSON.stringify(run))) : run
      };
      textOutput = JSON.stringify(dataObj, null, 2);
      mimeType = 'application/json';
      fileExt = 'json';
    } else if (format === 'csv') {
      const rows = [
        ['Type', 'Identifier', 'Source', 'Destination', 'Protocol', 'Port', 'Status', 'Details'].join(',')
      ];
      for (const h of run.hops) {
        const ip = maskIps ? maskString(h.ip) : h.ip;
        rows.push(`"Hop","${h.hopNumber}","LocalHost","${ip}","ICMP","Echo","${h.status}","RTT: ${h.avgLatencyMs}ms, Loss: ${h.lossPercent}%"`);
      }
      for (const c of run.checks) {
        const dst = maskIps ? maskString(c.targetHost) : c.targetHost;
        rows.push(`"Check","${c.id}","${c.flowSource}","${dst}","${c.protocol}","${c.port}","${c.status}","${c.details.replace(/"/g, '""')}"`);
      }
      for (const f of run.findings) {
        rows.push(`"Finding","${f.id}","N/A","N/A","N/A","N/A","${f.severity}","${f.title.replace(/"/g, '""')}"`);
      }
      textOutput = rows.join('\r\n');
      mimeType = 'text/csv';
      fileExt = 'csv';
    } else {
      // PDF / Print-ready text format
      textOutput = this.generateAsciiReport(run, maskIps, maskString);
      mimeType = 'text/plain';
      fileExt = 'txt';
    }

    // Binary-safe Base64 encoding
    const dataBase64 = typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(textOutput)))
      : Buffer.from(textOutput, 'utf-8').toString('base64');

    return {
      dataBase64,
      filename: `${baseFilename}.${fileExt}`,
      mimeType
    };
  }

  public async startResponder(ports: number[]): Promise<boolean> {
    this.responderActive = true;
    if (this.responderTimer) clearInterval(this.responderTimer);

    this.responderTimer = setInterval(() => {
      if (!this.responderActive) return;
      const port = ports[Math.floor(Math.random() * ports.length)] || 4500;
      const proto = port === 4500 || port === 6081 ? 'UDP' : 'TCP';
      const logEntry: ResponderLogEntry = {
        id: `resp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        clientIp: '192.0.2.80',
        protocol: proto,
        port,
        probeType: proto === 'TCP' ? 'SYN_PROBE' : 'UDP_ECHO_PROBE',
        handshakeStatus: 'SUCCESS',
        latencyMs: +(Math.random() * 3 + 14.1).toFixed(2)
      };
      this.responderLogs.unshift(logEntry);
      if (this.responderLogs.length > 50) this.responderLogs.pop();
    }, 4000);

    return true;
  }

  public async stopResponder(): Promise<boolean> {
    this.responderActive = false;
    if (this.responderTimer) {
      clearInterval(this.responderTimer);
      this.responderTimer = null;
    }
    return true;
  }

  public async getResponderLogs(): Promise<ResponderLogEntry[]> {
    return [...this.responderLogs];
  }

  // ---------------------------------------------------------------------------
  // Internal Incremental Run Execution
  // ---------------------------------------------------------------------------

  private emitEvent(runId: string, event: RunEvent) {
    const run = this.activeRuns.get(runId);
    if (!run) return;
    for (const listener of run.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in run event listener:', err);
      }
    }
  }

  private async executeIncrementalRun(runId: string, profile: DiagnosticProfile, options: RunOptions) {
    const scenario = this.currentScenario;
    const run = this.activeRuns.get(runId);
    if (!run) return;

    // Stage 1: Local network interface and DNS
    await new Promise((res) => setTimeout(res, 350));
    run.progress.percent = 20;
    run.progress.elapsedMs = 350;
    this.emitEvent(runId, {
      type: 'progress',
      runId,
      percent: 20,
      elapsedMs: 350,
      taskDescription: `Local interface verified: ${this.localHost.ipv4Address} on ${this.localHost.interfaceName}`,
      localHost: this.localHost
    });

    // Stage 2: Emit Hops incrementally
    const hops = this.generateHops(scenario);
    let hopElapsed = 350;
    for (const hop of hops) {
      await new Promise((res) => setTimeout(res, 120));
      hopElapsed += 120;
      run.progress.hops.push(hop);
      this.emitEvent(runId, { type: 'hop', runId, hop });
    }

    // Stage 3: MTU Probe
    await new Promise((res) => setTimeout(res, 250));
    hopElapsed += 250;
    const mtuResult = this.generateMtu(scenario, options.customMtuThreshold || profile.mtuSettings.defaultPathMtu);
    run.progress.mtuResult = mtuResult;
    this.emitEvent(runId, {
      type: 'progress',
      runId,
      percent: 60,
      elapsedMs: hopElapsed,
      taskDescription: `MTU evaluation completed: Path MTU ${mtuResult.discoveredPathMtu} bytes`,
      mtuResult
    });

    // Stage 4: Emit checks incrementally
    const checks = this.generateChecks(scenario, profile, options);
    for (const check of checks) {
      await new Promise((res) => setTimeout(res, 90));
      hopElapsed += 90;
      run.progress.checks.push(check);
      this.emitEvent(runId, { type: 'check', runId, check });
    }

    // Stage 5: Emit findings and complete
    await new Promise((res) => setTimeout(res, 200));
    hopElapsed += 200;
    const findings = this.generateFindings(scenario, profile, options);
    for (const finding of findings) {
      run.progress.findings.push(finding);
      this.emitEvent(runId, { type: 'finding', runId, finding });
    }

    run.progress.state = 'completed';
    run.progress.percent = 100;
    run.progress.elapsedMs = hopElapsed;

    const summary: SavedRunSummary = {
      runId,
      timestamp: new Date().toISOString(),
      profileId: profile.id,
      profileName: profile.name,
      targetRoles: options.targetRoles,
      primaryTarget: String(options.targetRoles['hcx-manager'] || options.targetRoles['vcenter'] || options.targetRoles['tep'] || '192.0.2.10'),
      localHost: this.localHost,
      durationMs: hopElapsed,
      overallStatus: findings.some((f) => f.severity === 'BLOCKED')
        ? 'BLOCKED'
        : findings.some((f) => f.severity === 'WARNING')
        ? 'WARNING'
        : 'OK',
      blockedCount: findings.filter((f) => f.severity === 'BLOCKED').length,
      warningCount: findings.filter((f) => f.severity === 'WARNING').length,
      okCount: findings.filter((f) => f.severity === 'OK').length,
      unverifiedCount: checks.filter((c) => c.status === 'CANNOT_BE_TESTED').length,
      pathMtu: mtuResult.discoveredPathMtu,
      hops: run.progress.hops,
      checks: run.progress.checks,
      findings: run.progress.findings
    };

    this.savedRuns.set(runId, summary);
    this.emitEvent(runId, { type: 'complete', runId, summary });
  }

  // ---------------------------------------------------------------------------
  // Generators for Scenarios A, B, and C
  // ---------------------------------------------------------------------------

  private generateHops(scenario: string): HopResult[] {
    if (scenario === 'scenario-a') {
      // Scenario A: ICMP blocked at hop 4 (192.0.2.4) but TCP 443 succeeds
      return [
        { hopNumber: 1, ip: '192.0.2.1', hostname: 'gw-onprem.example', lossPercent: 0, avgLatencyMs: 0.45, minLatencyMs: 0.40, maxLatencyMs: 0.52, jitterMs: 0.05, status: 'OK', dnsResolved: true },
        { hopNumber: 2, ip: '192.0.2.2', hostname: 'spine01.example', lossPercent: 0, avgLatencyMs: 1.20, minLatencyMs: 1.05, maxLatencyMs: 1.45, jitterMs: 0.11, status: 'OK', dnsResolved: true },
        { hopNumber: 3, ip: '192.0.2.3', hostname: 'er-cpe.example', lossPercent: 0, avgLatencyMs: 4.85, minLatencyMs: 4.60, maxLatencyMs: 5.10, jitterMs: 0.18, status: 'OK', dnsResolved: true },
        { hopNumber: 4, ip: '192.0.2.4', hostname: 'transit-hop04.example', lossPercent: 100, avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, jitterMs: 0, status: 'BLOCKED', dnsResolved: true, notes: 'ICMP echo timed out at hop 4. Intermediate filter.' },
        { hopNumber: 5, ip: '192.0.2.5', hostname: 'edge-avs.example', lossPercent: 0, avgLatencyMs: 14.80, minLatencyMs: 14.10, maxLatencyMs: 15.50, jitterMs: 0.35, status: 'OK', dnsResolved: true },
        { hopNumber: 6, ip: '192.0.2.10', hostname: 'endpoint.example', lossPercent: 0, avgLatencyMs: 15.10, minLatencyMs: 14.60, maxLatencyMs: 15.90, jitterMs: 0.40, status: 'OK', dnsResolved: true }
      ];
    } else if (scenario === 'scenario-c') {
      return [
        { hopNumber: 1, ip: '192.0.2.1', hostname: 'gw-onprem.example', lossPercent: 0, avgLatencyMs: 0.42, minLatencyMs: 0.38, maxLatencyMs: 0.50, jitterMs: 0.04, status: 'OK', dnsResolved: true },
        { hopNumber: 2, ip: '192.0.2.2', hostname: 'spine01.example', lossPercent: 0, avgLatencyMs: 1.15, minLatencyMs: 1.00, maxLatencyMs: 1.35, jitterMs: 0.09, status: 'OK', dnsResolved: true },
        { hopNumber: 3, ip: '192.0.2.3', hostname: 'er-cpe.example', lossPercent: 0, avgLatencyMs: 4.90, minLatencyMs: 4.70, maxLatencyMs: 5.25, jitterMs: 0.22, status: 'OK', dnsResolved: true },
        { hopNumber: 4, ip: '192.0.2.5', hostname: 'edge-avs.example', lossPercent: 0, avgLatencyMs: 14.60, minLatencyMs: 14.05, maxLatencyMs: 15.40, jitterMs: 0.30, status: 'OK', dnsResolved: true },
        { hopNumber: 5, ip: '192.0.2.100', hostname: 'tep-node.example', lossPercent: 0, avgLatencyMs: 15.00, minLatencyMs: 14.40, maxLatencyMs: 15.80, jitterMs: 0.32, status: 'OK', dnsResolved: true }
      ];
    } else {
      // Scenario B: HCX pre-check
      return [
        { hopNumber: 1, ip: '192.0.2.1', hostname: 'gw-onprem.example', lossPercent: 0, avgLatencyMs: 0.40, minLatencyMs: 0.35, maxLatencyMs: 0.48, jitterMs: 0.03, status: 'OK', dnsResolved: true },
        { hopNumber: 2, ip: '192.0.2.2', hostname: 'spine01.example', lossPercent: 0, avgLatencyMs: 1.10, minLatencyMs: 0.95, maxLatencyMs: 1.30, jitterMs: 0.08, status: 'OK', dnsResolved: true },
        { hopNumber: 3, ip: '192.0.2.3', hostname: 'er-cpe.example', lossPercent: 0, avgLatencyMs: 4.75, minLatencyMs: 4.50, maxLatencyMs: 5.05, jitterMs: 0.19, status: 'OK', dnsResolved: true },
        { hopNumber: 4, ip: '192.0.2.5', hostname: 'edge-avs.example', lossPercent: 0, avgLatencyMs: 14.50, minLatencyMs: 13.90, maxLatencyMs: 15.20, jitterMs: 0.28, status: 'OK', dnsResolved: true },
        { hopNumber: 5, ip: '192.0.2.20', hostname: 'hcx-ix.example', lossPercent: 0, avgLatencyMs: 14.95, minLatencyMs: 14.30, maxLatencyMs: 15.60, jitterMs: 0.31, status: 'OK', dnsResolved: true }
      ];
    }
  }

  private generateMtu(scenario: string, requiredMtu: number): MtuProbeResult {
    if (scenario === 'scenario-c') {
      // Don't-fragment test passes at 1472 and fails at 1500 payload sizes, path MTU 1500, required 1600
      return {
        probes: [
          { payloadSize: 1472, dontFragment: true, result: 'passed' },
          { payloadSize: 1500, dontFragment: true, result: 'fragmentation-needed', respondingHop: '192.0.2.2' }
        ],
        discoveredPathMtu: 1500,
        requiredMtu,
        status: 'BLOCKED',
        notes: 'Don\'t-fragment test passes at 1472 payload (+28 bytes IP/ICMP header = 1500 MTU) and fails at 1500 payload (1528 MTU).'
      };
    }

    return {
      probes: [
        { payloadSize: 1472, dontFragment: true, result: 'passed' },
        { payloadSize: 1572, dontFragment: true, result: 'passed' }
      ],
      discoveredPathMtu: 1600,
      requiredMtu,
      status: 'OK',
      notes: 'Don\'t-fragment probe passed for configured MTU threshold.'
    };
  }

  private generateChecks(
    scenario: string,
    profile: DiagnosticProfile,
    options: RunOptions
  ): CheckResult[] {
    const checks: CheckResult[] = [];
    const now = () => new Date().toLocaleTimeString('en-US', { hour12: false });

    for (const rule of profile.rules) {
      if (!rule.enabled) continue;

      // Rule Target Resolution
      const roleTarget = options.targetRoles[rule.targetRole];
      const targetHost = Array.isArray(roleTarget) ? roleTarget[0] : (roleTarget || '192.0.2.10');

      // Rule not testable from this workstation
      if (!rule.testableFromHere) {
        checks.push({
          id: `chk-${rule.id}`,
          ruleId: rule.id,
          timestamp: now(),
          label: rule.label,
          protocol: rule.protocol,
          port: rule.port,
          status: 'CANNOT_BE_TESTED',
          details: 'Cannot be tested from this machine: confirm on the source side',
          rawResult: 'SKIPPED: Traffic direction or network segment not reachable from local host.',
          targetHost,
          targetRole: rule.targetRole,
          flowSource: rule.flowSource,
          flowDestination: rule.flowDestination,
          testableFromHere: false,
          requiresResponder: rule.requiresResponder
        });
        continue;
      }

      if (scenario === 'scenario-a') {
        if (rule.protocol === 'ICMP') {
          checks.push({
            id: `chk-${rule.id}`,
            ruleId: rule.id,
            timestamp: now(),
            label: rule.label,
            protocol: 'ICMP',
            port: rule.port,
            status: 'WARNING',
            details: 'ICMP filtered at intermediate hop 4 (192.0.2.4). Downstream TCP traffic passes without interference.',
            rawResult: 'Request timed out. 100% packet loss at hop 4.',
            targetHost,
            targetRole: rule.targetRole,
            flowSource: rule.flowSource,
            flowDestination: rule.flowDestination,
            testableFromHere: true,
            requiresResponder: false
          });
        } else {
          checks.push({
            id: `chk-${rule.id}`,
            ruleId: rule.id,
            timestamp: now(),
            label: rule.label,
            protocol: rule.protocol,
            port: rule.port,
            status: 'OPEN',
            latencyMs: 14.8,
            details: 'TCP connection established successfully to destination endpoint.',
            rawResult: 'SYN -> SYN-ACK -> ACK completed in 14.8ms.',
            targetHost,
            targetRole: rule.targetRole,
            flowSource: rule.flowSource,
            flowDestination: rule.flowDestination,
            testableFromHere: true,
            requiresResponder: false
          });
        }
      } else if (scenario === 'scenario-b') {
        // Scenario B: HCX pre-check where UDP 4500 returns no response from responder-less target.
        // TCP 8123 filtered (no reset, timeout).
        if (rule.protocol === 'UDP') {
          checks.push({
            id: `chk-${rule.id}`,
            ruleId: rule.id,
            timestamp: now(),
            label: rule.label,
            protocol: 'UDP',
            port: rule.port,
            status: 'INCONCLUSIVE',
            details: 'UDP datagram sent; no application-level response or ICMP unreachable returned. Run responder mode on the far-end host to verify this.',
            rawResult: `UDP probe sent to port ${rule.port}. 0 responses returned. Target has no active UDP echo responder service.`,
            targetHost,
            targetRole: rule.targetRole,
            flowSource: rule.flowSource,
            flowDestination: rule.flowDestination,
            testableFromHere: true,
            requiresResponder: true
          });
        } else if (rule.port === '8123') {
          checks.push({
            id: `chk-${rule.id}`,
            ruleId: rule.id,
            timestamp: now(),
            label: rule.label,
            protocol: 'TCP',
            port: rule.port,
            status: 'BLOCKED',
            latencyMs: 3000,
            details: 'TCP SYN sent; connection timed out after 3000ms. No TCP RST received (silent drop).',
            rawResult: `TCP SYN sent to ${targetHost}:8123. 0 bytes received. ETIMEDOUT (Silent drop, state table reject).`,
            targetHost,
            targetRole: rule.targetRole,
            flowSource: rule.flowSource,
            flowDestination: rule.flowDestination,
            testableFromHere: true,
            requiresResponder: false
          });
        } else {
          checks.push({
            id: `chk-${rule.id}`,
            ruleId: rule.id,
            timestamp: now(),
            label: rule.label,
            protocol: rule.protocol,
            port: rule.port,
            status: 'OPEN',
            latencyMs: +(Math.random() * 2 + 14.2).toFixed(1),
            details: `Port ${rule.port} connection established successfully.`,
            rawResult: 'SYN-ACK received in nominal latency window.',
            targetHost,
            targetRole: rule.targetRole,
            flowSource: rule.flowSource,
            flowDestination: rule.flowDestination,
            testableFromHere: true,
            requiresResponder: false
          });
        }
      } else {
        // Scenario C
        checks.push({
          id: `chk-${rule.id}`,
          ruleId: rule.id,
          timestamp: now(),
          label: rule.label,
          protocol: rule.protocol,
          port: rule.port,
          status: rule.protocol === 'UDP' ? 'INCONCLUSIVE' : 'OPEN',
          latencyMs: 14.9,
          details: rule.protocol === 'UDP'
            ? 'UDP datagram sent without response. Run responder mode on far-end host.'
            : 'Connection established.',
          rawResult: 'Probe verified.',
          targetHost,
          targetRole: rule.targetRole,
          flowSource: rule.flowSource,
          flowDestination: rule.flowDestination,
          testableFromHere: true,
          requiresResponder: rule.requiresResponder
        });
      }
    }

    return checks;
  }

  private generateFindings(
    scenario: string,
    profile: DiagnosticProfile,
    options: RunOptions
  ): Finding[] {
    const findings: Finding[] = [];

    if (scenario === 'scenario-a') {
      findings.push({
        id: 'finding-icmp-filtered-hop4',
        title: 'ICMP filtered at transit hop 4, TCP unaffected',
        severity: 'WARNING',
        confidence: 'High',
        cause: 'Likely transit firewall or edge router policy dropping ICMP Echo Request packets at hop 4 (192.0.2.4), while TCP transport traffic passes without interference.',
        evidence: 'Hop 4 (192.0.2.4) exhibited 100% packet loss across 4 probes. Subsequent destination endpoint responded to TCP 443 within 14.8ms.',
        fixSteps: [
          'Verify transit firewall and Azure Network Security Group ICMP policies.',
          'If ICMP monitoring is required by enterprise NMS, create an explicit permit rule for ICMP Type 8 (Echo) from the on-premises management subnet.',
          'TCP HTTPS management traffic is unaffected.'
        ],
        kbUrl: 'https://kb.zaboraa.example/avs/icmp-filtering-edge',
        firewallRequest: {
          id: 'fw-icmp-hop4',
          source: this.localHost.ipv4Address,
          destination: '192.0.2.10',
          protocol: 'ICMP',
          port: 'Echo',
          direction: 'On-prem admin workstation -> AVS endpoint',
          purpose: 'Infrastructure path telemetry and latency monitoring',
          status: 'inconclusive',
          suggestedAction: 'ALLOW'
        }
      });
      findings.push({
        id: 'finding-tcp-443-nominal',
        title: 'TCP port 443 connectivity confirmed',
        severity: 'OK',
        confidence: 'High',
        cause: 'TCP three-way handshake completed without delay.',
        evidence: 'SYN/ACK round-trip measured at 14.8ms with zero packet loss.',
        fixSteps: ['Maintain existing firewall rules for administrative HTTPS traffic.'],
        kbUrl: 'https://kb.zaboraa.example/avs/management-access'
      });
    } else if (scenario === 'scenario-b') {
      const interconnectTarget = String(options.targetRoles['hcx-interconnect'] || '192.0.2.20');

      findings.push({
        id: 'finding-tcp-8123-filtered',
        title: 'TCP 8123 (Bulk Migration Control) filtered by firewall',
        severity: 'BLOCKED',
        confidence: 'High',
        cause: 'Likely firewall dropping TCP SYN packets to port 8123. The probe experienced a silent timeout with no TCP RST flag returned.',
        evidence: `Sent 3 SYN packets to ${interconnectTarget}:8123. Received 0 packets back. Total elapsed timeout 3000ms. No ICMP Host Unreachable message received.`,
        fixSteps: [
          'Submit a firewall change request to permit outbound TCP port 8123 from on-premises HCX Manager to interconnect appliances.',
          'Verify network security group and edge firewall access control lists.',
          'Confirm destination appliance is listening on port 8123.'
        ],
        kbUrl: 'https://kb.zaboraa.example/avs/hcx/port-8123',
        firewallRequest: {
          id: 'fw-hcx-8123',
          source: this.localHost.ipv4Address,
          destination: interconnectTarget,
          protocol: 'TCP',
          port: '8123',
          direction: 'HCX Manager -> HCX Interconnect (IX)',
          purpose: 'HCX Manager to interconnect bulk migration control',
          status: 'blocked',
          suggestedAction: 'ALLOW'
        }
      });

      findings.push({
        id: 'finding-udp-4500-inconclusive',
        title: 'UDP 4500 (HCX-IX Tunnel) inconclusive without remote responder',
        severity: 'WARNING',
        confidence: 'Medium',
        cause: 'UDP inconclusive without a responder; recommend running responder mode at the far end.',
        evidence: 'UDP datagram dispatched to port 4500 without receiving an ICMP Port Unreachable packet. No application acknowledgment returned by target.',
        fixSteps: [
          'Launch Zaboraa Responder Mode on a jumpbox or remote virtual machine within the target segment.',
          'Re-run diagnostic against the responder port 4500 to obtain authoritative verification.',
          'Confirm UDP 4500 is permitted in the transit firewall for IPsec NAT-Traversal encapsulation.'
        ],
        kbUrl: 'https://kb.zaboraa.example/avs/hcx/udp-4500',
        firewallRequest: {
          id: 'fw-hcx-4500',
          source: this.localHost.ipv4Address,
          destination: interconnectTarget,
          protocol: 'UDP',
          port: '4500',
          direction: 'HCX Interconnect -> HCX Interconnect',
          purpose: 'Between interconnect appliances (IPsec/NAT-T tunnel)',
          status: 'inconclusive',
          suggestedAction: 'ADD_RESPONDER'
        }
      });

      findings.push({
        id: 'finding-hcx-443-nominal',
        title: 'HCX Manager Web & REST API access confirmed',
        severity: 'OK',
        confidence: 'High',
        cause: 'TCP 443 and 9443 connections established with nominal latency.',
        evidence: 'SYN/ACK received on ports 443 and 9443.',
        fixSteps: ['Maintain existing rules for administrative HTTPS traffic.'],
        kbUrl: 'https://kb.zaboraa.example/avs/hcx/api-access'
      });
    } else if (scenario === 'scenario-c') {
      const tepTarget = String(options.targetRoles['tep'] || '192.0.2.100');

      findings.push({
        id: 'finding-mtu-insufficient-overlay',
        title: 'Path MTU 1500 insufficient for overlay (Requires 1600+)',
        severity: 'BLOCKED',
        confidence: 'High',
        cause: 'Transit path enforces standard 1500-byte MTU. Geneve overlay encapsulation requires minimum 1600 bytes to prevent fragmentation.',
        evidence: 'Don\'t-fragment test passes at 1472 and fails at 1500 payload sizes. Path MTU discovered: 1500.',
        fixSteps: [
          'Increase MTU on physical switches and routers along the path (minimum 1600 bytes).',
          'Ensure the ExpressRoute circuit has Jumbo Frames enabled with the service provider.',
          'Verify against your NSX version: check Transport Node Profile uplink MTU setting.',
          'Ensure ESXi vmkernel TEP interfaces on-premises match the required MTU.'
        ],
        kbUrl: 'https://kb.zaboraa.example/avs/nsx/overlay-mtu',
        isOverlayIssue: true,
        firewallRequest: {
          id: 'fw-mtu-geneve',
          source: this.localHost.ipv4Address,
          destination: tepTarget,
          protocol: 'UDP',
          port: '6081',
          direction: 'TEP -> TEP',
          purpose: 'UDP 6081 Geneve overlay data plane encapsulation',
          status: 'blocked',
          suggestedAction: 'REVIEW'
        }
      });
    }

    return findings;
  }

  private generateAsciiReport(
    run: SavedRunSummary,
    maskIps: boolean,
    maskString: (s: string) => string
  ): string {
    const border = '='.repeat(88);
    const subborder = '-'.repeat(88);

    let output = '';
    output += `${border}\n`;
    output += `ZABORAA NETWORK PATH ANALYZER - AIR-GAPPED AUDIT REPORT\n`;
    output += `Export Date  : ${new Date().toISOString()}\n`;
    output += `Privacy Mode : ${maskIps ? 'TOKENIZED MASKING ACTIVE' : 'UNMASKED'}\n`;
    output += `System Mode  : Local Workstation (Air-Gapped, No Cloud Connections)\n`;
    output += `${border}\n\n`;

    output += `1. EXECUTION CONTEXT\n`;
    output += `${subborder}\n`;
    output += `Run ID       : ${run.runId}\n`;
    output += `Profile      : ${run.profileName} (${run.profileId})\n`;
    output += `Primary Target: ${maskIps ? maskString(run.primaryTarget) : run.primaryTarget}\n`;
    output += `Verdict      : [${run.overallStatus}] (Blocked: ${run.blockedCount}, Warning: ${run.warningCount}, OK: ${run.okCount}, Unverified: ${run.unverifiedCount})\n`;
    output += `Path MTU     : ${run.pathMtu} bytes\n`;
    output += `Local Host   : ${maskIps ? maskString(run.localHost?.ipv4Address || '192.0.2.25') : (run.localHost?.ipv4Address || '192.0.2.25')} (${run.localHost?.interfaceName || 'Ethernet'})\n\n`;

    output += `2. DIAGNOSTIC FINDINGS\n`;
    output += `${subborder}\n`;
    for (const f of run.findings) {
      output += `[${f.severity}] ${f.title} (Confidence: ${f.confidence})\n`;
      output += `  Probable Cause : ${maskIps ? maskString(f.cause) : f.cause}\n`;
      output += `  Raw Evidence   : ${maskIps ? maskString(f.evidence) : f.evidence}\n`;
      output += `  Fix Actions    :\n`;
      for (const step of f.fixSteps) {
        output += `    - ${step}\n`;
      }
      output += `\n`;
    }

    output += `3. PATH HOPS\n`;
    output += `${subborder}\n`;
    output += `Hop | IP Address         | Loss % | Avg ms | Jitter | Status   | Hostname\n`;
    output += `----+--------------------+--------+--------+--------+----------+--------------------------\n`;
    for (const h of run.hops) {
      const ip = (maskIps ? maskString(h.ip) : h.ip).padEnd(18);
      const loss = `${h.lossPercent}%`.padStart(6);
      const latency = `${h.avgLatencyMs.toFixed(1)}ms`.padStart(6);
      const jitter = `${h.jitterMs.toFixed(1)}ms`.padStart(6);
      const status = h.status.padEnd(8);
      const host = maskIps ? maskString(h.hostname) : h.hostname;
      output += ` ${h.hopNumber.toString().padStart(2)} | ${ip} | ${loss} | ${latency} | ${jitter} | ${status} | ${host}\n`;
    }
    output += `\n`;

    output += `4. CHECK RESULTS MATRIX\n`;
    output += `${subborder}\n`;
    for (const c of run.checks) {
      const dst = maskIps ? maskString(c.targetHost) : c.targetHost;
      output += `[${c.status.padEnd(19)}] ${c.protocol.padEnd(4)} Port ${c.port.padEnd(6)} -> ${dst} (${c.label})\n`;
      output += `  Source -> Dest : ${c.flowSource} -> ${c.flowDestination}\n`;
      output += `  Details        : ${maskIps ? maskString(c.details) : c.details}\n\n`;
    }

    output += `${border}\nEND OF REPORT\n`;
    return output;
  }

  private seedInitialRuns() {
    const targetA = '192.0.2.10';
    const targetB = '192.0.2.20';
    const targetC = '192.0.2.100';

    const hopsA = this.generateHops('scenario-a');
    const checksA = this.generateChecks('scenario-a', this.profiles[2] || this.profiles[0], {
      profileId: 'expressroute-reachability',
      targetRoles: { 'hcx-manager': targetA, 'vcenter': '192.0.2.11', 'nsx-manager': '192.0.2.12' }
    });
    const findingsA = this.generateFindings('scenario-a', this.profiles[2] || this.profiles[0], {
      profileId: 'expressroute-reachability',
      targetRoles: { 'hcx-manager': targetA }
    });

    const hopsB = this.generateHops('scenario-b');
    const checksB = this.generateChecks('scenario-b', this.profiles[0], {
      profileId: 'hcx-precheck',
      targetRoles: { 'hcx-manager': '192.0.2.10', 'hcx-interconnect': targetB, 'esxi-host': ['192.0.2.31', '192.0.2.32'] }
    });
    const findingsB = this.generateFindings('scenario-b', this.profiles[0], {
      profileId: 'hcx-precheck',
      targetRoles: { 'hcx-interconnect': targetB }
    });

    const hopsC = this.generateHops('scenario-c');
    const checksC = this.generateChecks('scenario-c', this.profiles[4] || this.profiles[0], {
      profileId: 'overlay-network',
      targetRoles: { 'tep': targetC }
    });
    const findingsC = this.generateFindings('scenario-c', this.profiles[4] || this.profiles[0], {
      profileId: 'overlay-network',
      targetRoles: { 'tep': targetC }
    });

    this.savedRuns.set('run-seed-scenario-a', {
      runId: 'run-seed-scenario-a',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      profileId: 'expressroute-reachability',
      profileName: 'ExpressRoute / Global Reach Reachability',
      targetRoles: { 'hcx-manager': targetA },
      primaryTarget: targetA,
      localHost: this.localHost,
      durationMs: 3120,
      overallStatus: 'WARNING',
      blockedCount: 0,
      warningCount: 1,
      okCount: 2,
      unverifiedCount: 0,
      pathMtu: 1500,
      hops: hopsA,
      checks: checksA,
      findings: findingsA
    });

    this.savedRuns.set('run-seed-scenario-b-baseline', {
      runId: 'run-seed-scenario-b-baseline',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      profileId: 'hcx-precheck',
      profileName: 'HCX Pre-Check',
      targetRoles: { 'hcx-manager': '192.0.2.10', 'hcx-interconnect': targetB },
      primaryTarget: targetB,
      localHost: this.localHost,
      durationMs: 3450,
      overallStatus: 'BLOCKED',
      blockedCount: 1,
      warningCount: 1,
      okCount: 2,
      unverifiedCount: 0,
      pathMtu: 1500,
      hops: hopsB,
      checks: checksB,
      findings: findingsB
    });

    // Post-change run where port 8123 is verified open
    const fixedChecksB = checksB.map((c) =>
      c.port === '8123'
        ? {
            ...c,
            status: 'OPEN' as const,
            latencyMs: 14.7,
            details: 'TCP connection established successfully to destination endpoint.',
            rawResult: 'SYN -> SYN-ACK -> ACK completed in 14.7ms.'
          }
        : c
    );

    const fixedFindingsB = findingsB
      .filter((f) => f.id !== 'finding-tcp-8123-filtered')
      .concat([
        {
          id: 'finding-tcp-8123-fixed',
          title: 'TCP 8123 (Bulk Migration Control) verified open',
          severity: 'OK',
          confidence: 'High',
          cause: 'Permitted through updated firewall policy.',
          evidence: 'Handshake completed with 14.7ms latency.',
          fixSteps: ['Rule verified in production.'],
          kbUrl: 'https://kb.zaboraa.example/avs/hcx/port-matrix'
        }
      ]);

    this.savedRuns.set('run-seed-scenario-b-postchange', {
      runId: 'run-seed-scenario-b-postchange',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      profileId: 'hcx-precheck',
      profileName: 'HCX Pre-Check',
      targetRoles: { 'hcx-manager': '192.0.2.10', 'hcx-interconnect': targetB },
      primaryTarget: targetB,
      localHost: this.localHost,
      durationMs: 3380,
      overallStatus: 'WARNING',
      blockedCount: 0,
      warningCount: 1,
      okCount: 3,
      unverifiedCount: 0,
      pathMtu: 1500,
      hops: hopsB,
      checks: fixedChecksB,
      findings: fixedFindingsB
    });

    this.savedRuns.set('run-seed-scenario-c', {
      runId: 'run-seed-scenario-c',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
      profileId: 'overlay-network',
      profileName: 'NSX Overlay & BFD Transport',
      targetRoles: { 'tep': targetC },
      primaryTarget: targetC,
      localHost: this.localHost,
      durationMs: 2980,
      overallStatus: 'BLOCKED',
      blockedCount: 1,
      warningCount: 0,
      okCount: 0,
      unverifiedCount: 3,
      pathMtu: 1500,
      hops: hopsC,
      checks: checksC,
      findings: findingsC
    });
  }

  private seedResponderLogs() {
    this.responderLogs = [
      {
        id: 'resp-seed-1',
        timestamp: '14:22:05',
        clientIp: '192.0.2.80',
        protocol: 'UDP',
        port: 4500,
        probeType: 'UDP_ECHO_PROBE',
        handshakeStatus: 'ECHOED',
        latencyMs: 14.2
      },
      {
        id: 'resp-seed-2',
        timestamp: '14:21:48',
        clientIp: '192.0.2.80',
        protocol: 'TCP',
        port: 8123,
        probeType: 'SYN_PROBE',
        handshakeStatus: 'SUCCESS',
        latencyMs: 14.5
      },
      {
        id: 'resp-seed-3',
        timestamp: '14:19:12',
        clientIp: '192.0.2.80',
        protocol: 'TCP',
        port: 5201,
        probeType: 'UPLINK_BENCHMARK',
        handshakeStatus: 'SUCCESS',
        latencyMs: 13.9
      }
    ];
  }
}

export const mockEngine = new MockEngine();
