import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { DoomScroller } from "../../src/core";
import type { ScrollState } from "../../src/types";

describe("DoomScroller", () => {
  let scroller: DoomScroller;
  let subscriberCallback: (state: ScrollState) => void;

  beforeEach(() => {
    scroller = new DoomScroller();
    subscriberCallback = vi.fn();
    scroller.init();
  });

  afterEach(() => {
    scroller.destroy();
    vi.clearAllMocks();
  });

  test("initializes with default configuration", () => {
    const unsubscribe = scroller.subscribe(subscriberCallback);
    expect(typeof unsubscribe).toBe("function");
  });

  test("handles wheel events correctly", () => {
    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 0,
      deltaY: 100,
      deltaMode: 0,
    });

    window.dispatchEvent(wheelEvent);

    expect(subscriberCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        isScrolling: true,
        direction: expect.objectContaining({
          x: "none",
          y: "down",
        }),
      })
    );
  });

  test("handles touch events correctly", () => {
    const touchStartEvent = createTouchEvent("touchstart", [
      { clientX: 0, clientY: 0, identifier: 1 },
    ]);

    const touchMoveEvent = createTouchEvent("touchmove", [
      { clientX: 0, clientY: 50, identifier: 1 },
    ]);

    const touchEndEvent = createTouchEvent("touchend", []);

    window.dispatchEvent(touchStartEvent);
    window.dispatchEvent(touchMoveEvent);
    window.dispatchEvent(touchEndEvent);

    expect(subscriberCallback).toHaveBeenCalled();
  });

  test("updates configuration at runtime", () => {
    scroller.updateConfig({
      wheel: { speedMultiplier: 2 },
      touch: { speedMultiplier: 2 },
      debounceTime: 200,
    });

    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 0,
      deltaY: 100,
      deltaMode: 0,
    });

    window.dispatchEvent(wheelEvent);

    expect(subscriberCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: expect.objectContaining({
          y: expect.any(Number),
        }),
      })
    );
  });
});
