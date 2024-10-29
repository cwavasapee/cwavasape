/**
 * @fileoverview DataProcessor module for handling scroll, touch, and mouse event data processing
 * @module core/dataProcessor
 */

import type { Vector2D } from "../types";
import type { ScrollEventData } from "../types/events";

/**
 * Configuration options for movement processing
 *
 * @typedef {Object} MovementConfig
 * @property {number} [threshold] - Minimum threshold for considering movement significant
 * @property {number} [samples] - Number of samples to use for movement calculations
 * @property {Object} [smoothing] - Smoothing configuration for movement
 * @property {boolean} [smoothing.active] - Whether smoothing is enabled
 * @property {number} [smoothing.factor] - Smoothing factor between 0 and 1
 * @property {number} [smoothing.samples] - Number of samples for smoothing
 * @property {string} [smoothing.algorithm] - Smoothing algorithm to use
 */

/**
 * Configuration options for velocity processing
 *
 * @typedef {Object} VelocityConfig
 * @property {number} [min] - Minimum velocity value
 * @property {number} [max] - Maximum velocity value
 * @property {string} [algorithm] - Velocity calculation algorithm
 * @property {Object} [smoothing] - Smoothing configuration for velocity
 * @property {boolean} [smoothing.active] - Whether smoothing is enabled
 * @property {number} [smoothing.factor] - Smoothing factor between 0 and 1
 * @property {number} [smoothing.samples] - Number of samples for smoothing
 * @property {string} [smoothing.algorithm] - Smoothing algorithm to use
 */

/**
 * DataProcessor class for processing raw scroll event data
 * @class
 *
 * @description
 * The DataProcessor class handles the transformation and processing of raw scroll, touch,
 * and mouse events into normalized coordinate data. It maintains state between events
 * to calculate delta movements and provides consistent output regardless of input event type.
 *
 * Key features:
 * - Processes wheel, touch, and mouse events uniformly
 * - Calculates delta movements between events
 * - Handles both absolute positions and relative movements
 * - Maintains internal state for continuous tracking
 * - Handles edge cases and initial events gracefully
 * - Provides smooth transition between different input methods
 *
 * Processing Pipeline:
 * 1. Event Reception: Receives raw event data from various input sources
 * 2. Type Normalization: Converts different event types into a standard format
 * 3. Delta Calculation: Computes movement deltas based on event type
 * 4. Movement Thresholding: Applies significance thresholds to movements
 * 5. State Management: Updates internal state for continuous tracking
 * 6. Output Generation: Produces normalized position and delta values
 *
 * Performance Characteristics:
 * - O(1) time complexity for event processing
 * - Constant memory usage regardless of event frequency
 * - Minimal garbage collection impact
 * - Thread-safe state management
 *
 * @example
 * ```typescript
 * const processor = new DataProcessor();
 *
 * // Process a wheel event
 * const wheelResult = processor.process({
 *   type: 'wheel',
 *   timestamp: Date.now(),
 *   position: { x: 100, y: 100 },
 *   delta: { x: 10, y: -10 }
 * });
 *
 * // Process a touch event
 * const touchResult = processor.process({
 *   type: 'touch',
 *   timestamp: Date.now(),
 *   position: { x: 150, y: 150 }
 * });
 * ```
 *
 * @see {@link EventHandler} for event capture and normalization
 * @see {@link VelocityCalculator} for velocity computation
 * @see {@link SmoothingEngine} for movement smoothing
 */
export class DataProcessor {
  /**
   * Last recorded position from previous event
   * Used to calculate position-based deltas for touch/mouse events
   * @private
   */
  private lastPosition: Vector2D = { x: 0, y: 0 };

  /**
   * Accumulated position from delta movements
   * Used to calculate position-based deltas for touch/mouse events
   * @private
   */
  private accumulatedPosition: Vector2D = { x: 0, y: 0 };

  /**
   * Flag to track if it's the first event
   * Ensures proper delta calculation initialization
   * @private
   */
  private firstEvent: boolean = true;

  /**
   * Last movement time
   * Used to determine if movement is significant
   * @private
   */
  private lastMovementTime: number = 0;

  /**
   * Movement timeout in milliseconds
   * Used to determine if movement is significant
   * @private
   */
  private readonly MOVEMENT_TIMEOUT = 150; // ms

  /**
   * Movement threshold
   * Used to determine if movement is significant
   * @private
   */
  private MOVEMENT_THRESHOLD = 0.2; // Increased from 0.001 to better handle small movements

  /**
   * Creates a new DataProcessor instance
   *
   * @description
   * Initializes a new processor with zeroed state. The processor will begin
   * calculating deltas from the first event it receives. Initial state includes:
   * - Zeroed last position coordinates
   * - First event flag set to true
   * - No accumulated delta values
   */
  constructor(config?: {
    movement?: {
      threshold?: number;
      samples?: number;
      smoothing?: {
        active?: boolean;
        factor?: number;
        samples?: number;
        algorithm?: string;
      };
    };
    velocity?: {
      min?: number;
      max?: number;
      algorithm?: string;
      smoothing?: {
        active?: boolean;
        factor?: number;
        samples?: number;
        algorithm?: string;
      };
    };
  }) {
    // Apply threshold from config if provided
    if (config?.movement?.threshold !== undefined) {
      this.MOVEMENT_THRESHOLD = config.movement.threshold;
    }
    this.reset();
  }

