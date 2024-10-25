import type { ScrollState, DirectionState, Vector2D } from '@cwavasape/doom-scroller';

/**
 * Configuration options for the scroll debugger
 */
export interface ScrollDebuggerOptions {
	/** Enable console logging of scroll events */
	enableLogging?: boolean;
	/** Minimum time (ms) between logged events to prevent spam */
	logThrottle?: number;
	/** Custom format function for log messages */
	formatMessage?: (state: ScrollState) => string;
	/** Callback for when specific thresholds are crossed */
	thresholds?: {
		/** Minimum velocity to trigger velocity threshold callback */
		velocity?: number;
		/** Callback when velocity threshold is crossed */
		onVelocityThreshold?: (velocity: Vector2D) => void;
		/** Minimum delta to trigger movement threshold callback */
		movement?: number;
		/** Callback when movement threshold is crossed */
		onMovementThreshold?: (delta: Vector2D) => void;
	};
	/** Enable collecting scroll state history */
	enableHistory?: boolean;
	/** Maximum number of historical states to keep */
	historyLimit?: number;
}

/**
 * Statistics calculated from scroll behavior
 */
export interface ScrollStats {
	/** Average velocity over time */
	averageVelocity: Vector2D;
	/** Peak velocity reached */
	peakVelocity: Vector2D;
	/** Total distance scrolled */
	totalDistance: Vector2D;
	/** Duration of active scrolling in milliseconds */
	scrollDuration: number;
	/** Count of direction changes */
	directionChanges: {
		/** Horizontal direction changes */
		horizontal: number;
		/** Vertical direction changes */
		vertical: number;
	};
}

/**
 * Debug entry containing scroll state and timestamp
 */
export interface ScrollDebugEntry {
	/** Timestamp when the state was recorded */
	timestamp: number;
	/** Recorded scroll state */
	state: ScrollState;
}

/**
 * Utility class for debugging DoomScroller behavior
 */
export class ScrollDebugger {
	private lastLogTime: number = 0;
	private history: ScrollDebugEntry[] = [];
	private lastDirection: DirectionState = { x: 'none', y: 'none' };
	private startTime: number | null = null;
	private stats: ScrollStats = this.createInitialStats();
	private readonly options: Required<ScrollDebuggerOptions>;

	/**
	 * Creates a new ScrollDebugger instance
	 *
	 * @param options - Configuration options for the debugger
	 */
	constructor(options: ScrollDebuggerOptions = {}) {
		this.options = {
			enableLogging: true,
			logThrottle: 100,
			formatMessage: this.defaultFormatMessage,
			thresholds: {
				velocity: 1,
				onVelocityThreshold: undefined,
				movement: 10,
				onMovementThreshold: undefined
			},
			enableHistory: true,
			historyLimit: 1000,
			...options
		};
	}

	/**
	 * Default format function for log messages
	 *
	 * @param state - Current scroll state
	 * @returns Formatted debug message
	 */
	private defaultFormatMessage = (state: ScrollState): string => {
		return (
			`Scroll: ${state.direction.x},${state.direction.y} | ` +
			`Velocity: ${state.velocity.x.toFixed(2)},${state.velocity.y.toFixed(2)} | ` +
			`Delta: ${state.delta.x.toFixed(2)},${state.delta.y.toFixed(2)}`
		);
	};

	/**
	 * Creates initial stats object
	 */
	private createInitialStats(): ScrollStats {
		return {
			averageVelocity: { x: 0, y: 0 },
			peakVelocity: { x: 0, y: 0 },
			totalDistance: { x: 0, y: 0 },
			scrollDuration: 0,
			directionChanges: {
				horizontal: 0,
				vertical: 0
			}
		};
	}

	/**
	 * Updates debug information with new scroll state
	 *
	 * @param state - Current scroll state from DoomScroller
	 */
	update(state: ScrollState): void {
		const timestamp = performance.now();

		// Initialize timing on first scroll
		if (state.isScrolling && this.startTime === null) {
			this.startTime = timestamp;
		}

		// Update history if enabled
		if (this.options.enableHistory && state.isScrolling) {
			this.history.push({ timestamp, state });
			if (this.history.length > this.options.historyLimit) {
				this.history.shift();
			}
		}

		// Update statistics
		if (state.isScrolling) {
			this.updateStats(state, timestamp);
		}

		// Check thresholds
		this.checkThresholds(state);

		// Log if enabled and throttle time has passed
		if (this.options.enableLogging && timestamp - this.lastLogTime >= this.options.logThrottle) {
			this.lastLogTime = timestamp;
		}

		// Reset if scrolling ended
		if (!state.isScrolling && this.startTime !== null) {
			this.startTime = null;
		}

		// Track direction changes
		this.trackDirectionChanges(state.direction);
	}

	/**
	 * Updates scroll statistics
	 */
	private updateStats(state: ScrollState, timestamp: number): void {
		// Update peak velocity
		this.stats.peakVelocity = {
			x: Math.max(Math.abs(state.velocity.x), Math.abs(this.stats.peakVelocity.x)),
			y: Math.max(Math.abs(state.velocity.y), Math.abs(this.stats.peakVelocity.y))
		};

		// Update total distance
		this.stats.totalDistance = {
			x: this.stats.totalDistance.x + Math.abs(state.delta.x),
			y: this.stats.totalDistance.y + Math.abs(state.delta.y)
		};

		// Update duration
		if (this.startTime !== null) {
			this.stats.scrollDuration = timestamp - this.startTime;
		}

		// Update average velocity
		const duration = this.stats.scrollDuration / 1000; // Convert to seconds
		if (duration > 0) {
			this.stats.averageVelocity = {
				x: this.stats.totalDistance.x / duration,
				y: this.stats.totalDistance.y / duration
			};
		}
	}

	/**
	 * Checks if thresholds have been crossed
	 */
	private checkThresholds(state: ScrollState): void {
		const { velocity, movement } = this.options.thresholds;
		const { onVelocityThreshold, onMovementThreshold } = this.options.thresholds;

		if (onVelocityThreshold && velocity) {
			if (Math.abs(state.velocity.x) > velocity || Math.abs(state.velocity.y) > velocity) {
				onVelocityThreshold(state.velocity);
			}
		}

		if (onMovementThreshold && movement) {
			if (Math.abs(state.delta.x) > movement || Math.abs(state.delta.y) > movement) {
				onMovementThreshold(state.delta);
			}
		}
	}

	/**
	 * Tracks changes in scroll direction
	 */
	private trackDirectionChanges(direction: DirectionState): void {
		if (direction.x !== this.lastDirection.x && direction.x !== 'none') {
			this.stats.directionChanges.horizontal++;
		}
		if (direction.y !== this.lastDirection.y && direction.y !== 'none') {
			this.stats.directionChanges.vertical++;
		}
		this.lastDirection = direction;
	}

	/**
	 * Gets current scroll statistics
	 *
	 * @returns Current scroll statistics
	 */
	getStats(): ScrollStats {
		return { ...this.stats };
	}

	/**
	 * Gets scroll state history
	 *
	 * @returns Array of historical scroll states with timestamps
	 */
	getHistory(): ScrollDebugEntry[] {
		return [...this.history];
	}

	/**
	 * Resets all debug statistics and history
	 */
	reset(): void {
		this.history = [];
		this.lastLogTime = 0;
		this.startTime = null;
		this.stats = this.createInitialStats();
		this.lastDirection = { x: 'none', y: 'none' };
	}
}
