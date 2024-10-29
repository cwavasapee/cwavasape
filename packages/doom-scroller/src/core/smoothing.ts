/**
 * @fileoverview SmoothingEngine module for handling scroll and gesture smoothing operations
 * @module core/smoothing
 *
 * @description
 * The SmoothingEngine module provides sophisticated smoothing algorithms for scroll and gesture
 * movements. It handles both movement and velocity smoothing with configurable parameters
 * and multiple algorithm options.
 *
 * Core Features:
 * - Dual smoothing pipelines for movement and velocity
 * - Configurable sample history management
 * - Multiple smoothing algorithms (linear/exponential)
 * - Adaptive smoothing based on movement characteristics
 * - Direction change detection with dynamic factor adjustment
 *
 * Common Use Cases:
 * 1. Smooth scrolling implementations
 * 2. Touch gesture refinement
 * 3. Inertial scrolling behavior
 * 4. Animation transitions
 *
 *
 * Browser Support:
 * - Modern browsers (Chrome 60+, Firefox 55+, Safari 11+)
 * - Mobile device support
 * - Fallback behavior for older browsers
 *
 * @see {@link VelocityCalculator} for velocity computation
 * @see {@link DataProcessor} for input processing
 * @see {@link DoomScroller} for high-level scroll management
 */

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
 * - Separate movement and velocity smoothing configurations
 * - Sample-based movement history with automatic management
 * - Multiple smoothing algorithms (linear and exponential)
 * - Automatic sample management with configurable sample sizes
 * - Direction change detection with adaptive smoothing
 * - Threshold-based noise filtering
 *
 * The engine maintains separate sample histories and configurations for movement
 * and velocity smoothing, allowing fine-tuned control over each aspect of the
 * scrolling experience.
 *
 * @example
 * ```typescript
 * // Create with default settings
 * const smoother = new SmoothingEngine();
 *
 * // Create with custom configuration
 * const customSmoother = new SmoothingEngine({
 *   movement: {
 *     smoothing: {
 *       active: true,
 *       factor: 0.5,
 *       samples: 3,
 *       algorithm: "exponential"
 *     }
 *   },
 *   velocity: {
 *     smoothing: {
 *       active: true,
 *       factor: 0.3,
 *       samples: 5,
 *       algorithm: "linear"
 *     }
 *   }
 * });
 * ```
 *
 * @see {@link VelocityCalculator} for velocity computation
 * @see {@link DataProcessor} for input processing
 */
export class SmoothingEngine {
  /**
   * Movement smoothing configuration
   * @private
   * @type {Required<SmoothingConfig>}
   */
  private readonly movementConfig: Required<{
    active: boolean;
    factor: number;
    samples: number;
    algorithm: "linear" | "exponential";
  }>;

  /**
   * Velocity smoothing configuration
   * @private
   * @type {Required<SmoothingConfig>}
   */
  private readonly velocityConfig: Required<{
    active: boolean;
    factor: number;
    samples: number;
    algorithm: "linear" | "exponential";
  }>;

  /**
   * Array of historical movement samples
   * @private
   * @type {Vector2D[]}
   */
  private movementSamples: Vector2D[];

  /**
   * Array of historical velocity samples
   * @private
   * @type {Vector2D[]}
   */
  private velocitySamples: Vector2D[];

  /**
   * Current smoothed movement value
   * @private
   * @type {Vector2D}
   */
  private currentMovement: Vector2D;

  /**
   * Current smoothed velocity value
   * @private
   * @type {Vector2D}
   */
  private currentVelocity: Vector2D;

