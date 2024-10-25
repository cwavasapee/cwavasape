<script lang="ts">
	import { scroller, scrollerState } from '$lib/scroller';
	/**
	 * Configuration for the dot's appearance and behavior
	 */
	interface DotConfig {
		/** Size of the dot in pixels */
		size: number;
		/** Color of the dot in any valid CSS color format */
		color: string;
		/** Base movement speed multiplier */
		speed: number;
		/** Friction coefficient (0-1) affecting movement decay */
		friction: number;
	}

	/**
	 * Position coordinates for the dot
	 */
	interface DotPosition {
		/** X coordinate in pixels */
		x: number;
		/** Y coordinate in pixels */
		y: number;
	}

	/**
	 * Canvas rendering options
	 */
	interface CanvasOptions {
		/** Canvas width in pixels */
		width: number;
		/** Canvas height in pixels */
		height: number;
		/** Canvas rendering context */
		context: CanvasRenderingContext2D | null;
	}

	import { onMount, onDestroy } from 'svelte';
	import { type ScrollState } from '@cwavasape/doom-scroller';

	// Define the component script
	const INITIAL_DOT_CONFIG: DotConfig = {
		size: 10,
		color: '#ff3e00',
		speed: 1,
		friction: 0.5
	};

	let config: DotConfig = INITIAL_DOT_CONFIG;
	let canvas: HTMLCanvasElement;
	let canvasOptions = $state<CanvasOptions>({
		width: 0,
		height: 0,
		context: null
	});

	let animationFrame: number;

	const position = $state<DotPosition>({ x: 0, y: 0 });
	const velocity = $state<DotPosition>({ x: 0, y: 0 });

	/**
	 * Handles scroll events from DoomScroller
	 * @param state - Current scroll state from DoomScroller
	 */
	function handleScroll(state: ScrollState): void {
		$scrollerState = state;
		if (!state.isScrolling) return;
		// Apply movement based on raw scroll values for more precise control
		velocity.x += state.rawScroll.x * config.speed;
		velocity.y += state.rawScroll.y * config.speed;

		// Apply directional resistance based on scroll direction
		if (state.direction.x !== 'none' || state.direction.y !== 'none') {
			const directionMultiplier = 0.8; // Reduce velocity when changing directions
			velocity.x *= directionMultiplier;
			velocity.y *= directionMultiplier;
		}
	}

	/**
	 * Updates dot position based on velocity and boundaries
	 */
	function updatePosition(): void {
		// Update position based on velocity
		position.x += velocity.x;
		position.y += velocity.y;

		// Apply friction
		velocity.x *= 1 - config.friction;
		velocity.y *= 1 - config.friction;

		// Stop movement below threshold
		const minVelocity = 0.01;
		if (Math.abs(velocity.x) < minVelocity) velocity.x = 0;
		if (Math.abs(velocity.y) < minVelocity) velocity.y = 0;

		if (position.x < config.size) {
			position.x = config.size;
			velocity.x = Math.abs(velocity.x);
		} else if (position.x > canvasOptions.width - config.size) {
			position.x = canvasOptions.width - config.size;
			velocity.x = -Math.abs(velocity.x);
		}

		if (position.y < config.size) {
			position.y = config.size;
			velocity.y = Math.abs(velocity.y);
		} else if (position.y > canvasOptions.height - config.size) {
			position.y = canvasOptions.height - config.size;
			velocity.y = -Math.abs(velocity.y);
		}
	}

	/**
	 * Draws the dot on the canvas
	 */
	function draw(): void {
		if (!canvasOptions.context) return;

		const ctx = canvasOptions.context;
		ctx.clearRect(0, 0, canvasOptions.width, canvasOptions.height);

		// Draw dot with shadow
		ctx.beginPath();
		ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
		ctx.shadowBlur = 10;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.arc(position.x, position.y, config.size, 0, Math.PI * 2);
		ctx.fillStyle = config.color;
		ctx.fill();
		ctx.closePath();

		// Reset shadow
		ctx.shadowColor = 'transparent';
	}

	/**
	 * Animation loop
	 */
	function animate(): void {
		updatePosition();
		draw();
		animationFrame = requestAnimationFrame(animate);
	}

	/**
	 * Updates canvas dimensions and dot position on resize
	 */
	function updateCanvasSize(): void {
		if (typeof window === 'undefined') return;

		canvasOptions.width = window.innerWidth;
		canvasOptions.height = window.innerHeight;

		if (canvas) {
			canvas.width = canvasOptions.width;
			canvas.height = canvasOptions.height;
		}

		// Center the dot
		position.x = canvasOptions.width / 2;
		position.y = canvasOptions.height / 2;
	}

	onMount(() => {
		// Initialize DoomScroller with comprehensive config
		$scroller.subscribe(handleScroll);

		canvasOptions.context = canvas.getContext('2d');
		if (!canvasOptions.context) {
			throw new Error('Could not get canvas context');
		}

		updateCanvasSize();

		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateCanvasSize);
		}

		animate();
	});

	onDestroy(() => {
		if ($scroller) $scroller.destroy();
		if (animationFrame) cancelAnimationFrame(animationFrame);
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', updateCanvasSize);
		}
	});
</script>

<canvas class="block overscroll-none touch-none fixed inset-0" bind:this={canvas}> </canvas>
