/**
 * @file Type definitions for particle system
 */

import type { Vector2D } from '@cwavasape/doom-scroller';

export interface Particle {
	position: Vector2D;
	velocity: Vector2D;
	size: number;
	color: string;
	opacity: number;
	life: number;
	maxLife: number;
}

export interface ParticleSystemConfig {
	maxParticles: number;
	particlesPerScroll: number; // Added: number of particles to emit per scroll event
	particleLife: number;
	sizeRange: [number, number];
	speedRange: [number, number];
	colors: string[];
	fadeOut: boolean;
	bounce: boolean;
	scrollMultiplier: number;
	gravityEnabled: boolean;
	gravity: number;
}

export interface ParticleSystemState {
	context: CanvasRenderingContext2D | null;
	width: number;
	height: number;
	particles: Particle[];
	lastEmission: number;
	isPaused: boolean;
}