  /**
   * Creates a new instance of SmoothingEngine
   *
   * @constructor
   * @param {Object} options - Configuration options
   * @param {Object} [options.movement] - Movement smoothing options
   * @param {Object} [options.movement.smoothing] - Movement smoothing configuration
   * @param {boolean} [options.movement.smoothing.active] - Enable/disable movement smoothing
   * @param {number} [options.movement.smoothing.factor] - Movement smoothing factor (0-1)
   * @param {number} [options.movement.smoothing.samples] - Number of movement samples to use
   * @param {"linear" | "exponential"} [options.movement.smoothing.algorithm] - Movement smoothing algorithm
   * @param {Object} [options.velocity] - Velocity smoothing options
   * @param {Object} [options.velocity.smoothing] - Velocity smoothing configuration
   * @param {boolean} [options.velocity.smoothing.active] - Enable/disable velocity smoothing
   * @param {number} [options.velocity.smoothing.factor] - Velocity smoothing factor (0-1)
   * @param {number} [options.velocity.smoothing.samples] - Number of velocity samples to use
   * @param {"linear" | "exponential"} [options.velocity.smoothing.algorithm] - Velocity smoothing algorithm
   */
  constructor(
    options: {
      movement?: {
        smoothing?: {
          active?: boolean;
          factor?: number;
          samples?: number;
          algorithm?: "linear" | "exponential";
        };
      };
      velocity?: {
        smoothing?: {
          active?: boolean;
          factor?: number;
          samples?: number;
          algorithm?: "linear" | "exponential";
        };
      };
    } = {}
  ) {
    this.movementConfig = {
      active: options.movement?.smoothing?.active ?? true,
      factor: options.movement?.smoothing?.factor ?? 0.3,
      samples: options.movement?.smoothing?.samples ?? 5,
      algorithm: options.movement?.smoothing?.algorithm ?? "linear",
    };

    this.velocityConfig = {
      active: options.velocity?.smoothing?.active ?? true,
      factor: options.velocity?.smoothing?.factor ?? 0.3,
      samples: options.velocity?.smoothing?.samples ?? 5,
      algorithm: options.velocity?.smoothing?.algorithm ?? "linear",
    };

    this.movementSamples = [];
    this.velocitySamples = [];
    this.currentMovement = { x: 0, y: 0 };
    this.currentVelocity = { x: 0, y: 0 };
  }

  /**
   * Smooths incoming movement or velocity values using configured algorithm
   *
   * @public
   * @param {Vector2D} value - Raw input value to smooth
   * @param {"movement" | "velocity"} type - Type of value being smoothed
   * @returns {Vector2D} Smoothed output value
   *
   * @description
   * Applies configured smoothing algorithm to incoming values while maintaining
   * separate sample histories for movement and velocity. Features include:
   *
   * - Noise filtering with configurable threshold
   * - Sample history management
   * - Algorithm selection (linear/exponential)
   * - Separate movement/velocity configurations
   *
   * The smoothing process:
   * 1. Applies threshold filter to remove noise
   * 2. Adds new sample to history
   * 3. Maintains sample history size
   * 4. Applies selected smoothing algorithm
   * 5. Updates current smoothed value
   *
   * @example
   * ```typescript
   * const rawMovement = { x: 100, y: 50 };
   * const smoothedMovement = smoother.smooth(rawMovement, "movement");
   * ```
   */
  public smooth(value: Vector2D, type: "movement" | "velocity"): Vector2D {
    const config =
      type === "movement" ? this.movementConfig : this.velocityConfig;
    const samples =
      type === "movement" ? this.movementSamples : this.velocitySamples;
    const current =
      type === "movement" ? this.currentMovement : this.currentVelocity;

    if (!config.active) return value;

    // Add threshold check
    const threshold = 0.1; // You may want to make this configurable
    if (Math.abs(value.x) < threshold && Math.abs(value.y) < threshold) {
      return { x: 0, y: 0 };
    }

    // Add new sample
    samples.push(value);

    // Keep only recent samples
    if (samples.length > config.samples) {
      samples.shift();
    }

    const result =
      config.algorithm === "linear"
        ? this.linearSmoothing(samples, config.factor, current)
        : this.exponentialSmoothing(samples, config.factor, current);

    if (type === "movement") {
      this.currentMovement = result;
    } else {
      this.currentVelocity = result;
    }

    return result;
  }

