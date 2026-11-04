/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  engine, 
  mockEngine,
  DiagnosticProfile, 
  EngineCapabilities, 
  Finding, 
  RunProgress, 
  SavedRunSummary, 
  TargetRole,
  TargetSource,
  foldRunEvent
} from './engine';
import { Header, ScreenTab } from './components/Header';
import { CapabilitiesBanner } from './components/CapabilitiesBanner';
import { ScenarioLauncher } from './components/ScenarioLauncher';
import { RunScreen } from './components/RunScreen';
import { DiagnosisDetailModal } from './components/DiagnosisDetailModal';
import { FirewallRequestView } from './components/FirewallRequestView';
import { CompareRunsView } from './components/CompareRunsView';
import { ReportsView } from './components/ReportsView';
import { ResponderModeView } from './components/ResponderModeView';
import { ConnectionsView } from './components/ConnectionsView';
import { SettingsView } from './components/SettingsView';
import { QuickTestModal } from './components/QuickTestModal';

export default function App() {
  // Navigation & View Mode
  const [currentTab, setCurrentTab] = useState<ScreenTab>('scenarios');
  const [viewMode, setViewMode] = useState<'guided' | 'expert'>(() => {
    try {
      const saved = localStorage.getItem('zaboraa_view_mode');
      if (saved === 'guided' || saved === 'expert') return saved;
    } catch (e) {
      // fallback
    }
    return 'expert';
  });

  // Engine Data States
  const [profiles, setProfiles] = useState<DiagnosticProfile[]>([]);
  const [capabilities, setCapabilities] = useState<EngineCapabilities | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRunSummary[]>([]);
  const [activeMockScenario, setActiveMockScenario] = useState<'scenario-a' | 'scenario-b' | 'scenario-c'>('scenario-b');

  // Active Run Configuration
  const [selectedProfileId, setSelectedProfileId] = useState<string>('hcx-precheck');
  const [targetRoles, setTargetRoles] = useState<Partial<Record<TargetRole, string | string[]>>>({});
  const [targetSource, setTargetSource] = useState<TargetSource>('typed');
  const [customMtuThreshold, setCustomMtuThreshold] = useState<number>(1500);

  // Live Execution State
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState<RunProgress | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Requirement H.1: Store unsubscribe function in a ref so it's always cleaned up
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Active Modals & Inspecting finding
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);
  const [quickTestState, setQuickTestState] = useState<{ isOpen: boolean; testType: string; target: string }>({
    isOpen: false,
    testType: 'ping',
    target: '192.0.2.10'
  });

  // Clean up any active subscription on unmount (Requirement H.1)
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const handleToggleViewMode = (mode: 'guided' | 'expert') => {
    setViewMode(mode);
    try {
      localStorage.setItem('zaboraa_view_mode', mode);
    } catch (e) {
      // ignore
    }
  };

  // Initial Load from Engine Interface
  useEffect(() => {
    engine.getCapabilities().then(setCapabilities);
    engine.listProfiles().then((profs) => {
      setProfiles(profs);
      if (profs.length > 0) {
        setSelectedProfileId(profs[0].id);
        setTargetRoles(profs[0].defaultRoleTargets || {});
        setTargetSource(profs[0].targetSource);
        setCustomMtuThreshold(profs[0].mtuSettings?.defaultPathMtu || 1500);
      }
    });
    engine.listSavedRuns().then(setSavedRuns);
  }, []);

  // Update target roles when profile changes
  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const p = profiles.find((prof) => prof.id === id);
    if (p) {
      setTargetRoles(p.defaultRoleTargets || {});
      setTargetSource(p.targetSource);
      setCustomMtuThreshold(p.mtuSettings?.defaultPathMtu || 1500);
    }
  };

  const handleUpdateTargetRole = (role: TargetRole, value: string | string[]) => {
    setTargetRoles((prev) => ({
      ...prev,
      [role]: value
    }));
  };

  // Start Diagnostic Run
  const handleStartRun = useCallback(async () => {
    // Clean up any previous subscription before starting a new run (Requirement H.1)
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const p = profiles.find((prof) => prof.id === selectedProfileId) || profiles[0];
    if (!p) return;

    setIsRunning(true);
    setCurrentTab('run');

    const primaryTarget = String(targetRoles['hcx-manager'] || targetRoles['vcenter'] || targetRoles['tep'] || '192.0.2.10');

    // Reset initial run progress state
    setRunProgress({
      runId: 'pending',
      state: 'running',
      percent: 5,
      elapsedMs: 0,
      currentTaskDescription: `Initializing diagnostic run for "${p.name}"...`,
      hops: [],
      checks: [],
      findings: []
    });

    try {
      const runId = await engine.startRun({
        profileId: p.id,
        targetRoles,
        primaryTarget,
        customMtuThreshold
      });

      setActiveRunId(runId);

      // Subscribe with incremental folding helper (Requirement G.6)
      const unsub = engine.subscribeToRunEvents(runId, (event) => {
        setRunProgress((prev) => {
          const baseline: RunProgress = prev || {
            runId,
            state: 'running',
            percent: 5,
            elapsedMs: 0,
            currentTaskDescription: 'Executing run...',
            hops: [],
            checks: [],
            findings: []
          };
          const next = foldRunEvent(baseline, event);

          if (event.type === 'complete' || event.type === 'error') {
            setIsRunning(false);
            engine.listSavedRuns().then(setSavedRuns);

            // Clean up subscription upon completion (Requirement H.1)
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
            }
          }

          return next;
        });
      });

      unsubscribeRef.current = unsub;
    } catch (err) {
      console.error('Failed to start run:', err);
      setIsRunning(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [profiles, selectedProfileId, targetRoles, customMtuThreshold]);

  // Cancel Run
  const handleCancelRun = async () => {
    if (activeRunId) {
      await engine.cancelRun(activeRunId);
      setIsRunning(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  };

  // Launch from Scenario Launcher Card
  const handleSelectAndRunProfile = (profileId: string) => {
    handleSelectProfile(profileId);
    setTimeout(() => {
      handleStartRun();
    }, 50);
  };

  // Mock Scenario Selection (Requirement G.1)
  const handleSelectMockScenario = (scenario: 'scenario-a' | 'scenario-b' | 'scenario-c') => {
    setActiveMockScenario(scenario);
    if (engine.isMock) {
      mockEngine.setScenario(scenario);
    }
    // Set appropriate matching profile for quick exploration
    if (scenario === 'scenario-a') {
      handleSelectProfile('expressroute-reachability');
    } else if (scenario === 'scenario-b') {
      handleSelectProfile('hcx-precheck');
    } else if (scenario === 'scenario-c') {
      handleSelectProfile('overlay-network');
    }
  };

  // Quick Test Trigger
  const handleRunQuickTest = (testType: string, target: string) => {
    setQuickTestState({
      isOpen: true,
      testType,
      target: target || '192.0.2.10'
    });
  };

  const isAirGapped = capabilities ? !capabilities.internetAccess : true;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Workstation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onSelectMockScenario={handleSelectMockScenario}
        activeMockScenario={activeMockScenario}
        isMock={engine.isMock}
        isAirGapped={isAirGapped}
        isRunning={isRunning}
      />

      {/* Engine Capabilities Banner (Shows what works, admin status, internet, responder) */}
      <CapabilitiesBanner capabilities={capabilities} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-4 md:p-6 overflow-y-auto">
        {currentTab === 'scenarios' && (
          <ScenarioLauncher
            profiles={profiles}
            onSelectAndRunProfile={handleSelectAndRunProfile}
            onRunQuickTest={handleRunQuickTest}
            viewMode={viewMode}
          />
        )}

        {currentTab === 'run' && (
          <RunScreen
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            onSelectProfile={handleSelectProfile}
            targetRoles={targetRoles}
            onChangeTargetRole={handleUpdateTargetRole}
            targetSource={targetSource}
            onToggleTargetSource={() =>
              setTargetSource(targetSource === 'typed' ? 'discovered' : 'typed')
            }
            customMtuThreshold={customMtuThreshold}
            onChangeMtuThreshold={setCustomMtuThreshold}
            runProgress={runProgress}
            isRunning={isRunning}
            onStartRun={handleStartRun}
            onCancelRun={handleCancelRun}
            onSelectFinding={setInspectingFinding}
            viewMode={viewMode}
          />
        )}

        {currentTab === 'firewall' && (
          <FirewallRequestView
            currentRun={
              runProgress?.state === 'completed'
                ? {
                    runId: runProgress.runId,
                    timestamp: new Date().toISOString(),
                    profileId: selectedProfileId,
                    profileName: profiles.find((p) => p.id === selectedProfileId)?.name || 'Profile',
                    targetRoles,
                    primaryTarget: String(targetRoles['hcx-manager'] || targetRoles['vcenter'] || '192.0.2.10'),
                    localHost: runProgress.localHost,
                    durationMs: runProgress.elapsedMs,
                    overallStatus: runProgress.findings.some((f) => f.severity === 'BLOCKED')
                      ? 'BLOCKED'
                      : runProgress.findings.some((f) => f.severity === 'WARNING')
                      ? 'WARNING'
                      : 'OK',
                    blockedCount: runProgress.findings.filter((f) => f.severity === 'BLOCKED').length,
                    warningCount: runProgress.findings.filter((f) => f.severity === 'WARNING').length,
                    okCount: runProgress.findings.filter((f) => f.severity === 'OK').length,
                    unverifiedCount: runProgress.checks.filter((c) => c.status === 'CANNOT_BE_TESTED').length,
                    pathMtu: runProgress.mtuResult?.discoveredPathMtu || 1500,
                    hops: runProgress.hops,
                    checks: runProgress.checks,
                    findings: runProgress.findings
                  }
                : null
            }
            allSavedRuns={savedRuns}
          />
        )}

        {currentTab === 'compare' && <CompareRunsView savedRuns={savedRuns} />}

        {currentTab === 'reports' && (
          <ReportsView engine={engine} savedRuns={savedRuns} />
        )}

        {currentTab === 'responder' && <ResponderModeView engine={engine} />}

        {currentTab === 'connections' && <ConnectionsView />}

        {currentTab === 'settings' && (
          <SettingsView
            viewMode={viewMode}
            onToggleViewMode={handleToggleViewMode}
          />
        )}
      </main>

      {/* Modal: Diagnosis Finding Deep Inspector */}
      {inspectingFinding && (
        <DiagnosisDetailModal
          finding={inspectingFinding}
          onClose={() => setInspectingFinding(null)}
        />
      )}

      {/* Modal: Interactive Quick Test Console */}
      <QuickTestModal
        isOpen={quickTestState.isOpen}
        testType={quickTestState.testType}
        target={quickTestState.target}
        onClose={() => setQuickTestState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
