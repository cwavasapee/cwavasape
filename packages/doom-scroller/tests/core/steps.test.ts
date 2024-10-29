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

  describe("movement modes", () => {
    it("should handle absolute movement mode", () => {
      const absoluteManager = new StepsManager({
        active: true,
        movementMode: "absolute",
        movementThreshold: 100,
      });

      const result = absoluteManager.update({ x: 0, y: 150 }, { x: 0, y: 0 });
      expect(result?.trigger).toBe("movement");
    });

    it("should handle delta movement mode", () => {
      const deltaManager = new StepsManager({
        active: true,
        movementMode: "delta",
        movementThreshold: 100,
      });

      // First update to establish baseline
      deltaManager.update({ x: 0, y: 50 }, { x: 0, y: 0 });
      // Second update to trigger movement
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
      const result = manager.getCurrentStep();
      expect(result).toEqual({
        index: 2,
        size: 1000,
        start: { x: 0, y: 2000 },
        end: { x: window.innerWidth, y: 3000 },
      });
    });
  });
});
