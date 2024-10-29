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
      endDelay: 500,
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

  it("should handle all event types", () => {
    const events = {
      wheel: new WheelEvent("wheel", {
        deltaX: 10,
        deltaY: 20,
        clientX: 100,
        clientY: 200,
      }),
      touch: new TouchEvent("touchmove", {
        touches: [{ clientX: 120, clientY: 220 } as Touch],
      }),
      mouse: new MouseEvent("mousemove", {
        clientX: 140,
        clientY: 240,
      }),
    };

    Object.values(events).forEach((event) => {
      window.dispatchEvent(event);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isScrolling: true,
          timestamp: expect.any(Number),
        })
      );
    });
  });

  it("should handle event configuration updates", () => {
    handler.updateConfig({
      events: {
        wheel: false,
        touch: true,
        mouse: false,
      },
    });

    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 10,
      deltaY: 20,
    });

    window.dispatchEvent(wheelEvent);
    expect(mockHandler).not.toHaveBeenCalled();
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
});
