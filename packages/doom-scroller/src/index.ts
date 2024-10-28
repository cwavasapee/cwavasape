/**
 * @fileoverview DoomScroller - A TypeScript library for tracking scroll, touch, and mouse gestures
 * @module DoomScroller
 * @description
 * The DoomScroller class provides a comprehensive solution for tracking and managing scroll,
 * touch, and mouse gestures in web applications. It offers features like smooth animations,
 * velocity tracking, direction detection, and step-based scrolling.
 *
 * Key features:
 * - Unified event handling for wheel, touch, and mouse events
 * - Configurable smoothing and velocity calculations
 * - Direction detection with customizable thresholds
 * - Step-based scrolling support
 * - Reactive subscription system
 * - Cross-browser compatibility
 *
 * @example
 * ```typescript
 * // Initialize with default options
 * const scroller = new DoomScroller();
 *
 * // Subscribe to scroll updates
 * scroller.subscribe((state) => {
 *   console.log('Current position:', state.position);
 *   console.log('Current velocity:', state.velocity);
 * });
 *
 * // Start tracking
 * scroller.start();
 * ```
 */

import { EventHandler } from "./core/eventHandler";
import { DataProcessor } from "./core/dataProcessor";
import { VelocityCalculator } from "./core/velocity";
import { SmoothingEngine } from "./core/smoothing";
import { DirectionDetector } from "./core/direction";
import { StepsManager } from "./core/steps";
import type { ScrollEventData, ScrollEventHandler } from "./types/events";
import type { Options, Vector2D, Direction, ScrollState } from "./types";

export class DoomScroller {
  /**
   * Normalized configuration options
   * @private
   * @readonly
   */
  private readonly options: Required<Options>;

  /**
   * Event handling system for managing DOM events
   * @private
   * @readonly
   */
  private readonly eventHandler: EventHandler;

  /**
   * Raw event data processor for normalizing input
   * @private
   * @readonly
   */
  private readonly dataProcessor: DataProcessor;

  /**
   * Velocity calculation system for tracking movement speed
   * @private
   * @readonly
   */
  private readonly velocityCalculator: VelocityCalculator;

  /**
   * Movement smoothing system for fluid animations
   * @private
   * @readonly
   */
  private readonly smoothingEngine: SmoothingEngine;

  /**
   * Direction detection system for movement analysis
   * @private
   * @readonly
   */
  private readonly directionDetector: DirectionDetector;

  /**
   * Step-based scrolling system for discrete movements
   * @private
   * @readonly
   */
  private readonly stepsManager: StepsManager;

  /**
   * Set of subscriber callbacks for state updates
   * @private
   * @readonly
   */
  private readonly subscribers: Set<(state: ScrollState) => void>;

  /**
   * ResizeObserver instance for viewport changes
   * @private
   * @readonly
   */
  private readonly resizeObserver: ResizeObserver;

  /**
   * Current active state of the scroller
   * @private
   */
  private isActive: boolean = false;

  /**
   * Last emitted scroll state
   * @private
   */
  private lastState: ScrollState;

  /**
   * End event timeout handle
   * @private
   */
  private endTimeout?: number;

  /**
   * Creates a new DoomScroller instance
   * @param {Options} [options={}] - Configuration options
   *
   * @example
   * ```typescript
   * // Create with default options
   * const basic = new DoomScroller();
   *
   * // Create with custom configuration
   * const custom = new DoomScroller({
   *   speedMultiplier: 1.5,
   *   smoothing: {
   *     active: true,
   *     factor: 0.2
   *   },
   *   steps: {
   *     active: true,
   *     movementThreshold: 100
   *   }
   * });
   * ```
   */
  constructor(options: Options = {}) {
    // Normalize options
    this.options = {
      speedMultiplier: options.speedMultiplier ?? 1,
      debounceTime: options.debounceTime ?? 150,
      events: {
        wheel: options.events?.wheel ?? true,
        touch: options.events?.touch ?? true,
        mouse: options.events?.mouse ?? false,
      },
      smoothing: {
        active: options.smoothing?.active ?? true,
        factor: options.smoothing?.factor ?? 0.2,
        threshold: options.smoothing?.threshold ?? 0.05,
        samples: options.smoothing?.samples ?? 5,
        algorithm: options.smoothing?.algorithm ?? "linear",
      },
      velocity: {
        min: options.velocity?.min ?? 0,
        max: options.velocity?.max ?? 1,
        algorithm: options.velocity?.algorithm ?? "linear",
      },
      direction: {
        threshold: options.direction?.threshold ?? 0.1,
        samples: options.direction?.samples ?? 5,
      },
      steps: {
        active: options.steps?.active ?? false,
        movementMode: options.steps?.movementMode ?? "absolute",
        movementThreshold: options.steps?.movementThreshold ?? 0,
        velocityThreshold: options.steps?.velocityThreshold ?? 0,
      },
      debug: options.debug ?? false,
    };

    // Initialize state and subscribers
    this.lastState = this.createInitialState();
    this.subscribers = new Set();

    // Initialize core components
    this.eventHandler = new EventHandler({
      passive: true,
      events: this.options.events,
      endDelay: this.options.debounceTime,
    });

    this.dataProcessor = new DataProcessor();
    this.velocityCalculator = new VelocityCalculator(this.options.velocity);
    this.smoothingEngine = new SmoothingEngine(this.options.smoothing);
    this.directionDetector = new DirectionDetector(this.options.direction);
    this.stepsManager = new StepsManager(this.options.steps);

    // Bind event handlers
    this.eventHandler.addHandler(this.handleEvent);
    this.resizeObserver = new ResizeObserver(this.handleResize);

    // Start viewport observation if in browser
    if (typeof window !== "undefined") {
      this.resizeObserver.observe(document.documentElement);
    }
  }

