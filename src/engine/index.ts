import { EngineInterface } from './types';
import { mockEngine } from './MockEngine';

// Default export of the current active engine.
// To swap to a live Win32 / local C++ or Python engine, change this instance.
export const engine: EngineInterface = mockEngine;

export * from './types';
export * from './MockEngine';
