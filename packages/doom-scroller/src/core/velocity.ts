import type { Vector2D } from "../types";

/**
 * VelocityCalculator class for computing scroll and gesture velocities
 *
 * @class
 * @description
 * Provides velocity calculations for scroll and gesture movements with configurable
 * algorithms and bounds. Supports both linear and exponential velocity scaling.
 *
 * Key features:
 * - Configurable minimum and maximum velocity bounds
 * - Multiple velocity calculation algorithms
 * - Automatic time-based velocity scaling
 * - Protection against NaN and Infinity values
 * - Sign-preserving velocity clamping
 *
 * @example
 * ```typescript
 * // Create with default settings
 * const calculator = new VelocityCalculator();
 *
 * // Create with custom configuration
 * const customCalculator = new VelocityCalculator({
 *   min: 0.1,
 *   max: 2.0,
 *   algorithm: "exponential"
 * });
 *
 * // Calculate velocity
 * const velocity = calculator.calculate(
 *   { x: 100, y: 50 },
 *   Date.now()
 * );
 * ```
 */
export class VelocityCalculator {
  /**
   * Last recorded position
   * @private
   */
  private lastPosition: Vector2D = { x: 0, y: 0 };

  /**
   * Timestamp of last calculation
   * @private
   */
  private lastTimestamp: number = 0;

  /**
   * Current calculated velocity
   * @private
   */
  private currentVelocity: Vector2D = { x: 0, y: 0 };

  /**
   * Minimum velocity bound (absolute value)
   * @private
   * @readonly
   */
  private readonly minVelocity: number;

  /**
   * Maximum velocity bound (absolute value)
   * @private
   * @readonly
   */
  private readonly maxVelocity: number;

  /**
   * Selected velocity calculation algorithm
   * @private
   * @readonly
   */
  private readonly algorithm: "linear" | "exponential";

  /**
   * Creates a new VelocityCalculator instance
   *
   * @param {Object} options - Configuration options
   * @param {number} [options.min=0.0] - Minimum velocity bound (absolute value)
   * @param {number} [options.max=1.0] - Maximum velocity bound (absolute value)
   * @param {("linear"|"exponential")} [options.algorithm="linear"] - Velocity calculation algorithm
   *
   * @throws {Error} If min is greater than max
   * @throws {Error} If min or max are negative
   *
   * @example
   * ```typescript
   * const calculator = new VelocityCalculator({
   *   min: 0.1,
   *   max: 2.0,
   *   algorithm: "exponential"
   * });
   * ```
   */
  constructor(
    options: {
      min?: number;
      max?: number;
      algorithm?: "linear" | "exponential";
    } = {}
  ) {
    this.minVelocity = options.min ?? 0.0;
    this.maxVelocity = options.max ?? 1.0;
    this.algorithm = options.algorithm ?? "linear";

    if (this.minVelocity > this.maxVelocity) {
      throw new Error(
        "Minimum velocity cannot be greater than maximum velocity"
      );
    }
    if (this.minVelocity < 0 || this.maxVelocity < 0) {
      throw new Error("Velocity bounds cannot be negative");
    }
  }

  /**
   * Calculate velocity from movement delta
   *
   * @param {Vector2D} delta - Movement delta since last calculation
   * @param {number} timestamp - Current timestamp in milliseconds
   * @returns {Vector2D} Calculated velocity vector
   *
   * @description
   * Calculates instantaneous velocity based on movement delta and time difference.
   * The calculation process:
   * 1. Sanitizes input values (handles NaN/Infinity)
   * 2. Calculates raw velocity (pixels per millisecond)
   * 3. Applies selected algorithm (linear/exponential)
   * 4. Clamps results within configured bounds
   *
   * First call will return zero velocity as it establishes the baseline.
   *
   * @example
   * ```typescript
   * const calculator = new VelocityCalculator();
   *
   * // First call establishes baseline
   * calculator.calculate({ x: 0, y: 0 }, Date.now());
   *
   * // Later calls calculate velocity
   * const velocity = calculator.calculate(
   *   { x: 100, y: 50 },
   *   Date.now() + 100 // 100ms later
   * );
   * ```
   */
  public calculate(delta: Vector2D, timestamp: number): Vector2D {
    // Handle NaN and Infinity in input delta
    const sanitizedDelta = {
      x: Number.isFinite(delta.x) ? delta.x : 0,
      y: Number.isFinite(delta.y) ? delta.y : 0,
    };

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      this.lastPosition = sanitizedDelta;
      return { x: 0, y: 0 };
    }

    const timeDelta = timestamp - this.lastTimestamp;
    if (timeDelta === 0) return this.currentVelocity;

