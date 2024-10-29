/**
 * @fileoverview StepsManager module for handling step-based scroll navigation
 * @module core/steps
 *
 * @description
 * The StepsManager module provides functionality for dividing scroll content into
 * discrete steps or sections. This is particularly useful for:
 *
 * - Creating paginated scroll experiences
 * - Building section-based navigation
 * - Implementing scroll snapping behavior
 * - Managing scroll-based presentations
 *
 * Key Features:
 * - Viewport-based step size calculation
 * - Movement and velocity-based triggers
 * - Delta and absolute movement modes
 * - Accumulated movement tracking
 * - Step boundary calculations
 *
 * Architecture:
 * The module uses a state machine approach where:
 * 1. Movement/velocity inputs are tracked
 * 2. Thresholds are checked
 * 3. Step changes are triggered
 * 4. Step boundaries are calculated
 *
 * Performance Considerations:
 * - Minimal state management
 * - Efficient boundary calculations
 * - Optimized threshold checks
 * - Memory-efficient tracking
 *
 * Browser Compatibility:
 * - Modern browsers (Chrome 60+, Firefox 55+, Safari 11+)
 * - Fallback support for older browsers
 * - Mobile device support
 *
 * @see {@link DoomScroller} for high-level scroll management
 * @see {@link DataProcessor} for movement processing
 * @see {@link VelocityCalculator} for velocity calculations
 */

import type { Vector2D, Step } from "../types";

/**
 * StepsManager class for managing scroll steps and snapping behavior
 *
 * @class StepsManager
 * @description
 * The StepsManager provides functionality to divide scrolling into discrete steps,
 * useful for creating paginated or sectioned scroll experiences. It supports both
 * absolute and delta-based movement modes and can trigger step changes based on
 * either movement thresholds or velocity thresholds.
 *
 * Implementation Details:
 * - Uses viewport height for step size calculation
 * - Supports both movement and velocity triggers
 * - Handles accumulated delta tracking
 * - Manages step boundary calculations
 * - Provides step change notifications
 *
 * Common Use Cases:
 * 1. Single-page presentations
 * 2. Section-based navigation
 * 3. Scroll-snap containers
 * 4. Paginated content
 *
 * Performance Optimizations:
 * - Minimal state updates
 * - Efficient threshold checks
 * - Optimized boundary calculations
 * - Memory-efficient tracking
 *
 * @example
 * ```typescript
 * // Basic usage with absolute movement mode
 * const manager = new StepsManager({
 *   active: true,
 *   movementMode: 'absolute',
 *   movementThreshold: 100,
 *   velocityThreshold: 0.5
 * });
 *
 * // Update based on scroll position and velocity
 * const step = manager.update(
 *   { x: 0, y: 500 },  // position
 *   { x: 0, y: 0.2 }   // velocity
 * );
 *
 * if (step) {
 *   console.log(`Current step: ${step.index}`);
 *   console.log(`Step boundaries: ${step.start.y} to ${step.end.y}`);
 *   console.log(`Triggered by: ${step.trigger}`);
 * }
 * ```
 *
 * @see {@link Step} for step information structure
 * @see {@link Vector2D} for position and velocity types
 */
export class StepsManager {
  /**
   * Whether step detection is active
   * @private
   * @readonly
   */
  private readonly active: boolean;

  /**
   * Mode for movement calculation
   * @private
   * @readonly
   * @type {"delta" | "absolute"}
   */
  private readonly movementMode: "delta" | "absolute";

  /**
   * Threshold for movement-based step triggers
   * @private
   * @readonly
   */
  private readonly movementThreshold: number;

  /**
   * Threshold for velocity-based step triggers
   * @private
   * @readonly
   */
  private readonly velocityThreshold: number;

  /**
   * Current step index
   * @private
   */
  private currentStep: number;

  /**
   * Size of each step (typically viewport height)
   * @private
   */
  private stepSize: number;

  /**
   * Last recorded position
   * @private
   */
  private lastPosition: Vector2D;

  /**
   * Accumulated movement for delta mode
   * @private
   */
  private accumulatedDelta: number;

  /**
   * Creates a new StepsManager instance
   *
   * @param {Object} options - Configuration options
   * @param {boolean} [options.active=false] - Whether step detection is initially active
   * @param {"delta" | "absolute"} [options.movementMode="absolute"] - Mode for movement calculation
   * @param {number} [options.movementThreshold=0] - Threshold for movement-based triggers
   * @param {number} [options.velocityThreshold=0] - Threshold for velocity-based triggers
   *
   * @example
   * ```typescript
   * // Create with delta movement mode
   * const deltaManager = new StepsManager({
   *   active: true,
   *   movementMode: 'delta',
   *   movementThreshold: 50,
   *   velocityThreshold: 0.3
   * });
   * ```
   */
  constructor(
    options: {
      active?: boolean;
      movementMode?: "delta" | "absolute";
      movementThreshold?: number;
      velocityThreshold?: number;
    } = {}
  ) {
    this.active = options.active ?? false;
    this.movementMode = options.movementMode ?? "absolute";
    this.movementThreshold = options.movementThreshold ?? 0;
    this.velocityThreshold = options.velocityThreshold ?? 0;
    this.currentStep = 0;
    this.stepSize = 0;
    this.lastPosition = { x: 0, y: 0 };
    this.accumulatedDelta = 0;
  }