  private roundToFixed(value: number, precision: number = 3): number {
    return Number(value.toFixed(precision));
  }

  private validateInput(data: ScrollEventData): void {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid event data provided");
    }

    if (!data.timestamp || typeof data.timestamp !== "number") {
      throw new Error("Invalid timestamp in event data");
    }

    if (
      !data.position ||
      typeof data.position.x !== "number" ||
      typeof data.position.y !== "number"
    ) {
      throw new Error("Invalid position data in event");
    }
  }

  /**
   * Process raw event data into normalized position and delta values
   *
   * @param event - Raw scroll event data to process
   * @returns Object containing normalized position and delta values
   *
   * @description
   * Takes raw event data and processes it into normalized position and delta values.
   * For wheel events, uses the provided delta values directly. For touch and mouse
   * events, calculates delta from position changes.
   *
   * Processing steps:
   * 1. Extract position from event
   * 2. Handle first event case (zero delta)
   * 3. Calculate position-based delta if needed
   * 4. Use explicit delta values for wheel events
   * 5. Update internal state
   * 6. Return normalized results
   *
   * The method handles different event types consistently:
   * - Wheel events: Uses provided delta values
   * - Touch/Mouse events: Calculates delta from position changes
   * - First event: Returns zero delta to prevent jumps
   *
   * @example
   * ```typescript
   * const processor = new DataProcessor();
   *
   * // Process a wheel event with explicit delta
   * const result = processor.process({
   *   type: 'wheel',
   *   timestamp: Date.now(),
   *   position: { x: 0, y: 0 },
   *   delta: { x: -10, y: 20 }
   * });
   *
   * console.log(result.delta); // { x: -10, y: 20 }
   *
   * // Process a touch event (position-based delta)
   * const touchResult = processor.process({
   *   type: 'touch',
   *   timestamp: Date.now(),
   *   position: { x: 100, y: 100 }
   * });
   * ```
   */
  public process(event: ScrollEventData): {
    position: Vector2D;
    delta: Vector2D;
  } {
    this.validateInput(event);

    try {
      // Handle end events first
      if (event.type === "end") {
        this.reset();
        return {
          position: event.position,
          delta: { x: 0, y: 0 },
        };
      }

      const currentPosition = event.position || this.lastPosition;
      let delta: Vector2D;

      if (this.firstEvent) {
        delta = { x: 0, y: 0 };
        if (event.type === "wheel" && event.delta) {
          this.accumulatedPosition = event.delta;
        } else {
          this.accumulatedPosition = currentPosition;
        }
        this.firstEvent = false;
      } else if (event.type === "wheel" && event.delta) {
        delta = event.delta;
        this.accumulatedPosition = {
          x: this.accumulatedPosition.x + delta.x,
          y: this.accumulatedPosition.y + delta.y,
        };
      } else {
        delta = {
          x: this.roundToFixed(currentPosition.x - this.lastPosition.x),
          y: this.roundToFixed(currentPosition.y - this.lastPosition.y),
        };
        this.accumulatedPosition = currentPosition;
      }

      // Check if movement is significant
      const hasSignificantMovement =
        Math.abs(delta.x) > this.MOVEMENT_THRESHOLD ||
        Math.abs(delta.y) > this.MOVEMENT_THRESHOLD;

      if (hasSignificantMovement) {
        delta = {
          x: delta.x * 0.7,
          y: delta.y * 0.7,
        };
        this.lastMovementTime = event.timestamp;
      } else if (
        event.timestamp - this.lastMovementTime >
        this.MOVEMENT_TIMEOUT
      ) {
        // If no significant movement for a while, zero out all movement values
        delta = { x: 0, y: 0 };
        // Also update the last position to current to prevent residual movement
        this.lastPosition = currentPosition;
        return {
          position: this.accumulatedPosition,
          delta: { x: 0, y: 0 },
        };
      }

      this.lastPosition = currentPosition;

      return {
        position: this.accumulatedPosition,
        delta: {
          x: this.roundToFixed(delta.x),
          y: this.roundToFixed(delta.y),
        },
      };
    } catch (error) {
      console.error("Error processing scroll event:", error);
      // Return safe default values
      return {
        delta: { x: 0, y: 0 },
        position: { ...event.position },
      };
    }
  }

  /**
   * Reset processor state to initial values
   *
   * @description
   * Resets all internal state to initial values. This is useful when:
   * - Stopping and restarting scroll tracking
   * - Clearing accumulated state
   * - Handling component unmount/cleanup
   * - Switching between different scroll areas
   * - Recovering from error states
   *
   * Reset actions:
   * - Zeros out last position coordinates
   * - Resets first event flag
   * - Clears any accumulated state
   *
   * After reset, the processor will treat the next event as if it were
   * the first event received, ensuring smooth restart of tracking.
   *
   * @example
   * ```typescript
   * const processor = new DataProcessor();
   *
   * // Process some events...
   *
   * // Reset state
   * processor.reset();
   *
   * // Next event will be treated as first event
   * const result = processor.process({
   *   type: 'touch',
   *   timestamp: Date.now(),
   *   position: { x: 100, y: 100 }
   * });
   * ```
   */
  public reset(): void {
    this.lastPosition = { x: 0, y: 0 };
    this.accumulatedPosition = { x: 0, y: 0 };
    this.firstEvent = true;
  }
}
