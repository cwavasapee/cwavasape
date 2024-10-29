/**
 * @fileoverview Event types and interfaces for the DoomScroller library
 * @module types/events
 *
 * @description
 * This module defines the core event types and interfaces used throughout the DoomScroller library.
 * It provides type definitions for handling scroll, touch, and mouse events in a normalized way.
 *
 * Key Features:
 * - Unified event type system
 * - Normalized event data structure
 * - Type-safe event handling
 * - Configurable event options
 *
 * Architecture:
 * The module is structured around four main components:
 * 1. Event type definitions
 * 2. Event data interface
 * 3. Event handler types
 * 4. Event configuration options
 *
 * Common Use Cases:
 * 1. Scroll event processing
 * 2. Touch gesture handling
 * 3. Mouse movement tracking
 * 4. Event state management
 *
 * Performance Considerations:
 * - Minimal type overhead
 * - Efficient event normalization
 * - Memory-conscious design
 * - Optimized for frequent updates
 *
 * Browser Support:
 * - Modern browsers (Chrome 60+, Firefox 55+, Safari 11+)
 * - Mobile device support
 * - Touch event compatibility
 * - Fallback behavior for older browsers
 *
 * @see {@link DataProcessor} for event processing implementation
 * @see {@link EventHandler} for event management
 * @see {@link DoomScroller} for high-level scroll control
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
 * - `end`: End event signaling scroll/gesture completion
 *
 * Usage Scenarios:
 * 1. Event type discrimination
 * 2. Input method detection
 * 3. Event handler routing
 * 4. State management triggers
 *
 * Implementation Notes:
 * - String literal union type for type safety
 * - Enables exhaustive type checking
 * - Used for event filtering and routing
 * - Supports conditional event processing
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
 * Key Features:
 * - Unified event type system
 * - Timestamp tracking
 * - Position coordinates
 * - Optional movement deltas
 * - Scroll state tracking
 *
 * Common Applications:
 * 1. Event normalization
 * 2. Movement tracking
 * 3. Velocity calculations
 * 4. State management
 *
 * Design Considerations:
 * - Minimal required properties
 * - Optional delta for efficiency
 * - Type-safe structure
 * - Cross-browser compatibility
 *
 * @property {ScrollEventType} type - The type of event (wheel, touch, mouse, or end)
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
 *   delta: { x: -10, y: 20 },
 *   isScrolling: true
 * };
 * ```
 */
export interface ScrollEventData {
  type: ScrollEventType;
  timestamp: number;
  position: Vector2D;
  delta?: Vector2D;
  isScrolling: boolean;
}

/**
 * Event handler function type
 *
 * @callback ScrollEventHandler
 *
 * @description
 * Defines the function signature for event handlers that process normalized scroll events.
 * Used throughout the library for consistent event handling patterns.
 *
 * Features:
 * - Type-safe event handling
 * - Normalized event data
 * - Consistent handler signature
 * - Support for async operations
 *
 * Common Use Cases:
 * 1. Event subscription
 * 2. Movement processing
 * 3. Animation triggers
 * 4. State updates
 *
 * @param {ScrollEventData} event - The normalized event data
 * @returns {void}
 *
 * @example
 * ```typescript
 * const handler: ScrollEventHandler = (event) => {
 *   console.log(`Scroll event: ${event.type}`);
 * };
 * ```
 */
export type ScrollEventHandler = (event: ScrollEventData) => void;

/**
 * Configuration options for event handling
 *
 * @interface EventOptions
 *
 * @description
 * Defines the configuration options for event handling behavior.
 * Allows fine-tuning of event processing and listener behavior.
 *
 * Configuration Categories:
 * 1. Event Type Selection
 * 2. Listener Behavior
 * 3. Timing Controls
 * 4. Performance Options
 *
 * Key Features:
 * - Selective event enabling
 * - Passive listener control
 * - End event timing
 * - Type-safe configuration
 *
 * @property {boolean} [passive] - Whether events should use passive listeners
 * @property {Object} [events] - Event type configuration
 * @property {boolean} [events.wheel] - Enable wheel event handling
 * @property {boolean} [events.touch] - Enable touch event handling
 * @property {boolean} [events.mouse] - Enable mouse event handling
 * @property {number} [endDelay] - Delay before end event is triggered
 *
 * @example
 * ```typescript
 * const options: EventOptions = {
 *   passive: true,
 *   events: {
 *     wheel: true,
 *     touch: true,
 *     mouse: false
 *   },
 *   endDelay: 500
 * };
 * ```
 */
export interface EventOptions {
  passive?: boolean;
  events?: {
    wheel?: boolean;
    touch?: boolean;
    mouse?: boolean;
  };
  endDelay?: number;
}

/**
 * Required event options with default values
 *
 * @interface RequiredEventOptions
 * @internal
 *
 * @description
 * Internal interface that extends EventOptions to ensure all properties have values.
 * Used for internal processing where undefined values are not acceptable.
 *
 * Features:
 * - No optional properties
 * - Default value enforcement
 * - Type safety guarantees
 * - Internal implementation details
 *
 * Usage Context:
 * - Event handler initialization
 * - Configuration normalization
 * - Default value application
 * - Type checking enforcement
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

/**
 * Internal state interface for scroll tracking
 *
 * @interface ScrollerState
 *
 * @description
 * Defines the internal state structure for tracking scroll activity.
 * Used to maintain scroll state between events and manage scroll lifecycle.
 *
 * State Properties:
 * - Activity tracking
 * - Scroll state
 * - Timing information
 *
 * Usage:
 * - Internal state management
 * - Event processing control
 * - Timing calculations
 * - State transitions
 */
export interface ScrollerState {
  isActive: boolean;
  isScrolling: boolean;
  lastEventTime: number;
}
