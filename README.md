# Zaboraa Network Path Analyzer - Engine Contract Specification

This repository contains the user interface and mock implementation for the **Zaboraa Network Path Analyzer**, a Windows desktop workstation tool designed for network engineers and VMware administrators to troubleshoot hybrid connectivity between on-premises VMware data centers and Azure VMware Solution (AVS).

---

## 1. Architecture Overview

The UI layer is strictly decoupled from network diagnostic execution via the `EngineInterface` TypeScript contract in `src/engine/types.ts`. All views, hop tables, latency distribution charts, and firewall change generators communicate exclusively through this interface.

The application operates without external drivers (no WinPcap or Npcap required). On a real Windows desktop, privileged operations use standard OS raw sockets (requires administrator).

```typescript
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
```

---

## 2. Engine Interface Methods & Signatures

### `getCapabilities(): Promise<EngineCapabilities>`
- **Returns**: Operating system privileges, API version (`apiVersion`), raw socket availability (`"Raw sockets (requires administrator)"`), outbound internet status, and responder capability.
- **Real Engine Implementation**: Call `Windows.Networking.Sockets` or Win32 `IcmpCreateFile` / socket APIs to determine whether the current process token possesses elevated administrative privileges.

### `listProfiles(): Promise<DiagnosticProfile[]>`
- **Returns**: Array of diagnostic profiles loaded from `src/data/profiles.json` and any custom profiles saved locally.
- **Profiles Contract**: Each rule defines `targetRole`, `flowSource`, `flowDestination`, `testableFromHere`, `requiresAdmin`, and `requiresResponder`. Rules where `testableFromHere` is false are not probed from the workstation and are reported as unverified.

### `saveCustomProfile(profile: DiagnosticProfile): Promise<void>`
- **Behavior**: Persists a user-defined profile to local storage or engine SQLite database.

### `deleteCustomProfile(profileId: string): Promise<boolean>`
- **Behavior**: Removes a custom profile by identifier. Default system profiles cannot be deleted.

### `startRun(options: RunOptions): Promise<string>`
- **Parameters**: `profileId`, `targetRoles` (map of role to IP address or list of hosts), `primaryTarget`, `customMtuThreshold`, and optional timeouts.
- **Returns**: Unique asynchronous execution `runId`.
- **Real Engine Implementation**: Launches a background worker thread. When running without administrator privileges, probes fall back to unprivileged TCP connect handshakes (`WSAConnect`) and standard echo (`IcmpSendEcho`).

### `cancelRun(runId: string): Promise<boolean>`
- **Behavior**: Signals immediate cancellation to in-flight worker probes and dispatches terminal run events.

### `subscribeToRunEvents(runId: string, callback: RunEventCallback): () => void`
- **Events Delivered**:
  - `progress`: Percent completion, elapsed time, current task description, and local host interface info.
  - `hop`: Discovered transit hops, latency RTT, packet loss percentage, and jitter.
  - `check`: Individual rule verification outcomes (`OPEN`, `CLOSED`, `BLOCKED`, `WARNING`, `INCONCLUSIVE`, `RESPONDER_CONFIRMED`, `CANNOT_BE_TESTED`).
  - `finding`: Synthesized probabilistic diagnostic findings with cause and fix steps.
  - `complete`: Final `SavedRunSummary`.
  - `error`: Engine error code, message, and remediation steps.
- **Returns**: Unsubscribe function to release event listeners.

### `getRunResult(runId: string): Promise<SavedRunSummary | null>`
- **Returns**: Snapshot of completed run telemetry including local host IP/subnet context.

### `listSavedRuns(): Promise<SavedRunSummary[]>`
- **Returns**: Chronological list of saved runs for before/after comparison and regression diffing.

### `exportReport(runId: string, format: 'json' | 'csv' | 'pdf', maskIps?: boolean)`
- **Parameters**: `runId`, `format`, and optional `maskIps`.
- **Returns**: `{ dataBase64, filename, mimeType }` binary-safe encoded payload.
- **Privacy Masking**: When `maskIps` is true, all IPv4, IPv6 addresses, and hostnames are replaced with a consistent token mapping within the generated document.

### `startResponder(ports: number[])` / `stopResponder()` / `getResponderLogs()`
- **Behavior**: Binds UDP/TCP echo listeners on local ports (such as UDP 4500, TCP 8123, TCP/UDP 5201) to support bi-directional path testing without requiring remote target services.

---

## 3. Mock Engine (`MockEngine.ts`)

`MockEngine` provides simulated test runs with realistic step-by-step delays and pre-seeded baselines.

Mock scenario selection is isolated to the mock engine (`MockEngine.setScenario(scenario)`) and is not part of the standard `RunOptions`:
- **Scenario A**: ICMP filtered at transit hop 4 (`192.0.2.4`), but TCP 443 succeeds end-to-end (`WARNING`).
- **Scenario B**: HCX pre-check where UDP 4500 returns no response without a far-end responder (`WARNING: Inconclusive`), plus TCP 8123 filtered (`BLOCKED`).
- **Scenario C**: MTU Don't-Fragment probe passes at 1472 payload (1500 MTU) and fails at 1500 payload (1528 MTU), identifying insufficient MTU for the overlay (`BLOCKED`).

---

## 4. Swapping to a Native Windows Engine

To connect the UI to a real local Windows service:

1. Create a native engine adapter class implementing `EngineInterface` (for example `src/engine/NativeWindowsEngine.ts`).
2. Have the adapter communicate with a local Windows service over a local loopback HTTP or WebSocket endpoint (`http://127.0.0.1:5050`).
3. In `src/engine/index.ts`, replace `mockEngine` with your new native engine instance:
   ```typescript
   export const engine: EngineInterface = nativeWindowsEngine;
   ```
4. The entire user interface, telemetry displays, diff comparison, and export functions will work without modification.
