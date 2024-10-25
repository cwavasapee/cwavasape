/**
 * @file Direction detection with smoothing and hysteresis
 */

import type {
  DirectionState,
  Vector2D,
  HorizontalDirection,
  VerticalDirection,
} from "../types";

/** Configuration for direction detection */
interface DirectionConfig {
  threshold: number;
  smoothingFactor: number;
  minDeltaForChange: number;
  sampleSize: number;
}

/**
 * Handles detection and smoothing of movement directions
 */
export class DirectionDetector {
  private readonly config: DirectionConfig;
  private lastDirection: DirectionState;
  private recentDeltas: Vector2D[] = [];

  /**
   * Creates a new direction detector instance
   *
   * @param threshold - Movement threshold for direction change
   * @param smoothingFactor - Smoothing factor (0-1)
   * @param sampleSize - Number of samples to maintain
   */
  constructor(threshold = 0.1, smoothingFactor = 0.3, sampleSize = 5) {
    this.config = {
      threshold,
      smoothingFactor,
      minDeltaForChange: 0.5,
      sampleSize,
    };
    this.lastDirection = { x: "none", y: "none" };
  }

  /**
   * Updates configuration parameters
   */
  updateConfig(config: Partial<DirectionConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Resets detector state
   */
  reset(): void {
    this.lastDirection = { x: "none", y: "none" };
    this.recentDeltas = [];
  }

  /**
   * Detects movement direction with smoothing
   */
  detectDirection(delta: Vector2D): DirectionState {
    this.recentDeltas.push(delta);
    if (this.recentDeltas.length > this.config.sampleSize) {
      this.recentDeltas.shift();
    }

    const avgDelta = this.getAverageDeltas();
    const smoothedDelta = this.getSmoothDelta(avgDelta);

    const newDirection: DirectionState = {
      x: this.getHorizontalDirection(smoothedDelta.x, this.lastDirection.x),
      y: this.getVerticalDirection(smoothedDelta.y, this.lastDirection.y),
    };

    if (this.isSignificantChange(smoothedDelta)) {
      this.lastDirection = newDirection;
    }

    return this.lastDirection;
  }

  /**
   * Calculates average movement deltas
   */
  private getAverageDeltas(): Vector2D {
    if (this.recentDeltas.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = this.recentDeltas.reduce(
      (acc, delta) => ({
        x: acc.x + delta.x,
        y: acc.y + delta.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / this.recentDeltas.length,
      y: sum.y / this.recentDeltas.length,
    };
  }

  /**
   * Applies smoothing to delta values
   */
  private getSmoothDelta(avgDelta: Vector2D): Vector2D {
    const { smoothingFactor, minDeltaForChange } = this.config;

    return {
      x:
        avgDelta.x * smoothingFactor +
        (this.lastDirection.x === "none"
          ? 0
          : this.lastDirection.x === "right"
            ? minDeltaForChange
            : -minDeltaForChange) *
          (1 - smoothingFactor),
      y:
        avgDelta.y * smoothingFactor +
        (this.lastDirection.y === "none"
          ? 0
          : this.lastDirection.y === "down"
            ? minDeltaForChange
            : -minDeltaForChange) *
          (1 - smoothingFactor),
    };
  }

  /**
   * Determines horizontal direction with hysteresis
   */
  private getHorizontalDirection(
    value: number,
    prevDirection: HorizontalDirection
  ): HorizontalDirection {
    const { threshold, minDeltaForChange } = this.config;
    const changeThreshold =
      prevDirection === "none" ? threshold : minDeltaForChange;

    if (Math.abs(value) < changeThreshold) {
      return prevDirection;
    }

    return value > threshold ? "right" : value < -threshold ? "left" : "none";
  }

  /**
   * Determines vertical direction with hysteresis
   */
  private getVerticalDirection(
    value: number,
    prevDirection: VerticalDirection
  ): VerticalDirection {
    const { threshold, minDeltaForChange } = this.config;
    const changeThreshold =
      prevDirection === "none" ? threshold : minDeltaForChange;

    if (Math.abs(value) < changeThreshold) {
      return prevDirection;
    }

    return value > threshold ? "down" : value < -threshold ? "up" : "none";
  }

  /**
   * Checks if delta change is significant enough
   */
  private isSignificantChange(delta: Vector2D): boolean {
    return (
      Math.abs(delta.x) > this.config.minDeltaForChange ||
      Math.abs(delta.y) > this.config.minDeltaForChange
    );
  }
}
