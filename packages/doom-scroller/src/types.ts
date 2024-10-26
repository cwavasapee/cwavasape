/**
 * @file Type definitions for the DoomScroller library
 * @module doom-scroller/types
 */

/**
 * Represents 2D coordinates or movements in a two-dimensional space
 * @example
 * ```typescript
 * const position: Vector2D = { x: 100, y: 200 };
 * const velocity: Vector2D = { x: -0.5, y: 1.2 };
 * ```
 */
export interface Vector2D {
  /** X-axis coordinate or movement */
  x: number;
  /** Y-axis coordinate or movement */
  y: number;
}

/**
 * Represents the possible movement directions
 * - 'positive': Movement in the positive direction (right/down)
 * - 'negative': Movement in the negative direction (left/up)
 * - 'none': No significant movement
 */
export type Direction = "positive" | "negative" | "none";

/**
 * Combined direction state for both X and Y axes
 * @example
 * ```typescript
 * const direction: DirectionState = {
 *   x: "positive", // Moving right
 *   y: "none"     // No vertical movement
 * };
 * ```
 */
export interface DirectionState {
  /** X-axis direction */
  x: Direction;
  /** Y-axis direction */
  y: Direction;
}

/**
 * Time-stamped position data used for velocity calculations
 * @internal
 */
export interface TimePoint extends Vector2D {
  /** Timestamp in milliseconds (from performance.now()) */
  timestamp: number;
}

/**
 * Configuration options for the DoomScroller
 * @example
 * ```typescript
 * const config: ScrollConfig = {
 *   speedMultiplier: 1.5,    // 50% faster than default
 *   smoothingFactor: 0.3,    // More smoothing
 *   invertY: true,           // Invert vertical scrolling
 * };
 * ```
 */
export interface ScrollConfig {
  /**
   * Speed multiplier for scroll movements
   * @default 1
   */
  speedMultiplier: number;

  /**
   * Smoothing factor for movement (0-1)
   * Higher values = more responsive but less smooth
   * Lower values = smoother but more latency
   * @default 0.2
   */
  smoothingFactor: number;

  /**
   * Minimum movement required to trigger direction change
   * @default 0.15
   */
  directionThreshold: number;

  /**
   * Minimum velocity required to trigger movement
   * @default 0.1
   */
  minVelocity: number;

  /**
   * Maximum allowed velocity
   * @default 50
   */
  maxVelocity: number;

  /**
   * Number of samples to keep for velocity calculations
   * @default 5
   */
  sampleSize: number;

  /**
   * Invert X axis movement
   * @default false
   */
  invertX: boolean;

  /**
   * Invert Y axis movement
   * @default false
   */
  invertY: boolean;

  /**
   * Time in milliseconds to wait before declaring scroll ended
   * @default 200
   */
  debounceTime: number;
}

/**
 * Current scroll state provided to subscribers
 * @example
 * ```typescript
 * scroller.subscribe((state: ScrollState) => {
 *   if (state.isScrolling) {
 *     console.log(`Moving at velocity: ${state.velocity.x}, ${state.velocity.y}`);
 *     console.log(`Direction: ${state.direction.x}, ${state.direction.y}`);
 *   }
 * });
 * ```
 */
export interface ScrollState {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Current velocity vector */
  velocity: Vector2D;
  /** Current scroll direction */
  direction: DirectionState;
  /** Smoothed delta movement */
  delta: Vector2D;
  /** Raw (unsmoothed) delta movement */
  rawDelta: Vector2D;
}

/**
 * Internal scroll tracking state
 * @internal
 */
export interface ScrollTrackingState extends ScrollState {
  /** Last recorded point */
  lastPoint: TimePoint | null;
  /** Recent movement points for velocity calculation */
  recentPoints: readonly TimePoint[];
}

/**
 * Touch tracking data for gesture detection
 * @internal
 */
export interface TouchTrackingData {
  /** Initial touch X position */
  startX: number;
  /** Initial touch Y position */
  startY: number;
  /** Touch start timestamp */
  startTime: number;
  /** Whether touch has moved enough to be considered scrolling */
  isScrolling: boolean;
}

/**
 * Configuration for touch gesture detection
 * @internal
 */
export interface TouchConfig {
  /** Minimum movement distance to start scrolling (pixels) */
  scrollThreshold: number;
  /** Maximum duration for tap detection (milliseconds) */
  tapThreshold: number;
}
