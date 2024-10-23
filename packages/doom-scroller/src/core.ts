import type { DoomScrollerOptions, ScrollState, DirectionState } from "./types";
import { DirectionDetector } from "./direction-detector";

/**
 * DoomScroller main class that handles scroll detection and state management
 * @example
 * ```typescript
 * const scroller = new DoomScroller({
 *   speedMultiplier: 1.2,
 *   directionThreshold: 0.2
 * });
 *
 * scroller.subscribe((state) => {
 *   console.log('Direction:', state.direction);
 *   console.log('Velocity:', state.velocity);
 * });
 * ```
 */
export class DoomScroller {
  private options: Required<DoomScrollerOptions>;
  private scrollState: ScrollState;
  private rafId: number | null = null;
  private listeners: Set<(state: ScrollState) => void> = new Set();
  private directionDetector: DirectionDetector;
  private scrollEndTimeout: number | null = null;
  private scrollBuffer: Array<{ x: number; y: number; timestamp: number }> = [];
  private readonly bufferSize = 5;
  private lastTimestamp: number = 0;

  /**
   * Creates a new DoomScroller instance
   * @param options - Configuration options for the scroller
   */
  constructor(options: DoomScrollerOptions = {}) {
    this.options = {
      speedMultiplier: options.speedMultiplier ?? 1,
      sampleSize: options.sampleSize ?? 5,
      minVelocity: options.minVelocity ?? 0.1,
      directionThreshold: options.directionThreshold ?? 0.15,
      smoothingFactor: options.smoothingFactor ?? 0.3,
      debounceTime: options.debounceTime ?? 150,
    };

    this.directionDetector = new DirectionDetector(
      this.options.directionThreshold,
      this.options.smoothingFactor
    );

    this.scrollState = {
      isScrolling: false,
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      delta: { x: 0, y: 0 },
      rawScroll: { x: 0, y: 0 },
    };

    this.init();
  }

  /**
   * Initializes event listeners
   * @internal
   */
  private init(): void {
    window.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  /**
   * Adds a new delta measurement to the smoothing buffer
   * @internal
   */
  private addToBuffer(
    delta: { x: number; y: number },
    timestamp: number
  ): void {
    this.scrollBuffer.push({ ...delta, timestamp });
    if (this.scrollBuffer.length > this.bufferSize) {
      this.scrollBuffer.shift();
    }
  }

  /**
   * Calculates smoothed delta values from the buffer
   * @internal
   */
  private calculateSmoothedDelta(): { x: number; y: number } {
    if (this.scrollBuffer.length === 0) return { x: 0, y: 0 };

    let totalWeight = 0;
    const smoothedDelta = this.scrollBuffer.reduce(
      (acc, curr, index) => {
        const weight = index + 1;
        totalWeight += weight;
        return {
          x: acc.x + curr.x * weight,
          y: acc.y + curr.y * weight,
        };
      },
      { x: 0, y: 0 }
    );

    return {
      x: smoothedDelta.x / totalWeight,
      y: smoothedDelta.y / totalWeight,
    };
  }

  /**
   * Normalizes wheel event delta values across different browsers
   * @internal
   */
  private normalizeWheelDelta(e: WheelEvent): { x: number; y: number } {
    let { deltaX, deltaY } = e;

    switch (e.deltaMode) {
      case 1: // DOM_DELTA_LINE
        deltaX *= 16;
        deltaY *= 16;
        break;
      case 2: // DOM_DELTA_PAGE
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
   * Handles wheel events and updates scroll state
   * @internal
   */
  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const normalizedDelta = this.normalizeWheelDelta(e);
    const timestamp = Date.now();

    this.addToBuffer(normalizedDelta, timestamp);
    this.scrollState.rawScroll = normalizedDelta;

    if (!this.scrollState.isScrolling) {
      this.scrollState.isScrolling = true;
      this.startAnimation();
    }

    this.handleScrollEnd();
  };

  /**
   * Handles scroll end detection and cleanup
   * @internal
   */
  private handleScrollEnd = (): void => {
    if (this.scrollEndTimeout) {
      window.clearTimeout(this.scrollEndTimeout);
    }

    this.scrollEndTimeout = window.setTimeout(() => {
      this.scrollState.isScrolling = false;
      this.directionDetector.reset();
      this.scrollBuffer = [];

      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      this.scrollState.delta = { x: 0, y: 0 };
      this.scrollState.velocity = { x: 0, y: 0 };
      this.scrollState.direction = { x: "none", y: "none" };
      this.notifyListeners();
    }, this.options.debounceTime) as unknown as number;
  };

  /**
   * Starts the animation loop for continuous state updates
   * @internal
   */
  private startAnimation(): void {
    const animate = (): void => {
      this.updateScrollState();
      this.notifyListeners();
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  /**
   * Updates the scroll state with latest measurements
   * @internal
   */
  private updateScrollState(): void {
    const smoothedDelta = this.calculateSmoothedDelta();
    this.scrollState.delta = smoothedDelta;

    const currentTime = Date.now();
    const timeDelta = currentTime - this.lastTimestamp;
    this.lastTimestamp = currentTime;

    if (timeDelta > 0) {
      this.scrollState.velocity = {
        x: smoothedDelta.x / timeDelta,
        y: smoothedDelta.y / timeDelta,
      };
    }

    this.scrollState.direction =
      this.directionDetector.detectDirection(smoothedDelta);
  }

  /**
   * Subscribes to scroll state updates
   * @param callback - Function to be called with updated scroll state
   * @returns Function to unsubscribe
   *
   * @example
   * ```typescript
   * const unsubscribe = scroller.subscribe((state) => {
   *   if (state.direction.y === 'down') {
   *     // Handle downward scroll
   *   }
   * });
   *
   * // Later: cleanup
   * unsubscribe();
   * ```
   */
  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifies all subscribers of state changes
   * @internal
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback({ ...this.scrollState }));
  }

  /**
   * Cleans up all resources and event listeners
   * Should be called when the scroller is no longer needed
   */
  public destroy(): void {
    window.removeEventListener("wheel", this.handleWheel);

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.scrollEndTimeout) {
      window.clearTimeout(this.scrollEndTimeout);
    }

    this.listeners.clear();
  }
}
