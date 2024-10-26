/**
 * @file Input event normalization and processing
 * @module doom-scroller/input-handler
 */

import type { Vector2D, TimePoint } from "../types";

/**
 * Handles input event normalization and processing for different input types
 * @remarks
 * This class provides utility methods for normalizing different input events
 * (wheel and touch) into a consistent format for the scroller to process.
 */
export class InputHandler {
  /**
   * Normalizes wheel input across different browsers and input devices
   *
   * @param event - The wheel event to normalize
   * @param speedMultiplier - Speed multiplier for the movement
   * @param invertX - Whether to invert X axis movement
   * @param invertY - Whether to invert Y axis movement
   *
   * @returns Normalized movement vector
   *
   * @remarks
   * Handles different delta modes:
   * - mode 0: pixel units
   * - mode 1: line units (multiplied by 16)
   * - mode 2: page units (multiplied by 100)
   *
   * @example
   * ```typescript
   * element.addEventListener('wheel', (e) => {
   *   const movement = InputHandler.normalizeWheel(e, 1, false, false);
   *   console.log('Normalized movement:', movement);
   * });
   * ```
   */
  static normalizeWheel(
    event: WheelEvent,
    speedMultiplier: number,
    invertX: boolean,
    invertY: boolean
  ): Vector2D {
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;

    return {
      x: event.deltaX * factor * speedMultiplier * (invertX ? 1 : -1),
      y: event.deltaY * factor * speedMultiplier * (invertY ? 1 : -1),
    };
  }

  /**
   * Processes touch movement into normalized coordinates
   *
   * @param touch - Current touch event data
   * @param lastPoint - Previous touch position with timestamp
   * @param speedMultiplier - Speed multiplier for the movement
   * @param invertX - Whether to invert X axis movement
   * @param invertY - Whether to invert Y axis movement
   *
   * @returns Normalized movement vector
   *
   * @example
   * ```typescript
   * element.addEventListener('touchmove', (e) => {
   *   const touch = e.touches[0];
   *   const movement = InputHandler.processTouch(
   *     touch,
   *     lastPoint,
   *     1,
   *     false,
   *     false
   *   );
   * });
   * ```
   */
  static processTouch(
    touch: Touch,
    lastPoint: TimePoint,
    speedMultiplier: number,
    invertX: boolean,
    invertY: boolean
  ): Vector2D {
    return {
      x: (lastPoint.x - touch.clientX) * speedMultiplier * (invertX ? 1 : -1),
      y: (lastPoint.y - touch.clientY) * speedMultiplier * (invertY ? 1 : -1),
    };
  }

  /**
   * Creates a time-stamped point from coordinates
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   *
   * @returns TimePoint with current timestamp
   *
   * @example
   * ```typescript
   * const point = InputHandler.createTimePoint(100, 200);
   * console.log(point); // { x: 100, y: 200, timestamp: 1234567890 }
   * ```
   */
  static createTimePoint(x: number, y: number): TimePoint {
    return {
      x,
      y,
      timestamp: performance.now(),
    };
  }
}