  /**
   * Update step based on current scroll position and velocity
   *
   * @param {Vector2D} position - Current scroll position
   * @param {Vector2D} velocity - Current scroll velocity
   * @returns {Step | undefined} Step information if a step change occurred, undefined otherwise
   *
   * @description
   * Processes the current scroll position and velocity to determine if a step change
   * should occur. Step changes can be triggered by either exceeding the movement threshold
   * or the velocity threshold. In delta mode, movements are accumulated until they
   * exceed the threshold.
   *
   * The returned Step object includes:
   * - index: Current step number
   * - size: Step size (typically viewport height)
   * - start: Starting coordinates of the step
   * - end: Ending coordinates of the step
   * - trigger: What triggered the step change ("movement" or "velocity")
   *
   * @example
   * ```typescript
   * const step = manager.update(
   *   { x: 0, y: 750 },    // Current position
   *   { x: 0, y: 0.8 }     // Current velocity
   * );
   *
   * if (step) {
   *   console.log(`Now on step ${step.index}`);
   *   console.log(`Triggered by ${step.trigger}`);
   * }
   * ```
   */
  public update(position: Vector2D, velocity: Vector2D): Step | undefined {
    if (!this.active) return undefined;

    // Calculate step size based on viewport if not set
    if (this.stepSize === 0) {
      this.stepSize = window.innerHeight;
    }

    // Check movement threshold first
    let trigger: "movement" | "velocity" | undefined;

    if (this.movementMode === "delta") {
      this.accumulatedDelta += Math.abs(position.y);
      if (this.accumulatedDelta >= this.movementThreshold) {
        trigger = "movement";
        this.accumulatedDelta = 0;
      }
    } else {
      const absoluteMovement = Math.abs(position.y - this.lastPosition.y);
      if (absoluteMovement >= this.movementThreshold) {
        trigger = "movement";
      }
    }

    // Only check velocity if movement threshold wasn't met
    if (!trigger) {
      const velocityMagnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      if (velocityMagnitude >= this.velocityThreshold) {
        trigger = "velocity";
      }
    }

    // Calculate effective position
    const effectivePosition =
      this.movementMode === "delta"
        ? {
            x: this.lastPosition.x + position.x,
            y: this.lastPosition.y + position.y,
          }
        : position;

    // Calculate new step
    const newStep = Math.floor(effectivePosition.y / this.stepSize);

    // Store current position
    this.lastPosition = effectivePosition;

    // Return step info if there's a trigger OR step change
    if (trigger || newStep !== this.currentStep) {
      this.currentStep = newStep;
      return {
        index: this.currentStep,
        size: this.stepSize,
        start: {
          x: 0,
          y: this.currentStep * this.stepSize,
        },
        end: {
          x: window.innerWidth,
          y: (this.currentStep + 1) * this.stepSize,
        },
        trigger,
      };
    }

    return undefined;
  }

  /**
   * Reset manager state to initial values
   *
   * @description
   * Resets all internal state including:
   * - Current step index
   * - Step size
   * - Last position
   * - Accumulated delta
   *
   * Use this when you need to reset the scroll experience or clear the manager's state.
   *
   * @example
   * ```typescript
   * // Reset manager state
   * manager.reset();
   * ```
   */
  public reset(): void {
    this.currentStep = 0;
    this.stepSize = 0;
    this.lastPosition = { x: 0, y: 0 };
    this.accumulatedDelta = 0; // Reset accumulated delta
  }

  /**
   * Get current step information
   *
   * @returns {Step} Current step information
   *
   * @description
   * Returns information about the current step without performing any updates.
   * This includes the step's index, size, and boundary coordinates.
   *
   * @example
   * ```typescript
   * const currentStep = manager.getCurrentStep();
   * console.log(`Current step: ${currentStep.index}`);
   * console.log(`Step boundaries: ${currentStep.start.y} to ${currentStep.end.y}`);
   * ```
   */
  public getCurrentStep(): Step {
    return {
      index: this.currentStep,
      size: this.stepSize,
      start: {
        x: 0,
        y: this.currentStep * this.stepSize,
      },
      end: {
        x: window.innerWidth,
        y: (this.currentStep + 1) * this.stepSize,
      },
    };
  }
}
