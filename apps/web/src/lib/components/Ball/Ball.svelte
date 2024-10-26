<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ScrollState, Vector2D } from '@cwavasape/doom-scroller';
	import { scroller, scrollerState } from '$lib/scroller';

	interface BallState {
		context: CanvasRenderingContext2D | null;
		width: number;
		height: number;
		position: Vector2D;
		baseSize: number;
		currentSize: number;
		targetSize: number;
		color: string;
	}

	interface BallConfig {
		minSize: number;
		maxSize: number;
		elasticity: number; // How quickly the ball changes size (0-1)
		scrollSensitivity: number; // How much scroll affects size
		color: string;
		baseSize: number; // Default size when not scrolling
	}

	const config: BallConfig = {
		minSize: 20,
		maxSize: 200,
		elasticity: 0.15, // Lower = more elastic/bouncy feel
		scrollSensitivity: 0.5,
		color: '#ff3e00',
		baseSize: 40
	};

	let canvas: HTMLCanvasElement;
	let ballState: BallState = {
		context: null,
		width: 0,
		height: 0,
		position: { x: 0, y: 0 },
		baseSize: config.baseSize,
		currentSize: config.baseSize,
		targetSize: config.baseSize,
		color: config.color
	};

	let animationFrame: number | undefined;
	let isMounted = false;
	let resizeObserver: ResizeObserver | undefined;

	/**
	 * Calculates target size based on scroll velocity
	 */
	function calculateTargetSize(scrollDelta: Vector2D): number {
		const scrollSpeed = Math.sqrt(scrollDelta.x * scrollDelta.x + scrollDelta.y * scrollDelta.y);

		// Exponential growth for more dramatic effect
		const growthFactor = Math.pow(scrollSpeed * config.scrollSensitivity, 1.5);
		const targetSize = config.baseSize + growthFactor;

		return Math.min(Math.max(targetSize, config.minSize), config.maxSize);
	}

	/**
	 * Updates ball size with elastic animation
	 */
	function updateBallSize(): void {
		const sizeDiff = ballState.targetSize - ballState.currentSize;

		if (Math.abs(sizeDiff) > 0.1) {
			ballState.currentSize += sizeDiff * config.elasticity;
		}

		// Gradually return to base size when not scrolling
		if (!$scrollerState?.isScrolling) {
			ballState.targetSize = Math.max(
				ballState.targetSize - (ballState.targetSize - config.baseSize) * 0.1,
				config.baseSize
			);
		}
	}

	/**
	 * Renders the ball
	 */
	function render(): void {
		if (!ballState.context) return;

		// Clear canvas
		ballState.context.clearRect(0, 0, ballState.width, ballState.height);

		// Draw ball
		ballState.context.beginPath();
		ballState.context.arc(
			ballState.position.x,
			ballState.position.y,
			ballState.currentSize / 2,
			0,
			Math.PI * 2
		);

		// Add gradient fill
		const gradient = ballState.context.createRadialGradient(
			ballState.position.x,
			ballState.position.y,
			0,
			ballState.position.x,
			ballState.position.y,
			ballState.currentSize / 2
		);
		gradient.addColorStop(0, ballState.color);
		gradient.addColorStop(1, adjustColor(ballState.color, -30));

		ballState.context.fillStyle = gradient;
		ballState.context.fill();

		// Add highlight
		ballState.context.beginPath();
		ballState.context.arc(
			ballState.position.x - ballState.currentSize * 0.2,
			ballState.position.y - ballState.currentSize * 0.2,
			ballState.currentSize * 0.15,
			0,
			Math.PI * 2
		);
		ballState.context.fillStyle = 'rgba(255, 255, 255, 0.3)';
		ballState.context.fill();
	}

	/**
	 * Adjusts color brightness
	 */
	function adjustColor(color: string, amount: number): string {
		const hex = color.replace('#', '');
		const num = parseInt(hex, 16);
		let r = (num >> 16) + amount;
		let g = ((num >> 8) & 0x00ff) + amount;
		let b = (num & 0x0000ff) + amount;

		r = Math.min(Math.max(0, r), 255);
		g = Math.min(Math.max(0, g), 255);
		b = Math.min(Math.max(0, b), 255);

		return `#${(b | (g << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
	}

	/**
	 * Animation loop
	 */
	function animate(): void {
		if (!isMounted) return;

		updateBallSize();
		render();

		animationFrame = requestAnimationFrame(animate);
	}

	/**
	 * Handles scroll events
	 */
	function handleScroll(scrollState: ScrollState): void {
		if (!isMounted) return;

		$scrollerState = scrollState;

		if (!scrollState.isScrolling) return;

		ballState.targetSize = calculateTargetSize(scrollState.delta);
	}

	/**
	 * Updates canvas dimensions and ball position
	 */
	function updateCanvasSize(): void {
		if (!canvas || !isMounted) return;

		const rect = canvas.getBoundingClientRect();
		ballState.width = rect.width;
		ballState.height = rect.height;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = ballState.width * dpr;
		canvas.height = ballState.height * dpr;

		if (ballState.context) {
			ballState.context.scale(dpr, dpr);
		}

		// Center the ball
		ballState.position = {
			x: ballState.width / 2,
			y: ballState.height / 2
		};
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		isMounted = true;
		ballState.context = canvas.getContext('2d');

		if (!ballState.context) {
			throw new Error('Canvas context not available');
		}

		resizeObserver = new ResizeObserver(updateCanvasSize);
		resizeObserver.observe(canvas);

		$scroller.subscribe(handleScroll);
		updateCanvasSize();
		animate();
	});

	onDestroy(() => {
		isMounted = false;
		if (typeof window === 'undefined') return;

		if (animationFrame) cancelAnimationFrame(animationFrame);
		if (resizeObserver) resizeObserver.disconnect();
	});
</script>

<canvas class="block overscroll-none touch-none fixed inset-0 w-full h-full" bind:this={canvas}>
</canvas>
