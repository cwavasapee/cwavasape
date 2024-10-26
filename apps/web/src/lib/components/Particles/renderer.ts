/**
 * @file Rendering utilities for particle system
 */

import type { ParticleSystemState, Particle } from './types';

export class ParticleRenderer {
	/**
	 * Clears the canvas
	 */
	static clear(state: ParticleSystemState): void {
		if (!state.context) return;
		state.context.clearRect(0, 0, state.width, state.height);
	}

	/**
	 * Renders a single particle
	 */
	static renderParticle(context: CanvasRenderingContext2D, particle: Particle): void {
		context.beginPath();
		context.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
		context.fillStyle = `${particle.color}${Math.floor(particle.opacity * 255)
			.toString(16)
			.padStart(2, '0')}`;
		context.fill();
		context.closePath();
	}

	/**
	 * Renders debug information
	 */
	static renderDebugInfo(
		context: CanvasRenderingContext2D,
		particleCount: number,
		fps: number
	): void {
		context.fillStyle = '#000000';
		context.font = '14px monospace';
		context.fillText(`Particles: ${particleCount}`, 10, 20);
		context.fillText(`FPS: ${Math.round(fps)}`, 10, 40);
	}
}
