/**
 * @fileoverview Main entry point for the DoomScroller library
 */

import { EventHandler } from "./core/eventHandler";
import { DataProcessor } from "./core/dataProcessor";
import { VelocityCalculator } from "./core/velocity";
import { SmoothingEngine } from "./core/smoothing";
import { DirectionDetector } from "./core/direction";
import { StepsManager } from "./core/steps";
import type { ScrollEventData, ScrollEventType } from "./types/events";
import type {
  Options,
  Vector2D,
  Direction,
  ScrollState,
  Viewport,
} from "./types";

export class DoomScroller {
  private readonly options: Required<Options>;
  private readonly eventHandler: EventHandler;
  private readonly dataProcessor: DataProcessor;
  private readonly velocityCalculator: VelocityCalculator;
  private readonly smoothingEngine: SmoothingEngine;
  private readonly directionDetector: DirectionDetector;
  private readonly stepsManager: StepsManager;
  private readonly subscribers: Set<(state: ScrollState) => void>;
  private resizeObserver: ResizeObserver = {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {},
  } as ResizeObserver;

  private isActive: boolean = false;
  private lastState: ScrollState;
  private endTimeout?: number;

  private readonly eventQueue: ScrollEventData[] = [];
  private animationFrameId?: number;

  constructor(options: Partial<Options> = {}) {
    // Type-safe options normalization
    this.options = {
      speedMultiplier: options.speedMultiplier ?? 1,
      debounceTime: options.debounceTime ?? 500,
      events: {
        wheel: options.events?.wheel ?? true,
        touch: options.events?.touch ?? true,
        mouse: options.events?.mouse ?? false,
        passive: options.events?.passive ?? true,
        endDelay: options.events?.endDelay ?? 0,
      },
      movement: {
        threshold: options.movement?.threshold ?? 0.1,
        samples: options.movement?.samples ?? 5,
        smoothing: {
          active: options.movement?.smoothing?.active ?? true,
          factor: options.movement?.smoothing?.factor ?? 0.3,
          samples: options.movement?.smoothing?.samples ?? 5,
          algorithm: options.movement?.smoothing?.algorithm ?? "linear",
        },
      },
      velocity: {
        min: options.velocity?.min ?? 0,
        max: options.velocity?.max ?? 1,
        algorithm: options.velocity?.algorithm ?? "linear",
        smoothing: {
          active: options.velocity?.smoothing?.active ?? true,
          factor: options.velocity?.smoothing?.factor ?? 0.3,
          samples: options.velocity?.smoothing?.samples ?? 5,
          algorithm: options.velocity?.smoothing?.algorithm ?? "linear",
        },
      },
      steps: {
        active: options.steps?.active ?? false,
        movementMode: options.steps?.movementMode ?? "absolute",
        movementThreshold: options.steps?.movementThreshold,
        velocityThreshold: options.steps?.velocityThreshold,
      },
      debug: options.debug ?? false,
    } satisfies Required<Options>;

    // Initialize state and core components
    this.lastState = this.createInitialState();
    this.subscribers = new Set();

    // Initialize ResizeObserver first
    this.initResizeObserver();

    // Initialize core components
    this.eventHandler = new EventHandler({
      passive: this.options.events.passive,
      events: this.options.events,
      endDelay: this.options.events.endDelay,
    });

    this.dataProcessor = new DataProcessor();
    this.velocityCalculator = new VelocityCalculator(this.options.velocity);
    this.smoothingEngine = new SmoothingEngine({
      movement: { smoothing: this.options.movement.smoothing },
      velocity: { smoothing: this.options.velocity.smoothing },
    });
    this.directionDetector = new DirectionDetector({
      movement: {
        threshold: this.options.movement.threshold,
        samples: this.options.movement.samples,
      },
    });
    this.stepsManager = new StepsManager(this.options.steps);

    // Bind event handlers
    this.eventHandler.addHandler(this.queueEvent);
  }

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.eventHandler.start();

