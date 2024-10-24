import type { DoomScrollerOptions, ScrollState, DirectionState } from "./types";
import { DirectionDetector } from "./direction-detector";

/**
 * Smooth scroll detection and velocity tracking for advanced scroll-based interactions.
 *
 * The DoomScroller class provides a framework for handling scroll events with:
 * - Immediate direction detection
 * - Smooth velocity tracking
 * - Delta normalization
 * - Configurable sensitivity and smoothing
 *
 * @example
 * ```typescript
 * // Basic usage
 * const scroller = new DoomScroller();
 * scroller.init();
 *
 * scroller.subscribe(state => {
 *   console.log('Scroll direction:', state.direction);
 *   console.log('Scroll velocity:', state.velocity);
 * });
 *
 * // Cleanup when done
 * scroller.destroy();
 *
 * // With custom options
 * const customScroller = new DoomScroller({
 *   smoothingFactor: 0.2,    // Lower = smoother but more latency
 *   speedMultiplier: 1.5,    // Higher = more sensitive
 *   directionThreshold: 0.1  // Lower = more responsive to direction changes
 * });
 * ```
 */
export class DoomScroller {
  /**
   * Default configuration options for the DoomScroller instance.
   * @internal
   */
  private static readonly DEFAULT_OPTIONS: Required<DoomScrollerOptions> = {
    /** Base scroll speed multiplier */
    speedMultiplier: 1,
    /** Number of samples to keep for calculations */
    sampleSize: 5,
    /** Minimum velocity to register movement */
    minVelocity: 0.1,
    /** Threshold for direction changes */
    directionThreshold: 0.15,
    /** Smoothing factor (0-1, lower = smoother) */
    smoothingFactor: 0.2,
    /** Time in ms to wait before ending scroll */
    debounceTime: 150,
  };

  private readonly options: Required<DoomScrollerOptions>;
  private readonly directionDetector: DirectionDetector;
  private readonly subscribers: Set<(state: ScrollState) => void>;

  private animationFrame: number | null;
  private scrollTimeout: number | null;
  private lastEventTime: number;
  private initialized: boolean;

  // Smooth value tracking
  private smoothDelta: { x: number; y: number };
  private smoothVelocity: { x: number; y: number };
  private previousDelta: { x: number; y: number };

  // Immediate direction tracking
  private lastRawDelta: { x: number; y: number };
  private lastDirection: DirectionState;

  // Current state
  private state: ScrollState;

  /**
   * Creates a new DoomScroller instance.
   * Note: Call {@link init} after creating the instance to start scroll detection.
   *
   * @param options - Configuration options for customizing scroll behavior
   */
  constructor(options: Partial<DoomScrollerOptions> = {}) {
    this.options = { ...DoomScroller.DEFAULT_OPTIONS, ...options };
    this.directionDetector = new DirectionDetector(
      this.options.directionThreshold,
      this.options.smoothingFactor
    );

    // Initialize instance variables
    this.subscribers = new Set();
    this.animationFrame = null;
    this.scrollTimeout = null;
    this.lastEventTime = 0;
    this.initialized = false;

    // Initialize tracking values
    this.smoothDelta = { x: 0, y: 0 };
    this.smoothVelocity = { x: 0, y: 0 };
    this.previousDelta = { x: 0, y: 0 };
    this.lastRawDelta = { x: 0, y: 0 };
    this.lastDirection = { x: "none", y: "none" };

    // Initialize state
    this.state = {
      isScrolling: false,
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      delta: { x: 0, y: 0 },
      rawScroll: { x: 0, y: 0 },
    };
  }

