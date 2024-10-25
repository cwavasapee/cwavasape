/**
 * @file Movement processing and velocity calculation
 */

import type {
  MovementState,
  Vector2D,
  TimePoint,
  MovementConfig,
} from "../types";

/**
 * Handles movement processing and velocity calculations
 */
export class MovementProcessor {
  /**
   * Creates initial movement state
   */
  static createInitialState(): MovementState {
    return {
      isActive: false,
      lastPosition: null,
      velocity: { x: 0, y: 0 },
      smoothDelta: { x: 0, y: 0 },
      rawDelta: { x: 0, y: 0 },
      recentPoints: [],
    };
  }

  /**
   * Processes movement input and updates state
   */
  static processMovement(
    state: MovementState,
    rawDelta: Vector2D,
    timestamp: number,
    config: Required<MovementConfig>
  ): void {
    // Update raw delta with speed and capping
    state.rawDelta = {
      x: this.capVelocity(
        rawDelta.x * config.speedMultiplier,
        config.maxVelocity
      ),
      y: this.capVelocity(
        rawDelta.y * config.speedMultiplier,
        config.maxVelocity
      ),
    };

    // Record movement point
    const timePoint: TimePoint = {
      x: state.rawDelta.x,
      y: state.rawDelta.y,
      timestamp,
    };
    state.recentPoints.push(timePoint);

    // Maintain sample size
    while (state.recentPoints.length > config.sampleSize) {
      state.recentPoints.shift();
    }

    // Update velocity and smooth movement
    this.updateVelocity(state, config.maxVelocity);
    state.smoothDelta = this.smoothVector(
      state.rawDelta,
      state.smoothDelta,
      config.smoothingFactor
    );
  }

  /**
   * Caps velocity to maximum value
   */
  static capVelocity(velocity: number, maxVelocity: number): number {
    return Math.min(Math.max(velocity, -maxVelocity), maxVelocity);
  }

  /**
   * Applies movement smoothing
   */
  static smoothVector(
    current: Vector2D,
    previous: Vector2D,
    smoothingFactor: number
  ): Vector2D {
    return {
      x: current.x * smoothingFactor + previous.x * (1 - smoothingFactor),
      y: current.y * smoothingFactor + previous.y * (1 - smoothingFactor),
    };
  }

  /**
   * Updates velocity from recent movements
   */
  private static updateVelocity(
    state: MovementState,
    maxVelocity: number
  ): void {
    const points = state.recentPoints;

    if (points.length < 2) {
      state.velocity = { x: 0, y: 0 };
      return;
    }

    let totalWeight = 0;
    let weightedVelX = 0;
    let weightedVelY = 0;

    // Safely iterate over point pairs
    for (let i = 1; i < points.length; i++) {
      // Safely get current and previous points
      const currentPoint = points[i];
      const previousPoint = points[i - 1];

      // Extra type guard for TypeScript
      if (!currentPoint || !previousPoint) {
        continue;
      }

      const timeDelta = currentPoint.timestamp - previousPoint.timestamp;
      if (timeDelta <= 0) {
        continue;
      }

      // Calculate instantaneous velocity
      const instantVelX = (currentPoint.x - previousPoint.x) / timeDelta;
      const instantVelY = (currentPoint.y - previousPoint.y) / timeDelta;

      // Apply progressive weighting (more recent = higher weight)
      const weight = Math.pow(i / (points.length - 1), 2);
      weightedVelX += instantVelX * weight;
      weightedVelY += instantVelY * weight;
      totalWeight += weight;
    }

    // Update state with weighted average velocity
    if (totalWeight === 0) {
      state.velocity = { x: 0, y: 0 };
    } else {
      state.velocity = {
        x: this.capVelocity(weightedVelX / totalWeight, maxVelocity),
        y: this.capVelocity(weightedVelY / totalWeight, maxVelocity),
      };
    }
  }
}
