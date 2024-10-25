import { describe, test, expect, beforeEach } from "vitest";
import { DirectionDetector } from "../../src/core/direction-detector";

describe("DirectionDetector", () => {
  let detector: DirectionDetector;

  beforeEach(() => {
    detector = new DirectionDetector();
  });

  test("detects horizontal movement", () => {
    const direction = detector.detectDirection({ x: 1, y: 0 });
    expect(direction.x).toBe("right");
    expect(direction.y).toBe("none");
  });

  test("detects vertical movement", () => {
    const direction = detector.detectDirection({ x: 0, y: 1 });
    expect(direction.x).toBe("none");
    expect(direction.y).toBe("down");
  });

  test("applies hysteresis to prevent rapid changes", () => {
    detector.detectDirection({ x: 1, y: 0 });
    const direction = detector.detectDirection({ x: 0.1, y: 0 });
    expect(direction.x).toBe("right");
  });

  test("resets state correctly", () => {
    detector.detectDirection({ x: 1, y: 1 });
    detector.reset();
    const direction = detector.detectDirection({ x: 0, y: 0 });
    expect(direction.x).toBe("none");
    expect(direction.y).toBe("none");
  });
});
