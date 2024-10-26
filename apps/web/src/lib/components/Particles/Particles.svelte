<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ScrollState, Vector2D } from '@cwavasape/doom-scroller';
	import { scroller, scrollerState } from '$lib/scroller';
	import type { ParticleSystemConfig, Particle } from './types';
	import { ParticlePhysics } from './physics';
	import { ParticleRenderer } from './renderer';

	const config: ParticleSystemConfig = {
		maxParticles: 100,
		particlesPerScroll: 5,
		particleLife: 2000,
		sizeRange: [4, 40],
		speedRange: [0.5, 2],
		colors: ['#ff3e00', '#40b3ff', '#676778'],
		fadeOut: true,
		bounce: false,
		scrollMultiplier: 0.5,
		gravityEnabled: true,
		gravity: 0.001
	};

	let canvas: HTMLCanvasElement;
	// Explicitly type the systemState object
	let systemState: {
		context: CanvasRenderingContext2D | null;
		width: number;
		height: number;
		particles: Particle[]; // This was missing proper typing
		lastEmission: number;
		isPaused: boolean;
	} = {
		context: null,
		width: 0,
		height: 0,
		particles: [],
		lastEmission: 0,
		isPaused: false
	};

	let animationFrame: number | undefined;
	let lastFrameTime = 0;
	let fps = 0;
	let isMounted = false;
	let resizeObserver: ResizeObserver | undefined;

	/**
	 * Calculates particle size based on velocity with dramatic effect
	 */
	function calculateParticleSize(velocity: Vector2D): number {
		const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
		const [minSize, maxSize] = config.sizeRange;

		const normalizedSpeed = Math.min(speed / 30, 1);
		const sizeRange = maxSize - minSize;
		return minSize + sizeRange * Math.pow(normalizedSpeed, 0.5);
	}

	/**
	 * Updates particle system state
	 */
	function updateParticles(deltaTime: number): void {
		systemState.particles = systemState.particles.filter((particle) => {
			// Update position
			particle.position.x += particle.velocity.x;
			particle.position.y += particle.velocity.y;

			// Apply gravity if enabled
			if (config.gravityEnabled) {
				particle.velocity.y += config.gravity * deltaTime;
			}

			// Remove particles that go outside the canvas
			if (
				particle.position.x < -particle.size ||
				particle.position.x > systemState.width + particle.size ||
				particle.position.y < -particle.size ||
				particle.position.y > systemState.height + particle.size
			) {
				return false;
			}

			// Update life and opacity
			particle.life += deltaTime;
			if (config.fadeOut) {
				particle.opacity = 1 - particle.life / particle.maxLife;
			}

			// Update size based on current velocity
			particle.size = calculateParticleSize(particle.velocity);

			return particle.life < particle.maxLife;
		});
	}

	/**
	 * Emits particles based on scroll velocity
	 */
	function emitParticles(scrollDelta: Vector2D): void {
		if (systemState.isPaused) return;

		const scrollSpeed = Math.sqrt(scrollDelta.x * scrollDelta.x + scrollDelta.y * scrollDelta.y);
		const particlesToEmit = Math.min(
			Math.ceil(scrollSpeed * config.particlesPerScroll),
			config.maxParticles - systemState.particles.length
		);

		for (let i = 0; i < particlesToEmit; i++) {
			if (systemState.particles.length >= config.maxParticles) break;

			// Add some randomness to velocity while maintaining scroll direction
			const velocity = {
				x: scrollDelta.x * config.scrollMultiplier * (0.8 + Math.random() * 0.4),
				y: scrollDelta.y * config.scrollMultiplier * (0.8 + Math.random() * 0.4)
			};

			// Calculate position with some spread
			const position = {
				x: systemState.width / 2 + (Math.random() - 0.5) * systemState.width * 0.5,
				y: systemState.height / 2 + (Math.random() - 0.5) * systemState.height * 0.5
			};

			const particle = ParticlePhysics.createParticle(
				position,
				config,
				velocity,
				calculateParticleSize(velocity)
			);

			systemState.particles.push(particle);
		}
	}

	/**
	 * Renders the current frame
	 */
	function render(): void {
		if (!systemState.context) return;

		ParticleRenderer.clear(systemState);

		systemState.particles.forEach((particle) => {
			if (systemState.context) {
				ParticleRenderer.renderParticle(systemState.context, particle);
			}
		});

		ParticleRenderer.renderDebugInfo(systemState.context, systemState.particles.length, fps);
	}

	/**
	 * Animation loop
	 */
	function animate(currentTime: number): void {
		if (!isMounted) return;

		const deltaTime = currentTime - lastFrameTime;
		fps = 1000 / deltaTime;

		updateParticles(deltaTime);
		render();

		lastFrameTime = currentTime;
		animationFrame = requestAnimationFrame(animate);
	}

	/**
	 * Handles scroll events
	 */
	function handleScroll(scrollState: ScrollState): void {
		if (!isMounted || systemState.isPaused) return;

		$scrollerState = scrollState;

		if (!scrollState.isScrolling) return;

		emitParticles(scrollState.delta);
	}

	/**
	 * Updates canvas dimensions
	 */
	function updateCanvasSize(): void {
		if (!canvas || !isMounted) return;

		const rect = canvas.getBoundingClientRect();
		systemState.width = rect.width;
		systemState.height = rect.height;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = systemState.width * dpr;
		canvas.height = systemState.height * dpr;

		if (systemState.context) {
			systemState.context.scale(dpr, dpr);
		}
	}

	/**
	 * Toggles particle system pause state
	 */
	function togglePause(): void {
		systemState.isPaused = !systemState.isPaused;
		if (systemState.isPaused) {
			systemState.particles = [];
		}
	}

	/**
	 * Clears all particles
	 */
	function clearParticles(): void {
		systemState.particles = [];
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		isMounted = true;
		systemState.context = canvas.getContext('2d');

		if (!systemState.context) {
			throw new Error('Canvas context not available');
		}

		resizeObserver = new ResizeObserver(updateCanvasSize);
		resizeObserver.observe(canvas);

		$scroller.subscribe(handleScroll);
		updateCanvasSize();
		lastFrameTime = performance.now();
		animate(lastFrameTime);
	});

	onDestroy(() => {
		isMounted = false;
		if (typeof window === 'undefined') return;

		if (animationFrame) cancelAnimationFrame(animationFrame);
		if (resizeObserver) resizeObserver.disconnect();
	});
</script>

<div class="absolute top-20 right-4 flex flex-col gap-2">
	<button
		class="bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-400 transition-colors p-4 z-50"
		on:click={togglePause}
	>
		{systemState.isPaused ? 'Resume' : 'Pause'} System
	</button>
	<button
		class="bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-400 transition-colors p-4 z-50"
		on:click={clearParticles}
	>
		Clear Particles
	</button>
</div>

<canvas class="block overscroll-none touch-none fixed inset-0 w-full h-full" bind:this={canvas}
></canvas>
