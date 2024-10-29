import { describe, it, expect, beforeEach } from "vitest";
import { DoomScroller } from "../../src";
import type { ScrollState } from "../../src/types";

describe("DoomScroller Performance Tests", () => {
  let scroller: DoomScroller;
  let states: ScrollState[] = [];
  let startTime: number;

  beforeEach(() => {
    states = [];
    scroller = new DoomScroller({
      movement: {
        threshold: 0.1,
        samples: 3,
        smoothing: {
          active: true,
          factor: 0.2,
          samples: 5,
          algorithm: "linear",
        },
      },
      velocity: {
        min: 0,
        max: 1,
        algorithm: "linear",
        smoothing: {
          active: true,
          factor: 0.2,
          samples: 5,
          algorithm: "linear",
        },
      },
      events: {
        wheel: true,
        touch: false,
        mouse: false,
      },
    });

    scroller.subscribe((state: ScrollState) => {
      states.push(state);
    });

    scroller.start();
  });

  it("should handle high-frequency scroll events efficiently", () => {
    startTime = performance.now();

    // Simulate 1000 rapid scroll events with varying deltas
    for (let i = 0; i < 1000; i++) {
      window.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX: Math.cos(i) * 50,
          deltaY: Math.sin(i) * 50,
          clientX: 100,
          clientY: 100,
        })
      );
    }

    const executionTime = performance.now() - startTime;

    // Performance assertions
    expect(executionTime).toBeLessThan(1000); // Should process 1000 events in under 1 second
    expect(states.length).toBeLessThan(1000); // Should throttle updates

    // Verify smooth transitions between states
    for (let i = 1; i < states.length; i++) {
      const prevState = states[i - 1]!;
      const currentState = states[i]!;

      // Check for smooth velocity changes (using the configured max velocity of 1)
      expect(
        Math.abs(currentState.velocity.x - prevState.velocity.x)
      ).toBeLessThan(0.2);
      expect(
        Math.abs(currentState.velocity.y - prevState.velocity.y)
      ).toBeLessThan(0.2);
      expect(Math.abs(currentState.velocity.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(currentState.velocity.y)).toBeLessThanOrEqual(1);
    }
  });

  it("should maintain consistent memory usage", async () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage();

    // Simulate extended scroll session with direction changes
    for (let i = 0; i < 5000; i++) {
      window.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX: Math.sin(i * 0.1) * 100,
          deltaY: Math.cos(i * 0.1) * 100,
          clientX: 100 + Math.sin(i * 0.05) * 50,
          clientY: 100 + Math.cos(i * 0.05) * 50,
        })
      );
    }

    // Wait for any pending operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Force garbage collection again
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // Memory assertions
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB growth
    expect(states.length).toBeLessThan(5000); // Verify event throttling
  });

  it("should handle rapid direction changes smoothly", () => {
    // Simulate quick direction changes
    const directions = ["up", "down", "left", "right"];

    directions.forEach((direction, i) => {
      const deltaX =
        direction === "left" ? -100 : direction === "right" ? 100 : 0;
      const deltaY = direction === "up" ? -100 : direction === "down" ? 100 : 0;

      window.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX,
          deltaY,
          clientX: 100,
          clientY: 100,
        })
      );
    });

    // Verify smooth direction transitions
    let directionChanges = 0;
    for (let i = 1; i < states.length; i++) {
      const prevState = states[i - 1]!;
      const currentState = states[i]!;

      if (
        prevState.direction.x !== currentState.direction.x ||
        prevState.direction.y !== currentState.direction.y
      ) {
        directionChanges++;
      }
    }

    // Should smooth out some direction changes due to movement threshold and smoothing
    expect(directionChanges).toBeLessThan(directions.length);
  });

  afterEach(() => {
    if (scroller) {
      scroller.destroy();
    }
    states = [];
  });
});
