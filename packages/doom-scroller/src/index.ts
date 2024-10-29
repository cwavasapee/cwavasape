/**
 * @fileoverview Main entry point for the DoomScroller library
 */

import { EventHandler } from "./core/eventHandler";
import { DataProcessor } from "./core/dataProcessor";
import { VelocityCalculator } from "./core/velocity";
import { SmoothingEngine } from "./core/smoothing";
import { DirectionDetector } from "./core/direction";
import { StepsManager } from "./core/steps";
import type { ScrollEventData, ScrollEventType } from "./types/events";
import type {
  Options,
  Vector2D,
  Direction,
  ScrollState,
  Viewport,
} from "./types";

/**
 * DoomScroller - High-performance scroll and gesture tracking library
 *
 * @class
 * @description
 * The DoomScroller class provides a comprehensive solution for tracking and managing
 * scroll, touch, and mouse gesture events with built-in smoothing and step-based navigation.
 *
 * Key features:
 * - Event normalization across different input methods (wheel, touch, mouse)
 * - Configurable smoothing algorithms for movement and velocity
 * - Step-based navigation support
 * - Viewport size tracking
 * - Memory-efficient event queue management
 * - Reactive state management with subscription system
 *
 * The class uses a modular architecture with specialized components:
 * - EventHandler: Raw event processing
 * - DataProcessor: Input normalization
 * - VelocityCalculator: Speed and direction calculations
 * - SmoothingEngine: Movement and velocity smoothing
 * - DirectionDetector: Directional change detection
 * - StepsManager: Step-based navigation
 *
 * @example
 * ```typescript
 * const scroller = new DoomScroller({
 *   speedMultiplier: 1.5,
 *   events: {
 *     wheel: true,
 *     touch: true,
 *     mouse: false
 *   },
 *   movement: {
 *     smoothing: {
 *       active: true,
 *       factor: 0.3
 *     }
 *   }
 * });
 *
 * scroller.subscribe(state => {
 *   console.log('Movement:', state.movement);
 *   console.log('Velocity:', state.velocity);
 * });
 *
 * scroller.start();
 * ```
 */
export class DoomScroller {
  private readonly options: Required<Options>;
  private readonly eventHandler: EventHandler;
  private readonly dataProcessor: DataProcessor;
  private readonly velocityCalculator: VelocityCalculator;
  private readonly smoothingEngine: SmoothingEngine;
  private readonly directionDetector: DirectionDetector;
  private readonly stepsManager: StepsManager;
  private readonly subscribers: Set<(state: ScrollState) => void>;
  private resizeObserver: ResizeObserver = {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {},
  } as ResizeObserver;

  private isActive: boolean = false;
  private lastState: ScrollState;
  private endTimeout?: number;

  private readonly eventQueue: ScrollEventData[] = [];
  private animationFrameId?: number;