  /**
   * Checks if the current environment is a browser with required features
   * @internal
   */
  private isBrowserEnvironment(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function" &&
      typeof window.removeEventListener === "function" &&
      typeof window.requestAnimationFrame === "function" &&
      typeof performance?.now === "function"
    );
  }

  /**
   * Initializes the scroll detection system.
   * Must be called after construction and in a browser environment.
   *
   * @throws {Error} If called in a non-browser environment or already initialized
   */
  public init(): void {
    if (!this.isBrowserEnvironment()) {
      throw new Error(
        "DoomScroller requires a browser environment with DOM support"
      );
    }

    if (this.initialized) {
      throw new Error("DoomScroller is already initialized");
    }

    try {
      window.addEventListener("wheel", this.handleWheel, { passive: false });
      this.initialized = true;
    } catch (error) {
      throw new Error(
        "Failed to initialize DoomScroller: " + (error as Error).message
      );
    }
  }

  /**
   * Updates direction based on raw input for immediate feedback
   * @internal
   */
  private getImmediateDirection(rawDelta: {
    x: number;
    y: number;
  }): DirectionState {
    const threshold = this.options.directionThreshold;

    return {
      x:
        Math.abs(rawDelta.x) < threshold
          ? this.lastDirection.x
          : rawDelta.x > 0
            ? "right"
            : "left",
      y:
        Math.abs(rawDelta.y) < threshold
          ? this.lastDirection.y
          : rawDelta.y > 0
            ? "down"
            : "up",
    };
  }

  /**
   * Processes immediate movement updates before smoothing
   * @internal
   */
  private processImmediateUpdate(rawDelta: { x: number; y: number }): void {
    const newDirection = this.getImmediateDirection(rawDelta);

    if (
      Math.abs(rawDelta.x) > this.options.directionThreshold ||
      Math.abs(rawDelta.y) > this.options.directionThreshold
    ) {
      this.state.direction = newDirection;
      this.lastDirection = newDirection;
    }
  }

  /**
   * Applies exponential smoothing to a single value
   * @internal
   */
  private smooth(current: number, previous: number): number {
    return (
      this.options.smoothingFactor * current +
      (1 - this.options.smoothingFactor) * previous
    );
  }

  /**
   * Applies smoothing to a 2D vector
   * @internal
   */
  private smoothVector(
    current: { x: number; y: number },
    previous: { x: number; y: number }
  ): { x: number; y: number } {
    return {
      x: this.smooth(current.x, previous.x),
      y: this.smooth(current.y, previous.y),
    };
  }

  /**
   * Normalizes wheel event delta values across different browsers and input methods
   * @internal
   */
  private normalizeWheelDelta(event: WheelEvent): { x: number; y: number } {
    let { deltaX, deltaY } = event;

    switch (event.deltaMode) {
      case 1: // LINE mode
        deltaX *= 16;
        deltaY *= 16;
        break;
      case 2: // PAGE mode
        deltaX *= 100;
        deltaY *= 100;
        break;
    }

    return {
      x: deltaX * this.options.speedMultiplier,
      y: deltaY * this.options.speedMultiplier,
    };
  }

  /**
   * Handles wheel events and initiates scroll state updates
   * @internal
   */
  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const rawDelta = this.normalizeWheelDelta(event);
    const timestamp = performance.now();

    // Handle immediate direction update
    this.processImmediateUpdate(rawDelta);

    // Store raw values
    this.state.rawScroll = rawDelta;
    this.lastRawDelta = rawDelta;

    // Apply smoothing to delta for velocity calculations
    this.smoothDelta = this.smoothVector(rawDelta, this.previousDelta);
    this.previousDelta = this.smoothDelta;

    if (!this.state.isScrolling) {
      this.state.isScrolling = true;
      this.lastEventTime = timestamp;
      this.startAnimation();
    }

    // Notify subscribers immediately for direction changes
    this.notifySubscribers();
    this.scheduleScrollEnd();
  };

  /**
   * Schedules the end of scroll detection after inactivity
   * @internal
   */
  private scheduleScrollEnd(): void {
    if (!this.isBrowserEnvironment()) return;

    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = window.setTimeout(
      () => this.endScroll(),
      this.options.debounceTime
    );
  }

  /**
   * Handles cleanup when scrolling ends
   * @internal
   */
  private endScroll(): void {
    this.state.isScrolling = false;
    this.directionDetector.reset();

    // Reset smooth values
    this.smoothDelta = { x: 0, y: 0 };
    this.smoothVelocity = { x: 0, y: 0 };
    this.previousDelta = { x: 0, y: 0 };

    // Reset immediate tracking
    this.lastRawDelta = { x: 0, y: 0 };
    this.lastDirection = { x: "none", y: "none" };

    if (this.animationFrame !== null && this.isBrowserEnvironment()) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Reset state
    this.state.delta = { x: 0, y: 0 };
    this.state.velocity = { x: 0, y: 0 };
    this.state.direction = { x: "none", y: "none" };
    this.state.rawScroll = { x: 0, y: 0 };

    this.notifySubscribers();
  }

  /**
   * Starts the animation loop for continuous state updates
   * @internal
   */
  private startAnimation(): void {
    if (!this.isBrowserEnvironment()) return;

    const animate = (): void => {
      if (!this.state.isScrolling) return;

      this.updateState();
      this.notifySubscribers();

      if (this.isBrowserEnvironment()) {
        this.animationFrame = window.requestAnimationFrame(animate);
      }
    };

    this.animationFrame = window.requestAnimationFrame(animate);
  }

  /**
   * Updates the current scroll state with latest calculations
   * @internal
   */
  private updateState(): void {
    this.state.delta = this.smoothDelta;

    const now = performance.now();
    const timeDelta = now - this.lastEventTime;
    this.lastEventTime = now;

    if (timeDelta > 0) {
      const instantVelocity = {
        x: this.smoothDelta.x / timeDelta,
        y: this.smoothDelta.y / timeDelta,
      };

      this.smoothVelocity = this.smoothVector(
        instantVelocity,
        this.smoothVelocity
      );
      this.state.velocity = this.smoothVelocity;
    }
  }

  /**
   * Notifies all subscribers of the current state
   * @internal
   */
  private notifySubscribers(): void {
    const stateCopy: ScrollState = { ...this.state };
    for (const subscriber of this.subscribers) {
      subscriber(stateCopy);
    }
  }

  /**
   * Subscribes to scroll state updates.
   * The callback will be invoked with the current scroll state whenever it changes.
   *
   * @param callback - Function to be called with scroll state updates
   * @returns Function to remove the subscription
   */
  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Cleans up all resources and event listeners.
   * Should be called when the scroller is no longer needed.
   */
  public destroy(): void {
    if (!this.initialized) return;

    if (this.isBrowserEnvironment()) {
      try {
        window.removeEventListener("wheel", this.handleWheel);

        if (this.animationFrame !== null) {
          window.cancelAnimationFrame(this.animationFrame);
          this.animationFrame = null;
        }

        if (this.scrollTimeout !== null) {
          window.clearTimeout(this.scrollTimeout);
          this.scrollTimeout = null;
        }
      } catch (error) {
        console.warn("Error during DoomScroller cleanup:", error);
      }
    }

    this.subscribers.clear();
    this.initialized = false;
  }
}
