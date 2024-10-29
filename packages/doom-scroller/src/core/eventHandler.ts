/**
 * @fileoverview EventHandler module for managing DOM events in the DoomScroller library
 * @module core/eventHandler
 */

import type { Vector2D } from "../types";
import type {
  ScrollEventData,
  ScrollEventHandler,
  EventOptions,
  RequiredEventOptions,
} from "../types/events";

interface EventHandlerOptions extends EventOptions {
  events?: {
    wheel?: boolean;
    touch?: boolean;
    mouse?: boolean;
  };
}

/**
 * EventHandler class for managing scroll, touch and mouse events
 * @class
 *
 * @description
 * The EventHandler class provides a unified interface for handling various DOM events
 * related to scrolling and movement. It normalizes different event types (wheel, touch, mouse)
 * into a consistent format and manages event listeners lifecycle.
 *
 * Features:
 * - Unified event handling for wheel, touch, and mouse events
 * - Event normalization into consistent format
 * - Automatic event cleanup
 * - Support for passive and non-passive event listeners
 * - Multiple handler registration
 *
 * @example
 * ```typescript
 * const handler = new EventHandler({ passive: true });
 *
 * handler.addHandler((event) => {
 *   console.log('Movement detected:', event.position);
 * });
 *
 * handler.start();
 * ```
 */
export class EventHandler {
  /**
   * Target DOM element for event listeners
   * @private
   * @readonly
   */
  private readonly target: Window;

  /**
   * Set of registered event handlers
   * @private
   * @readonly
   */
  private readonly handlers: Set<ScrollEventHandler>;

  /**
   * Current active state of the handler
   * @private
   */
  private isActive: boolean = false;

  /**
   * Last touch position for touch movement handling
   * @private
   */
  private lastTouchPosition: Vector2D | null = null;

  /**
   * Timeout for end event
   * @private
   */
  private endEventTimeout?: number;

  /**
   * Event listener options
   * @private
   */
  private options: RequiredEventOptions;

  /**
   * Creates a new EventHandler instance
   * @param {EventHandlerOptions} [options={}] - Configuration options for event handling
   * @param {boolean} [options.passive=true] - Whether events should be passive
   * @param {Object} [options.events] - Event type configuration
   * @param {boolean} [options.events.wheel=true] - Enable wheel event handling
   * @param {boolean} [options.events.touch=true] - Enable touch event handling
   * @param {boolean} [options.events.mouse=false] - Enable mouse event handling
   * @param {number} [options.endDelay] - Custom end delay for end event
   *
   * @example
   * ```typescript
   * // Create with default options
   * const handler = new EventHandler();
   *
   * // Create with custom configuration
   * const customHandler = new EventHandler({
   *   passive: false,
   *   events: {
   *     wheel: true,
   *     touch: false,
   *     mouse: true
   *   }
   * });
   * ```
   */
  constructor(options: EventHandlerOptions = {}) {
    this.handlers = new Set();
    this.options = {
      passive: options.passive ?? true,
      events: {
        wheel: options.events?.wheel ?? true,
        touch: options.events?.touch ?? true,
        mouse: options.events?.mouse ?? false,
      },
      endDelay: options.endDelay ?? 500,
    };
    this.target = window;
  }

  /**
   * Start listening to events
   * @returns {void}
   *
   * @description
   * Begins listening for events by attaching all necessary event listeners.
   * If the handler is already active, this method has no effect.
   *
   * @example
   * ```typescript
   * const handler = new EventHandler();
   * handler.start(); // Begin listening for events
   * ```
   */
  public start(): void {
    if (this.isActive) return;
    this.isActive = true;

    if (this.options.events.wheel) {
      this.target.addEventListener("wheel", this.handleWheel, {
        passive: this.options.passive,
      });
    }

    if (this.options.events.touch) {
      this.target.addEventListener("touchstart", this.handleTouchStart, {
        passive: this.options.passive,
      });
      this.target.addEventListener("touchmove", this.handleTouchMove, {
        passive: this.options.passive,
      });
      this.target.addEventListener("touchend", this.handleTouchEnd, {
        passive: this.options.passive,
      });
    }

    if (this.options.events.mouse) {
      this.target.addEventListener("mousedown", this.handleMouseDown, {
        passive: this.options.passive,
      });
      this.target.addEventListener("mousemove", this.handleMouseMove, {
        passive: this.options.passive,
      });
      this.target.addEventListener("mouseup", this.handleMouseUp, {
        passive: this.options.passive,
      });
    }
  }

  /**
   * Stop listening to events
   * @returns {void}
   *
   * @description
   * Stops listening for events by removing all event listeners.
   * If the handler is already inactive, this method has no effect.
   *
   * @example
   * ```typescript
   * handler.stop(); // Stop listening for events
   * ```
   */
  public stop(): void {
    if (!this.isActive) return;

    this.target.removeEventListener("wheel", this.handleWheel);
    this.target.removeEventListener("touchstart", this.handleTouchStart);
    this.target.removeEventListener("touchmove", this.handleTouchMove);
    this.target.removeEventListener("touchend", this.handleTouchEnd);
    this.target.removeEventListener("mousedown", this.handleMouseDown);
    this.target.removeEventListener("mousemove", this.handleMouseMove);
    this.target.removeEventListener("mouseup", this.handleMouseUp);

    this.isActive = false;
    this.lastTouchPosition = null;
  }

