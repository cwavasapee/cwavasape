/**
 * @fileoverview Core type definitions for the DoomScroller library
 * @module types
 * @description
 * This module contains all the core type definitions used throughout the DoomScroller library.
 * It defines interfaces for vectors, directions, configuration options, steps, and output data.
 */

/**
 * Vector2D interface for x,y coordinates
 *
 * @interface Vector2D
 * @description
 * Represents a 2D vector with x and y coordinates. Used throughout the library
 * for positions, velocities, and deltas.
 *
 * @example
 * ```typescript
 * const position: Vector2D = { x: 100, y: 200 };
 * const velocity: Vector2D = { x: 0.5, y: -0.3 };
 * ```
 */
export interface Vector2D {
  /** X-axis coordinate or value */
  x: number;
  /** Y-axis coordinate or value */
  y: number;
}

/**
 * Direction type for scroll directions
 *
 * @interface Direction
 * @description
 * Represents the current scroll or movement direction on both x and y axes.
 * Each axis can be moving in a positive direction, negative direction, or not moving.
 *
 * @example
 * ```typescript
 * const direction: Direction = { x: "right", y: "none" };
 * ```
 */
export interface Direction {
  /** X-axis direction: left, right, or none */
  x: "left" | "right" | "none";
  /** Y-axis direction: up, down, or none */
  y: "up" | "down" | "none";
}

/**
 * Options interface for DoomScroller configuration
 *
 * @interface Options
 * @description
 * Configuration options for the DoomScroller instance. Controls various aspects
 * of scroll tracking, smoothing, velocity calculation, and step detection.
 *
 * @example
 * ```typescript
 * const options: Options = {
 *   speedMultiplier: 1.5,
 *   smoothing: {
 *     active: true,
 *     factor: 0.3,
 *     algorithm: "exponential"
 *   },
 *   events: {
 *     wheel: true,
 *     touch: true
 *   }
 * };
 * ```
 */
export interface Options {
  /** Multiplier for scroll speed (default: 1) */
  speedMultiplier?: number;
  /** Time in ms to wait before considering scroll ended (default: 500) */
  debounceTime?: number;
  /** Event handling configuration */
  events?: {
    /** Enable wheel event tracking (default: true) */
    wheel?: boolean;
    /** Enable touch event tracking (default: true) */
    touch?: boolean;
    /** Enable mouse event tracking (default: false) */
    mouse?: boolean;
    /** Enable passive event listeners (default: true) */
    passive?: boolean;
    /** Delay before considering scroll ended (default: 0) */
    endDelay?: number;
  };
  /** Movement smoothing configuration */
  smoothing?: {
    /** Enable smoothing (default: true) */
    active?: boolean;
    /** Smoothing factor between 0 and 1 (default: 0.3) */
    factor?: number;
    /** Minimum movement threshold (default: 0.1) */
    threshold?: number;
    /** Number of samples for smoothing calculation (default: 5) */
    samples?: number;
    /** Smoothing algorithm selection (default: "linear") */
    algorithm?: "linear" | "exponential";
  };
  /** Velocity calculation configuration */
  velocity?: {
    /** Minimum velocity value (default: 0) */
    min?: number;
    /** Maximum velocity value (default: 1) */
    max?: number;
    /** Velocity calculation algorithm (default: "linear") */
    algorithm?: "linear" | "exponential";
  };
  /** Direction detection configuration */
  direction?: {
    /** Direction change threshold (default: 0.1) */
    threshold?: number;
    /** Number of samples for direction detection (default: 5) */
    samples?: number;
  };
  /** Step detection configuration */
  steps?: {
    /** Enable step detection (default: false) */
    active?: boolean;
    /** Step detection mode (default: "absolute") */
    movementMode?: "delta" | "absolute";
    /** Movement threshold for step detection */
    movementThreshold?: number;
    /** Velocity threshold for step detection */
    velocityThreshold?: number;
  };
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Step interface for scroll steps
 *
 * @interface Step
 * @description
 * Represents a discrete step in scrolling movement. Used when step detection
 * is enabled to divide scrolling into distinct segments.
 *
 * @example
 * ```typescript
 * const step: Step = {
 *   index: 2,
 *   size: 100,
 *   start: { x: 200, y: 0 },
 *   end: { x: 300, y: 0 },
 *   trigger: "movement"
 * };
 * ```
 */
export interface Step {
  /** Step index number */
  index: number;
  /** Size of the step in pixels */
  size?: number;
  /** Starting coordinates of the step */
  start?: Vector2D;
  /** Ending coordinates of the step */
  end?: Vector2D;
  /** What triggered the step change */
  trigger?: "movement" | "velocity";
}

/**
 * ScrollState interface for scroll data
 *
 * @interface ScrollState
 * @description
 * Complete output data structure containing all information about the current
 * scroll state, including position, velocity, direction, and step information.
 *
 * @example
 * ```typescript
 * const scrollState: ScrollState = {
 *   isScrolling: true,
 *   viewport: { x: 1920, y: 1080 },
 *   position: { x: 100, y: 200 },
 *   movement: { x: 10, y: 20 },
 *   velocity: { x: 0.5, y: 0.3 },
 *   direction: { x: "right", y: "down" },
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface ScrollState {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Current viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
  /** Current absolute position */
  position: Vector2D;
  /** Movement delta since last update */
  movement: Vector2D;
  /** Current velocity vector */
  velocity: Vector2D;
  /** Current movement direction */
  direction: Direction;
  /** Current step information (if steps enabled) */
  step?: number;
  /** Timestamp of the last update */
  timestamp: number;
}

// Re-export event types
export type { ScrollEventData, ScrollEventType } from "./events";
