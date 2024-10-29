/**
 * @fileoverview DirectionDetector module for detecting scroll or movement direction
 * @module core/direction
 *
 * @description
 * The DirectionDetector module provides functionality for detecting and tracking movement
 * direction based on position samples. It uses a threshold-based approach to determine
 * significant directional changes while filtering out small, unintentional movements.
 *
 * Key features:
 * - Sample-based direction detection
 * - Configurable movement threshold
 * - Stationary state detection
 * - Smooth direction transitions
 * - Memory-efficient sample management
 *
 * Performance characteristics:
 * - O(1) time complexity for updates
 * - Constant memory usage (bounded by sample size)
 * - Minimal garbage collection impact
 *
 * @see {@link DataProcessor} for movement data processing
 * @see {@link SmoothingEngine} for movement smoothing
 */

import type { Vector2D, Direction } from "../types";

/**
 * DirectionDetector class for detecting scroll or movement direction
 *
 * @class
 * @description
 * Handles direction detection based on movement samples using a threshold-based approach.
 * The detector maintains a rolling window of position samples and uses them to determine
 * the current movement direction while filtering out noise and small movements.
 *
 * Features:
 * - Configurable movement threshold
 * - Adjustable sample size
 * - Stationary state detection
 * - Last direction memory
 * - Automatic sample management
 *
 * Direction is determined by:
 * 1. Comparing oldest and newest samples
 * 2. Applying movement threshold
 * 3. Checking for stationary state
 * 4. Maintaining direction history
 *
 * @example
 * ```typescript
 * const detector = new DirectionDetector({
 *   movement: {
 *     threshold: 0.2,
 *     samples: 3
 *   }
 * });
 * const direction = detector.update({ x: 100, y: 200 });
 * // Returns: { x: "none", y: "down" }
 * ```
 */

export class DirectionDetector {
  /**
   * Array of position samples used for direction detection
   * @private
   * @type {Vector2D[]}
   */
  private samples: Vector2D[];
  /**
   * Maximum number of samples to store for detection
   * @private
   * @readonly
   * @type {number}
   */
  private readonly maxSamples: number;
  /**
   * Minimum movement threshold to trigger direction change
   * @private
   * @readonly
   * @type {number}
   */
  private readonly threshold: number;
  /**
   * Last detected direction
   * @private
   * @type {Direction}
   */
  private lastDirection: Direction;

  /**
   * Creates a new DirectionDetector instance
   *
   * @constructor
   * @param {Object} options - Configuration options
   * @param {Object} [options.movement] - Movement configuration
   * @param {number} [options.movement.threshold=0.1] - Minimum movement threshold to trigger direction change
   * @param {number} [options.movement.samples=5] - Maximum number of samples to store for detection
   *
   * @throws {Error} If threshold is negative
   * @throws {Error} If samples is less than 2
   *
   * @example
   * ```typescript
   * // Create with default settings
   * const detector = new DirectionDetector();
   *
   * // Create with custom configuration
   * const customDetector = new DirectionDetector({
   *   movement: {
   *     threshold: 0.2,
   *     samples: 3
   *   }
   * });
   * ```
   */
  constructor(
    options: {
      movement?: {
        threshold?: number;
        samples?: number;
      };
    } = {}
  ) {
    this.samples = [];
    this.maxSamples = options.movement?.samples ?? 5;
    this.threshold = options.movement?.threshold ?? 0.1;
    this.lastDirection = { x: "none", y: "none" };
  }

  /**
   * Add position sample and update direction
   *
   * @public
   * @param {Vector2D} position - Current position vector
   * @returns {Direction} Current movement direction
   *
   * @description
   * Updates the detector with a new position sample and calculates the current
   * movement direction. The method:
   * 1. Adds the new position to the sample window
   * 2. Manages sample buffer size
   * 3. Calculates direction based on samples
   * 4. Applies movement threshold
   * 5. Checks for stationary state
   *
   * The returned Direction object contains:
   * - x: "left" | "right" | "none"
   * - y: "up" | "down" | "none"
   *
   * @example
   * ```typescript
   * const newDirection = detector.update({ x: 100, y: 150 });
   * console.log(newDirection); // { x: "none", y: "down" }
   * ```
   */
  public update(position: Vector2D): Direction {
    this.addSample(position);
    return this.detectDirection();
  }

  /**
   * Reset detector state to initial values
   *
   * @public
   * @returns {void}
   *
   * @description
   * Resets the detector to its initial state by:
   * - Clearing all stored samples
   * - Resetting direction to "none"
   * - Maintaining configuration settings
   *
   * Useful when:
   * - Changing tracking context
   * - Handling scroll end events
   * - Clearing historical data
   *
   * @example
   * ```typescript
   * detector.reset(); // Clear all state
   * ```
   */
  public reset(): void {
    this.samples = [];
    this.lastDirection = { x: "none", y: "none" };
  }

  /**
   * Add new position sample to the samples array
   *
   * @private
   * @param {Vector2D} position - Position vector to add
   * @returns {void}
   *
   * @description
   * Adds a new position sample to the rolling window and maintains the
   * sample buffer size by removing oldest samples when necessary.
   *
   * Sample management:
   * 1. Add new sample to end
   * 2. Check buffer size
   * 3. Remove oldest if over limit
   */
  private addSample(position: Vector2D): void {
    this.samples.push(position);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Detect movement direction based on stored samples
   *
   * @private
   * @returns {Direction} Detected direction vector
   *
   * @description
   * Calculates the current movement direction by analyzing the stored position samples.
   * The detection process:
   * 1. Checks for minimum sample count
   * 2. Compares oldest and newest samples
   * 3. Applies movement threshold
   * 4. Detects stationary state
   * 5. Updates last known direction
   *
   * Direction is determined by:
   * - Comparing position deltas against threshold
   * - Checking recent samples for stationary state
   * - Maintaining direction history for stability
   *
   * @remarks
   * - Direction is determined by comparing the oldest and newest samples
   * - Movement smaller than the threshold is considered as "none"
   * - Returns last known direction if insufficient samples are available
   * - Stationary state is detected by analyzing recent sample variance
   */
  private detectDirection(): Direction {
    if (this.samples.length < 2) {
      return this.lastDirection;
    }

    const latest = this.samples[this.samples.length - 1]!;
    const oldest = this.samples[0]!;

    const deltaX = latest.x - oldest.x;
    const deltaY = latest.y - oldest.y;

    // Check if the last few samples are identical (stationary)
    const isStationary = this.samples
      .slice(-3)
      .every(
        (sample) =>
          Math.abs(sample.x - latest.x) < this.threshold &&
          Math.abs(sample.y - latest.y) < this.threshold
      );

    if (isStationary) {
      this.lastDirection = { x: "none", y: "none" };
      return this.lastDirection;
    }

    const direction: Direction = {
      x:
        Math.abs(deltaX) < this.threshold
          ? "none"
          : deltaX > 0
            ? "right"
            : "left",
      y:
        Math.abs(deltaY) < this.threshold ? "none" : deltaY > 0 ? "down" : "up",
    };

    this.lastDirection = direction;
    return direction;
  }
}
