/**
 * @file Type definitions for the DoomScroller library
 */

/** Represents 2D coordinates or movements */
export interface Vector2D {
  x: number;
  y: number;
}

/** Horizontal scroll direction states */
export type HorizontalDirection = "left" | "right" | "none";

/** Vertical scroll direction states */
export type VerticalDirection = "up" | "down" | "none";

/** Combined direction state for both axes */
export interface DirectionState {
  x: HorizontalDirection;
  y: VerticalDirection;
}

/** Time-stamped position data */
export interface TimePoint extends Vector2D {
  timestamp: number;
}

/** Configuration for direction inversion */
export interface DirectionConfig {
  invertX: boolean;
  invertY: boolean;
}

/** Movement processing configuration */
export interface MovementConfig extends DirectionConfig {
  /** Speed multiplier for movement (default: 1) */
  speedMultiplier: number;
  /** Smoothing factor for movement (0-1, default: 0.2) */
  smoothingFactor: number;
  /** Threshold for direction change detection */
  directionThreshold: number;
  /** Minimum velocity to trigger movement */
  minVelocity: number;
  /** Maximum allowed velocity */
  maxVelocity: number;
  /** Number of samples to keep for calculations */
  sampleSize: number;
}

/** Momentum scrolling configuration */
export interface MomentumConfig {
  /** Enable/disable momentum scrolling */
  enabled: boolean;
  /** Duration of momentum effect in ms */
  duration: number;
  /** Friction coefficient (0-1) */
  friction: number;
  /** Minimum velocity to trigger momentum */
  minVelocity: number;
  /** Minimum touch duration for momentum */
  minTouchDuration: number;
}

/** Internal movement tracking state */
export interface MovementState {
  isActive: boolean;
  lastPosition: TimePoint | null;
  velocity: Vector2D;
  smoothDelta: Vector2D;
  rawDelta: Vector2D;
  recentPoints: TimePoint[];
}

/** Touch interaction tracking state */
export interface TouchTrackingState {
  isActive: boolean;
  activeTouch: number | null;
  touchStartTime: number | null;
}

/** Complete scroll state information */
export interface ScrollState {
  isScrolling: boolean;
  velocity: Vector2D;
  direction: DirectionState;
  delta: Vector2D;
  rawScroll: Vector2D;
}

/** Main DoomScroller configuration options */
export interface DoomScrollerOptions {
  /** Debounce time for scroll end detection (ms) */
  debounceTime?: number;
  /** Mouse wheel configuration */
  wheel?: Partial<MovementConfig>;
  /** Touch interaction configuration */
  touch?: Partial<MovementConfig & MomentumConfig>;
}
