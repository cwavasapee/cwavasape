/**
 * @fileoverview Core type definitions for the DoomScroller library
 * @module types
 *
 * @description
 * This module contains all core TypeScript type definitions used throughout the DoomScroller library.
 * It provides strongly-typed interfaces for:
 * - Vector coordinates and movements
 * - Scroll directions and states
 * - Configuration options
 * - Step tracking
 * - Viewport dimensions
 *
 * The types are designed to:
 * - Ensure type safety across the library
 * - Provide clear documentation and examples
 * - Support IDE autocompletion
 * - Enable strict type checking
 *
 * Key Features:
 * - Comprehensive configuration options
 * - Flexible event handling setup
 * - Customizable smoothing algorithms
 * - Advanced step detection configuration
 * - Detailed scroll state tracking
 *
 * Common Use Cases:
 * 1. Configuring scroll behavior
 * 2. Type-safe event handling
 * 3. State management
 * 4. Animation control
 *
 * @see {@link DoomScroller} for the main class implementation
 * @see {@link DataProcessor} for movement processing
 * @see {@link EventHandler} for event management
 */

/**
 * Vector2D interface for x,y coordinates
 *
 * @interface Vector2D
 * @description
 * Represents a 2D vector with x and y coordinates. Used throughout the library
 * for positions, velocities, and deltas. This interface is fundamental to:
 * - Tracking scroll positions
 * - Calculating movement deltas
 * - Managing velocities
 * - Handling touch/mouse coordinates
 *
 * Implementation Details:
 * - Both x and y are required numbers
 * - Values can be positive or negative
 * - Used in both input and output operations
 * - Supports floating-point precision
 *
 * Common Use Cases:
 * 1. Scroll position tracking
 * 2. Velocity calculations
 * 3. Movement delta storage
 * 4. Touch/mouse position tracking
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
 * Key Features:
 * - Independent x and y axis tracking
 * - Three states per axis (positive, negative, none)
 * - Type-safe direction values
 * - Clear semantic meaning
 *
 * Use Cases:
 * 1. Directional animation triggers
 * 2. Scroll-based navigation
 * 3. Direction-dependent behaviors
 * 4. UI feedback systems
 *
 * @example
 * ```typescript
 * const direction: Direction = { x: "right", y: "none" };
 * ```
 *
 * @see {@link DirectionDetector} for direction calculation implementation
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
 * Comprehensive configuration options for the DoomScroller instance. Controls various aspects
 * of scroll tracking, smoothing, velocity calculation, and step detection.
 *
 * Configuration Categories:
 * 1. Core Settings
 *    - Speed multiplier
 *    - Debounce timing
 *    - Debug mode
 *
 * 2. Event Handling
 *    - Input method selection
 *    - Passive event options
 *    - End event delays
 *
 * 3. Movement Processing
 *    - Threshold configuration
 *    - Sample size control
 *    - Smoothing options
 *
 * 4. Velocity Calculations
 *    - Range limits
 *    - Algorithm selection
 *    - Smoothing parameters
 *
 * 5. Step Detection
 *    - Mode selection
 *    - Threshold controls
 *    - Movement tracking
 *
 * Performance Considerations:
 * - All options are optional with sensible defaults
 * - Nested configuration for logical grouping
 * - Type-safe option values
 * - Runtime validation support
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
 *
 * @see {@link DoomScroller} for implementation details
 * @see README.md for complete configuration guide
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
  /** Movement configuration */
  movement?: {
    /** Direction change threshold (default: 0.1) */
    threshold?: number;
    /** Number of samples for direction detection (default: 5) */
    samples?: number;
    /** Movement smoothing configuration */
    smoothing?: {
      /** Enable smoothing (default: true) */
      active?: boolean;
      /** Smoothing factor between 0 and 1 (default: 0.3) */
      factor?: number;
      /** Number of samples for smoothing calculation (default: 5) */
      samples?: number;
      /** Smoothing algorithm selection (default: "linear") */
      algorithm?: "linear" | "exponential";
    };
  };
  /** Velocity configuration */
  velocity?: {
    /** Minimum velocity value (default: 0) */
    min?: number;
    /** Maximum velocity value (default: 1) */
    max?: number;
    /** Velocity calculation algorithm (default: "linear") */
    algorithm?: "linear" | "exponential";
    /** Velocity smoothing configuration */
    smoothing?: {
      /** Enable smoothing (default: true) */
      active?: boolean;
      /** Smoothing factor between 0 and 1 (default: 0.3) */
      factor?: number;
      /** Number of samples for smoothing calculation (default: 5) */
      samples?: number;
      /** Smoothing algorithm selection (default: "linear") */
      algorithm?: "linear" | "exponential";
    };
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
 * Key Features:
 * - Unique step identification
 * - Size tracking
 * - Boundary coordinates
 * - Trigger type tracking
 *
 * Common Applications:
 * 1. Paginated scrolling
 * 2. Section-based navigation
 * 3. Scroll snapping
 * 4. Progress tracking
 *
 * Implementation Details:
 * - Steps are zero-indexed
 * - Size is optional for flexible sizing
 * - Coordinates use Vector2D type
 * - Trigger tracking for analytics
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
 *
 * @see {@link StepsManager} for step management implementation
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
 * State Properties:
 * 1. Activity Tracking
 *    - Scroll active state
 *    - Timestamp tracking
 *
 * 2. Position Data
 *    - Absolute position
 *    - Movement delta
 *    - Viewport dimensions
 *
 * 3. Movement Analysis
 *    - Current velocity
 *    - Movement direction
 *    - Step position
 *
 * Use Cases:
 * 1. Animation control
 * 2. Progress tracking
 * 3. Event handling
 * 4. State management
 *
 * @example
 * ```typescript
 * const scrollState: ScrollState = {
 *   isScrolling: true,
 *   viewport: { width: 1920, height: 1080 },
 *   position: { x: 100, y: 200 },
 *   movement: { x: 10, y: 20 },
 *   velocity: { x: 0.5, y: 0.3 },
 *   direction: { x: "right", y: "down" },
 *   timestamp: Date.now()
 * };
 * ```
 *
 * @see {@link DoomScroller} for state management implementation
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

/**
 * Viewport interface for screen dimensions
 *
 * @interface Viewport
 * @description
 * Represents the current viewport dimensions. Used for:
 * - Calculating relative movements
 * - Determining step sizes
 * - Boundary checking
 * - Responsive behavior
 *
 * Features:
 * - Width tracking
 * - Height tracking
 * - Automatic updates
 * - Resolution independence
 *
 * @see {@link ResizeObserver} for viewport tracking implementation
 */
export interface Viewport {
  width: number;
  height: number;
}

// Re-export event types
export type { ScrollEventData, ScrollEventType } from "./events";
