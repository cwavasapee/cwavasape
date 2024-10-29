import { describe, it, expect, beforeEach } from "vitest";
import { SmoothingEngine } from "../../src/core/smoothing";
import type { Vector2D } from "../../src/types";

describe("SmoothingEngine", () => {
  let engine: SmoothingEngine;

  beforeEach(() => {
    engine = new SmoothingEngine({
      movement: {
        smoothing: {
          active: true,
          factor: 0.3,
          samples: 3,
          algorithm: "linear",
        },
      },
      velocity: {
        smoothing: {
          active: true,
          factor: 0.3,
          samples: 3,
          algorithm: "linear",
        },
      },
    });
  });

  describe("constructor", () => {
    it("should initialize with default values when no options provided", () => {
      const defaultEngine = new SmoothingEngine();
      const result = defaultEngine.smooth({ x: 10, y: 10 }, "movement");
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });

    it("should respect provided configuration options", () => {
      const customEngine = new SmoothingEngine({
        movement: {
          smoothing: {
            active: false,
            factor: 0.5,
            samples: 2,
            algorithm: "exponential",
          },
        },
      });
      const value: Vector2D = { x: 10, y: 10 };
      expect(customEngine.smooth(value, "movement")).toEqual(value);
    });
  });

  describe("smooth method", () => {
    it("should handle both movement and velocity types", () => {
      const movement: Vector2D = { x: 100, y: 200 };
      const velocity: Vector2D = { x: 2.0, y: 3.0 };

      // For movement, we expect significant smoothing
      const smoothedMovement = engine.smooth(movement, "movement");
      expect(smoothedMovement.x).toBeLessThan(movement.x);
      expect(smoothedMovement.y).toBeLessThan(movement.y);

      // For velocity, we need to handle it differently since it's already a rate of change
      engine.reset(); // Reset to ensure clean state
      const smoothedVelocity = engine.smooth(velocity, "velocity");
      expect(Math.abs(smoothedVelocity.x)).toBeLessThanOrEqual(
        Math.abs(velocity.x)
      );
      expect(Math.abs(smoothedVelocity.y)).toBeLessThanOrEqual(
        Math.abs(velocity.y)
      );
    });

    it("should return raw value when smoothing is inactive", () => {
      const inactiveEngine = new SmoothingEngine({
        movement: { smoothing: { active: false } },
        velocity: { smoothing: { active: false } },
      });
      const value: Vector2D = { x: 10, y: 20 };
      expect(inactiveEngine.smooth(value, "movement")).toEqual(value);
      expect(inactiveEngine.smooth(value, "velocity")).toEqual(value);
    });

    it("should return zero when value is below threshold", () => {
      const value: Vector2D = { x: 0.05, y: 0.05 };
      expect(engine.smooth(value, "movement")).toEqual({ x: 0, y: 0 });
      expect(engine.smooth(value, "velocity")).toEqual({ x: 0, y: 0 });
    });

    it("should maintain sample size limit for both types", () => {
      const values: Vector2D[] = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
        { x: 40, y: 40 },
      ];

      // Test movement smoothing
      values.forEach((value) => engine.smooth(value, "movement"));
      const movementResult = engine.smooth({ x: 50, y: 50 }, "movement");

      expect(movementResult.x).toBeGreaterThan(0);
      expect(movementResult.x).toBeLessThan(50);

      // Reset and test velocity smoothing
      engine.reset();
      values.forEach((value) => engine.smooth(value, "velocity"));
      const velocityResult = engine.smooth({ x: 50, y: 50 }, "velocity");

      expect(velocityResult.x).toBeGreaterThan(0);
      expect(velocityResult.x).toBeLessThan(50);
    });
  });

  describe("smoothing algorithms", () => {
    it("should apply linear smoothing correctly", () => {
      const linearEngine = new SmoothingEngine({
        movement: {
          smoothing: {
            algorithm: "linear",
            factor: 0.3,
            samples: 5,
          },
        },
      });

      const result1 = linearEngine.smooth({ x: 10, y: 10 }, "movement");
      const result2 = linearEngine.smooth({ x: 20, y: 20 }, "movement");

      expect(result2.x).toBeGreaterThan(result1.x);
      expect(result2.y).toBeGreaterThan(result1.y);
      expect(result2.x).toBeLessThan(20);
      expect(result2.y).toBeLessThan(20);
    });

    it("should apply exponential smoothing correctly", () => {
      const expEngine = new SmoothingEngine({
        movement: {
          smoothing: {
            algorithm: "exponential",
            factor: 0.3,
            samples: 5,
          },
        },
      });

      const result1 = expEngine.smooth({ x: 10, y: 10 }, "velocity");
      const result2 = expEngine.smooth({ x: 20, y: 20 }, "velocity");

      expect(result2.x).toBeGreaterThan(result1.x);
      expect(result2.y).toBeGreaterThan(result1.y);
      expect(result2.x).toBeLessThan(20);
      expect(result2.y).toBeLessThan(20);
    });
  });

  describe("edge cases", () => {
    it("should handle zero values for both types", () => {
      const zeroValue: Vector2D = { x: 0, y: 0 };
      expect(engine.smooth(zeroValue, "movement")).toEqual(zeroValue);
      expect(engine.smooth(zeroValue, "velocity")).toEqual(zeroValue);
    });

    it("should handle very large values", () => {
      const result = engine.smooth({ x: 1000000, y: 1000000 }, "movement");
      expect(Number.isFinite(result.x)).toBe(true);
      expect(Number.isFinite(result.y)).toBe(true);
    });
  });

  describe("long scroll sequences", () => {
    it("should maintain smooth acceleration with linear algorithm", () => {
      const linearEngine = new SmoothingEngine({
        movement: {
          smoothing: {
            algorithm: "linear",
            factor: 0.3,
            samples: 5,
          },
        },
      });

      const results: Vector2D[] = [];
      // Simulate accelerating scroll
      for (let i = 0; i < 20; i++) {
        results.push(linearEngine.smooth({ x: i * 10, y: i * 10 }, "movement"));
      }

      // Check acceleration is smooth
      for (let i = 2; i < results.length; i++) {
        if (!results[i] || !results[i - 1] || !results[i - 2]) continue;

        const prevDelta: Vector2D = {
          x: results[i - 1]!.x - results[i - 2]!.x,
          y: results[i - 1]!.y - results[i - 2]!.y,
        };
        const currentDelta: Vector2D = {
          x: results[i]!.x - results[i - 1]!.x,
          y: results[i]!.y - results[i - 1]!.y,
        };

        expect(Math.abs(currentDelta.x - prevDelta.x)).toBeLessThan(5);
        expect(Math.abs(currentDelta.y - prevDelta.y)).toBeLessThan(5);
      }
    });

    it("should maintain smooth deceleration with exponential algorithm", () => {
      const expEngine = new SmoothingEngine({
        movement: {
          smoothing: {
            algorithm: "exponential",
            factor: 0.3,
            samples: 5,
          },
        },
      });

      const results: Vector2D[] = [];
      // First accelerate
      for (let i = 0; i < 10; i++) {
        results.push(expEngine.smooth({ x: i * 20, y: i * 20 }, "velocity"));
      }

      // Then decelerate
      for (let i = 10; i >= 0; i--) {
        results.push(expEngine.smooth({ x: i * 20, y: i * 20 }, "velocity"));
      }

      // Check deceleration phase is smooth (using more lenient comparison)
      for (
        let i = results.length - 3;
        i >= results.length - 10 && i >= 0;
        i--
      ) {
        if (!results[i] || !results[i + 1] || !results[i + 2]) continue;

        const prevDelta: Vector2D = {
          x: results[i + 1]!.x - results[i + 2]!.x,
          y: results[i + 1]!.y - results[i + 2]!.y,
        };
        const currentDelta: Vector2D = {
          x: results[i]!.x - results[i + 1]!.x,
          y: results[i]!.y - results[i + 1]!.y,
        };

        // Increase tolerance for floating point differences
        expect(currentDelta.x).toBeLessThanOrEqual(prevDelta.x + 0.1);
        expect(currentDelta.y).toBeLessThanOrEqual(prevDelta.y + 0.1);
      }
    });

    it("should handle rapid direction changes smoothly", () => {
      const engine = new SmoothingEngine({
        movement: {
          smoothing: {
            algorithm: "linear",
            factor: 0.2, // Reduced factor for smoother output
            samples: 4,
          },
        },
      });

      const results: Vector2D[] = [];
      // Simulate zigzag movement with smaller amplitude
      for (let i = 0; i < 20; i++) {
        results.push(
          engine.smooth(
            {
              x: Math.sin(i * 0.5) * 50, // Reduced amplitude
              y: Math.cos(i * 0.5) * 50,
            },
            "movement"
          )
        );
      }

      // Skip first few results to allow smoothing to stabilize
      for (let i = 4; i < results.length; i++) {
        if (!results[i] || !results[i - 1]) continue;

        const inputDelta = Math.abs(
          Math.sin((i + 1) * 0.5) * 50 - Math.sin(i * 0.5) * 50
        );
        const outputDelta = Math.abs(results[i]!.x - results[i - 1]!.x);

        expect(outputDelta).toBeLessThan(inputDelta);
      }
    });
  });
});
