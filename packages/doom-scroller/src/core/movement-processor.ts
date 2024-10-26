/**
 * @file Movement calculations and processing
 * @module doom-scroller/movement-processor
 */

import type { Vector2D, Direction, DirectionState, TimePoint } from "../types";

/**
 * Handles movement calculations and processing for scroll interactions
 * @remarks
 * This class provides utility methods for processing movement data,
 * including velocity calculations, direction detection, and smoothing.
 */
export class MovementProcessor {
  /**
   * Calculates weighted velocity from a series of time-stamped points
   *
   * @param points - Array of recent movement points with timestamps
   * @param maxVelocity - Maximum allowed velocity
   * @returns Calculated velocity vector
   *
   * @remarks
   * Uses a weighted average where recent points have more influence.
   * The weight is calculated as (index/total)² to give more importance
   * to recent movements.
   *
   * @example
   * ```typescript
   * const points = [
   *   { x: 0, y: 0, timestamp: 1000 },
   *   { x: 10, y: 5, timestamp: 1016 },
   *   { x: 20, y: 10, timestamp: 1032 }
   * ];
   * const velocity = MovementProcessor.calculateVelocity(points, 50);
   * ```
   */
  static calculateVelocity(
    points: readonly TimePoint[],
    maxVelocity: number
  ): Vector2D {
    if (points.length < 2) {
      return { x: 0, y: 0 };
    }

    let totalWeight = 0;
    let weightedVelX = 0;
    let weightedVelY = 0;

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];

      if (!current || !previous) {
        continue;
      }

      const dt = current.timestamp - previous.timestamp;
      if (dt <= 0) continue;

      const weight = Math.pow(i / (points.length - 1), 2);
      weightedVelX += ((current.x - previous.x) / dt) * weight;
      weightedVelY += ((current.y - previous.y) / dt) * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: this.capValue(weightedVelX / totalWeight, maxVelocity),
      y: this.capValue(weightedVelY / totalWeight, maxVelocity),
    };
  }

  /**
   * Determines movement direction based on value and threshold
   *
   * @param value - Movement value to evaluate
   * @param threshold - Minimum value to consider movement significant
   * @returns Movement direction
   *
   * @example
   * ```typescript
   * const dir = MovementProcessor.getDirection(10, 5); // "positive"
   * const dir2 = MovementProcessor.getDirection(-2, 5); // "none"
   * ```
   */
  static getDirection(value: number, threshold: number): Direction {
    return Math.abs(value) < threshold
      ? "none"
      : value > 0
        ? "positive"
        : "negative";
  }

  /**
   * Updates movement direction state for both axes
   *
   * @param delta - Movement delta vector
   * @param threshold - Direction change threshold
   * @returns Updated direction state
   *
   * @example
   * ```typescript
   * const direction = MovementProcessor.updateDirection(
   *   { x: 10, y: -5 },
   *   3
   * );
   * // { x: "positive", y: "negative" }
   * ```
   */
  static updateDirection(delta: Vector2D, threshold: number): DirectionState {
    return {
      x: this.getDirection(delta.x, threshold),
      y: this.getDirection(delta.y, threshold),
    };
  }

  /**
   * Applies movement smoothing using linear interpolation
   *
   * @param current - Current movement vector
   * @param previous - Previous movement vector
   * @param factor - Smoothing factor (0-1)
   * @returns Smoothed movement vector
   *
   * @remarks
   * Lower factor values result in smoother movement but more latency.
   * Higher values are more responsive but less smooth.
   *
   * @example
   * ```typescript
   * const smoothed = MovementProcessor.smoothDelta(
   *   { x: 10, y: 5 },
   *   { x: 0, y: 0 },
   *   0.2
   * );
   * ```
   */
  static smoothDelta(
    current: Vector2D,
    previous: Vector2D,
    factor: number
  ): Vector2D {
    return {
      x: current.x * factor + previous.x * (1 - factor),
      y: current.y * factor + previous.y * (1 - factor),
    };
  }

  /**
   * Caps a value to a maximum magnitude while preserving sign
   *
   * @param value - Value to cap
   * @param max - Maximum allowed magnitude
   * @returns Capped value
   *
   * @example
   * ```typescript
   * const capped = MovementProcessor.capValue(100, 50); // 50
   * const capped2 = MovementProcessor.capValue(-100, 50); // -50
   * ```
   */
  static capValue(value: number, max: number): number {
    return Math.min(Math.abs(value), max) * Math.sign(value);
  }
}
