import type { Vector2D } from "../types";

/**
 * SmoothingEngine class for smoothing scroll movements and gestures
 *
 * @class
 * @description
 * Provides smoothing functionality for scroll and gesture movements using different algorithms.
 * Supports both linear and exponential smoothing with configurable parameters.
 *
 * Features:
 * - Configurable smoothing factor and threshold
 * - Sample-based movement history
 * - Multiple smoothing algorithms
 * - Automatic sample management
 *
 * @example
 * ```typescript
 * // Create with default settings
 * const smoother = new SmoothingEngine();
 *
 * // Create with custom configuration
 * const customSmoother = new SmoothingEngine({
 *   active: true,
 *   factor: 0.5,
 *   threshold: 0.2,
 *   samples: 3,
 *   algorithm: "exponential"
 * });
 *
 * // Smooth a movement
 * const smoothedValue = smoother.smooth({ x: 100, y: 150 });
 * ```
 */
export class SmoothingEngine {
  /** Flag indicating if smoothing is active */
  private active: boolean;

  /** Smoothing factor (0.0 to 1.0) affecting smoothing intensity */
  private factor: number;

  /** Minimum movement threshold to trigger smoothing */
  private threshold: number;

  /** Maximum number of samples to keep for smoothing calculations */
  private maxSamples: number;

  /** Current smoothing algorithm selection */
  private algorithm: "linear" | "exponential";

  /** Array of historical movement samples */
  private samples: Vector2D[];

  /** Current smoothed value */
  private currentValue: Vector2D;

  /** Initial configuration options stored for resets */
  private readonly options: Required<{
    active: boolean;
    factor: number;
    threshold: number;
    samples: number;
    algorithm: "linear" | "exponential";
  }>;

  /**
   * Creates a new SmoothingEngine instance
   *
   * @param {Object} options - Configuration options
   * @param {boolean} [options.active=true] - Whether smoothing is initially active
   * @param {number} [options.factor=0.3] - Smoothing factor (0.0 to 1.0)
   * @param {number} [options.threshold=0.1] - Minimum movement threshold
   * @param {number} [options.samples=5] - Maximum number of samples to keep
   * @param {("linear"|"exponential")} [options.algorithm="linear"] - Smoothing algorithm to use
   *
   * @throws {Error} If factor is outside valid range (0.0 to 1.0)
   * @throws {Error} If threshold is negative
   * @throws {Error} If samples is less than 1
   *
   * @example
   * ```typescript
   * const smoother = new SmoothingEngine({
   *   active: true,
   *   factor: 0.5,
   *   threshold: 0.2,
   *   samples: 3,
   *   algorithm: "exponential"
   * });
   * ```
   */
  constructor(
    options: {
      active?: boolean;
      factor?: number;
      threshold?: number;
      samples?: number;
      algorithm?: "linear" | "exponential";
    } = {}
  ) {
    this.options = {
      active: options.active ?? true,
      factor: options.factor ?? 0.3,
      threshold: options.threshold ?? 0.1,
      samples: options.samples ?? 5,
      algorithm: options.algorithm ?? "linear",
    };
    this.active = this.options.active;
    this.factor = this.options.factor;
    this.threshold = this.options.threshold;
    this.maxSamples = this.options.samples;
    this.algorithm = this.options.algorithm;
    this.samples = [];
    this.currentValue = { x: 0, y: 0 };
  }

  /**
   * Smooth the input value using the configured algorithm
   *
   * @param {Vector2D} value - Raw input value to smooth
   * @returns {Vector2D} Smoothed output value
   *
   * @description
   * Applies the selected smoothing algorithm to the input value, taking into account
   * the configured threshold and previous samples. If smoothing is disabled, returns
   * the input value unchanged.
   *
   * @example
   * ```typescript
   * const rawMovement = { x: 100, y: 150 };
   * const smoothed = smoother.smooth(rawMovement);
   * console.log(smoothed); // { x: 30, y: 45 } (with factor 0.3)
   * ```
   */
  public smooth(value: Vector2D, type: "movement" | "velocity"): Vector2D {
    return type === "movement"
      ? this.smoothMovement(value)
      : this.smoothVelocity(value);
  }

  /**
   * Smooth the input velocity using the configured algorithm
   *
   * @param {Vector2D} velocity - Raw input velocity to smooth
   * @returns {Vector2D} Smoothed output velocity
   *
   * @description
   * Applies the selected smoothing algorithm to the input velocity, taking into account
   * the configured threshold and previous samples. If smoothing is disabled, returns
   * the input velocity unchanged.
   */
  public smoothVelocity(velocity: Vector2D): Vector2D {
    if (!this.active) return velocity;

    // Add new sample
    this.samples.push(velocity);

    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Apply threshold check before any smoothing
    if (
      Math.abs(velocity.x) < this.threshold &&
      Math.abs(velocity.y) < this.threshold
    ) {
      this.currentValue = { x: 0, y: 0 };
      return this.currentValue;
    }

    // Use specialized velocity smoothing
    return this.velocitySmoothing();
  }

  /**
   * Smooth the input movement using the configured algorithm
   *
   * @param {Vector2D} movement - Raw input movement to smooth
   * @returns {Vector2D} Smoothed output movement
   *
   * @description
   * Applies the selected smoothing algorithm to the input movement, taking into account
   * the configured threshold and previous samples. If smoothing is disabled, returns
   * the input movement unchanged.
   */
  private smoothMovement(movement: Vector2D): Vector2D {
    if (!this.active) return movement;

    // Add new sample
    this.samples.push(movement);

    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Apply threshold
    if (
      Math.abs(movement.x) < this.threshold &&
      Math.abs(movement.y) < this.threshold
    ) {
      return { x: 0, y: 0 };
    }

    return this.algorithm === "linear"
      ? this.linearSmoothing()
      : this.exponentialSmoothing();
  }

