/**
 * @file Main entry point for the DoomScroller library
 * @module doom-scroller
 *
 * @description
 * This module exports the DoomScroller class and its associated types.
 * The DoomScroller provides a unified interface for handling both touch and wheel-based
 * scrolling with smooth animations, velocity calculations, and directional tracking.
 *
 * @example
 * ```typescript
 * import { DoomScroller } from 'doom-scroller';
 *
 * // Create a new instance with default configuration
 * const scroller = new DoomScroller();
 *
 * // Initialize with custom configuration
 * const customScroller = new DoomScroller({
 *   speedMultiplier: 1.5,
 *   smoothingFactor: 0.3
 * });
 *
 * // Initialize and subscribe to updates
 * scroller.init();
 * scroller.subscribe((state) => {
 *   console.log('Scroll velocity:', state.velocity);
 * });
 * ```
 */

export { DoomScroller } from "./core/scroller";
export type {
  ScrollConfig,
  ScrollState,
  Vector2D,
  Direction,
  DirectionState,
} from "./types";