    // Calculate raw velocity (pixels per millisecond)
    const rawVelocity = {
      x: sanitizedDelta.x / timeDelta,
      y: sanitizedDelta.y / timeDelta,
    };

    // Apply selected algorithm
    this.currentVelocity =
      this.algorithm === "linear"
        ? this.linearVelocity(rawVelocity)
        : this.exponentialVelocity(rawVelocity);

    this.lastTimestamp = timestamp;
    this.lastPosition = sanitizedDelta;

    return this.currentVelocity;
  }

  /**
   * Reset calculator state
   *
   * @returns {void}
   *
   * @description
   * Resets all internal state to initial values. This is useful when:
   * - Stopping and restarting velocity tracking
   * - Clearing accumulated state
   * - Handling component unmount/cleanup
   *
   * After reset, the next calculation will treat the movement as if it
   * were the first movement received.
   *
   * @example
   * ```typescript
   * const calculator = new VelocityCalculator();
   *
   * // Calculate some velocities...
   *
   * // Reset state
   * calculator.reset();
   *
   * // Next calculation will be treated as first movement
   * const velocity = calculator.calculate(
   *   { x: 100, y: 50 },
   *   Date.now()
   * );
   * ```
   */
  public reset(): void {
    this.lastTimestamp = 0;
    this.lastPosition = { x: 0, y: 0 };
    this.currentVelocity = { x: 0, y: 0 };
  }

  /**
   * Calculate linear velocity
   *
   * @private
   * @param {Vector2D} velocity - Raw velocity input
   * @returns {Vector2D} Processed velocity with linear scaling
   *
   * @description
   * Applies linear scaling to raw velocity values. The output is directly
   * proportional to input velocity, clamped within configured bounds.
   *
   * @example
   * ```typescript
   * private someMethod() {
   *   const rawVelocity = { x: 0.5, y: 0.3 };
   *   const processed = this.linearVelocity(rawVelocity);
   * }
   * ```
   */
  private linearVelocity(velocity: Vector2D): Vector2D {
    // Add a minimum velocity preservation to prevent too rapid decay
    const preservationFactor = 0.2; // Maintains some minimal velocity
    const raw = {
      x: velocity.x + this.currentVelocity.x * preservationFactor,
      y: velocity.y + this.currentVelocity.y * preservationFactor,
    };

    // Enforce bounds
    return {
      x: this.clampWithSign(raw.x),
      y: this.clampWithSign(raw.y),
    };
  }

  /**
   * Calculate exponential velocity
   *
   * @private
   * @param {Vector2D} velocity - Raw velocity input
   * @returns {Vector2D} Processed velocity with exponential scaling
   *
   * @description
   * Applies exponential scaling to raw velocity values. The output increases
   * exponentially with input velocity, providing more dramatic changes at
   * higher velocities while maintaining sign.
   *
   * The formula used is: sign(v) * |v|^2
   *
   * @example
   * ```typescript
   * private someMethod() {
   *   const rawVelocity = { x: 0.5, y: 0.3 };
   *   const processed = this.exponentialVelocity(rawVelocity);
   * }
   * ```
   */
  private exponentialVelocity(velocity: Vector2D): Vector2D {
    // Adjust exponential scaling to be less aggressive
    const scaleFactor = 0.8; // Reduced from 1.0
    const raw = {
      x: Math.pow(Math.abs(velocity.x), scaleFactor) * Math.sign(velocity.x),
      y: Math.pow(Math.abs(velocity.y), scaleFactor) * Math.sign(velocity.y),
    };

    // Enforce bounds
    return {
      x: this.clampWithSign(raw.x),
      y: this.clampWithSign(raw.y),
    };
  }

  /**
   * Clamp velocity while preserving sign
   *
   * @private
   * @param {number} value - Raw velocity value
   * @returns {number} Clamped velocity value
   *
   * @description
   * Clamps the absolute value of velocity within configured bounds while
   * preserving the original sign. This ensures that direction is maintained
   * while keeping magnitude within limits.
   *
   * Process:
   * 1. Extract sign
   * 2. Clamp absolute value
   * 3. Reapply sign
   *
   * @example
   * ```typescript
   * private someMethod() {
   *   const raw = 2.5;  // Above max
   *   const clamped = this.clampWithSign(raw); // Returns ±1.0 (max)
   * }
   * ```
   */
  private clampWithSign(value: number): number {
    const sign = Math.sign(value);
    const absValue = Math.abs(value);

    // First enforce minimum bounds
    if (absValue < this.minVelocity) {
      // If very close to zero, allow decay
      if (absValue < this.minVelocity * 0.1) {
        return 0;
      }
      // Otherwise enforce minimum
      return sign * this.minVelocity;
    }

    // Then enforce maximum bounds
    return sign * Math.min(this.maxVelocity, absValue);
  }
}