  /**
   * Reset smoothing state to initial values
   *
   * @returns {void}
   *
   * @description
   * Resets all internal state including samples and current value.
   * Also restores initial configuration options.
   *
   * @example
   * ```typescript
   * smoother.reset(); // Clear all state and restore defaults
   * ```
   */
  public reset(): void {
    // Clear all state
    this.samples = [];
    this.currentValue = { x: 0, y: 0 };

    // Reset configuration to initial values
    this.active = this.options.active;
    this.factor = this.options.factor;
    this.threshold = this.options.threshold;
    this.maxSamples = this.options.samples;
    this.algorithm = this.options.algorithm;

    // Force next smoothing operation to start fresh
    this.samples = [];
  }

  /**
   * Apply linear smoothing algorithm to samples
   *
   * @private
   * @returns {Vector2D} Smoothed value using linear algorithm
   *
   * @description
   * Calculates smoothed value using weighted average with linear weight distribution.
   * More recent samples have higher weights.
   */
  private linearSmoothing(): Vector2D {
    if (this.samples.length === 0) return { x: 0, y: 0 };

    // Calculate weighted average with stronger weight on recent samples
    const smoothed = this.samples.reduce(
      (acc, curr, idx) => {
        // Reduce weight impact for rapid direction changes
        const weight =
          Math.pow((idx + 1) / this.samples.length, 2) * this.factor;
        return {
          x: acc.x + curr.x * weight,
          y: acc.y + curr.y * weight,
        };
      },
      { x: 0, y: 0 }
    );

    // Detect direction changes and calculate magnitude of change
    const lastSample = this.samples[this.samples.length - 1];
    const directionChange = lastSample && {
      x: Math.sign(lastSample.x) !== Math.sign(this.currentValue.x),
      y: Math.sign(lastSample.y) !== Math.sign(this.currentValue.y),
    };

    // Calculate adaptive damping factor
    const dampingFactor =
      directionChange?.x || directionChange?.y
        ? this.factor * 0.25 // More aggressive damping on direction change
        : this.factor * 0.75; // Normal damping

    // Apply additional damping for rapid changes
    const velocityMagnitude = Math.sqrt(
      Math.pow(lastSample?.x ?? 0, 2) + Math.pow(lastSample?.y ?? 0, 2)
    );
    const adaptiveFactor = Math.min(
      dampingFactor,
      dampingFactor / (1 + velocityMagnitude * 0.1)
    );

    this.currentValue = {
      x:
        this.currentValue.x +
        (smoothed.x - this.currentValue.x) * adaptiveFactor,
      y:
        this.currentValue.y +
        (smoothed.y - this.currentValue.y) * adaptiveFactor,
    };

    return this.currentValue;
  }

  /**
   * Apply exponential smoothing algorithm to samples
   *
   * @private
   * @returns {Vector2D} Smoothed value using exponential algorithm
   *
   * @description
   * Calculates smoothed value using weighted average with exponential weight distribution.
   * Provides more aggressive smoothing for larger movements.
   */
  private exponentialSmoothing(): Vector2D {
    if (this.samples.length === 0) return { x: 0, y: 0 };

    // Calculate exponentially weighted average with normalized weights
    const weights = this.samples.map(
      (_, idx) => Math.exp((idx + 1) / this.samples.length) * this.factor
    );
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    const smoothed = this.samples.reduce(
      (acc, curr, idx) => {
        const normalizedWeight = weights[idx]! / weightSum;
        return {
          x: acc.x + curr.x * normalizedWeight,
          y: acc.y + curr.y * normalizedWeight,
        };
      },
      { x: 0, y: 0 }
    );

    this.currentValue = smoothed;
    return this.currentValue;
  }

  /**
   * Apply specialized smoothing for velocity values
   *
   * @private
   * @returns {Vector2D} Smoothed velocity
   */
  private velocitySmoothing(): Vector2D {
    if (this.samples.length === 0) return { x: 0, y: 0 };

    // Use exponential moving average for velocity
    const alpha = this.factor * 0.8; // Gentler factor for velocity

    // Calculate weighted sum with exponential decay
    const smoothed = this.samples.reduce(
      (acc, curr, idx) => {
        const weight = Math.pow(1 - alpha, this.samples.length - idx - 1);
        return {
          x: acc.x + curr.x * weight,
          y: acc.y + curr.y * weight,
        };
      },
      { x: 0, y: 0 }
    );

    // Normalize by weight sum
    const weightSum = this.samples.reduce(
      (sum, _, idx) => sum + Math.pow(1 - alpha, this.samples.length - idx - 1),
      0
    );

    // Calculate new velocity with momentum preservation
    const newVelocity = {
      x: smoothed.x / weightSum,
      y: smoothed.y / weightSum,
    };

    // Blend with current velocity to maintain momentum
    const blendFactor = 0.85; // High blend factor to preserve momentum
    this.currentValue = {
      x: this.currentValue.x * blendFactor + newVelocity.x * (1 - blendFactor),
      y: this.currentValue.y * blendFactor + newVelocity.y * (1 - blendFactor),
    };

    return this.currentValue;
  }
}
