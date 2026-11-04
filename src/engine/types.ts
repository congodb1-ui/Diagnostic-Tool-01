/**
 * Zaboraa Network Path Analyzer - Engine Contract Interface
 * 
 * Strict contract defining the local diagnostic engine.
 * The UI layer strictly communicates with this interface.
 * Does not require any external driver (no WinPcap, no Npcap).
 * Uses standard OS capabilities and raw sockets (requires administrator).
 */

export type TargetSource = 'typed' | 'discovered';

export interface TestTarget {
  host: string;
  label?: string;
  source: TargetSource;
  connectionId?: string;
}

export type TargetRole = 
  | 'hcx-manager'
  | 'hcx-interconnect'
  | 'esxi-host'
  | 'vcenter'
  | 'nsx-manager'
  | 'dns-server'
  | 'ad-controller'
  | 'tep'
  | 'custom';

export type ProtocolType = 'TCP' | 'UDP' | 'ICMP' | 'HTTPS' | 'DNS' | 'MTU';

export interface ProfileRule {
  id: string;
  label: string;
  protocol: ProtocolType;
  port: string; // Port or port range or ICMP description
  direction: string;
  purpose: string;
  source: string; // Verified document or "Zaboraa internal, to be verified"
  verifyAgainstVersion: string;
  enabled: boolean;
  targetRole: TargetRole;
  flowSource: string; // Who initiates traffic (e.g. "HCX Manager", "On-prem admin workstation")
  flowDestination: string; // Who receives traffic (e.g. "ESXi host", "AVS vCenter")
  testableFromHere: boolean; // false if traffic originates on AVS side or inside private TEP network
  requiresAdmin: boolean;
  requiresResponder: boolean;
}

export interface MtuSettings {
  defaultPathMtu: number;
  thresholdNote: string; // "Unverified default, confirm for your design"
  source: string;
  verifyAgainstVersion: string;
}

export interface DiagnosticProfile {
  id: string;
  name: string;
  category: string;
  description: string;
  rolesUsed: TargetRole[];
  defaultRoleTargets: Partial<Record<TargetRole, string | string[]>>;
  defaultTargetLabel?: string;
  targetSource: TargetSource;
  mtuSettings: MtuSettings;
  rules: ProfileRule[];
  isCustom?: boolean;
}

export type SeverityLevel = 'BLOCKED' | 'WARNING' | 'OK';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type CheckStatus = 
  | 'OPEN' 
  | 'CLOSED' 
  | 'BLOCKED' 
  | 'WARNING' 
  | 'INCONCLUSIVE' 
  | 'RESPONDER_CONFIRMED' 
  | 'CANNOT_BE_TESTED'
  | 'PENDING' 
  | 'PROBING';

export interface HopResult {
  hopNumber: number;
  ip: string;
  hostname: string;
  lossPercent: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  jitterMs: number;
  status: 'OK' | 'WARNING' | 'BLOCKED';
  dnsResolved: boolean;
  notes?: string;
}

export interface CheckResult {
  id: string;
  ruleId?: string;
  timestamp: string;
  label: string;
  protocol: ProtocolType;
  port: string;
  status: CheckStatus;
  latencyMs?: number;
  details: string;
  rawResult: string;
  targetHost: string;
  targetRole: TargetRole;
  flowSource: string;
  flowDestination: string;
  testableFromHere: boolean;
  requiresResponder: boolean;
  error?: string;
}

export interface FirewallRequestRule {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port: string;
  direction: string;
  purpose: string;
  status: 'open' | 'blocked' | 'inconclusive' | 'unverified';
  suggestedAction: 'ALLOW' | 'REVIEW' | 'ADD_RESPONDER' | 'CONFIRM_ON_SOURCE';
  ruleRef?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  cause: string;
  evidence: string;
  fixSteps: string[];
  kbUrl: string;
  firewallRequest?: FirewallRequestRule;
  associatedRuleId?: string;
  isOverlayIssue?: boolean;
}

export interface MtuProbeStep {
  payloadSize: number;
  dontFragment: boolean;
  result: 'passed' | 'fragmentation-needed' | 'no-reply';
  respondingHop?: string;
}

export interface MtuProbeResult {
  probes: MtuProbeStep[];
  discoveredPathMtu: number;
  requiredMtu: number;
  status: 'OK' | 'WARNING' | 'BLOCKED';
  notes: string;
}

export interface LocalHostInfo {
  hostname: string;
  interfaceName: string;
  ipv4Address: string;
  prefixLength: number;
}

export interface RunProgress {
  runId: string;
  state: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  percent: number;
  elapsedMs: number;
  currentTaskDescription: string;
  localHost?: LocalHostInfo;
  hops: HopResult[];
  checks: CheckResult[];
  findings: Finding[];
  mtuResult?: MtuProbeResult;
  error?: EngineError;
}

export interface SavedRunSummary {
  runId: string;
  timestamp: string;
  profileId: string;
  profileName: string;
  targetRoles: Partial<Record<TargetRole, string | string[]>>;
  primaryTarget: string;
  localHost?: LocalHostInfo;
  durationMs: number;
  overallStatus: SeverityLevel;
  blockedCount: number;
  warningCount: number;
  okCount: number;
  unverifiedCount: number;
  pathMtu: number;
  hops: HopResult[];
  checks: CheckResult[];
  findings: Finding[];
}