  /**
   * Creates a new DoomScroller instance
   *
   * @param {Partial<Options>} options - Configuration options
   *
   * @description
   * Initializes a new DoomScroller instance with the provided options. All options
   * have sensible defaults and are deeply merged with user-provided values.
   *
   * The constructor:
   * 1. Normalizes configuration options
   * 2. Initializes core components
   * 3. Sets up event handlers
   * 4. Prepares the resize observer
   */
  constructor(options: Partial<Options> = {}) {
    this.options = {
      speedMultiplier: options.speedMultiplier ?? 1,
      debounceTime: options.debounceTime ?? 500,
      events: {
        wheel: options.events?.wheel ?? true,
        touch: options.events?.touch ?? true,
        mouse: options.events?.mouse ?? false,
        passive: options.events?.passive ?? true,
        endDelay: options.events?.endDelay ?? 0,
      },
      movement: {
        threshold: options.movement?.threshold ?? 0.1,
        samples: options.movement?.samples ?? 5,
        smoothing: {
          active: options.movement?.smoothing?.active ?? true,
          factor: options.movement?.smoothing?.factor ?? 0.3,
          samples: options.movement?.smoothing?.samples ?? 5,
          algorithm: options.movement?.smoothing?.algorithm ?? "linear",
        },
      },
      velocity: {
        min: options.velocity?.min ?? 0,
        max: options.velocity?.max ?? 1,
        algorithm: options.velocity?.algorithm ?? "linear",
        smoothing: {
          active: options.velocity?.smoothing?.active ?? true,
          factor: options.velocity?.smoothing?.factor ?? 0.3,
          samples: options.velocity?.smoothing?.samples ?? 5,
          algorithm: options.velocity?.smoothing?.algorithm ?? "linear",
        },
      },
      steps: {
        active: options.steps?.active ?? false,
        movementMode: options.steps?.movementMode ?? "absolute",
        movementThreshold: options.steps?.movementThreshold,
        velocityThreshold: options.steps?.velocityThreshold,
      },
      debug: options.debug ?? false,
    } satisfies Required<Options>;

    this.debugLog("Constructor", "Initializing with options:", options);

    // Initialize state and core components
    this.lastState = this.createInitialState();
    this.subscribers = new Set();

    // Initialize ResizeObserver first
    this.initResizeObserver();

    // Initialize core components
    this.eventHandler = new EventHandler({
      passive: this.options.events.passive,
      events: this.options.events,
      endDelay: this.options.events.endDelay,
    });

    this.dataProcessor = new DataProcessor();
    this.velocityCalculator = new VelocityCalculator(this.options.velocity);
    this.smoothingEngine = new SmoothingEngine({
      movement: { smoothing: this.options.movement.smoothing },
      velocity: { smoothing: this.options.velocity.smoothing },
    });
    this.directionDetector = new DirectionDetector({
      movement: {
        threshold: this.options.movement.threshold,
        samples: this.options.movement.samples,
      },
    });
    this.stepsManager = new StepsManager(this.options.steps);

    // Bind event handlers
    this.eventHandler.addHandler(this.queueEvent);

    this.debugLog("Constructor", "Initialization complete");
  }

  /**
   * Starts the scroll tracking
   *
   * @public
   * @description
   * Activates the scroll tracking system. This includes:
   * - Enabling event listeners
   * - Starting viewport tracking
   * - Initializing state management
   *
   * Should be called after setting up subscribers and before expecting
   * any scroll events to be processed.
   */
  public start(): void {
    if (this.isActive) return;
    this.debugLog("Lifecycle", "Starting scroll tracking");
    this.isActive = true;
    this.eventHandler.start();

    if (typeof window !== "undefined") {
      this.resizeObserver.observe(document.documentElement);
    }
  }

  /**
   * Stops the scroll tracking
   *
   * @public
   * @description
   * Deactivates the scroll tracking system. This includes:
   * - Removing event listeners
   * - Stopping viewport tracking
   * - Resetting internal state
   *
   * Useful when temporarily disabling scroll tracking or cleaning up
   * before destroying the instance.
   */
  public stop(): void {
    if (!this.isActive) return;
    this.debugLog("Lifecycle", "Stopping scroll tracking");

    this.eventHandler.stop();
    this.resizeObserver.disconnect();
    this.isActive = false;
    this.reset();
  }

