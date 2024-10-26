/**
 * @file Main DoomScroller implementation
 * @module doom-scroller/scroller
 *
 * @description
 * The DoomScroller class provides a unified interface for handling both touch
 * and wheel-based scrolling with smooth animations, velocity calculations,
 * and directional tracking. It supports both mouse wheels and touch gestures
 * while maintaining natural touch interactions like tapping and short swipes.
 */

import type {
  ScrollConfig,
  ScrollState,
  ScrollTrackingState,
  TimePoint,
  TouchConfig,
  TouchTrackingData,
  Vector2D,
} from "../types";
import { InputHandler } from "./input-handler";
import { MovementProcessor } from "./movement-processor";

/**
 * Default configuration values for the DoomScroller
 * @internal
 */
const DEFAULT_CONFIG: ScrollConfig = {
  speedMultiplier: 1,
  smoothingFactor: 0.2,
  directionThreshold: 0.15,
  minVelocity: 0.1,
  maxVelocity: 50,
  sampleSize: 5,
  invertX: false,
  invertY: false,
  debounceTime: 200,
};

/**
 * Unified scroll handler for touch and wheel input with smooth animations
 *
 * @example
 * ```typescript
 * // Basic usage
 * const scroller = new DoomScroller();
 * scroller.init();
 *
 * // With custom config
 * const customScroller = new DoomScroller({
 *   speedMultiplier: 1.5,
 *   smoothingFactor: 0.3,
 *   invertY: true
 * });
 *
 * // Subscribe to scroll updates
 * const unsubscribe = scroller.subscribe((state) => {
 *   if (state.isScrolling) {
 *     console.log('Velocity:', state.velocity);
 *     console.log('Direction:', state.direction);
 *   }
 * });
 *
 * // Cleanup when done
 * scroller.destroy();
 * ```
 */
export class DoomScroller {
  private readonly config: ScrollConfig;
  private state: ScrollTrackingState;
  private touchActive: boolean = false;
  private animationFrame: number | null = null;
  private scrollTimeout: number | null = null;
  private subscribers = new Set<(state: ScrollState) => void>();

  /**
   * Touch-specific configuration
   * @internal
   */
  private readonly touchConfig: TouchConfig = {
    scrollThreshold: 10,
    tapThreshold: 200,
  };

  /**
   * Touch tracking data
   * @internal
   */
  private touchTrackingData: TouchTrackingData | null = null;

  /**
   * Creates a new DoomScroller instance
   *
   * @param config - Optional partial configuration to override defaults
   *
   * @example
   * ```typescript
   * // Default configuration
   * const scroller = new DoomScroller();
   *
   * // Custom configuration
   * const customScroller = new DoomScroller({
   *   speedMultiplier: 1.5,
   *   invertY: true
   * });
   * ```
   */
  constructor(config: Partial<ScrollConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Initializes event listeners for scroll and touch events
   *
   * @throws {Error} If not running in a browser environment
   *
   * @example
   * ```typescript
   * const scroller = new DoomScroller();
   * scroller.init(); // Start listening for events
   * ```
   */
  public init(): void {
    if (typeof window === "undefined") {
      throw new Error("Browser environment required");
    }

    window.addEventListener("wheel", this.handleInput, { passive: false });
    window.addEventListener("touchstart", this.handleTouchStart, {
      passive: true,
    });
    window.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", this.handleTouchEnd, { passive: true });
  }

  /**
   * Subscribes to scroll state updates
   *
   * @param callback - Function to call with scroll state updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = scroller.subscribe((state) => {
   *   console.log('Scroll velocity:', state.velocity);
   *   console.log('Scroll direction:', state.direction);
   * });
   *
   * // Later, to stop receiving updates:
   * unsubscribe();
   * ```
   */
  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Updates configuration at runtime
   *
   * @param config - Partial configuration to update
   *
   * @example
   * ```typescript
   * scroller.updateConfig({
   *   speedMultiplier: 2.0, // Double the speed
   *   smoothingFactor: 0.4  // More responsive, less smooth
   * });
   * ```
   */
  public updateConfig(config: Partial<ScrollConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Cleans up resources and removes event listeners
   *
   * @example
   * ```typescript
   * scroller.destroy(); // Remove listeners and stop animations
   * ```
   */
  public destroy(): void {
    window.removeEventListener("wheel", this.handleInput);
    window.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchmove", this.handleInput);
    window.removeEventListener("touchend", this.handleTouchEnd);

    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);

    this.subscribers.clear();
  }

  /**
   * Creates initial scroll tracking state
   * @internal
   */
  private createInitialState(): ScrollTrackingState {
    return {
      isScrolling: false,
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      delta: { x: 0, y: 0 },
      rawDelta: { x: 0, y: 0 },
      lastPoint: null,
      recentPoints: [],
    };
  }

  /**
   * Unified input handler for wheel and touch events
   * @internal
   */
  private handleInput = (event: WheelEvent | TouchEvent): void => {
    if (event instanceof WheelEvent) {
      event.preventDefault();
      const delta = this.getDelta(event);
      if (!delta) return;
      this.processMovement(delta, performance.now());
      return;
    }

    if (this.touchTrackingData?.isScrolling) {
      event.preventDefault();
      const delta = this.getDelta(event);
      if (!delta) return;
      this.processMovement(delta, performance.now());
    }
  };

  /**
   * Handles touch start events
   * @internal
   */
  private handleTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (!touch) return;

    this.touchTrackingData = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
      isScrolling: false,
    };

