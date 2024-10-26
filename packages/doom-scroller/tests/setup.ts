import { vi } from 'vitest';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(performance.now()), 0) as unknown as number;
});

global.cancelAnimationFrame = vi.fn((handle: number): void => {
  clearTimeout(handle);
});

// Mock performance.now()
global.performance.now = vi.fn(() => Date.now());

// Mock Touch constructor
class MockTouch implements Touch {
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;

  constructor(init: TouchInit) {
    this.identifier = init.identifier;
    this.target = init.target;
    this.clientX = init.clientX || 0;
    this.clientY = init.clientY || 0;
    this.pageX = init.pageX || init.clientX || 0;
    this.pageY = init.pageY || init.clientY || 0;
    this.screenX = init.screenX || init.clientX || 0;
    this.screenY = init.screenY || init.clientY || 0;
    this.radiusX = 0;
    this.radiusY = 0;
    this.rotationAngle = 0;
    this.force = 0;
  }
}

// Create proper global interfaces
declare global {
  interface Window {
    Touch: typeof MockTouch;
  }
}

global.Touch = MockTouch as typeof Touch;

// Mock window if not available (for jsdom)
if (typeof window === 'undefined') {
  global.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame: global.requestAnimationFrame,
    cancelAnimationFrame: global.cancelAnimationFrame,
    performance: {
      now: global.performance.now
    }
  } as unknown as Window & typeof globalThis;
}