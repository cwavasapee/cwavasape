import { describe, test, expect, beforeEach, vi } from "vitest";
import { MomentumHandler } from "../../src/core/momentum-handler";

describe("MomentumHandler", () => {
  let handler: MomentumHandler;

  beforeEach(() => {
    handler = new MomentumHandler();
  });

  test("starts momentum scrolling", () => {
    const onFrame = vi.fn();
    const onComplete = vi.fn();

    handler.start(
      { x: 1, y: 1 },
      {
        enabled: true,
        duration: 1000,
        friction: 0.95,
        minVelocity: 0.1,
      },
      onFrame,
      onComplete
    );

    expect(handler.active).toBe(true);
    expect(onFrame).toHaveBeenCalled();
  });

  test("stops momentum scrolling", () => {
    const onFrame = vi.fn();
    const onComplete = vi.fn();

    handler.start(
      { x: 1, y: 1 },
      {
        enabled: true,
        duration: 1000,
        friction: 0.95,
        minVelocity: 0.1,
      },
      onFrame,
      onComplete
    );

    handler.stop();
    expect(handler.active).toBe(false);
  });
});
