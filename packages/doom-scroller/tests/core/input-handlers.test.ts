import { describe, test, expect } from "vitest";
import { InputHandler } from "../../src/core/input-handlers";

describe("InputHandler", () => {
  test("normalizes wheel delta values", () => {
    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 100,
      deltaY: 100,
      deltaMode: 0,
    });

    const normalized = InputHandler.normalizeWheelDelta(wheelEvent, 1);
    expect(normalized).toEqual({ x: 100, y: 100 });
  });

  test("creates touch point data", () => {
    const touch = new Touch({
      identifier: 1,
      target: document.body,
      clientX: 100,
      clientY: 100,
    });

    const point = InputHandler.createTouchPoint(touch);
    expect(point).toEqual({
      x: 100,
      y: 100,
      timestamp: expect.any(Number),
    });
  });

  test("calculates touch delta", () => {
    const touch = new Touch({
      identifier: 1,
      target: document.body,
      clientX: 150,
      clientY: 150,
    });

    const lastPosition = {
      x: 100,
      y: 100,
      timestamp: performance.now(),
    };

    const delta = InputHandler.getTouchDelta(touch, lastPosition, 1);
    expect(delta).toEqual({ x: -50, y: -50 });
  });
});
