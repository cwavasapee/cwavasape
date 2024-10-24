import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { DoomScroller } from "../src/core";
import type { ScrollState } from "../src/types";

interface MockWindow {
  requestAnimationFrame: ReturnType<typeof vi.fn>;
  cancelAnimationFrame: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  performance: {
    now: ReturnType<typeof vi.fn>;
  };
  setTimeout: ReturnType<typeof vi.fn>;
  clearTimeout: ReturnType<typeof vi.fn>;
}

/**
 * Setup the test environment with required browser globals
 */
const setupBrowserEnv = () => {
  const mockWin: Partial<MockWindow> = {
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 0)),
    cancelAnimationFrame: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    performance: {
      now: vi.fn(() => Date.now()),
    },
    setTimeout: vi.fn((cb: Function, ms: number) => global.setTimeout(cb, ms)),
    clearTimeout: vi.fn((id: number) => global.clearTimeout(id)),
  };

  const win = mockWin as MockWindow;

  // Setup global objects
  Object.defineProperty(global, "window", {
    value: win,
    writable: true,
  });

  Object.defineProperty(global, "performance", {
    value: win.performance,
    writable: true,
  });

  return win;
};

/**
 * Helper to create a wheel event with the given parameters
 */
const createWheelEvent = (
  deltaX = 0,
  deltaY = 0,
  deltaMode = 0
): Partial<WheelEvent> => ({
  deltaX,
  deltaY,
  deltaMode,
  preventDefault: vi.fn(),
});

/**
 * Type guard to check if a value is a WheelEvent handler
 */
const isWheelEventHandler = (
  value: unknown
): value is (event: WheelEvent) => void => {
  return typeof value === "function";
};

