import { describe, it, expect, beforeEach, vi } from "vitest";
import { StepsManager } from "../../src/core/steps";

describe("StepsManager", () => {
  let manager: StepsManager;

  beforeEach(() => {
    // Mock window dimensions
    vi.stubGlobal("window", {
      innerHeight: 1000,
      innerWidth: 800,
    });

    manager = new StepsManager({
      active: true,
      movementMode: "absolute",
      movementThreshold: 100,
      velocityThreshold: 0.5,
    });
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      const defaultManager = new StepsManager();
      expect(defaultManager.getCurrentStep()).toEqual({
        index: 0,
        size: 0,
        start: { x: 0, y: 0 },
        end: { x: 800, y: 0 },
      });
    });

    it("should respect provided options", () => {
      const customManager = new StepsManager({
        active: true,
        movementMode: "delta",
        movementThreshold: 200,
        velocityThreshold: 1.0,
      });
      expect(customManager["active"]).toBe(true);
      expect(customManager["movementMode"]).toBe("delta");
      expect(customManager["movementThreshold"]).toBe(200);
      expect(customManager["velocityThreshold"]).toBe(1.0);
    });
  });

  describe("update method", () => {
    it("should handle first update correctly", () => {
      const result = manager.update({ x: 0, y: 0 }, { x: 0, y: 0 });
      expect(manager["stepSize"]).toBe(1000); // window.innerHeight
      expect(result).toBeUndefined();
    });

    it("should detect velocity-based step change", () => {
      const result = manager.update(
        { x: 0, y: 500 },
        { x: 0, y: 0.6 } // Above velocity threshold
      );
      expect(result?.trigger).toBe("velocity");
    });

    it("should handle negative step indices", () => {
      const result = manager.update({ x: 0, y: -1500 }, { x: 0, y: 0 });
      expect(result?.index).toBe(-2);
      expect(result?.start).toEqual({ x: 0, y: -2000 });
      expect(result?.end).toEqual({ x: 800, y: -1000 });
    });

    it("should accumulate delta movements correctly", () => {
      const deltaManager = new StepsManager({
        active: true,
        movementMode: "delta",
        movementThreshold: 100,
        velocityThreshold: 100.0, // Set very high to avoid velocity triggers
      });

      deltaManager.update({ x: 0, y: 50 }, { x: 0, y: 0 });
      const result = deltaManager.update({ x: 0, y: 60 }, { x: 0, y: 0 });
      expect(result?.trigger).toBe("movement");
    });
  });

  describe("reset method", () => {
    it("should reset all internal state", () => {
      manager.update({ x: 0, y: 1500 }, { x: 0, y: 0 });
      manager.reset();

      expect(manager["currentStep"]).toBe(0);
      expect(manager["stepSize"]).toBe(0);
      expect(manager["lastPosition"]).toEqual({ x: 0, y: 0 });
      expect(manager["accumulatedDelta"]).toBe(0);
    });

    it("should handle subsequent updates after reset", () => {
      manager.update({ x: 0, y: 1500 }, { x: 0, y: 0 });
      manager.reset();
      const result = manager.update({ x: 0, y: 500 }, { x: 0, y: 0 });
      expect(result?.index).toBe(0);
    });
  });

  describe("getCurrentStep method", () => {
    it("should return correct initial step", () => {
      const step = manager.getCurrentStep();
      expect(step).toEqual({
        index: 0,
        size: 0,
        start: { x: 0, y: 0 },
        end: { x: 800, y: 0 },
      });
    });

    it("should return correct step after updates", () => {
      manager.update({ x: 0, y: 2500 }, { x: 0, y: 0 });
      const step = manager.getCurrentStep();
      expect(step).toEqual({
        index: 2,
        size: 1000,
        start: { x: 0, y: 2000 },
        end: { x: 800, y: 3000 },
      });
    });

    it("should maintain step boundaries after reset", () => {
      manager.update({ x: 0, y: 1500 }, { x: 0, y: 0 });
      manager.reset();
      const step = manager.getCurrentStep();
      expect(step.index).toBe(0);
      expect(step.size).toBe(0);
    });
  });

  describe("delta movement mode", () => {
    it("should accumulate movements until threshold", () => {
      const deltaManager = new StepsManager({
        active: true,
        movementMode: "delta",
        movementThreshold: 100,
        velocityThreshold: 100.0,
      });

      // First movement (40 units)
      let result = deltaManager.update({ x: 0, y: 40 }, { x: 0, y: 0 });
      expect(result).toBeUndefined();

      // Second movement (40 units, total 80)
      result = deltaManager.update({ x: 0, y: 40 }, { x: 0, y: 0 });
      expect(result).toBeUndefined();

      // Third movement (40 units, total 120 - should trigger)
      result = deltaManager.update({ x: 0, y: 40 }, { x: 0, y: 0 });
      expect(result?.trigger).toBe("movement");
    });

    it("should reset accumulator after trigger", () => {
      const deltaManager = new StepsManager({
        active: true,
        movementMode: "delta",
        movementThreshold: 100,
        velocityThreshold: 100.0,
      });

      // Accumulate to trigger
      deltaManager.update({ x: 0, y: 60 }, { x: 0, y: 0 });
      deltaManager.update({ x: 0, y: 60 }, { x: 0, y: 0 });
      expect(deltaManager["accumulatedDelta"]).toBe(0); // Should reset after trigger

      // Start new accumulation
      const result = deltaManager.update({ x: 0, y: 40 }, { x: 0, y: 0 });
      expect(result).toBeUndefined();
      expect(deltaManager["accumulatedDelta"]).toBe(40);
    });
  });
});
