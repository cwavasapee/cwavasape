// setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Extend global to include our mocked functions
declare global {
  interface Window {
    requestAnimationFrame: (callback: FrameRequestCallback) => number;
    cancelAnimationFrame: (handle: number) => void;
  }
}

// Track RAF callbacks
let rafHandle = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

// Mock requestAnimationFrame
const requestAnimationFrameMock = vi.fn(
  (callback: FrameRequestCallback): number => {
    rafHandle++;
    rafCallbacks.set(rafHandle, callback);
    setTimeout(() => {
      const cb = rafCallbacks.get(rafHandle);
      if (cb) {
        rafCallbacks.delete(rafHandle);
        cb(performance.now());
      }
    }, 0);
    return rafHandle;
  }
);

// Mock cancelAnimationFrame
const cancelAnimationFrameMock = vi.fn((handle: number): void => {
  rafCallbacks.delete(handle);
});

// Mock performance.now()
const performanceNowMock = vi.fn((): number => {
  return Date.now();
});

// Setup global mocks
global.requestAnimationFrame = requestAnimationFrameMock;
global.cancelAnimationFrame = cancelAnimationFrameMock;
global.performance.now = performanceNowMock;

// Helper to reset all mocks and state
export function resetRAFMocks(): void {
  rafCallbacks.clear();
  rafHandle = 0;
  vi.clearAllMocks();
}

// Export mocked functions for testing
export const mocks = {
  requestAnimationFrame: requestAnimationFrameMock,
  cancelAnimationFrame: cancelAnimationFrameMock,
  performanceNow: performanceNowMock,
} as const;