  /**
   * Starts tracking scroll events
   * @returns {void}
   *
   * @description
   * Begins tracking scroll, touch, and mouse events based on the configured options.
   * If the scroller is already active, this method has no effect.
   *
   * @example
   * ```typescript
   * const scroller = new DoomScroller();
   * scroller.start(); // Begin tracking events
   * ```
   */
  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.eventHandler.start();
  }

  /**
   * Stops tracking scroll events
   * @returns {void}
   *
   * @description
   * Stops tracking all events and cleans up internal state.
   * The scroller can be restarted by calling start() again.
   *
   * @example
   * ```typescript
   * scroller.stop(); // Stop tracking events
   * ```
   */
  public stop(): void {
    this.eventHandler.stop();
    this.resizeObserver.disconnect();
    this.isActive = false;
    this.reset();
  }

  /**
   * Subscribes to scroll state updates
   * @param {(state: ScrollState) => void} callback - Function to handle state updates
   * @returns {() => void} Unsubscribe function
   *
   * @description
   * Registers a callback function to receive scroll state updates. The callback will be
   * called immediately with the current state and then with each subsequent update.
   * Returns a function that can be called to unsubscribe.
   *
   * @example
   * ```typescript
   * const unsubscribe = scroller.subscribe((state) => {
   *   console.log('Position:', state.position);
   *   console.log('Velocity:', state.velocity);
   * });
   *
   * // Later: cleanup subscription
   * unsubscribe();
   * ```
   */
  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.lastState); // Emit initial state
    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribes from scroll events
   */
  public unsubscribe(callback: (state: ScrollState) => void): void {
    this.subscribers.delete(callback);
  }

  /**
   * Resets all internal state
   */
  public reset(): void {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    this.dataProcessor.reset();
    this.velocityCalculator.reset();
    this.smoothingEngine.reset();
    this.directionDetector.reset();
    this.stepsManager.reset();

    this.lastState = this.createInitialState();
    this.notifySubscribers(this.lastState);
  }

  /**
   * Cleans up all resources
   */
  public destroy(): void {
    this.stop();
    this.eventHandler.destroy();
    this.subscribers.clear();
    this.reset();
  }

  private handleEvent = (event: ScrollEventData): void => {
    if (!this.isActive) return;

    // Handle end events
    if (event.type === "end") {
      this.handleEventEnd();
      return;
    }

    // Process event data
    const { position, delta } = this.dataProcessor.process(event);

    // Scale movement
    const scaledDelta: Vector2D = {
      x: delta.x * this.options.speedMultiplier,
      y: delta.y * this.options.speedMultiplier,
    };

    // Apply smoothing
    const smoothedMovement = this.smoothingEngine.smooth(
      scaledDelta,
      "movement"
    );

    // Calculate velocity
    const rawVelocity = this.velocityCalculator.calculate(
      smoothedMovement,
      event.timestamp
    );
    const smoothedVelocity = this.smoothingEngine.smooth(
      rawVelocity,
      "velocity"
    );

    // Update steps if enabled
    const step = this.options.steps.active
      ? this.stepsManager.update(position, smoothedVelocity)
      : undefined;

    // Create new state
    const currentState: ScrollState = {
      isScrolling: true,
      viewport: this.getViewport(),
      position,
      movement: smoothedMovement,
      velocity: smoothedVelocity,
      direction: this.calculateDirection(position),
      step: step?.index,
      timestamp: event.timestamp,
    };

    // Update and notify
    this.lastState = currentState;
    this.notifySubscribers(currentState);
  };

  private handleEventEnd = (): void => {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
    }

    // Update state but keep tracking active
    this.lastState.isScrolling = false;
    this.notifySubscribers(this.lastState);

    // Schedule cleanup
    this.endTimeout = window.setTimeout(() => {
      // Reset processors
      this.dataProcessor.reset();
      this.velocityCalculator.reset();
      this.smoothingEngine.reset();
      this.directionDetector.reset();
      this.stepsManager.reset();

      // Create final state
      const finalState: ScrollState = {
        ...this.createInitialState(),
        position: this.lastState.position, // Preserve position
      };

      // Update and notify
      this.lastState = finalState;
      this.notifySubscribers(finalState);
    }, this.options.debounceTime);
  };

  private handleResize = (entries: ResizeObserverEntry[]): void => {
    const viewport = this.getViewport();
    this.notifySubscribers({
      ...this.lastState,
      viewport,
    });
  };

  private getViewport(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private calculateDirection(position: Vector2D): Direction {
    return this.directionDetector.update(position);
  }

  private createInitialState(): ScrollState {
    return {
      isScrolling: false,
      viewport: this.getViewport(),
      position: { x: 0, y: 0 },
      movement: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      timestamp: Date.now(),
    };
  }

  private notifySubscribers(data: ScrollState): void {
    this.subscribers.forEach((callback) => callback(data));
  }
}

// Export types
export type { Options, ScrollState, Vector2D, Direction };
export type { ScrollEventData, ScrollEventType } from "./types/events";
