/**
 * @file Input event handling and normalization
 */

import type { Vector2D, TimePoint, TouchTrackingState } from "../types";

/**
 * Handles input event processing and normalization
 */
export class InputHandler {
  /**
   * Normalizes wheel delta values across browsers
   */
  static normalizeWheelDelta(
    event: WheelEvent,
    speedMultiplier: number,
    invertX: boolean,
    invertY: boolean
  ): Vector2D {
    let { deltaX, deltaY } = event;

    // Normalize delta modes
    switch (event.deltaMode) {
      case 1: // LINE mode
        deltaX *= 16;
        deltaY *= 16;
        break;
      case 2: // PAGE mode
        deltaX *= 100;
        deltaY *= 100;
        break;
    }

    return {
      x: deltaX * speedMultiplier * (invertX ? 1 : -1),
      y: deltaY * speedMultiplier * (invertY ? 1 : -1),
    };
  }

  /**
   * Creates a time-stamped position from touch event
   */
  static createTouchPoint(touch: Touch): TimePoint {
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: performance.now(),
    };
  }

  /**
   * Validates touch against tracking state
   */
  static isValidTouch(touch: Touch, tracking: TouchTrackingState): boolean {
    return tracking.isActive && tracking.activeTouch === touch.identifier;
  }

  /**
   * Calculates touch movement delta
   */
  static getTouchDelta(
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
   * Updates touch position state
   */
  static updateTouchState(
    lastPosition: TimePoint | null,
    touch: Touch
  ): TimePoint {
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: performance.now(),
    };
  }

  /**
   * Finds active touch in touch list
   */
  static findActiveTouch(
    touches: TouchList,
    tracking: TouchTrackingState
  ): Touch | null {
    if (!tracking.isActive) return null;

    return (
      Array.from(touches).find(
        (touch) => touch.identifier === tracking.activeTouch
      ) || null
    );
  }
}