  /**
   * Add event handler
   * @param {ScrollEventHandler} handler - Function to handle scroll events
   * @returns {void}
   *
   * @description
   * Registers a new handler function to receive scroll events.
   * Multiple handlers can be registered simultaneously.
   *
   * @example
   * ```typescript
   * handler.addHandler((event) => {
   *   console.log('Position:', event.position);
   *   console.log('Event type:', event.type);
   * });
   * ```
   */
  public addHandler(handler: ScrollEventHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Remove event handler
   * @param {ScrollEventHandler} handler - Handler function to remove
   * @returns {void}
   *
   * @description
   * Unregisters a previously added handler function.
   * If the handler wasn't previously registered, this method has no effect.
   *
   * @example
   * ```typescript
   * const myHandler = (event) => console.log(event);
   * handler.addHandler(myHandler);
   * // Later...
   * handler.removeHandler(myHandler);
   * ```
   */
  public removeHandler(handler: ScrollEventHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Clean up all handlers and events
   * @returns {void}
   *
   * @description
   * Performs complete cleanup by stopping event listening and clearing all handlers.
   * Use this method when the EventHandler instance is no longer needed.
   *
   * @example
   * ```typescript
   * handler.destroy(); // Clean up everything
   * ```
   */
  public destroy(): void {
    this.stop();
    this.handlers.clear();
  }

  private emit(event: ScrollEventData): void {
    if (this.endEventTimeout) {
      window.clearTimeout(this.endEventTimeout);
      this.endEventTimeout = undefined;
    }

    this.handlers.forEach((handler) => handler(event));

    if (event.isScrolling && this.isActive) {
      this.scheduleEndEvent();
    }
  }

  private scheduleEndEvent(): void {
    if (!this.options.endDelay || !this.isActive) return;

    if (this.endEventTimeout) {
      window.clearTimeout(this.endEventTimeout);
    }

    this.endEventTimeout = window.setTimeout(() => {
      if (!this.isActive) return;

      const endEvent: ScrollEventData = {
        type: "end",
        timestamp: Date.now(),
        position: { x: 0, y: 0 },
        isScrolling: false,
      };

      this.endEventTimeout = undefined;
      this.handlers.forEach((handler) => handler(endEvent));
    }, this.options.endDelay);
  }

  private readonly handleWheel = (e: WheelEvent) => {
    if (!this.isActive) return;

    if (!this.options.passive) {
      e.preventDefault();
    }

    this.emit({
      type: "wheel",
      timestamp: Date.now(),
      position: { x: e.clientX, y: e.clientY },
      delta: { x: e.deltaX, y: e.deltaY },
      isScrolling: true,
    });
  };

  private readonly handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    this.lastTouchPosition = { x: touch.clientX, y: touch.clientY };
    this.emit({
      type: "touch",
      timestamp: Date.now(),
      position: this.lastTouchPosition,
      delta: { x: 0, y: 0 },
      isScrolling: true,
    });
  };

  private readonly handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !this.lastTouchPosition) return;

    const currentPosition = { x: touch.clientX, y: touch.clientY };
    const delta = {
      x: currentPosition.x - this.lastTouchPosition.x,
      y: currentPosition.y - this.lastTouchPosition.y,
    };

    this.lastTouchPosition = currentPosition;
    this.emit({
      type: "touch",
      timestamp: Date.now(),
      position: currentPosition,
      delta,
      isScrolling: true,
    });
  };

  private readonly handleTouchEnd = (e: TouchEvent) => {
    if (!this.lastTouchPosition) return;

    this.emit({
      type: "end",
      timestamp: Date.now(),
      position: this.lastTouchPosition,
      delta: { x: 0, y: 0 },
      isScrolling: false,
    });
    this.lastTouchPosition = null;
  };

  private readonly handleMouseDown = (e: MouseEvent) => {
    this.emit({
      type: "mouse",
      timestamp: Date.now(),
      position: { x: e.clientX, y: e.clientY },
      isScrolling: true,
    });
  };

  private readonly handleMouseMove = (e: MouseEvent) => {
    this.emit({
      type: "mouse",
      timestamp: Date.now(),
      position: { x: e.clientX, y: e.clientY },
      isScrolling: true,
    });
  };

  private readonly handleMouseUp = (e: MouseEvent) => {
    this.emit({
      type: "mouse",
      timestamp: Date.now(),
      position: { x: e.clientX, y: e.clientY },
      isScrolling: false,
    });
  };

  public updateConfig(options: EventHandlerOptions): void {
    this.stop();
    this.options = {
      passive: options.passive ?? this.options.passive,
      events: {
        wheel: options.events?.wheel ?? this.options.events.wheel,
        touch: options.events?.touch ?? this.options.events.touch,
        mouse: options.events?.mouse ?? this.options.events.mouse,
      },
      endDelay: options.endDelay ?? this.options.endDelay,
    };
    if (this.isActive) {
      this.start();
    }
  }
}