  /**
   * Resets the smoothing engine state
   *
   * @public
   * @description
   * Clears all internal state including:
   * - Movement sample history
   * - Velocity sample history
   * - Current smoothed movement value
   * - Current smoothed velocity value
   *
   * Useful when:
   * - Switching between scroll areas
   * - Handling component unmount
   * - Recovering from error states
   * - Reinitializing the engine
   */
  public reset(): void {
    this.movementSamples = [];
    this.velocitySamples = [];
    this.currentMovement = { x: 0, y: 0 };
    this.currentVelocity = { x: 0, y: 0 };
  }

  /**
   * Applies linear smoothing algorithm to samples
   *
   * @private
   * @param {Vector2D[]} samples - Array of historical samples
   * @param {number} factor - Smoothing factor between 0 and 1
   * @param {Vector2D} current - Current smoothed value
   * @returns {Vector2D} New smoothed value
   *
   * @description
   * Implements weighted linear smoothing with:
   * - Quadratic sample weighting
   * - Direction change detection
   * - Adaptive damping based on velocity
   * - Smooth transitions between values
   *
   * The algorithm:
   * 1. Applies weighted averaging to samples
   * 2. Detects direction changes
   * 3. Adjusts damping factor
   * 4. Applies velocity-based adaptation
   * 5. Smoothly transitions to new value
   */
  private linearSmoothing(
    samples: Vector2D[],
    factor: number,
    current: Vector2D
  ): Vector2D {
    if (samples.length === 0) return { x: 0, y: 0 };

    const smoothed = samples.reduce(
      (acc, curr, idx) => {
        const weight = Math.pow((idx + 1) / samples.length, 2) * factor;
        return {
          x: acc.x + curr.x * weight,
          y: acc.y + curr.y * weight,
        };
      },
      { x: 0, y: 0 }
    );

    const lastSample = samples[samples.length - 1]!;
    const directionChange = {
      x: Math.sign(lastSample.x) !== Math.sign(current.x),
      y: Math.sign(lastSample.y) !== Math.sign(current.y),
    };

    const dampingFactor =
      directionChange.x || directionChange.y ? factor * 0.25 : factor * 0.75;

    const velocityMagnitude = Math.sqrt(
      Math.pow(lastSample.x, 2) + Math.pow(lastSample.y, 2)
    );
    const adaptiveFactor = Math.min(
      dampingFactor,
      dampingFactor / (1 + velocityMagnitude * 0.1)
    );

    return {
      x: current.x + (smoothed.x - current.x) * adaptiveFactor,
      y: current.y + (smoothed.y - current.y) * adaptiveFactor,
    };
  }

  /**
   * Applies exponential smoothing algorithm to samples
   *
   * @private
   * @param {Vector2D[]} samples - Array of historical samples
   * @param {number} factor - Smoothing factor between 0 and 1
   * @param {Vector2D} current - Current smoothed value
   * @returns {Vector2D} New smoothed value
   *
   * @description
   * Implements exponential smoothing with:
   * - Position-based weight calculation
   * - Decay factor for deceleration
   * - Normalized weight distribution
   * - Natural feeling transitions
   *
   * The algorithm:
   * 1. Calculates exponential weights
   * 2. Applies decay factor
   * 3. Normalizes weights
   * 4. Computes weighted average
   *
   * Best suited for:
   * - Natural feeling scrolling
   * - Smooth deceleration
   * - Inertial behaviors
   */
  private exponentialSmoothing(
    samples: Vector2D[],
    factor: number,
    current: Vector2D
  ): Vector2D {
    if (samples.length === 0) return { x: 0, y: 0 };

    // Adjust weights calculation for smoother deceleration
    const weights = samples.map((_, idx) => {
      const position = (idx + 1) / samples.length;
      return Math.exp(position) * factor * (1 - position * 0.3); // Add decay factor
    });

    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    return samples.reduce(
      (acc, curr, idx) => {
        const normalizedWeight = weights[idx]! / weightSum;
        return {
          x: acc.x + curr.x * normalizedWeight,
          y: acc.y + curr.y * normalizedWeight,
        };
      },
      { x: 0, y: 0 }
    );
  }
}
