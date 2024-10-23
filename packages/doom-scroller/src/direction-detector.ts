import type {
  DirectionState,
  HorizontalDirection,
  VerticalDirection,
} from "./types";

/**
 * Handles the detection and smoothing of scroll directions
 * @internal
 */
export class DirectionDetector {
  private readonly threshold: number;
  private readonly smoothingFactor: number;
  private lastDirection: DirectionState;
  private readonly minDeltaForChange: number;

  constructor(threshold: number = 0.1, smoothingFactor: number = 0.3) {
    this.threshold = threshold;
    this.smoothingFactor = smoothingFactor;
    this.lastDirection = { x: "none", y: "none" };
    this.minDeltaForChange = 0.5;
  }

  /**
   * Determines the horizontal direction based on delta value
   * @internal
   */
  private getHorizontalDirection(delta: number): HorizontalDirection {
    if (Math.abs(delta) < this.minDeltaForChange) {
      return this.lastDirection.x;
    }
    return delta > this.threshold
      ? "right"
      : delta < -this.threshold
        ? "left"
        : "none";
  }

  /**
   * Determines the vertical direction based on delta value
   * @internal
   */
  private getVerticalDirection(delta: number): VerticalDirection {
    if (Math.abs(delta) < this.minDeltaForChange) {
      return this.lastDirection.y;
    }
    return delta > this.threshold
      ? "down"
      : delta < -this.threshold
        ? "up"
        : "none";
  }

  /**
   * Detects the current scroll direction based on delta values
   * @internal
   */
  detectDirection(delta: { x: number; y: number }): DirectionState {
    const newDirection: DirectionState = {
      x: this.getHorizontalDirection(delta.x),
      y: this.getVerticalDirection(delta.y),
    };

    if (
      Math.abs(delta.x) > this.minDeltaForChange ||
      Math.abs(delta.y) > this.minDeltaForChange
    ) {
      this.lastDirection = newDirection;
    }

    return this.lastDirection;
  }

  /**
   * Resets the direction detector state
   * @internal
   */
  reset(): void {
    this.lastDirection = { x: "none", y: "none" };
  }
}
