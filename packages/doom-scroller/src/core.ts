/**
 * @file Core DoomScroller implementation
 */

import type {
  DoomScrollerOptions,
  ScrollState,
  MovementConfig,
  MomentumConfig,
  MovementState,
  Vector2D,
  TouchTrackingState,
} from "./types";

import { DirectionDetector } from "./core/direction-detector";
import { InputHandler } from "./core/input-handlers";
import { MovementProcessor } from "./core/movement-processor";
import { MomentumHandler } from "./core/momentum-handler";

/** Default movement configuration */
const DEFAULT_MOVEMENT_CONFIG: Required<MovementConfig> = {
  speedMultiplier: 1,
  smoothingFactor: 0.2,
  directionThreshold: 0.15,
  minVelocity: 0.1,
  maxVelocity: 50,
  sampleSize: 5,
  invertX: false,
  invertY: false,
};

/** Default momentum configuration */
const DEFAULT_MOMENTUM_CONFIG: Required<MomentumConfig> = {
  enabled: true,
  duration: 1000,
  friction: 0.95,
  minVelocity: 0.1,
  minTouchDuration: 100,
};

/**
 * Main DoomScroller class for handling scroll interactions
 */
export class DoomScroller {
  private readonly config: {
    debounceTime: number;
    wheel: Required<MovementConfig>;
    touch: Required<MovementConfig & MomentumConfig>;
  };

  private readonly directionDetector: DirectionDetector;
  private readonly momentumHandler: MomentumHandler;
  private readonly subscribers = new Set<(state: ScrollState) => void>();

  private wheelState: MovementState;
  private touchState: MovementState;
  private touchTracking: TouchTrackingState = {
    isActive: false,
    activeTouch: null,
    touchStartTime: null,
  };

  private animationFrame: number | null = null;
  private scrollTimeout: number | null = null;
  private isBrowser: boolean;

  private state: ScrollState = {
    isScrolling: false,
    velocity: { x: 0, y: 0 },
    direction: { x: "none", y: "none" },
    delta: { x: 0, y: 0 },
    rawScroll: { x: 0, y: 0 },
  };

  /**
   * Creates a new DoomScroller instance
   */
  constructor(options: Partial<DoomScrollerOptions> = {}) {
    this.config = {
      debounceTime: options.debounceTime ?? 200,
      wheel: { ...DEFAULT_MOVEMENT_CONFIG, ...options.wheel },
      touch: {
        ...DEFAULT_MOVEMENT_CONFIG,
        ...DEFAULT_MOMENTUM_CONFIG,
        ...options.touch,
      },
    };

    this.directionDetector = new DirectionDetector(
      this.config.wheel.directionThreshold,
      this.config.wheel.smoothingFactor,
      this.config.wheel.sampleSize
    );

    this.momentumHandler = new MomentumHandler();
    this.wheelState = MovementProcessor.createInitialState();
    this.touchState = MovementProcessor.createInitialState();
    this.isBrowser = typeof window !== "undefined";
  }

