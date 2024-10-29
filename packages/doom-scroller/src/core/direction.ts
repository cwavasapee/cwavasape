/**
 * @fileoverview DirectionDetector module for detecting scroll or movement direction
 * @module core/direction
 */

import type { Vector2D, Direction } from "../types";

/**
 * DirectionDetector class for detecting scroll or movement direction
 * @description Handles direction detection based on movement samples using a threshold-based approach
 *
 * @example
 * ```typescript
 * const detector = new DirectionDetector({ threshold: 0.2, samples: 3 });
 * const direction = detector.update({ x: 100, y: 200 });
 * // Returns: { x: "none", y: "down" }
 * ```
 */
export class DirectionDetector {
  /** Array of position samples used for direction detection */
  private samples: Vector2D[];
  /** Maximum number of samples to store for detection */
  private readonly maxSamples: number;
  /** Minimum movement threshold to trigger direction change */
  private readonly threshold: number;
  /** Last detected direction */
  private lastDirection: Direction;

  /**
   * Creates a new DirectionDetector instance
   * @param options - Configuration options
   * @param [options.movement] - Movement configuration
   * @param [options.movement.threshold=0.1] - Minimum movement threshold to trigger direction change
   * @param [options.movement.samples=5] - Maximum number of samples to store for detection
   *
   * @throws {Error} If threshold is negative
   * @throws {Error} If samples is less than 2
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
   * @param position - Current position vector
   * @returns Current movement direction
   *
   * @example
   * ```typescript
   * const newDirection = detector.update({ x: 100, y: 150 });
   * ```
   */
  public update(position: Vector2D): Direction {
    this.addSample(position);
    return this.detectDirection();
  }

  /**
   * Reset detector state to initial values
   * @remarks Clears all stored samples and resets direction to "none"
   */
  public reset(): void {
    this.samples = [];
    this.lastDirection = { x: "none", y: "none" };
  }

  /**
   * Add new position sample to the samples array
   * @param position - Position vector to add
   * @private
   */
  private addSample(position: Vector2D): void {
    this.samples.push(position);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Detect movement direction based on stored samples
   * @returns Detected direction vector
   * @private
   *
   * @remarks
   * Direction is determined by comparing the oldest and newest samples.
   * Movement smaller than the threshold is considered as "none".
   * Returns last known direction if insufficient samples are available.
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
