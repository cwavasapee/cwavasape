import { describe, test, expect } from "vitest";
import { MovementProcessor } from "../../src/core/movement-processor";
import type { MovementState } from "../../src/types";

describe("MovementProcessor", () => {
  test("processes movement correctly", () => {
    const state: MovementState = {
      isActive: false,
      lastPosition: null,
      velocity: { x: 0, y: 0 },
      smoothDelta: { x: 0, y: 0 },
      rawDelta: { x: 0, y: 0 },
      recentPoints: [],
    };

    MovementProcessor.processMovement(
      state,
      { x: 1, y: 1 },
      performance.now(),
      {
        speedMultiplier: 1,
        smoothingFactor: 0.2,
        sampleSize: 5,
      }
    );

    expect(state.rawDelta).toEqual({ x: 1, y: 1 });
    expect(state.smoothDelta).toEqual({ x: 0.2, y: 0.2 });
  });

  test("updates velocity calculations", () => {
    const state: MovementState = {
      isActive: false,
      lastPosition: null,
      velocity: { x: 0, y: 0 },
      smoothDelta: { x: 0, y: 0 },
      rawDelta: { x: 0, y: 0 },
      recentPoints: [
        { x: 0, y: 0, timestamp: 1000 },
        { x: 100, y: 100, timestamp: 2000 },
      ],
    };

    MovementProcessor.updateVelocity(state, 2000);
    expect(state.velocity).toEqual({ x: 0.1, y: 0.1 });
  });
});