  /**
   * Initializes scroll detection
   */
  public init(): void {
    if (!this.isBrowser) {
      throw new Error("DoomScroller requires a browser environment");
    }

    window.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("touchstart", this.handleTouchStart, {
      passive: false,
    });
    window.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", this.handleTouchEnd, {
      passive: false,
    });
    window.addEventListener("touchcancel", this.handleTouchEnd, {
      passive: false,
    });
  }

  /**
   * Subscribes to scroll state updates
   */
  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Updates configuration at runtime
   */
  public updateConfig(options: Partial<DoomScrollerOptions>): void {
    if (options.wheel) {
      Object.assign(this.config.wheel, options.wheel);
      this.directionDetector.updateConfig({
        threshold: this.config.wheel.directionThreshold,
        smoothingFactor: this.config.wheel.smoothingFactor,
        sampleSize: this.config.wheel.sampleSize,
      });
    }

    if (options.touch) {
      Object.assign(this.config.touch, options.touch);
    }

    if (options.debounceTime !== undefined) {
      this.config.debounceTime = options.debounceTime;
    }
  }

  /**
   * Cleans up event listeners and resources
   */
  public destroy(): void {
    if (this.isBrowser) {
      window.removeEventListener("wheel", this.handleWheel);
      window.removeEventListener("touchstart", this.handleTouchStart);
      window.removeEventListener("touchmove", this.handleTouchMove);
      window.removeEventListener("touchend", this.handleTouchEnd);
      window.removeEventListener("touchcancel", this.handleTouchEnd);

      this.momentumHandler.stop();

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }

      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
    }

    this.subscribers.clear();
  }

  /**
   * Handles wheel events
   */
  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rawDelta = InputHandler.normalizeWheelDelta(
      event,
      this.config.wheel.speedMultiplier,
      this.config.wheel.invertX,
      this.config.wheel.invertY
    );
    this.processMovement("wheel", rawDelta, performance.now());
  };

  /**
   * Handles touch start
   */
  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    const touch = event.touches[0];

    if (!touch || this.touchTracking.isActive) return;

    this.touchTracking.isActive = true;
    this.touchTracking.activeTouch = touch.identifier;
    this.touchTracking.touchStartTime = performance.now();

    if (this.momentumHandler.active) {
      this.momentumHandler.stop();
    }

    const point = InputHandler.createTouchPoint(touch);
    this.touchState.lastPosition = point;
    this.touchState.recentPoints = [point];
  };

  /**
   * Handles touch move
   */
  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();

    const touch = InputHandler.findActiveTouch(
      event.touches,
      this.touchTracking
    );
    if (!touch || !this.touchState.lastPosition) return;

    const timestamp = performance.now();
    const delta = InputHandler.getTouchDelta(
      touch,
      this.touchState.lastPosition,
      this.config.touch.speedMultiplier,
      this.config.touch.invertX,
      this.config.touch.invertY
    );

    this.touchState.lastPosition = InputHandler.updateTouchState(
      this.touchState.lastPosition,
      touch
    );
    this.processMovement("touch", delta, timestamp);
  };

  /**
   * Handles touch end
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();

    const isActiveTouch = Array.from(event.changedTouches).some(
      (t) => t.identifier === this.touchTracking.activeTouch
    );

    if (!isActiveTouch) return;

    const config = this.config.touch;
    const touchDuration = this.touchTracking.touchStartTime
      ? performance.now() - this.touchTracking.touchStartTime
      : 0;

    const shouldStartMomentum =
      config.enabled &&
      touchDuration >= config.minTouchDuration &&
      this.touchState.velocity &&
      (Math.abs(this.touchState.velocity.x) > config.minVelocity ||
        Math.abs(this.touchState.velocity.y) > config.minVelocity);

    this.resetTouchTracking();

    if (shouldStartMomentum) {
      const cappedVelocity = {
        x: MovementProcessor.capVelocity(
          this.touchState.velocity.x,
          config.maxVelocity
        ),
        y: MovementProcessor.capVelocity(
          this.touchState.velocity.y,
          config.maxVelocity
        ),
      };

      this.momentumHandler.start(
        cappedVelocity,
        config,
        this.handleMomentumFrame,
        () => this.endScroll()
      );
    } else {
      this.endScroll();
    }

    this.touchState.lastPosition = null;
    this.touchState.recentPoints = [];
  };

  /**
   * Handles momentum scrolling frames
   */
  private handleMomentumFrame = (delta: Vector2D, timestamp: number): void => {
    this.processMovement("touch", delta, timestamp);
  };

  /**
   * Resets touch tracking state
   */
  private resetTouchTracking(): void {
    this.touchTracking.isActive = false;
    this.touchTracking.activeTouch = null;
    this.touchTracking.touchStartTime = null;
  }

  /**
   * Processes movement from any input source
   */
  private processMovement(
    source: "wheel" | "touch",
    rawDelta: Vector2D,
    timestamp: number
  ): void {
    const state = source === "wheel" ? this.wheelState : this.touchState;
    const config = source === "wheel" ? this.config.wheel : this.config.touch;

    MovementProcessor.processMovement(state, rawDelta, timestamp, config);
    this.updateGlobalState(state);

    if (!state.isActive) {
      state.isActive = true;
      this.startAnimation();
    }

    this.scheduleScrollEnd();
  }

  /**
   * Updates global scroll state
   */
  private updateGlobalState(state: MovementState): void {
    this.state = {
      isScrolling: true,
      velocity: state.velocity,
      direction: this.directionDetector.detectDirection(state.rawDelta),
      delta: state.smoothDelta,
      rawScroll: state.rawDelta,
    };

    this.notifySubscribers();
  }

  /**
   * Starts animation loop
   */
  private startAnimation(): void {
    const animate = (): void => {
      this.animationFrame = requestAnimationFrame(animate);
      this.notifySubscribers();
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Schedules scroll end detection
   */
  private scheduleScrollEnd(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = window.setTimeout(
      () => this.endScroll(),
      this.config.debounceTime
    ) as unknown as number;
  }

  /**
   * Ends current scroll interaction
   */
  private endScroll(): void {
    this.wheelState.isActive = false;
    this.touchState.isActive = false;
    this.directionDetector.reset();

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.state = {
      isScrolling: false,
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      delta: { x: 0, y: 0 },
      rawScroll: { x: 0, y: 0 },
    };

    this.notifySubscribers();
  }

  /**
   * Notifies subscribers of state changes
   */
  private notifySubscribers(): void {
    const stateCopy = { ...this.state };
    for (const subscriber of this.subscribers) {
      subscriber(stateCopy);
    }
  }
}