    this.touchActive = true;
    this.state.lastPoint = InputHandler.createTimePoint(
      touch.clientX,
      touch.clientY
    );
  };

  /**
   * Handles touch move events
   * @internal
   */
  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.touchTrackingData) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = Math.abs(touch.clientX - this.touchTrackingData.startX);
    const deltaY = Math.abs(touch.clientY - this.touchTrackingData.startY);

    if (
      deltaX > this.touchConfig.scrollThreshold ||
      deltaY > this.touchConfig.scrollThreshold
    ) {
      this.touchTrackingData.isScrolling = true;
    }

    if (this.touchTrackingData.isScrolling) {
      event.preventDefault();
      const delta = this.getDelta(event);
      if (delta) {
        this.processMovement(delta, performance.now());
      }
    }
  };

  /**
   * Handles touch end events
   * @internal
   */
  private handleTouchEnd = (): void => {
    if (!this.touchTrackingData) return;

    this.touchActive = false;
    this.touchTrackingData = null;
    this.endScroll();
  };

  /**
   * Gets movement delta from input event
   * @internal
   */
  private getDelta(event: WheelEvent | TouchEvent): Vector2D | null {
    if (event instanceof WheelEvent) {
      return InputHandler.normalizeWheel(
        event,
        this.config.speedMultiplier,
        this.config.invertX,
        this.config.invertY
      );
    }

    if (this.touchActive && this.state.lastPoint) {
      const touch = event.touches[0];
      if (!touch) return null;

      const delta = InputHandler.processTouch(
        touch,
        this.state.lastPoint,
        this.config.speedMultiplier,
        this.config.invertX,
        this.config.invertY
      );

      this.state.lastPoint = InputHandler.createTimePoint(
        touch.clientX,
        touch.clientY
      );

      return delta;
    }

    return null;
  }

  /**
   * Processes movement and updates scroll state
   *
   * @param delta - Movement delta vector
   * @param timestamp - Current timestamp
   * @internal
   *
   * @remarks
   * This method handles:
   * - Capping movement values
   * - Updating recent points for velocity calculation
   * - Calculating new velocity
   * - Updating movement direction
   * - Applying smoothing
   * - Notifying subscribers
   */
  private processMovement(delta: Vector2D, timestamp: number): void {
    const cappedDelta = {
      x: MovementProcessor.capValue(delta.x, this.config.maxVelocity),
      y: MovementProcessor.capValue(delta.y, this.config.maxVelocity),
    };

    const timePoint: TimePoint = {
      ...cappedDelta,
      timestamp,
    };

    // Create a new array instead of mutating
    const newPoints = [...this.state.recentPoints, timePoint];
    this.state = {
      ...this.state,
      recentPoints: newPoints.slice(-this.config.sampleSize),
    };

    this.state.velocity = MovementProcessor.calculateVelocity(
      this.state.recentPoints,
      this.config.maxVelocity
    );

    this.state.direction = MovementProcessor.updateDirection(
      cappedDelta,
      this.config.directionThreshold
    );

    this.state.delta = MovementProcessor.smoothDelta(
      cappedDelta,
      this.state.delta,
      this.config.smoothingFactor
    );

    this.state.rawDelta = cappedDelta;
    this.state.isScrolling = true;

    this.notifySubscribers();
    this.scheduleScrollEnd();

    if (!this.animationFrame) {
      this.startAnimation();
    }
  }

  /**
   * Starts the animation loop for smooth scrolling
   * @internal
   *
   * @remarks
   * Uses requestAnimationFrame to provide smooth animation updates
   * to subscribers at screen refresh rate
   */
  private startAnimation(): void {
    const animate = (): void => {
      this.animationFrame = requestAnimationFrame(animate);
      this.notifySubscribers();
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Schedules scroll end detection
   * @internal
   *
   * @remarks
   * Uses debounce pattern to detect when scrolling has stopped
   * Based on the configured debounceTime
   */
  private scheduleScrollEnd(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = window.setTimeout(
      () => this.endScroll(),
      this.config.debounceTime
    ) as unknown as number;
  }

  /**
   * Ends scroll interaction and resets state
   * @internal
   *
   * @remarks
   * This method:
   * - Cancels any ongoing animation
   * - Resets scroll state to initial values
   * - Notifies subscribers of the state change
   */
  private endScroll(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    Object.assign(this.state, this.createInitialState());
    this.notifySubscribers();
  }

  /**
   * Notifies subscribers of state changes
   * @internal
   *
   * @remarks
   * Creates a clean public state object without internal tracking data
   * before notifying subscribers
   */
  private notifySubscribers(): void {
    const publicState: ScrollState = {
      isScrolling: this.state.isScrolling,
      velocity: { ...this.state.velocity },
      direction: { ...this.state.direction },
      delta: { ...this.state.delta },
      rawDelta: { ...this.state.rawDelta },
    };

    for (const subscriber of this.subscribers) {
      subscriber(publicState);
    }
  }
}
