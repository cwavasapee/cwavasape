<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		DoomScroller,
		type ScrollState,
		type DoomScrollerOptions,
		type Vector2D,
		type DirectionState
	} from '@cwavasape/doom-scroller';
	import { browser } from '$app/environment';
	import { scroller, scrollerState } from '$lib/scroller';

	/**
	 * Configuration for individual particles
	 */
	interface ParticleConfig {
		/** Initial size of the particle in pixels */
		baseSize: number;
		/** Color of the particle */
		color: string;
		/** Maximum life span in milliseconds */
		maxLife: number;
		/** Speed multiplier for particle movement */
		speedMultiplier: number;
		/** How quickly the particle fades out */
		fadeRate: number;
	}

	/**
	 * Represents a single particle in the system
	 */
	interface Particle {
		/** Current position */
		position: Vector2D;
		/** Current velocity */
		velocity: Vector2D;
		/** Current size in pixels */
		size: number;
		/** Remaining life in milliseconds */
		life: number;
		/** Current opacity (0-1) */
		opacity: number;
		/** Unique particle color */
		color: string;
		/** Rotation angle in radians */
		rotation: number;
		/** Angular velocity in radians per frame */
		angularVelocity: number;
	}

	/**
	 * Canvas rendering context and dimensions
	 */
	interface CanvasContext {
		/** Canvas element reference */
		element: HTMLCanvasElement | null;
		/** 2D rendering context */
		ctx: CanvasRenderingContext2D | null;
		/** Canvas width */
		width: number;
		/** Canvas height */
		height: number;
	}

	// Particle system configuration
	const PARTICLE_CONFIG: ParticleConfig = {
		baseSize: 8,
		color: '#ff3e00',
		maxLife: 2000,
		speedMultiplier: 0.5,
		fadeRate: 0.02
	};

	// Maximum number of particles to maintain
	const MAX_PARTICLES = 200;

	let canvas = $state<CanvasContext>({
		element: null,
		ctx: null,
		width: 0,
		height: 0
	});

	let particles = $state<Particle[]>([]);
	let animationFrame: number | null = null;
	let lastTimestamp = 0;

	/**
	 * Creates a new particle based on scroll state
	 */
	function createParticle(state: ScrollState): Particle {
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;

		// Use scroll velocity to determine particle initial velocity
		const velocity: Vector2D = {
			x: state.velocity.x * PARTICLE_CONFIG.speedMultiplier * (Math.random() - 0.5),
			y: state.velocity.y * PARTICLE_CONFIG.speedMultiplier * (Math.random() - 0.5)
		};

		// Generate a color based on scroll direction
		const hue = getDirectionalHue(state.direction);
		const color = `hsl(${hue}, 80%, 60%)`;

		return {
			position: { x: centerX, y: centerY },
			velocity,
			size: PARTICLE_CONFIG.baseSize * (0.5 + Math.random()),
			life: PARTICLE_CONFIG.maxLife,
			opacity: 1,
			color,
			rotation: Math.random() * Math.PI * 2,
			angularVelocity: (Math.random() - 0.5) * 0.2
		};
	}

	/**
	 * Gets a hue value based on scroll direction
	 */
	function getDirectionalHue(direction: DirectionState): number {
		if (direction.y === 'up') return 180;
		if (direction.y === 'down') return 0;
		if (direction.x === 'left') return 270;
		if (direction.x === 'right') return 90;
		return 45;
	}

	/**
	 * Updates particle positions and properties
	 */
	function updateParticles(deltaTime: number): void {
		particles = particles.filter((particle) => {
			// Update position
			particle.position.x += particle.velocity.x * deltaTime;
			particle.position.y += particle.velocity.y * deltaTime;

			// Update rotation
			particle.rotation += particle.angularVelocity;

			// Apply fade out
			particle.life -= deltaTime;
			particle.opacity = particle.life / PARTICLE_CONFIG.maxLife;

			// Remove dead particles
			return particle.life > 0;
		});
	}

	/**
	 * Renders all particles
	 */
	function drawParticles(): void {
		if (!canvas.ctx) return;

		canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

		particles.forEach((particle) => {
			canvas.ctx!.save();

			// Set up particle appearance
			canvas.ctx!.globalAlpha = particle.opacity;
			canvas.ctx!.translate(particle.position.x, particle.position.y);
			canvas.ctx!.rotate(particle.rotation);

			// Draw particle shape
			canvas.ctx!.beginPath();
			canvas.ctx!.moveTo(-particle.size, -particle.size);
			canvas.ctx!.lineTo(particle.size, -particle.size);
			canvas.ctx!.lineTo(0, particle.size);
			canvas.ctx!.closePath();

			// Fill and stroke
			canvas.ctx!.fillStyle = particle.color;
			canvas.ctx!.fill();
			canvas.ctx!.strokeStyle = 'rgba(255, 255, 255, 0.5)';
			canvas.ctx!.stroke();

			canvas.ctx!.restore();
		});
	}

	/**
	 * Main animation loop
	 */
	function animate(timestamp: number): void {
		if (!browser) return;

		const deltaTime = timestamp - lastTimestamp;
		lastTimestamp = timestamp;

		// Add new particles based on scroll state
		if ($scrollerState?.isScrolling) {
			const particlesToAdd = Math.min(5, MAX_PARTICLES - particles.length);
			for (let i = 0; i < particlesToAdd; i++) {
				particles.push(createParticle($scrollerState));
			}
		}

		updateParticles(deltaTime);
		drawParticles();

		animationFrame = requestAnimationFrame(animate);
	}

	/**
	 * Updates canvas dimensions on resize
	 */
	function handleResize(): void {
		if (!canvas.element || !browser) return;

		const width = window.innerWidth;
		const height = window.innerHeight;

		canvas.width = width;
		canvas.height = height;
		canvas.element.width = width;
		canvas.element.height = height;
	}

	/**
	 * Handles scroll events from DoomScroller
	 */
	function handleScroll(state: ScrollState): void {
		$scrollerState = state;
	}

	/**
	 * Initializes the canvas and animation system
	 */
	function initializeCanvas(): void {
		if (!canvas.element || !browser) return;

		canvas.ctx = canvas.element.getContext('2d');
		if (!canvas.ctx) throw new Error('Could not get canvas context');

		$scroller.subscribe(handleScroll);

		// Set up canvas
		handleResize();
		window.addEventListener('resize', handleResize);

		// Start animation
		lastTimestamp = performance.now();
		animate(lastTimestamp);
	}

	onMount(() => {
		if (browser) {
			initializeCanvas();
		}
	});

	onDestroy(() => {
		if (!browser) return;

		if ($scroller) $scroller.destroy();
		if (animationFrame) cancelAnimationFrame(animationFrame);
		window.removeEventListener('resize', handleResize);
	});
</script>

<canvas
	bind:this={canvas.element}
	class="block fixed inset-0 overscroll-none touch-none bg-gray-900"
></canvas>
