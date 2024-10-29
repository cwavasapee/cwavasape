import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DoomScroller } from "../../src";

describe("DoomScroller Touch Gesture Tests", () => {
  let scroller: DoomScroller;
  let lastState: any;

  beforeEach(() => {
    // Set up fake timers
    vi.useFakeTimers();

    // Reset any previous instance
    if (scroller) {
      scroller.destroy();
    }

    scroller = new DoomScroller({
      events: {
        touch: true,
        wheel: false,
        mouse: false,
      },
    });

    scroller.subscribe((state) => {
      lastState = state;
    });

    scroller.start();
  });

  afterEach(() => {
    if (scroller) {
      scroller.destroy();
    }
    // Reset timers
    vi.useRealTimers();
  });

  it("should handle complex touch gestures", () => {
    // Simulate touch start with timestamp
    window.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          { clientX: 100, clientY: 100, identifier: 0 },
        ] as unknown as Touch[],
      })
    );

    // Small delay to allow for processing
    vi.advanceTimersByTime(16);

    // Simulate diagonal swipe with timestamp
    window.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [
          { clientX: 150, clientY: 150, identifier: 0 },
        ] as unknown as Touch[],
        changedTouches: [
          { clientX: 150, clientY: 150, identifier: 0 },
        ] as unknown as Touch[],
      })
    );

    vi.advanceTimersByTime(16);

    expect(lastState.direction).toEqual({
      x: "right",
      y: "down",
    });

    // Simulate touch end
    window.dispatchEvent(new TouchEvent("touchend", {}));

    // Advance timers to process the end event
    vi.advanceTimersByTime(32);

    // Force process any pending animation frames
    vi.runAllTimers();

    expect(lastState.isScrolling).toBe(false);
  });

  it("should handle multi-touch pinch gestures", () => {
    // Simulate pinch start with timestamp
    window.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [
          { clientX: 100, clientY: 100, identifier: 0 },
          { clientX: 200, clientY: 200, identifier: 1 },
        ] as unknown as Touch[],
      })
    );

    vi.advanceTimersByTime(16);

    // Simulate pinch movement with timestamp and changedTouches
    window.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [
          { clientX: 50, clientY: 50, identifier: 0 },
          { clientX: 250, clientY: 250, identifier: 1 },
        ] as unknown as Touch[],
        changedTouches: [
          { clientX: 50, clientY: 50, identifier: 0 },
          { clientX: 250, clientY: 250, identifier: 1 },
        ] as unknown as Touch[],
      })
    );

    vi.advanceTimersByTime(16);

    expect(lastState.movement.x).not.toBe(0);
    expect(lastState.movement.y).not.toBe(0);
  });
});
