/**
 * @file Physics calculations for particle system
 */

import type { Vector2D } from '@cwavasape/doom-scroller';
import type { Particle, ParticleSystemConfig } from './types';

export class ParticlePhysics {
	/**
	 * Creates a new particle with specified properties
	 */
	static createParticle(
		position: Vector2D,
		config: ParticleSystemConfig,
		velocity?: Vector2D,
		size?: number
	): Particle {
		const speed =
			config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);

		const angle = Math.random() * Math.PI * 2;
		const randomVelocity = {
			x: Math.cos(angle) * speed,
			y: Math.sin(angle) * speed
		};

		return {
			position: { ...position },
			velocity: velocity ?? randomVelocity,
			size: size ?? config.sizeRange[0], // Use provided size or default
			color: config.colors[Math.floor(Math.random() * config.colors.length)],
			opacity: 1,
			life: 0,
			maxLife: config.particleLife * (0.8 + Math.random() * 0.4)
		};
	}

	/**
	 * Updates particle physics
	 */
	static updateParticle(
		particle: Particle,
		config: ParticleSystemConfig,
		width: number,
		height: number,
		deltaTime: number
	): boolean {
		// Update position
		particle.position.x += particle.velocity.x;
		particle.position.y += particle.velocity.y;

		// Apply gravity if enabled
		if (config.gravityEnabled) {
			particle.velocity.y += config.gravity * deltaTime;
		}

		// Handle boundaries
		if (config.bounce) {
			if (particle.position.x < particle.size) {
				particle.position.x = particle.size;
				particle.velocity.x = Math.abs(particle.velocity.x) * 0.8;
			} else if (particle.position.x > width - particle.size) {
				particle.position.x = width - particle.size;
				particle.velocity.x = -Math.abs(particle.velocity.x) * 0.8;
			}

			if (particle.position.y < particle.size) {
				particle.position.y = particle.size;
				particle.velocity.y = Math.abs(particle.velocity.y) * 0.8;
			} else if (particle.position.y > height - particle.size) {
				particle.position.y = height - particle.size;
				particle.velocity.y = -Math.abs(particle.velocity.y) * 0.8;
			}
		}

		// Update life and opacity
		particle.life += deltaTime;
		if (config.fadeOut) {
			particle.opacity = 1 - particle.life / particle.maxLife;
		}

		return particle.life < particle.maxLife;
	}

	/**
	 * Applies scroll force to particles
	 */
	static applyScrollForce(particle: Particle, scrollDelta: Vector2D, multiplier: number): void {
		particle.velocity.x += scrollDelta.x * multiplier;
		particle.velocity.y += scrollDelta.y * multiplier;
	}
}
