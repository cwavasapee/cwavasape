import { describe, it, expect, beforeEach } from "vitest";
import { DataProcessor } from "../../src/core/dataProcessor";
import type { ScrollEventData } from "../../src/types/events";

describe("DataProcessor", () => {
  let processor: DataProcessor;

  beforeEach(() => {
    processor = new DataProcessor();
  });

  it("should handle first event with zero delta", () => {
    const event: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 100, y: 100 },
      isScrolling: true,
    };

    const result = processor.process(event);
    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.position).toEqual({ x: 100, y: 100 });
  });

  it("should maintain accumulated position after reset", () => {
    const event1: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 100, y: 100 },
      isScrolling: true,
    };

    processor.process(event1);
    processor.reset();

    const event2: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 150, y: 150 },
      isScrolling: true,
    };

    const result = processor.process(event2);
    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.position).toEqual({ x: 150, y: 150 });
  });

  it("should handle negative deltas", () => {
    const event1: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 100, y: 100 },
      isScrolling: true,
    };

    const event2: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 50, y: 25 },
      isScrolling: true,
    };

    processor.process(event1);
    const result = processor.process(event2);
    expect(result.delta).toEqual({ x: -50, y: -75 });
    expect(result.position).toEqual({ x: 50, y: 25 });
  });

  it("should accumulate wheel event deltas", () => {
    const event1: ScrollEventData = {
      type: "wheel",
      timestamp: Date.now(),
      position: { x: 0, y: 0 },
      delta: { x: 10, y: 20 },
      isScrolling: true,
    };

    const event2: ScrollEventData = {
      type: "wheel",
      timestamp: Date.now(),
      position: { x: 0, y: 0 },
      delta: { x: -5, y: 15 },
      isScrolling: true,
    };

    processor.process(event1);
    const result = processor.process(event2);
    expect(result.delta).toEqual({ x: -5, y: 15 });
    expect(result.position).toEqual({ x: 5, y: 35 });
  });

  it("should handle zero movement", () => {
    const event1: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 100, y: 100 },
      isScrolling: true,
    };

    const event2: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 100, y: 100 },
      isScrolling: true,
    };

    processor.process(event1);
    const result = processor.process(event2);
    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.position).toEqual({ x: 100, y: 100 });
  });

  it("should initialize with zero values", () => {
    const event: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 0, y: 0 },
      isScrolling: true,
    };

    const result = processor.process(event);
    expect(result.position).toEqual({ x: 0, y: 0 });
    expect(result.delta).toEqual({ x: 0, y: 0 });
  });

  describe("movement detection", () => {
    it("should zero out delta when no significant movement occurs", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      const result = processor.process({
        type: "touch",
        timestamp: baseTime + 200,
        position: { x: 100.0001, y: 100.0001 },
        isScrolling: true,
      });

      expect(result.delta).toEqual({ x: 0, y: 0 });
    });

    it("should maintain delta for significant movements", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      const result = processor.process({
        type: "touch",
        timestamp: baseTime + 50,
        position: { x: 110, y: 110 },
        isScrolling: true,
      });

      expect(result.delta).toEqual({ x: 10, y: 10 });
    });

    it("should handle movement timeout correctly", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      const result = processor.process({
        type: "touch",
        timestamp: baseTime + 200, // After timeout
        position: { x: 100.0005, y: 100.0005 },
        isScrolling: true,
      });

      expect(result.delta).toEqual({ x: 0, y: 0 });
    });

    it("should maintain position even when zeroing delta", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      const result = processor.process({
        type: "touch",
        timestamp: baseTime + 200,
        position: { x: 100.0001, y: 100.0001 },
        isScrolling: true,
      });

      expect(result.delta).toEqual({ x: 0, y: 0 });
      expect(result.position).toEqual({ x: 100.0001, y: 100.0001 });
    });

    it("should reset movement detection state on reset", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      processor.reset();

      const result = processor.process({
        type: "touch",
        timestamp: baseTime + 200,
        position: { x: 110, y: 110 },
        isScrolling: true,
      });

      expect(result.delta).toEqual({ x: 0, y: 0 });
    });

    it("should zero out movement after timeout", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      const result = processor.process({
        type: "touch",
        timestamp: baseTime + 200, // After MOVEMENT_TIMEOUT
        position: { x: 100.05, y: 100.05 }, // Smaller movement that's below threshold
        isScrolling: true,
      });

      expect(result.delta).toEqual({ x: 0, y: 0 });
      expect(result.position).toEqual({ x: 100.05, y: 100.05 });
    });

    it("should handle movements near threshold correctly", () => {
      const baseTime = Date.now();

      processor.process({
        type: "touch",
        timestamp: baseTime,
        position: { x: 100, y: 100 },
        isScrolling: true,
      });

      const belowThreshold = processor.process({
        type: "touch",
        timestamp: baseTime + 50,
        position: { x: 100.1, y: 100.1 }, // Below MOVEMENT_THRESHOLD
        isScrolling: true,
      });

      const aboveThreshold = processor.process({
        type: "touch",
        timestamp: baseTime + 100,
        position: { x: 100.5, y: 100.5 }, // Above MOVEMENT_THRESHOLD
        isScrolling: true,
      });

      expect(belowThreshold.delta).toEqual({ x: 0, y: 0 });
      // We expect rounded values to 3 decimal places
      const expectedDelta = { x: 0.4, y: 0.4 };
      expect(aboveThreshold.delta.x).toBeCloseTo(expectedDelta.x, 3);
      expect(aboveThreshold.delta.y).toBeCloseTo(expectedDelta.y, 3);
    });
  });
});
