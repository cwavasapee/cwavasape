/**
 * Represents the possible horizontal scroll directions
 */
export type HorizontalDirection = "left" | "right" | "none";

/**
 * Represents the possible vertical scroll directions
 */
export type VerticalDirection = "up" | "down" | "none";

/**
 * Combined state of both horizontal and vertical scroll directions
 */
export interface DirectionState {
  /** Horizontal direction of scrolling */
  x: HorizontalDirection;
  /** Vertical direction of scrolling */
  y: VerticalDirection;
}

/**
 * Represents the complete state of scrolling at any given moment
 */
export interface ScrollState {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Current velocity in pixels per millisecond */
  velocity: {
    x: number;
    y: number;
  };
  /** Current scroll direction state */
  direction: DirectionState;
  /** Change in scroll position since last update */
  delta: {
    x: number;
    y: number;
  };
  /** Raw scroll values from the wheel event */
  rawScroll: {
    x: number;
    y: number;
  };
}

/**
 * Configuration options for the DoomScroller instance
 */
export interface DoomScrollerOptions {
  /** Multiplier for scroll speed. Default: 1 */
  speedMultiplier?: number;
  /** Number of samples to keep for smoothing. Default: 5 */
  sampleSize?: number;
  /** Minimum velocity to register as movement. Default: 0.1 */
  minVelocity?: number;
  /** Threshold for direction change detection. Default: 0.15 */
  directionThreshold?: number;
  /** Factor for smoothing scroll movements. Default: 0.3 */
  smoothingFactor?: number;
  /** Time in ms to wait before considering scroll ended. Default: 150 */
  debounceTime?: number;
}
