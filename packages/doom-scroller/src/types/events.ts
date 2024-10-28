/**
 * @fileoverview Event types and interfaces for the DoomScroller library
 * @module types/events
 * @description
 * This module defines the core event types and interfaces used throughout the DoomScroller library.
 * It provides type definitions for handling scroll, touch, and mouse events in a normalized way.
 */

import type { Vector2D } from ".";

/**
 * Event types supported by DoomScroller
 *
 * @typedef {("wheel"|"touch"|"mouse"|"end")} ScrollEventType
 *
 * @description
 * Represents the four main types of events that DoomScroller can process:
 * - `wheel`: Mouse wheel or trackpad scroll events
 * - `touch`: Touch events from mobile/tablet devices
 * - `mouse`: Mouse movement and drag events
 * - `end`: End event
 *
 * @example
 * ```typescript
 * const eventType: ScrollEventType = "wheel";
 * ```
 */
export type ScrollEventType = "wheel" | "touch" | "mouse" | "end";

/**
 * Event data structure for normalized events
 *
 * @interface ScrollEventData
 *
 * @description
 * Provides a normalized structure for all scroll-related events, regardless of their original source.
 * This interface ensures consistent event handling across different input methods.
 *
 * @property {ScrollEventType} type - The type of event (wheel, touch, or mouse)
 * @property {number} timestamp - Unix timestamp when the event occurred
 * @property {Vector2D} position - Current cursor or touch position
 * @property {Vector2D} [delta] - Optional movement delta (mainly for wheel events)
 * @property {boolean} isScrolling - Whether scrolling is currently active
 *
 * @example
 * ```typescript
 * const wheelEvent: ScrollEventData = {
 *   type: "wheel",
 *   timestamp: Date.now(),
 *   position: { x: 100, y: 200 },
 *   delta: { x: -10, y: 20 }
 * };
 * ```
 */
export interface ScrollEventData {
  /**
   * Type of the event
   */
  type: ScrollEventType;
  /**
   * Timestamp when the event occurred
   */
  timestamp: number;
  /**
   * Current cursor or touch position
   */
  position: Vector2D;
  /**
   * Movement delta (mainly for wheel events)
   */
  delta?: Vector2D;
  /**
   * Whether scrolling is currently active
   */
  isScrolling: boolean;
}

/**
 * Event handler function type
 * @callback ScrollEventHandler
 * @param {ScrollEventData} event - The normalized event data
 */
export type ScrollEventHandler = (event: ScrollEventData) => void;

/**
 * Configuration options for event handling
 * @interface EventOptions
 */
export interface EventOptions {
  /**
   * Whether events should use passive listeners
   * @default true
   */
  passive?: boolean;
  /**
   * Event type configuration
   */
  events?: {
    /**
     * Enable wheel event handling
     * @default true
     */
    wheel?: boolean;
    /**
     * Enable touch event handling
     * @default true
     */
    touch?: boolean;
    /**
     * Enable mouse event handling
     * @default false
     */
    mouse?: boolean;
  };
  /**
   * Delay before end event is triggered (default: 500)
   */
  endDelay?: number;
}

/**
 * Required event options with default values
 * @interface RequiredEventOptions
 * @internal
 */
export interface RequiredEventOptions {
  passive: boolean;
  events: {
    wheel: boolean;
    touch: boolean;
    mouse: boolean;
  };
  endDelay: number;
}

// Add new interface for internal state
export interface ScrollerState {
  isActive: boolean;
  isScrolling: boolean;
  lastEventTime: number;
}