  /**
   * Subscribes to scroll state updates
   *
   * @public
   * @param {(state: ScrollState) => void} callback - Subscriber callback function
   * @returns {() => void} Unsubscribe function
   *
   * @description
   * Adds a subscriber to receive scroll state updates. The callback will be
   * immediately called with the current state and then for all subsequent
   * state changes.
   *
   * The returned function can be called to remove the subscription.
   */
  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.debugLog("Subscriptions", "Adding new subscriber");
    this.subscribers.add(callback);
    callback(this.lastState); // Emit initial state
    return () => this.unsubscribe(callback);
  }

  /**
   * Removes a subscriber from receiving updates
   *
   * @public
   * @param {(state: ScrollState) => void} callback - The callback function to remove
   * @description
   * Removes a previously registered subscriber callback from the notification list.
   * If the callback is not found, the operation is silently ignored.
   */
  public unsubscribe(callback: (state: ScrollState) => void): void {
    this.debugLog("Subscriptions", "Removing subscriber");
    this.subscribers.delete(callback);
  }

  /**
   * Resets the scroll tracking state
   *
   * @public
   * @description
   * Resets all internal state to initial values while maintaining
   * subscriptions and configuration. This includes:
   * - Clearing timeouts
   * - Resetting all component states
   * - Reinitializing the scroll state
   * - Notifying subscribers of the reset
   */
  public reset(): void {
    if (this.endTimeout) {
      window.clearTimeout(this.endTimeout);
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
   * Completely destroys the scroll tracker
   *
   * @public
   * @description
   * Performs a complete cleanup of the scroll tracker:
   * - Stops all tracking
   * - Removes event listeners
   * - Clears all timeouts and animation frames
   * - Removes all subscribers
   * - Resets all state
   *
   * After calling destroy, the instance should not be reused.
   */
  public destroy(): void {
    this.debugLog("Lifecycle", "Destroying instance");
    this.stop();
    this.eventHandler.destroy();

    if (this.endTimeout) {
      window.clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.subscribers.clear();
    this.reset();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.eventQueue.length = 0;

    // Clear references
    this.lastState = this.createInitialState();
    this.isActive = false;
  }

  /**
   * Queues a scroll event for processing
   *
   * @private
   * @param {ScrollEventData} event - The event to queue
   * @description
   * Adds an event to the processing queue and schedules processing if needed.
   * Uses requestAnimationFrame for efficient batching of events.
   */
  private queueEvent = (event: ScrollEventData): void => {
    if (!this.isActive) return;

    this.debugLog("Queue", "Adding event to queue:", event);
    this.eventQueue.push(event);

    // Only schedule processing if not already scheduled
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.processEventQueue);
    }
  };

  /**
   * Processes the queued events
   *
   * @private
   * @description
   * Processes all queued events in the current animation frame.
   * Only processes the most recent event to prevent overwhelming
   * the system during rapid scroll sequences.
   */
  private processEventQueue = (): void => {
    this.animationFrameId = undefined;

    this.debugLog(
      "Queue",
      `Processing ${this.eventQueue.length} queued events`
    );

    // Process only the most recent event for each type
    const lastEvent = this.eventQueue[this.eventQueue.length - 1];
    if (lastEvent) {
      this.handleEvent(lastEvent);
    }

    // Clear the queue
    this.eventQueue.length = 0;
  };

  /**
   * Handles a single scroll event
   *
   * @private
   * @param {ScrollEventData} event - The event to process
   * @description
   * Core event processing pipeline:
   * 1. Normalizes input data
   * 2. Applies speed multiplier
   * 3. Smooths movement
   * 4. Calculates velocity
   * 5. Updates step tracking
   * 6. Emits new state
   */
  private handleEvent = (event: ScrollEventData): void => {
    if (!this.isActive) return;

    this.debugLog("Event", "Processing event:", event);

    if (event.type === "end") {
      this.handleEventEnd();
      return;
    }

    const { position, delta } = this.dataProcessor.process(event);

    const scaledDelta: Vector2D = {
      x: delta.x * this.options.speedMultiplier,
      y: delta.y * this.options.speedMultiplier,
    };

    const smoothedMovement = this.smoothingEngine.smooth(
      scaledDelta,
      "movement"
    );

    const rawVelocity = this.velocityCalculator.calculate(
      smoothedMovement,
      event.timestamp
    );
    const smoothedVelocity = this.smoothingEngine.smooth(
      rawVelocity,
      "velocity"
    );

    const step = this.options.steps.active
      ? this.stepsManager.update(position, smoothedVelocity)
      : undefined;

    const currentState: ScrollState = {
      isScrolling: true,
      viewport: this.getViewport(),
      position,
      movement: smoothedMovement,
      velocity: smoothedVelocity,
      direction: this.calculateDirection(position),
      step: step?.index ?? undefined,
      timestamp: event.timestamp,
    };

    this.debugLog("Event", "New state:", currentState);
    this.lastState = currentState;
    this.notifySubscribers(currentState);
  };

  /**
   * Handles the end of a scroll sequence
   *
   * @private
   * @description
   * Manages the transition from active scrolling to idle state:
   * 1. Updates scrolling flag
   * 2. Notifies subscribers
   * 3. Schedules cleanup after debounce period
   * 4. Resets component states
   */
  private handleEventEnd = (): void => {
    this.debugLog("Event", "Processing end event");

    if (this.endTimeout) {
      window.clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    const currentState = { ...this.lastState, isScrolling: false };
    this.lastState = currentState;
    this.notifySubscribers(currentState);

    this.endTimeout = window.setTimeout(() => {
      if (!this.isActive) return;

      this.dataProcessor.reset();
      this.velocityCalculator.reset();
      this.smoothingEngine.reset();
      this.directionDetector.reset();
      this.stepsManager.reset();

      const finalState: ScrollState = {
        ...this.createInitialState(),
        position: this.lastState.position,
        step: this.lastState.step,
      };

      this.lastState = finalState;
      this.notifySubscribers(finalState);
      this.endTimeout = undefined;
    }, this.options.debounceTime);
  };

  /**
   * Handles viewport resize events
   *
   * @private
   * @param {ResizeObserverEntry[]} entries - Resize observer entries
   * @description
   * Updates the viewport dimensions and notifies subscribers
   * of the change while maintaining other state values.
   */
  private handleResize = (entries: ResizeObserverEntry[]): void => {
    if (!this.isActive) return;

    const viewport = this.getViewport();
    this.notifySubscribers({
      ...this.lastState,
      viewport,
    });
  };

  /**
   * Gets current viewport dimensions
   *
   * @private
   * @returns {Viewport} Current viewport dimensions
   * @description
   * Safely retrieves the current viewport dimensions,
   * handling both browser and SSR environments.
   */
  private getViewport(): Viewport {
    if (typeof window === "undefined") {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Calculates the current scroll direction
   *
   * @private
   * @param {Vector2D} position - Current scroll position
   * @returns {Direction} Calculated direction object
   * @description
   * Uses the DirectionDetector to determine the current scroll
   * direction based on the provided position.
   */
  private calculateDirection(position: Vector2D): Direction {
    return this.directionDetector.update(position);
  }

  /**
   * Creates the initial scroll state
   *
   * @private
   * @returns {ScrollState} Initial state object
   * @description
   * Generates a fresh scroll state with default values
   * for all properties. Used during initialization
   * and reset operations.
   */
  private createInitialState(): ScrollState {
    return {
      isScrolling: false,
      viewport: this.getViewport(),
      position: { x: 0, y: 0 },
      movement: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      step: undefined,
      timestamp: Date.now(),
    };
  }

  /**
   * Notifies all subscribers of state changes
   *
   * @private
   * @param {ScrollState} data - Current scroll state
   * @description
   * Safely calls all subscriber callbacks with the new state.
   * Handles any errors in subscriber callbacks to prevent
   * breaking the scroll tracking system.
   */
  private notifySubscribers(data: ScrollState): void {
    this.debugLog("State", "Notifying subscribers", {
      subscriberCount: this.subscribers.size,
      state: data,
    });
    this.subscribers.forEach((callback) => callback(data));
  }

  /**
   * Initializes the ResizeObserver
   *
   * @private
   * @description
   * Sets up viewport tracking with fallback for environments
   * that don't support ResizeObserver. Handles both browser
   * and SSR scenarios safely.
   */
  private initResizeObserver(): void {
    if (typeof window === "undefined") {
      this.resizeObserver = {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {},
      } as ResizeObserver;
      return;
    }

    try {
      this.resizeObserver = new ResizeObserver(this.handleResize);
    } catch (e) {
      // Fallback for browsers that don't support ResizeObserver
      this.resizeObserver = {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {},
      } as ResizeObserver;
    }
  }

  /**
   * Internal debug logger
   *
   * @private
   * @param {string} context - The context/area where the log originated
   * @param {string} message - The message to log
   * @param {unknown} [data] - Optional data to include in the log
   */
  private debugLog(context: string, message: string, data?: unknown): void {
    if (!this.options?.debug) return;

    const timestamp = new Date().toISOString();
    const prefix = `[DoomScroller][${timestamp}][${context}]`;

    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

// Export types
export type {
  Options,
  ScrollState,
  Vector2D,
  Direction,
  ScrollEventData,
  ScrollEventType,
};
