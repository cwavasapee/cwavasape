import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterEach,
} from "vitest";
import { EventHandler } from "../../src/core/eventHandler";
import type { ScrollEventData } from "../../src/types/events";
import type { Mock } from "vitest";

describe("EventHandler", () => {
  let handler: EventHandler;
  let mockHandler: Mock;
  let target: Window;

  // Setup mock window with proper event handling
  beforeAll(() => {
    target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event) => {
        // Add preventDefault to the event if it doesn't exist
        if (!event.preventDefault) {
          event.preventDefault = vi.fn();
        }

        // Ensure touches array is accessible
        if (event.type.startsWith("touch")) {
          const touchEvent = event as TouchEvent;
          if (!touchEvent.touches) {
            Object.defineProperty(touchEvent, "touches", {
              get: () => [],
              configurable: true,
            });
          }
          if (!touchEvent.changedTouches) {
            Object.defineProperty(touchEvent, "changedTouches", {
              get: () => [],
              configurable: true,
            });
          }
        }

        const handlerMap: Record<string, (e: Event) => void> = {
          wheel: (e: Event) => handler["handleWheel"](e as WheelEvent),
          touchstart: (e: Event) =>
            handler["handleTouchStart"](e as TouchEvent),
          touchmove: (e: Event) => handler["handleTouchMove"](e as TouchEvent),
          touchend: (e: Event) => handler["handleTouchEnd"](e as TouchEvent),
          mousedown: (e: Event) => handler["handleMouseDown"](e as MouseEvent),
          mousemove: (e: Event) => handler["handleMouseMove"](e as MouseEvent),
          mouseup: (e: Event) => handler["handleMouseUp"](e as MouseEvent),
        };

        const eventHandler = handlerMap[event.type];
        if (eventHandler) {
          eventHandler(event);
        }
        return true;
      }),
      setTimeout: vi.fn((callback, delay) => {
        return 1; // Return a dummy timeout ID
      }),
      clearTimeout: vi.fn(),
    } as unknown as Window;

    vi.stubGlobal("window", target);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create new handler instance
    handler = new EventHandler({
      passive: true,
      endDelay: 500, // Update test setup
      events: {
        wheel: true,
        touch: true,
        mouse: true,
      },
    });

    // Setup mock handler
    mockHandler = vi.fn();
    handler.addHandler(mockHandler);

    // Start the handler
    handler.start();
  });

  it("should handle wheel events", () => {
    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 10,
      deltaY: 20,
      clientX: 100,
      clientY: 200,
    });

    window.dispatchEvent(wheelEvent);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "wheel",
        position: { x: 100, y: 200 },
        delta: { x: 10, y: 20 },
        isScrolling: true,
      })
    );
  });

  it("should handle touch events", () => {
    const touchStart = new TouchEvent("touchstart", {
      touches: [
        {
          pageX: 100,
          pageY: 200,
          clientX: 100,
          clientY: 200,
        } as Touch,
      ],
    });

    const touchMove = new TouchEvent("touchmove", {
      touches: [
        {
          pageX: 120,
          pageY: 220,
          clientX: 120,
          clientY: 220,
        } as Touch,
      ],
    });

    const touchEnd = new TouchEvent("touchend", {
      touches: [],
    });

    window.dispatchEvent(touchStart);
    window.dispatchEvent(touchMove);
    window.dispatchEvent(touchEnd);

    expect(mockHandler).toHaveBeenCalledTimes(3);
    expect(mockHandler).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "touch",
        position: { x: 100, y: 200 },
        isScrolling: true,
      })
    );
  });

  it("should handle mouse events", () => {
    const mouseDown = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 200,
    });

    const mouseMove = new MouseEvent("mousemove", {
      clientX: 120,
      clientY: 220,
    });

    const mouseUp = new MouseEvent("mouseup", {
      clientX: 140,
      clientY: 240,
    });

    // Simulate mouse sequence
    window.dispatchEvent(mouseDown);
    window.dispatchEvent(mouseMove);
    window.dispatchEvent(mouseUp);

    expect(mockHandler).toHaveBeenCalledTimes(3);
  });

  it("should start and stop event listening", () => {
    handler.start();
    expect(handler["isActive"]).toBe(true);

    handler.stop();
    expect(handler["isActive"]).toBe(false);
  });

  it("should add and remove handlers", () => {
    const newHandler = vi.fn();
    handler.addHandler(newHandler);

    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 10,
      deltaY: 20,
    });

    window.dispatchEvent(wheelEvent);
    expect(newHandler).toHaveBeenCalled();

    handler.removeHandler(newHandler);
    newHandler.mockClear();

    window.dispatchEvent(wheelEvent);
    expect(newHandler).not.toHaveBeenCalled();
  });

  it("should clean up on destroy", () => {
    handler.destroy();
    expect(handler["isActive"]).toBe(false);
    expect(handler["handlers"].size).toBe(0);
  });

  it("should properly detach events when stopped", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    handler.stop();

    // Should remove all event listeners
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "wheel",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchend",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mousemove",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mouseup",
      expect.any(Function)
    );
  });

  it("should respect passive option for event listeners", () => {
    const nonPassiveHandler = new EventHandler({ passive: false, events: {} });
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    nonPassiveHandler.start();

    // Check that events are attached with passive: false
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "wheel",
      expect.any(Function),
      expect.objectContaining({ passive: false })
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function),
      expect.objectContaining({ passive: false })
    );
  });

  it("should prevent default on wheel events when passive is false", () => {
    const nonPassiveHandler = new EventHandler({ passive: false, events: {} });
    const mockPreventDefault = vi.fn();
    nonPassiveHandler.start();

    // Create a new wheel event and set up preventDefault
    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 10,
      deltaY: 20,
    });

    // Temporarily replace the handler reference for this test
    const originalHandler = handler;
    handler = nonPassiveHandler;

    Object.defineProperty(wheelEvent, "preventDefault", {
      value: mockPreventDefault,
    });

    window.dispatchEvent(wheelEvent);

    // Restore the original handler
    handler = originalHandler;

    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it("should normalize touch event data correctly", () => {
    const touchEvent = {
      type: "touchmove",
      touches: [
        {
          clientX: 100,
          clientY: 200,
        },
      ],
      preventDefault: vi.fn(),
    };

    // Set initial touch position
    handler["lastTouchPosition"] = { x: 90, y: 190 };

    // Dispatch the event directly to the handler
    handler["handleTouchMove"](touchEvent as unknown as TouchEvent);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "touch",
        position: { x: 100, y: 200 },
        delta: { x: 10, y: 10 },
        isScrolling: true,
        timestamp: expect.any(Number),
      })
    );
  });

  it("should handle touch events with no touches", () => {
    const emptyTouchEvent = new TouchEvent("touchmove", {
      touches: [],
    });

    window.dispatchEvent(emptyTouchEvent);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should normalize mouse event data correctly", () => {
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 250,
    });

    window.dispatchEvent(mouseEvent);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mouse",
        position: { x: 150, y: 250 },
        timestamp: expect.any(Number),
      })
    );
  });

  it("should not start multiple times", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const initialCallCount = addEventListenerSpy.mock.calls.length;

    handler.start(); // Already started in beforeEach
    handler.start(); // Try to start again

    expect(addEventListenerSpy).toHaveBeenCalledTimes(initialCallCount);
  });

  it("should not stop multiple times", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    handler.stop(); // First stop
    const callCount = removeEventListenerSpy.mock.calls.length;
    removeEventListenerSpy.mockClear(); // Clear the spy's history

    handler.stop(); // Try to stop again

    expect(removeEventListenerSpy).not.toHaveBeenCalled();
  });

  describe("Event type configuration", () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, "addEventListener");
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
    });

    it("should use default event configuration", () => {
      const handler = new EventHandler();
      handler.start();

      // Should attach wheel and touch events by default
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "wheel",
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function),
        expect.any(Object)
      );

      // Should not attach mouse events by default
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function),
        expect.any(Object)
      );
    });

    it("should respect custom event configuration", () => {
      const handler = new EventHandler({
        events: {
          wheel: false,
          touch: true,
          mouse: true,
        },
      });
      handler.start();

      // Should not attach wheel events
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "wheel",
        expect.any(Function),
        expect.any(Object)
      );

      // Should attach touch events
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function),
        expect.any(Object)
      );

      // Should attach mouse events
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function),
        expect.any(Object)
      );
    });

    it("should handle all events disabled", () => {
      const handler = new EventHandler({
        events: {
          wheel: false,
          touch: false,
          mouse: false,
        },
      });
      handler.start();

      // Should not attach any events
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it("should properly clean up only attached events", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const handler = new EventHandler({
        events: {
          wheel: true,
          touch: false,
          mouse: true,
        },
      });

      handler.start();
      handler.stop();

      // Should only remove attached events
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "wheel",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mouseup",
        expect.any(Function)
      );

      // Should not try to remove unattached events
      expect(removeEventListenerSpy).not.toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).not.toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).not.toHaveBeenCalledWith(
        "touchend",
        expect.any(Function)
      );
    });
  });

  describe("Event configuration", () => {
    it("should respect event configuration from DoomScroller", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      const handler = new EventHandler({
        events: {
          wheel: false,
          touch: false,
          mouse: true,
        },
      });

      handler.start();

      // Should not attach wheel events
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "wheel",
        expect.any(Function),
        expect.any(Object)
      );

      // Should not attach touch events
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        expect.any(Object)
      );

      // Should attach mouse events
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
        expect.any(Object)
      );
    });

    it("should properly clean up when configuration changes", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const handler = new EventHandler({
        events: {
          wheel: true,
          touch: true,
          mouse: false,
        },
      });

      handler.start();
      removeEventListenerSpy.mockClear();

      // Change configuration with proper type
      handler.updateConfig({
        events: {
          wheel: false,
          touch: false,
          mouse: true,
        },
      });

      // Should remove old events
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "wheel",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchmove",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "touchend",
        expect.any(Function)
      );
    });
  });

  describe("Event timing", () => {
    let handler: EventHandler;
    let mockHandler: Mock;

    beforeEach(() => {
      vi.useFakeTimers();

      // Create a new mock window with proper event handling
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn((event) => {
          if (!event.preventDefault) {
            event.preventDefault = vi.fn();
          }

          const handlerMap: Record<string, (e: Event) => void> = {
            wheel: (e: Event) => handler["handleWheel"](e as WheelEvent),
            touchstart: (e: Event) =>
              handler["handleTouchStart"](e as TouchEvent),
            touchmove: (e: Event) =>
              handler["handleTouchMove"](e as TouchEvent),
            touchend: (e: Event) => handler["handleTouchEnd"](e as TouchEvent),
            mousedown: (e: Event) =>
              handler["handleMouseDown"](e as MouseEvent),
            mousemove: (e: Event) =>
              handler["handleMouseMove"](e as MouseEvent),
            mouseup: (e: Event) => handler["handleMouseUp"](e as MouseEvent),
          };

          const eventHandler = handlerMap[event.type];
          if (eventHandler) {
            eventHandler(event);
          }
          return true;
        }),
        // Use vi's timer functions directly
        setTimeout: vi.fn().mockImplementation((cb, delay) => {
          return setTimeout(cb, delay);
        }),
        clearTimeout: vi.fn().mockImplementation((id) => {
          clearTimeout(id);
        }),
      } as unknown as Window;

      vi.stubGlobal("window", mockWindow);

      handler = new EventHandler({
        endDelay: 500, // Update test setup
        events: {
          wheel: true,
          touch: true,
          mouse: true,
        },
      });
      mockHandler = vi.fn();
      handler.addHandler(mockHandler);
      handler.start();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it("should maintain isScrolling true during continuous events", () => {
      const wheelEvent = new WheelEvent("wheel", {
        deltaX: 10,
        deltaY: 20,
        clientX: 100,
        clientY: 200,
      });

      // Simulate continuous scrolling
      window.dispatchEvent(wheelEvent);
      vi.advanceTimersByTime(300); // Updated timing
      window.dispatchEvent(wheelEvent);
      vi.advanceTimersByTime(300); // Updated timing
      window.dispatchEvent(wheelEvent);

      const falseCalls = mockHandler.mock.calls.filter(
        (call): call is [ScrollEventData] =>
          !call[0].isScrolling && call[0].type !== "end"
      );

      expect(falseCalls.length).toBe(0);
    });

    it("should only emit isScrolling false after the debounce period", () => {
      const wheelEvent = new WheelEvent("wheel", {
        deltaX: 10,
        deltaY: 20,
        clientX: 100,
        clientY: 200,
      });

      window.dispatchEvent(wheelEvent);

      // Verify initial event was emitted
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "wheel",
          position: { x: 100, y: 200 },
          delta: { x: 10, y: 20 },
          isScrolling: true,
        })
      );

      // Advance time but not enough to trigger end event
      vi.advanceTimersByTime(300); // Updated timing

      // Should not have any end events yet
      const earlyEndEvents = mockHandler.mock.calls.filter(
        ([event]) => !event.isScrolling
      );
      expect(earlyEndEvents.length).toBe(0);

      // Advance remaining time to trigger end event
      vi.advanceTimersByTime(200); // Complete the 500ms period

      // Should now have an end event
      const endEvents = mockHandler.mock.calls.filter(
        ([event]) => !event.isScrolling
      );
      expect(endEvents.length).toBe(1);
    });

    it("should clear pending end events when new scroll events occur", () => {
      const wheelEvent = new WheelEvent("wheel", {
        deltaX: 10,
        deltaY: 20,
        clientX: 100,
        clientY: 200,
      });

      window.dispatchEvent(wheelEvent);
      vi.advanceTimersByTime(300); // Updated timing
      window.dispatchEvent(wheelEvent); // Should clear previous timeout
      vi.advanceTimersByTime(300); // Updated timing

      // Should not have any end events yet
      expect(mockHandler.mock.calls.some(([event]) => !event.isScrolling)).toBe(
        false
      );
    });

    it("should cleanup timeouts when stopped", () => {
      const wheelEvent = new WheelEvent("wheel", {
        deltaX: 10,
        deltaY: 20,
        clientX: 100,
        clientY: 200,
      });

      window.dispatchEvent(wheelEvent);
      handler.stop();

      // Should receive exactly one end event from stop()
      const endEvents = mockHandler.mock.calls.filter(
        ([event]) => !event.isScrolling
      );
      expect(endEvents.length).toBe(1);

      // Advance time - should not receive additional end events
      vi.advanceTimersByTime(200);
      const finalEndEvents = mockHandler.mock.calls.filter(
        ([event]) => !event.isScrolling
      );
      expect(finalEndEvents.length).toBe(1);
    });
  });

  it("should handle complete touch interaction cycle", () => {
    // Create touch events
    const touchEvents = {
      start: {
        type: "touchstart",
        touches: [
          {
            clientX: 100,
            clientY: 200,
          },
        ],
        preventDefault: vi.fn(),
      },
      move: {
        type: "touchmove",
        touches: [
          {
            clientX: 120,
            clientY: 220,
          },
        ],
        preventDefault: vi.fn(),
      },
      end: {
        type: "touchend",
        touches: [],
        changedTouches: [
          {
            clientX: 120,
            clientY: 220,
          },
        ],
        preventDefault: vi.fn(),
      },
    };

    // Call handlers directly instead of using dispatchEvent
    handler["handleTouchStart"](touchEvents.start as unknown as TouchEvent);
    handler["handleTouchMove"](touchEvents.move as unknown as TouchEvent);
    handler["handleTouchEnd"](touchEvents.end as unknown as TouchEvent);

    expect(mockHandler).toHaveBeenCalledTimes(3);

    // Check start event
    expect(mockHandler).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "touch",
        position: { x: 100, y: 200 },
        delta: { x: 0, y: 0 },
        isScrolling: true,
      })
    );

    // Check move event
    expect(mockHandler).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "touch",
        position: { x: 120, y: 220 },
        delta: { x: 20, y: 20 },
        isScrolling: true,
      })
    );

    // Check end event
    expect(mockHandler).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: "end",
        delta: { x: 0, y: 0 },
        isScrolling: false,
      })
    );
  });
});