describe("DoomScroller", () => {
  let scroller: DoomScroller;
  let onStateChange: ReturnType<typeof vi.fn>;
  let mockWindow: MockWindow;
  let wheelHandler: ((event: WheelEvent) => void) | undefined;
  let currentTime: number = 0;

  const simulateScroll = async (
    deltaX = 0,
    deltaY = 0,
    deltaMode = 0,
    timeIncrement = 16
  ): Promise<void> => {
    if (!wheelHandler) {
      const wheelEventCall = mockWindow.addEventListener.mock.calls.find(
        ([event]) => event === "wheel"
      );

      if (!wheelEventCall || !isWheelEventHandler(wheelEventCall[1])) {
        throw new Error("Wheel event handler not found");
      }

      wheelHandler = wheelEventCall[1];
    }

    // Update current time before wheel event
    currentTime += timeIncrement;
    mockWindow.performance.now.mockReturnValue(currentTime);

    wheelHandler(createWheelEvent(deltaX, deltaY, deltaMode) as WheelEvent);
    vi.advanceTimersByTime(timeIncrement);

    const rafCalls = mockWindow.requestAnimationFrame.mock.calls;
    const rafCallback = rafCalls[rafCalls.length - 1]?.[0];
    if (typeof rafCallback === "function") {
      // Update time again before animation frame
      currentTime += timeIncrement;
      mockWindow.performance.now.mockReturnValue(currentTime);
      rafCallback(currentTime);
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    currentTime = 0;
    mockWindow = setupBrowserEnv();
    // Start with time = 0
    mockWindow.performance.now.mockReturnValue(currentTime);
    onStateChange = vi.fn();
    wheelHandler = undefined;

    scroller = new DoomScroller({
      smoothingFactor: 1, // No smoothing for predictable tests
      speedMultiplier: 1,
      directionThreshold: 0.1,
      debounceTime: 150,
    });

    scroller.init();
    scroller.subscribe(onStateChange);
  });

  afterEach(() => {
    scroller.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    test("initializes with default options", () => {
      const instance = new DoomScroller();
      expect(instance).toBeInstanceOf(DoomScroller);
    });

    test("throws error when initialized outside browser", () => {
      (global as any).window = undefined;
      const instance = new DoomScroller();
      expect(() => instance.init()).toThrow();
    });

    test("adds wheel event listener on init", () => {
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "wheel",
        expect.any(Function),
        expect.any(Object)
      );
    });
  });

  describe("scroll detection", () => {
    test("detects vertical scroll direction", async () => {
      // Test downward scroll
      await simulateScroll(0, 100);
      let state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.direction.y).toBe("down");

      // Reset state
      vi.advanceTimersByTime(200);
      onStateChange.mockClear();

      // Test upward scroll
      await simulateScroll(0, -100);
      state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.direction.y).toBe("up");
    });

    test("detects horizontal scroll direction", async () => {
      // Test rightward scroll
      await simulateScroll(100, 0);
      let state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.direction.x).toBe("right");

      // Reset state
      vi.advanceTimersByTime(200);
      onStateChange.mockClear();

      // Test leftward scroll
      await simulateScroll(-100, 0);
      state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.direction.x).toBe("left");
    });

    test("normalizes different delta modes", async () => {
      // Test LINE mode
      await simulateScroll(1, 1, 1);
      let state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.rawScroll).toEqual({ x: 16, y: 16 });

      // Reset state
      vi.advanceTimersByTime(200);
      onStateChange.mockClear();

      // Test PAGE mode
      await simulateScroll(1, 1, 2);
      state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.rawScroll).toEqual({ x: 100, y: 100 });
    });

    test("ignores movements below threshold", async () => {
      await simulateScroll(0.05, 0.05);
      const state = onStateChange.mock.calls[0]?.[0] as ScrollState;
      expect(state.direction).toEqual({ x: "none", y: "none" });
    });
  });

  describe("scroll state tracking", () => {
    test("calculates velocity", async () => {
      // Simulate a scroll with 100px over 16ms
      await simulateScroll(0, 100, 0, 16);

      const state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.velocity.y).toBeGreaterThan(0);
      expect(typeof state.velocity.y).toBe("number");

      // Test exact velocity calculation (100px / 16ms)
      const expectedVelocity = 100 / 16; // pixels per millisecond
      expect(state.velocity.y).toBeCloseTo(expectedVelocity, 2);
    });

    test("calculates velocity in both directions", async () => {
      // Test horizontal velocity
      await simulateScroll(100, 0, 0, 16);
      let state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.velocity.x).toBeGreaterThan(0);

      // Reset state
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // Test vertical velocity
      await simulateScroll(0, -100, 0, 16);
      state = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;
      expect(state.velocity.y).toBeLessThan(0);
    });

    test("velocity decreases when smoothing is applied", async () => {
      // Create scroller with smoothing
      scroller = new DoomScroller({
        smoothingFactor: 0.5,
        speedMultiplier: 1,
        directionThreshold: 0.1,
        debounceTime: 150,
      });
      scroller.init();
      scroller.subscribe(onStateChange);
      onStateChange.mockClear();

      // Simulate rapid scrolling
      await simulateScroll(0, 100, 0, 16);
      const firstState = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;

      await simulateScroll(0, 50, 0, 16);
      const secondState = onStateChange.mock.calls[
        onStateChange.mock.calls.length - 1
      ]?.[0] as ScrollState;

      expect(Math.abs(secondState.velocity.y)).toBeLessThan(
        Math.abs(firstState.velocity.y)
      );
    });
  });

  describe("scroll sequences", () => {
    test("handles complex scroll patterns", async () => {
      // Wait for initial state to settle
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // 1. Quick downward scroll
      await simulateScroll(0, 100, 0, 16);
      let state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state).toBeDefined();
      expect(state.direction.y).toBe("down");
      expect(state.velocity.y).toBeGreaterThan(0);

      // Wait for complete reset
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // 2. Slow upward scroll
      await simulateScroll(0, -50, 0, 32);
      state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state.direction.y).toBe("up");
      expect(Math.abs(state.velocity.y)).toBeLessThan(100 / 16); // Should be slower than first scroll

      // Wait for complete reset
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // 3. Right scroll
      await simulateScroll(75, 0, 0, 16);
      state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state.direction.x).toBe("right");
      const lastState = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(lastState.direction.y).toBe("none"); // Should not have vertical direction

      // Wait for complete reset
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // 4. Diagonal movement (down-right)
      await simulateScroll(60, 60, 0, 16);
      state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state.direction.x).toBe("right");
      expect(state.direction.y).toBe("down");
      expect(state.velocity.x).toBeGreaterThan(0);
      expect(state.velocity.y).toBeGreaterThan(0);

      // Wait for complete reset
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // 5. Slow left movement
      await simulateScroll(-30, 0, 0, 32);
      state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state.direction.x).toBe("left");
      expect(state.direction.y).toBe("none");
      expect(Math.abs(state.velocity.x)).toBeLessThan(75 / 16); // Should be slower than previous movements

      // Wait for complete reset
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);
      onStateChange.mockClear();

      // 6. Diagonal up-left movement
      await simulateScroll(-45, -45, 0, 16);
      state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state.direction.x).toBe("left");
      expect(state.direction.y).toBe("up");
      expect(state.velocity.x).toBeLessThan(0);
      expect(state.velocity.y).toBeLessThan(0);

      // Verify final state after complete sequence
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);

      state = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(state.isScrolling).toBe(false);
      expect(state.direction).toEqual({ x: "none", y: "none" });
      expect(state.velocity).toEqual({ x: 0, y: 0 });
    });

    test("maintains consistency during rapid direction changes", async () => {
      // Rapid zigzag pattern
      const movements = [
        { x: 0, y: 50 }, // down
        { x: 50, y: 0 }, // right
        { x: 0, y: -50 }, // up
        { x: -50, y: 0 }, // left
        { x: 35, y: 35 }, // diagonal down-right
        { x: -35, y: -35 }, // diagonal up-left
      ];

      for (const movement of movements) {
        await simulateScroll(movement.x, movement.y, 0, 16);

        const state = onStateChange.mock.lastCall?.[0] as ScrollState;
        expect(state).toBeDefined();

        // Verify direction matches movement
        if (movement.x > 0) expect(state.direction.x).toBe("right");
        if (movement.x < 0) expect(state.direction.x).toBe("left");
        if (movement.y > 0) expect(state.direction.y).toBe("down");
        if (movement.y < 0) expect(state.direction.y).toBe("up");

        // Verify velocity signs match movement
        if (movement.x)
          expect(Math.sign(state.velocity.x)).toBe(Math.sign(movement.x));
        if (movement.y)
          expect(Math.sign(state.velocity.y)).toBe(Math.sign(movement.y));

        // Small pause between movements
        vi.advanceTimersByTime(32);
        currentTime += 32;
        mockWindow.performance.now.mockReturnValue(currentTime);
      }

      // Verify proper cleanup after sequence
      vi.advanceTimersByTime(200);
      currentTime += 200;
      mockWindow.performance.now.mockReturnValue(currentTime);

      const finalState = onStateChange.mock.lastCall?.[0] as ScrollState;
      expect(finalState.isScrolling).toBe(false);
      expect(finalState.direction).toEqual({ x: "none", y: "none" });
      expect(finalState.velocity).toEqual({ x: 0, y: 0 });
    });
  });

  describe("subscription management", () => {
    test("handles multiple subscribers", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scroller.subscribe(callback1);
      scroller.subscribe(callback2);

      await simulateScroll(0, 100);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      const lastCall1 = callback1.mock.lastCall;
      const lastCall2 = callback2.mock.lastCall;

      expect(lastCall1).toBeDefined();
      expect(lastCall2).toBeDefined();

      if (lastCall1 && lastCall2) {
        expect(lastCall1[0]).toEqual(lastCall2[0]);
      }
    });

    test("allows unsubscribing", async () => {
      const callback = vi.fn();
      const unsubscribe = scroller.subscribe(callback);

      await simulateScroll(0, 100);
      expect(callback).toHaveBeenCalled();

      callback.mockClear();
      unsubscribe();

      await simulateScroll(0, 100);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    test("cleans up resources properly", async () => {
      await simulateScroll(0, 100);
      scroller.destroy();

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        "wheel",
        expect.any(Function)
      );
      expect(mockWindow.cancelAnimationFrame).toHaveBeenCalled();

      // Should not throw when destroyed multiple times
      expect(() => scroller.destroy()).not.toThrow();
    });
  });
});