    if (typeof window !== "undefined") {
      this.resizeObserver.observe(document.documentElement);
    }
  }

  public stop(): void {
    if (!this.isActive) return;

    this.eventHandler.stop();
    this.resizeObserver.disconnect();
    this.isActive = false;
    this.reset();
  }

  public subscribe(callback: (state: ScrollState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.lastState); // Emit initial state
    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: (state: ScrollState) => void): void {
    this.subscribers.delete(callback);
  }

  public reset(): void {
    if (this.endTimeout) {
      window.clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    this.dataProcessor.reset();
    this.velocityCalculator.reset();
    this.smoothingEngine.reset();
    this.directionDetector.reset();
    this.stepsManager.reset();

    this.lastState = this.createInitialState();
    this.notifySubscribers(this.lastState);
  }

  public destroy(): void {
    this.stop();
    this.eventHandler.destroy();

    if (this.endTimeout) {
      window.clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.subscribers.clear();
    this.reset();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.eventQueue.length = 0;

    // Clear references
    this.lastState = this.createInitialState();
    this.isActive = false;
  }

  private queueEvent = (event: ScrollEventData): void => {
    if (!this.isActive) return;

    this.eventQueue.push(event);

    // Only schedule processing if not already scheduled
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.processEventQueue);
    }
  };

  private processEventQueue = (): void => {
    this.animationFrameId = undefined;

    // Process only the most recent event for each type
    const lastEvent = this.eventQueue[this.eventQueue.length - 1];
    if (lastEvent) {
      this.handleEvent(lastEvent);
    }

    // Clear the queue
    this.eventQueue.length = 0;
  };

  private handleEvent = (event: ScrollEventData): void => {
    if (!this.isActive) return;

    if (event.type === "end") {
      this.handleEventEnd();
      return;
    }

    const { position, delta } = this.dataProcessor.process(event);

    const scaledDelta: Vector2D = {
      x: delta.x * this.options.speedMultiplier,
      y: delta.y * this.options.speedMultiplier,
    };

    const smoothedMovement = this.smoothingEngine.smooth(
      scaledDelta,
      "movement"
    );

    const rawVelocity = this.velocityCalculator.calculate(
      smoothedMovement,
      event.timestamp
    );
    const smoothedVelocity = this.smoothingEngine.smooth(
      rawVelocity,
      "velocity"
    );

    const step = this.options.steps.active
      ? this.stepsManager.update(position, smoothedVelocity)
      : undefined;

    const currentState: ScrollState = {
      isScrolling: true,
      viewport: this.getViewport(),
      position,
      movement: smoothedMovement,
      velocity: smoothedVelocity,
      direction: this.calculateDirection(position),
      step: step?.index ?? undefined,
      timestamp: event.timestamp,
    };

    this.lastState = currentState;
    this.notifySubscribers(currentState);
  };

  private handleEventEnd = (): void => {
    if (this.endTimeout) {
      window.clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    const currentState = { ...this.lastState, isScrolling: false };
    this.lastState = currentState;
    this.notifySubscribers(currentState);

    this.endTimeout = window.setTimeout(() => {
      if (!this.isActive) return;

      this.dataProcessor.reset();
      this.velocityCalculator.reset();
      this.smoothingEngine.reset();
      this.directionDetector.reset();
      this.stepsManager.reset();

      const finalState: ScrollState = {
        ...this.createInitialState(),
        position: this.lastState.position,
        step: this.lastState.step,
      };

      this.lastState = finalState;
      this.notifySubscribers(finalState);
      this.endTimeout = undefined;
    }, this.options.debounceTime);
  };

  private handleResize = (entries: ResizeObserverEntry[]): void => {
    if (!this.isActive) return;

    const viewport = this.getViewport();
    this.notifySubscribers({
      ...this.lastState,
      viewport,
    });
  };

  private getViewport(): Viewport {
    if (typeof window === "undefined") {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private calculateDirection(position: Vector2D): Direction {
    return this.directionDetector.update(position);
  }

  private createInitialState(): ScrollState {
    return {
      isScrolling: false,
      viewport: this.getViewport(),
      position: { x: 0, y: 0 },
      movement: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      direction: { x: "none", y: "none" },
      step: undefined,
      timestamp: Date.now(),
    };
  }

  private notifySubscribers(data: ScrollState): void {
    this.subscribers.forEach((callback) => callback(data));
  }

  private initResizeObserver(): void {
    if (typeof window === "undefined") {
      this.resizeObserver = {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {},
      } as ResizeObserver;
      return;
    }

    try {
      this.resizeObserver = new ResizeObserver(this.handleResize);
    } catch (e) {
      // Fallback for browsers that don't support ResizeObserver
      this.resizeObserver = {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {},
      } as ResizeObserver;
    }
  }
}

// Export types
export type {
  Options,
  ScrollState,
  Vector2D,
  Direction,
  ScrollEventData,
  ScrollEventType,
};
