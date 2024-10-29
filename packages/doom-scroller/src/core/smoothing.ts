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
 * - Separate movement and velocity smoothing
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
 */
export class SmoothingEngine {
  /** Movement smoothing configuration */
  private readonly movementConfig: Required<{
    active: boolean;
    factor: number;
    samples: number;
    algorithm: "linear" | "exponential";
  }>;

  /** Velocity smoothing configuration */
  private readonly velocityConfig: Required<{
    active: boolean;
    factor: number;
    samples: number;
    algorithm: "linear" | "exponential";
  }>;

  /** Array of historical movement samples */
  private movementSamples: Vector2D[];

  /** Array of historical velocity samples */
  private velocitySamples: Vector2D[];

  /** Current smoothed movement value */
  private currentMovement: Vector2D;

  /** Current smoothed velocity value */
  private currentVelocity: Vector2D;

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

  public reset(): void {
    this.movementSamples = [];
    this.velocitySamples = [];
    this.currentMovement = { x: 0, y: 0 };
    this.currentVelocity = { x: 0, y: 0 };
  }

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
