import { describe, it, expect, beforeEach } from "vitest";
import { DataProcessor } from "../../src/core/dataProcessor";
import type { ScrollEventData } from "../../src/types/events";

describe("DataProcessor", () => {
  let processor: DataProcessor;

  beforeEach(() => {
    processor = new DataProcessor({
      movement: {
        threshold: 0.1,
        samples: 3,
        smoothing: {
          active: true,
          factor: 0.3,
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
          factor: 0.3,
          samples: 5,
          algorithm: "linear",
        },
      },
    });
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
    expect(result.delta).toEqual({ x: -35, y: -52.5 });
    expect(result.position).toEqual({ x: 50, y: 25 });
  });

  it("should apply smoothing to movement", () => {
    const event1: ScrollEventData = {
      type: "touch",
      timestamp: Date.now(),
      position: { x: 0, y: 0 },
      isScrolling: true,
    };

    const event2: ScrollEventData = {
      type: "touch",
      timestamp: Date.now() + 100,
      position: { x: 100, y: 100 },
      isScrolling: true,
    };

    processor.process(event1);
    const result = processor.process(event2);

    // Smoothed value should be less than raw delta due to smoothing factor
    expect(Math.abs(result.delta.x)).toBeLessThan(100);
    expect(Math.abs(result.delta.y)).toBeLessThan(100);
  });
});
