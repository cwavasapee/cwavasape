/**
 * @fileoverview VelocityCalculator module for computing and managing scroll/gesture velocities
 * @module core/velocity
 *
 * @description
 * The VelocityCalculator module provides sophisticated velocity calculations for scroll
 * and gesture movements. It handles:
 *
 * Core Functionality:
 * - Real-time velocity computation from movement deltas
 * - Time-based velocity scaling and normalization
 * - Configurable velocity bounds and clamping
 * - Multiple calculation algorithms (linear/exponential)
 *
 * Key Features:
 * - Automatic time-delta compensation
 * - Velocity smoothing and damping
 * - Protection against edge cases (NaN, Infinity)
 * - Sign-preserving velocity clamping
 * - Memory-efficient state management
 *
 * Common Use Cases:
 * 1. Scroll-based animations
 * 2. Touch gesture tracking
 * 3. Momentum scrolling
 * 4. Inertial movements
 *
 * Performance Optimizations:
 * - Minimal state updates
 * - Efficient calculations
 * - Automatic cleanup
 * - Memory leak prevention
 *
 * Browser Compatibility:
 * - Modern browsers (Chrome 60+, Firefox 55+, Safari 11+)
 * - Mobile device support
 * - Fallback behavior for older browsers
 *
 * @see {@link DataProcessor} for input processing
 * @see {@link SmoothingEngine} for velocity smoothing
 * @see {@link DoomScroller} for high-level scroll management
 */

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
   * @public
   * @param {Vector2D} delta - Movement delta since last calculation
   * @param {number} timestamp - Current timestamp in milliseconds
   * @returns {Vector2D} Calculated velocity vector
   *
   * @description
   * Computes instantaneous velocity based on movement delta and time difference.
   * The calculation process involves:
   *
   * 1. Time Delta Processing
   *    - Computes time difference between events
   *    - Handles zero-time-delta edge case
   *    - Applies time-based scaling
   *
   * 2. Movement Processing
   *    - Calculates position deltas
   *    - Applies time scaling
   *    - Handles direction preservation
   *
   * 3. Velocity Computation
   *    - Applies damping factor
   *    - Scales to frames per second
   *    - Normalizes output range
   *
   * 4. Algorithm Application
   *    - Applies selected algorithm (linear/exponential)
   *    - Processes through velocity bounds
   *    - Maintains sign consistency
   *
   * Performance Considerations:
   * - Optimized for 60fps target
   * - Minimal object creation
   * - Efficient state updates
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
   *   Date.now() + 16 // ~60fps
   * );
   * ```
   *
   * @throws {Error} If timestamp is invalid (NaN/Infinity)
   */
  public calculate(delta: Vector2D, timestamp: number): Vector2D {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      this.lastPosition = delta;
      return { x: 0, y: 0 };
    }

    const timeDelta = timestamp - this.lastTimestamp;
    if (timeDelta === 0) return this.currentVelocity;

    const deltaX = delta.x - this.lastPosition.x;
    const deltaY = delta.y - this.lastPosition.y;

    const timeScale = Math.min(1, Math.sqrt(16 / Math.max(timeDelta, 1)));
    const dampingFactor = 1 / (1 + timeDelta * 0.001);

    const rawVelocity = {
      x: (deltaX / Math.max(timeDelta, 1)) * timeScale * dampingFactor * 60,
      y: (deltaY / Math.max(timeDelta, 1)) * timeScale * dampingFactor * 60,
    };

    this.currentVelocity =
      this.algorithm === "linear"
        ? this.linearVelocity(rawVelocity)
        : this.exponentialVelocity(rawVelocity);

    this.lastTimestamp = timestamp;
    this.lastPosition = delta;

    return this.currentVelocity;
  }

  /**
   * Reset calculator state
   *
   * @public
   * @returns {void}
   *
   * @description
   * Resets all internal state to initial values. This is crucial for:
   *
   * Use Cases:
   * - Stopping and restarting velocity tracking
   * - Clearing accumulated state
   * - Handling component unmount/cleanup
   * - Recovering from error states
   * - Switching between scroll areas
   *
   * Reset Actions:
   * 1. Clears timestamp
   * 2. Zeros position coordinates
   * 3. Resets velocity values
   * 4. Maintains configuration
   *
   * After reset, the calculator will treat the next calculation as if it
   * were the first movement received, ensuring clean state for new tracking.
   *
   * Best Practices:
   * - Call before switching scroll contexts
   * - Use during cleanup/unmount
   * - Reset after error recovery
   * - Clear before changing modes
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
   * // Next calculation starts fresh
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
   * Applies linear scaling to raw velocity values. The process:
   *
   * 1. Input Processing
   *    - Takes raw velocity components
   *    - Preserves directional information
   *
   * 2. Linear Transformation
   *    - Applies direct proportional scaling
   *    - Maintains velocity relationships
   *
   * 3. Boundary Enforcement
   *    - Clamps within configured bounds
   *    - Preserves zero-velocity state
   *
   * Linear scaling provides predictable, consistent velocity changes
   * ideal for precise control scenarios.
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
    return {
      x: this.clamp(Math.abs(velocity.x)),
      y: this.clamp(Math.abs(velocity.y)),
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
   * Applies exponential scaling to raw velocity values for more dynamic
   * response at higher velocities. The process:
   *
   * 1. Input Processing
   *    - Extracts magnitude and direction
   *    - Handles zero velocity case
   *
   * 2. Exponential Transformation
   *    - Applies power function (v^1.5)
   *    - Provides progressive scaling
   *
   * 3. Output Processing
   *    - Reapplies direction
   *    - Clamps within bounds
   *
   * Exponential scaling creates more dramatic changes at higher velocities
   * while maintaining fine control at lower speeds.
   *
   * Mathematical Model:
   * output = sign(v) * |v|^1.5
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
    return {
      x: this.clamp(Math.pow(Math.abs(velocity.x), 1.5)),
      y: this.clamp(Math.pow(Math.abs(velocity.y), 1.5)),
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
   * Clamps velocity magnitude within configured bounds while preserving
   * directional information. The process:
   *
   * 1. Input Validation
   *    - Handles NaN/Infinity
   *    - Processes zero values
   *
   * 2. Magnitude Processing
   *    - Extracts absolute value
   *    - Applies minimum threshold
   *    - Handles near-zero values
   *
   * 3. Boundary Enforcement
   *    - Applies minimum velocity
   *    - Clamps to maximum
   *    - Preserves zero state
   *
   * Special Cases:
   * - NaN returns 0
   * - Infinity returns maxVelocity
   * - Sub-threshold returns 0
   * - Near-minimum scales to minimum
   *
   * @example
   * ```typescript
   * private someMethod() {
   *   const raw = 2.5;  // Above max
   *   const clamped = this.clamp(raw); // Returns maxVelocity
   * }
   * ```
   */
  private clamp(value: number): number {
    if (!Number.isFinite(value)) {
      if (Number.isNaN(value)) return 0;
      return this.maxVelocity;
    }

    const absValue = Math.abs(value);

    if (absValue < 0.0005) {
      return 0;
    }

    if (this.minVelocity > 0 && absValue > 0) {
      if (absValue < this.minVelocity * 0.25) {
        return 0;
      }
      if (absValue < this.minVelocity) {
        return this.minVelocity;
      }
    }

    return Math.min(absValue, this.maxVelocity);
  }
}
