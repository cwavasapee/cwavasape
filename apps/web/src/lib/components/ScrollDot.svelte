<script lang="ts">
	/**
	 * Represents the position of the dot on the canvas
	 */
	interface DotPosition {
		x: number;
		y: number;
	}

	/**
	 * Configuration for the dot's movement and appearance
	 */
	interface DotConfig {
		size: number;
		color: string;
		speed: number;
		friction: number;
	}

	import { onMount, onDestroy } from 'svelte';
	import { DoomScroller, type ScrollState } from '@cwavasape/doom-scroller';

	let {
		config = {
			size: 20,
			color: '#ff3e00',
			speed: 1.5,
			friction: 0.5
		},
		height = 500,
		width = 500
	}: { config?: DotConfig; height?: number; width?: number } = $props();

	// State
	let canvas: HTMLCanvasElement;
	let context: CanvasRenderingContext2D | null;
	let scroller: DoomScroller;
	let animationFrame: number;

	// Dot position and velocity using Svelte 5's state
	const position = $state<DotPosition>({
		x: width / 2,
		y: height / 2
	});

	const velocity = $state<DotPosition>({
		x: 0,
		y: 0
	});

	/**
	 * Handles scroll state updates from DoomScroller
	 */
	function handleScroll(state: ScrollState): void {
		if (!state.isScrolling) return;

		velocity.x += state.velocity.x * config.speed;
		velocity.y += state.velocity.y * config.speed;
	}

	/**
	 * Updates the dot's position based on velocity and handles boundaries
	 */
	function updatePosition(): void {
		// Update position based on velocity
		position.x += velocity.x;
		position.y += velocity.y;

		// Apply friction
		velocity.x *= config.friction;
		velocity.y *= config.friction;

		// Handle boundaries
		if (position.x < config.size) {
			position.x = config.size;
			velocity.x = 0;
		} else if (position.x > width - config.size) {
			position.x = width - config.size;
			velocity.x = 0;
		}

		if (position.y < config.size) {
			position.y = config.size;
			velocity.y = 0;
		} else if (position.y > height - config.size) {
			position.y = height - config.size;
			velocity.y = 0;
		}
	}

	/**
	 * Draws the dot on the canvas
	 */
	function draw(): void {
		if (!context) return;

		// Clear canvas
		context.clearRect(0, 0, width, height);

		// Draw dot
		context.beginPath();
		context.arc(position.x, position.y, config.size, 0, Math.PI * 2);
		context.fillStyle = config.color;
		context.fill();
		context.closePath();
	}

	/**
	 * Animation loop
	 */
	function animate(): void {
		updatePosition();
		draw();
		animationFrame = requestAnimationFrame(animate);
	}

	onMount(() => {
		// Initialize canvas context
		context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Could not get canvas context');
		}

		// Initialize DoomScroller
		scroller = new DoomScroller({
			smoothingFactor: 0.2,
			speedMultiplier: 1.5,
			directionThreshold: 0.1
		});

		scroller.init();
		scroller.subscribe(handleScroll);

		// Start animation loop
		animate();
	});

	onDestroy(() => {
		if (scroller) {
			scroller.destroy();
		}
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
	});
</script>

<canvas bind:this={canvas} {width} {height} style="border: 1px solid #ccc;"> </canvas>

<style>
	canvas {
		display: block;
		margin: 0 auto;
	}
</style>
