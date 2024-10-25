/**
 * @file Momentum scrolling implementation
 */

import type { Vector2D, MomentumConfig, MovementConfig } from "../types";
import { MovementProcessor } from "./movement-processor";

/**
 * Handles momentum scrolling behavior
 */
export class MomentumHandler {
  private animationFrame: number | null = null;
  private isActive = false;
  private startTime: number | null = null;
  private lastFrameTime: number | null = null;

  /**
   * Starts momentum scrolling animation
   */
  start(
    initialVelocity: Vector2D,
    config: Required<MomentumConfig & MovementConfig>,
    onFrame: (delta: Vector2D, timestamp: number) => void,
    onComplete: () => void
  ): void {
    if (this.isActive) {
      this.stop();
    }

    // Validate initial velocity
    const startVelocity = {
      x: MovementProcessor.capVelocity(initialVelocity.x, config.maxVelocity),
      y: MovementProcessor.capVelocity(initialVelocity.y, config.maxVelocity),
    };

    // Check if velocity is sufficient to start momentum
    if (
      Math.abs(startVelocity.x) < config.minVelocity &&
      Math.abs(startVelocity.y) < config.minVelocity
    ) {
      onComplete();
      return;
    }

    // Initialize animation state
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.isActive = true;

    const animate = (): void => {
      const currentTime = performance.now();

      if (!this.startTime || !this.lastFrameTime || !this.isActive) {
        this.stop();
        onComplete();
        return;
      }

      const elapsed = currentTime - this.startTime;
      const deltaTime = currentTime - this.lastFrameTime;
      const progress = Math.min(elapsed / config.duration, 1);

      const { delta, velocity } = this.calculateFrame(
        startVelocity,
        progress,
        deltaTime,
        config
      );

      // Continue animation if movement is still significant
      if (
        progress < 1 &&
        (Math.abs(velocity.x) > config.minVelocity ||
          Math.abs(velocity.y) > config.minVelocity)
      ) {
        onFrame(delta, currentTime);
        this.lastFrameTime = currentTime;
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.stop();
        onComplete();
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Calculates momentum for current animation frame
   */
  private calculateFrame(
    startVelocity: Vector2D,
    progress: number,
    deltaTime: number,
    config: Required<MomentumConfig & MovementConfig>
  ): { delta: Vector2D; velocity: Vector2D } {
    // Apply easing to smooth out the animation
    const easeOutExpo = 1 - Math.pow(2, -10 * progress);

    // Calculate friction based on frame time
    const frictionFactor = Math.pow(
      config.friction,
      deltaTime / (1000 / 60) // Normalize to 60fps
    );

    // Current velocity with friction and progress decay
    const velocity = {
      x: MovementProcessor.capVelocity(
        startVelocity.x * frictionFactor * (1 - progress),
        config.maxVelocity
      ),
      y: MovementProcessor.capVelocity(
        startVelocity.y * frictionFactor * (1 - progress),
        config.maxVelocity
      ),
    };

    // Calculate movement delta for this frame
    const delta = {
      x: velocity.x * deltaTime * easeOutExpo * (config.invertX ? -1 : 1),
      y: velocity.y * deltaTime * easeOutExpo * (config.invertY ? -1 : 1),
    };

    return { delta, velocity };
  }

  /**
   * Stops momentum animation
   */
  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isActive = false;
    this.startTime = null;
    this.lastFrameTime = null;
  }

  /**
   * Returns current momentum state
   */
  get active(): boolean {
    return this.isActive;
  }
}
