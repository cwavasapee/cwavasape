import { describe, it, expect, beforeEach } from "vitest";
import { DirectionDetector } from "../../src/core/direction";

describe("DirectionDetector", () => {
  let detector: DirectionDetector;

  beforeEach(() => {
    detector = new DirectionDetector({
      threshold: 0.1,
      samples: 3,
    });
  });

  it("should detect right direction", () => {
    const direction1 = detector.update({ x: 0, y: 0 });
    const direction2 = detector.update({ x: 5, y: 0 });
    const direction3 = detector.update({ x: 10, y: 0 });

    expect(direction3).toEqual({ x: "right", y: "none" });
  });

  it("should detect left direction", () => {
    const direction1 = detector.update({ x: 10, y: 0 });
    const direction2 = detector.update({ x: 5, y: 0 });
    const direction3 = detector.update({ x: 0, y: 0 });

    expect(direction3).toEqual({ x: "left", y: "none" });
  });

  it("should detect up direction", () => {
    const direction1 = detector.update({ x: 0, y: 10 });
    const direction2 = detector.update({ x: 0, y: 5 });
    const direction3 = detector.update({ x: 0, y: 0 });

    expect(direction3).toEqual({ x: "none", y: "up" });
  });

  it("should detect down direction", () => {
    const direction1 = detector.update({ x: 0, y: 0 });
    const direction2 = detector.update({ x: 0, y: 5 });
    const direction3 = detector.update({ x: 0, y: 10 });

    expect(direction3).toEqual({ x: "none", y: "down" });
  });

  it("should return none when movement is below threshold", () => {
    const direction1 = detector.update({ x: 0, y: 0 });
    const direction2 = detector.update({ x: 0.05, y: 0.05 });

    expect(direction2).toEqual({ x: "none", y: "none" });
  });

  it("should reset detector state", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 10, y: 10 });
    detector.reset();

    const direction = detector.update({ x: 15, y: 15 });
    expect(direction).toEqual({ x: "none", y: "none" });
  });

  it("should maintain direction with small movements below threshold", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 0.05, y: 0.05 });
    const result = detector.update({ x: 0.09, y: 0.09 });

    expect(result).toEqual({ x: "none", y: "none" });
  });

  it("should detect diagonal movement", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: 5 });
    const result = detector.update({ x: 10, y: 10 });

    expect(result).toEqual({ x: "right", y: "down" });
  });

  it("should handle direction changes", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: 5 });
    let result = detector.update({ x: 10, y: 10 });
    expect(result).toEqual({ x: "right", y: "down" });

    // Change direction
    detector.update({ x: 10, y: 10 });
    detector.update({ x: 5, y: 5 });
    result = detector.update({ x: 0, y: 0 });
    expect(result).toEqual({ x: "left", y: "up" });
  });

  it("should maintain last direction after reset until new samples", () => {
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: 0 });
    const before = detector.update({ x: 10, y: 0 });

    detector.reset();

    const after = detector.update({ x: 15, y: 0 });
    expect(after).toEqual({ x: "none", y: "none" }); // Not enough samples after reset
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

  it("should respect custom threshold", () => {
    const customDetector = new DirectionDetector({ threshold: 1.0 });
    customDetector.update({ x: 0, y: 0 });
    customDetector.update({ x: 0.5, y: 0.5 });
    const result = customDetector.update({ x: 0.9, y: 0.9 });
    expect(result).toEqual({ x: "none", y: "none" });
  });

  it("should respect custom samples size", () => {
    const customDetector = new DirectionDetector({ samples: 2 });
    customDetector.update({ x: 0, y: 0 });
    const result = customDetector.update({ x: 10, y: 10 });
    // With only 2 samples needed, direction should be detected immediately
    expect(result).toEqual({ x: "right", y: "down" });
  });

  it("should handle floating point positions", () => {
    detector.update({ x: 0.1, y: 0.1 });
    detector.update({ x: 0.2, y: 0.2 });
    const result = detector.update({ x: 0.3, y: 0.3 });
    expect(result).toEqual({ x: "right", y: "down" });
  });

  it("should handle negative floating point positions", () => {
    detector.update({ x: -0.1, y: -0.1 });
    detector.update({ x: -0.2, y: -0.2 });
    const result = detector.update({ x: -0.3, y: -0.3 });
    expect(result).toEqual({ x: "left", y: "up" });
  });

  it("should maintain direction when samples array is full", () => {
    // Fill up samples array (maxSamples is 3)
    detector.update({ x: 0, y: 0 });
    detector.update({ x: 5, y: 5 });
    detector.update({ x: 10, y: 10 });
    // Add one more sample, causing the first one to be shifted out
    const result = detector.update({ x: 15, y: 15 });
    expect(result).toEqual({ x: "right", y: "down" });
  });
});