export interface CapabilityItem {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED';
  detail: string;
  remediation?: string;
}

export interface EngineCapabilities {
  apiVersion: string;
  isAdmin: boolean;
  rawSocketsAvailable: boolean; // "Raw sockets (requires administrator)"
  internetAccess: boolean;
  responderModeAvailable: boolean;
  platform: string;
  capabilitiesList: CapabilityItem[];
}

export interface EngineError {
  code: string;
  message: string;
  remediation?: string;
}

export interface ConnectionDefinition {
  id: string;
  kind: 'nsx' | 'vcenter' | 'hcx';
  name: string;
  host: string;
  readOnlyAccount: true;
  credentialsStoredLocally: true;
  status: 'planned';
}

export interface ResponderLogEntry {
  id: string;
  timestamp: string;
  clientIp: string;
  protocol: 'TCP' | 'UDP';
  port: number;
  probeType: string;
  handshakeStatus: 'SUCCESS' | 'ECHOED' | 'REFUSED';
  latencyMs: number;
}

export interface RunOptions {
  profileId: string;
  targetRoles: Partial<Record<TargetRole, string | string[]>>;
  primaryTarget?: string;
  customMtuThreshold?: number;
  enabledRuleIds?: string[];
  timeoutMs?: number;
  rateLimit?: number;
  sourceSubnetOverride?: string;
}

export type RunEvent = 
  | { type: 'hop'; runId: string; hop: HopResult }
  | { type: 'check'; runId: string; check: CheckResult }
  | { type: 'finding'; runId: string; finding: Finding }
  | { type: 'progress'; runId: string; percent: number; elapsedMs: number; taskDescription: string; mtuResult?: MtuProbeResult; localHost?: LocalHostInfo }
  | { type: 'complete'; runId: string; summary: SavedRunSummary }
  | { type: 'error'; runId: string; error: EngineError };

export type RunEventCallback = (event: RunEvent) => void;

/**
 * Folds incremental run events into the current progress state for the UI
 */
export function foldRunEvent(current: RunProgress, event: RunEvent): RunProgress {
  switch (event.type) {
    case 'hop': {
      const existingIdx = current.hops.findIndex((h) => h.hopNumber === event.hop.hopNumber);
      const newHops = [...current.hops];
      if (existingIdx >= 0) {
        newHops[existingIdx] = event.hop;
      } else {
        newHops.push(event.hop);
        newHops.sort((a, b) => a.hopNumber - b.hopNumber);
      }
      return { ...current, hops: newHops };
    }
    case 'check': {
      const existingIdx = current.checks.findIndex((c) => c.id === event.check.id);
      const newChecks = [...current.checks];
      if (existingIdx >= 0) {
        newChecks[existingIdx] = event.check;
      } else {
        newChecks.push(event.check);
      }
      return { ...current, checks: newChecks };
    }
    case 'finding': {
      const existingIdx = current.findings.findIndex((f) => f.id === event.finding.id);
      const newFindings = [...current.findings];
      if (existingIdx >= 0) {
        newFindings[existingIdx] = event.finding;
      } else {
        newFindings.push(event.finding);
      }
      return { ...current, findings: newFindings };
    }
    case 'progress': {
      return {
        ...current,
        percent: event.percent,
        elapsedMs: event.elapsedMs,
        currentTaskDescription: event.taskDescription,
        mtuResult: event.mtuResult !== undefined ? event.mtuResult : current.mtuResult,
        localHost: event.localHost !== undefined ? event.localHost : current.localHost
      };
    }
    case 'complete': {
      return {
        ...current,
        state: 'completed',
        percent: 100,
        hops: event.summary.hops,
        checks: event.summary.checks,
        findings: event.summary.findings,
        localHost: event.summary.localHost || current.localHost,
        currentTaskDescription: 'Diagnostic completed.'
      };
    }
    case 'error': {
      return {
        ...current,
        state: 'error',
        error: event.error,
        currentTaskDescription: `Error: ${event.error.message}`
      };
    }
  }
}

export interface EngineInterface {
  readonly isMock: boolean;
  getCapabilities(): Promise<EngineCapabilities>;
  listProfiles(): Promise<DiagnosticProfile[]>;
  saveCustomProfile(profile: DiagnosticProfile): Promise<void>;
  deleteCustomProfile(profileId: string): Promise<boolean>;
  startRun(options: RunOptions): Promise<string>;
  cancelRun(runId: string): Promise<boolean>;
  subscribeToRunEvents(runId: string, callback: RunEventCallback): () => void;
  getRunResult(runId: string): Promise<SavedRunSummary | null>;
  listSavedRuns(): Promise<SavedRunSummary[]>;
  exportReport(runId: string, format: 'json' | 'csv' | 'pdf', maskIps?: boolean): Promise<{ dataBase64: string; filename: string; mimeType: string }>;
  startResponder(ports: number[]): Promise<boolean>;
  stopResponder(): Promise<boolean>;
  getResponderLogs(): Promise<ResponderLogEntry[]>;
}
