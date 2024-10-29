import { describe, it, expect, beforeEach } from "vitest";
import { DirectionDetector } from "../../src/core/direction";

describe("DirectionDetector", () => {
  let detector: DirectionDetector;

  beforeEach(() => {
    detector = new DirectionDetector({
      movement: {
        threshold: 0.1,
        samples: 5,
      },
    });
  });

  it("should detect right direction", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: 0 });
    const direction = detector.update({ x: 10, y: 0 });

    expect(direction).toEqual({ x: "right", y: "none" });
  });

  it("should detect left direction", () => {
    detector.update({ x: 10, y: 0 });
    detector.update({ x: 5, y: 0 });
    const direction = detector.update({ x: 0, y: 0 });

    expect(direction).toEqual({ x: "left", y: "none" });
  });

  it("should detect up direction", () => {
    detector.update({ x: 0, y: 10 });
    detector.update({ x: 0, y: 5 });
    const direction = detector.update({ x: 0, y: 0 });

    expect(direction).toEqual({ x: "none", y: "up" });
  });

  it("should detect down direction", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 0, y: 5 });
    const direction = detector.update({ x: 0, y: 10 });

    expect(direction).toEqual({ x: "none", y: "down" });
  });

  it("should return none when movement is below threshold", () => {
    detector.update({ x: 0, y: 0 });
    const direction = detector.update({ x: 0.05, y: 0.05 });

    expect(direction).toEqual({ x: "none", y: "none" });
  });

  it("should reset detector state", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 10, y: 10 });
    detector.reset();

    const direction = detector.update({ x: 15, y: 15 });
    expect(direction).toEqual({ x: "none", y: "none" });
  });

  it("should respect movement threshold configuration", () => {
    const detector = new DirectionDetector({
      movement: {
        threshold: 1.0,
        samples: 3,
      },
    });

    detector.update({ x: 0, y: 0 });
    detector.update({ x: 0.5, y: 0.5 });
    const result = detector.update({ x: 0.9, y: 0.9 });

    expect(result).toEqual({ x: "none", y: "none" });
  });

  it("should handle mixed directions", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: -5 });
    const result = detector.update({ x: 10, y: -10 });

    expect(result).toEqual({ x: "right", y: "up" });
  });

  it("should detect stationary state after movement", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: 5 });
    let result = detector.update({ x: 10, y: 10 });
    expect(result).toEqual({ x: "right", y: "down" });

    // Become stationary
    detector.update({ x: 10, y: 10 });
    detector.update({ x: 10, y: 10 });
    result = detector.update({ x: 10, y: 10 });
    expect(result).toEqual({ x: "none", y: "none" });
  });

  it("should handle single sample", () => {
    const result = detector.update({ x: 10, y: 10 });
    expect(result).toEqual({ x: "none", y: "none" });
  });
});
