import { describe, it, expect, beforeEach } from "vitest";
import { VelocityCalculator } from "../../src/core/velocity";

describe("VelocityCalculator", () => {
  let calculator: VelocityCalculator;

  beforeEach(() => {
    calculator = new VelocityCalculator({
      min: 0,
      max: 1,
      algorithm: "linear",
    });
  });

  it("should return zero velocity on first calculation", () => {
    const result = calculator.calculate({ x: 10, y: 10 }, Date.now());
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("should calculate linear velocity magnitude", () => {
    const time1 = Date.now();
    const time2 = time1 + 100; // 100ms difference

    calculator.calculate({ x: 0, y: 0 }, time1);
    const result = calculator.calculate({ x: 100, y: 50 }, time2);

    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThanOrEqual(1);
    expect(result.y).toBeGreaterThan(0);
    expect(result.y).toBeLessThanOrEqual(1);
  });

  it("should calculate exponential velocity magnitude", () => {
    const expCalculator = new VelocityCalculator({
      algorithm: "exponential",
    });

    const time1 = Date.now();
    const time2 = time1 + 100;

    expCalculator.calculate({ x: 0, y: 0 }, time1);
    const result = expCalculator.calculate({ x: 100, y: 50 }, time2);

    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThanOrEqual(1);
    expect(result.y).toBeGreaterThan(0);
    expect(result.y).toBeLessThanOrEqual(1);
  });

  it("should clamp velocity magnitude within min/max bounds", () => {
    const time1 = Date.now();
    const time2 = time1 + 10; // Very small time difference to generate high velocity

    calculator.calculate({ x: 0, y: 0 }, time1);
    const result = calculator.calculate({ x: 1000, y: 1000 }, time2);

    expect(result.x).toBe(1); // Should be clamped to max
    expect(result.y).toBe(1); // Should be clamped to max
  });

  it("should handle both positive and negative movements with same magnitude", () => {
    const time1 = Date.now();
    const time2 = time1 + 100;

    // Test positive movement
    calculator.calculate({ x: 0, y: 0 }, time1);
    const positiveResult = calculator.calculate({ x: 100, y: 100 }, time2);

    calculator.reset();

    // Test negative movement
    calculator.calculate({ x: 0, y: 0 }, time1);
    const negativeResult = calculator.calculate({ x: -100, y: -100 }, time2);

    // Magnitudes should be equal and positive
    expect(positiveResult.x).toEqual(negativeResult.x);
    expect(positiveResult.y).toEqual(negativeResult.y);
    expect(positiveResult.x).toBeGreaterThan(0);
    expect(negativeResult.x).toBeGreaterThan(0);
  });

  it("should handle very small movements", () => {
    const time1 = Date.now();
    const time2 = time1 + 100;

    calculator.calculate({ x: 0, y: 0 }, time1);
    const result = calculator.calculate({ x: 0.001, y: 0.001 }, time2);

    expect(result.x).toBe(0); // Below threshold should return 0
    expect(result.y).toBe(0); // Below threshold should return 0
  });

  it("should respect minimum velocity bounds", () => {
    const calculator = new VelocityCalculator({
      min: 0.1,
      max: 1,
      algorithm: "linear",
    });

    const time1 = Date.now();
    const time2 = time1 + 1000; // Long time delta to generate small velocity

    calculator.calculate({ x: 0, y: 0 }, time1);
    const result = calculator.calculate({ x: 50, y: 50 }, time2);

    expect(result.x).toBeGreaterThanOrEqual(0.1);
    expect(result.y).toBeGreaterThanOrEqual(0.1);
  });

  it("should handle zero time delta", () => {
    const time = Date.now();
    calculator.calculate({ x: 0, y: 0 }, time);
    const result = calculator.calculate({ x: 100, y: 100 }, time); // Same timestamp
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("should handle very large time deltas", () => {
    const time1 = Date.now();
    const time2 = time1 + 5000; // 5 second difference

    calculator.calculate({ x: 0, y: 0 }, time1);
    const result = calculator.calculate({ x: 100, y: 100 }, time2);

    expect(result.x).toBeLessThan(0.1);
    expect(result.y).toBeLessThan(0.1);
  });

  it("should handle NaN and Infinity gracefully", () => {
    const time = Date.now();

    calculator.calculate({ x: 0, y: 0 }, time);
    const result = calculator.calculate({ x: Infinity, y: NaN }, time + 100);

    expect(result.x).toBe(1); // Should be clamped to max
    expect(result.y).toBe(0); // NaN should be converted to 0
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
  });

  it("should calculate increasing exponential velocity magnitude", () => {
    const expCalculator = new VelocityCalculator({
      algorithm: "exponential",
      min: 0,
      max: 5,
    });

    const time1 = Date.now();
    const time2 = time1 + 100;

    expCalculator.calculate({ x: 0, y: 0 }, time1);
    const result1 = expCalculator.calculate({ x: 10, y: 10 }, time2);
    const result2 = expCalculator.calculate({ x: 100, y: 100 }, time2 + 100);

    expect(result2.x).toBeGreaterThan(result1.x);
    expect(result2.y).toBeGreaterThan(result1.y);
  });

  it("should handle consecutive resets correctly", () => {
    const time1 = Date.now();

    calculator.calculate({ x: 100, y: 100 }, time1);
    calculator.reset();
    calculator.reset(); // Multiple resets should not cause issues

    const result = calculator.calculate({ x: 200, y: 200 }, time1 + 100);
    expect(result).toEqual({ x: 0, y: 0 }); // Should still treat as first calculation
  });

  it("should respect custom min/max bounds", () => {
    const customCalculator = new VelocityCalculator({
      min: 0.5,
      max: 2.0,
      algorithm: "linear",
    });

    const time1 = Date.now();
    const time2 = time1 + 100;

    customCalculator.calculate({ x: 0, y: 0 }, time1);
    const result = customCalculator.calculate({ x: 1000, y: 1 }, time2);

    expect(result.x).toBe(2.0);
    expect(result.y).toBe(0.5);
  });

  it("should properly handle velocity threshold", () => {
    const time1 = Date.now();
    const time2 = time1 + 10; // Shorter time delta to generate higher velocity

    calculator.calculate({ x: 0, y: 0 }, time1);

    // Test multiple small movements
    const smallMovements = [0.01, 0.05, 0.1, 0.2]; // Adjusted thresholds

    smallMovements.forEach((movement) => {
      const result = calculator.calculate({ x: movement, y: movement }, time2);

      // Velocity should be proportional to movement
      expect(result.x).toBeGreaterThan(0);
      expect(result.x).toBeLessThanOrEqual(1); // Capped by max velocity
    });
  });

  it("should handle velocity transitions smoothly", () => {
    const time1 = Date.now();
    let lastVelocity = { x: 0, y: 0 };

    // Test gradual increase and decrease
    for (let i = 0; i <= 10; i++) {
      const movement = i * 0.1; // 0.0 to 1.0
      const result = calculator.calculate(
        { x: movement, y: movement },
        time1 + i * 50
      );

      // Velocity changes should be continuous
      const velocityDelta = Math.abs(result.x - lastVelocity.x);
      expect(velocityDelta).toBeLessThan(0.5);

      lastVelocity = result;
    }
  });
});
