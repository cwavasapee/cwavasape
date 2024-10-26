/**
 * @file Physics calculations for dot movement
 */

import type { Vector2D } from '@cwavasape/doom-scroller';

export class DotPhysics {
	/**
	 * Calculates distance between two points
	 */
	static getDistance(p1: Vector2D, p2: Vector2D): number {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Calculates total velocity magnitude
	 */
	static getTotalVelocity(velocity: Vector2D): number {
		return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
	}

	/**
	 * Applies friction to velocity
	 */
	static applyFriction(velocity: Vector2D, friction: number): Vector2D {
		return {
			x: velocity.x * (1 - friction),
			y: velocity.y * (1 - friction)
		};
	}

	/**
	 * Calculates return force to center
	 */
	static calculateReturnForce(position: Vector2D, center: Vector2D, strength: number): Vector2D {
		return {
			x: (center.x - position.x) * strength,
			y: (center.y - position.y) * strength
		};
	}
}
