<script lang="ts">
	import { onMount } from 'svelte';
	import { DoomScroller } from '@cwavasape/doom-scroller';
	import type { ScrollState, Vector2D } from '@cwavasape/doom-scroller';
	import { scrollState } from '$lib/stores';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let width = $state(0);
	let height = $state(0);
	let position = $state<Vector2D>({ x: 0, y: 0 });
	let velocity = $state<Vector2D>({ x: 0, y: 0 });
	let isMoving = $state(false);
	let scroller: DoomScroller | undefined = $state(undefined);

	const BASE_COLOR = { r: 255, g: 62, b: 0 }; // Original color in RGB
	const BASE_BALL_SIZE = 50;

	const VELOCITY_THRESHOLD = 0.01;

	let currentSize = $state(BASE_BALL_SIZE);
	const SIZE_SMOOTHING_FACTOR = 0.15;

	$effect(() => {
		if (canvas) {
			canvas.width = width;
			canvas.height = height;
			drawBall();
		}
	});

	function getColorFromVelocity(xVelocity: number): string {
		// Now we know xVelocity is always positive, simplify the normalization
		const normalizedVel = Math.min(xVelocity, 2) / 2;

		// Interpolate between base color and a different hue
		const r = BASE_COLOR.r * (1 - normalizedVel) + 0 * normalizedVel;
		const g = BASE_COLOR.g * (1 - normalizedVel) + 150 * normalizedVel;
		const b = BASE_COLOR.b * (1 - normalizedVel) + 255 * normalizedVel;

		return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
	}

	function getBallSize(yVelocity: number): number {
		const normalizedVel = Math.min(yVelocity, 2) / 4;
		const targetSize = BASE_BALL_SIZE * (0.8 + normalizedVel * 0.4);

		// Smooth transition between current and target size
		currentSize += (targetSize - currentSize) * SIZE_SMOOTHING_FACTOR;

		return currentSize;
	}

	function drawBall() {
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const velocityMagnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
		const dynamicColor = getColorFromVelocity(velocity.x);
		const dynamicSize = getBallSize(velocity.y);

		// Scale based on overall velocity for squash effect
		const scale = isMoving ? 1 + Math.min(0.3, velocityMagnitude) : 1;
		const deformationX = isMoving ? velocity.x * 0.2 : 0;
		const deformationY = isMoving ? velocity.y * 0.2 : 0;

		// Update glow effect based on velocity
		ctx.shadowBlur = isMoving ? 20 * velocityMagnitude : 0;
		ctx.shadowColor = `rgba(${BASE_COLOR.r}, ${BASE_COLOR.g}, ${BASE_COLOR.b}, 0.6)`;

		const centerX = canvas.width / 2 + position.x;
		const centerY = canvas.height / 2 + position.y;

		ctx.beginPath();
		ctx.fillStyle = dynamicColor;
		ctx.ellipse(
			centerX,
			centerY,
			(dynamicSize * scale) / 2 + deformationX,
			(dynamicSize * scale) / 2 + deformationY,
			Math.atan2(velocity.y, velocity.x),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.closePath();
	}

	function updateDimensions() {
		width = window.innerWidth;
		height = window.innerHeight;
	}

	onMount(() => {
		updateDimensions();
		ctx = canvas.getContext('2d');

		scroller = new DoomScroller({
			steps: {
				active: false
			},
			events: {
				wheel: true,
				touch: true,
				mouse: false,
				passive: true,
				endDelay: 50
			},
			movement: {
				smoothing: {
					active: false,
					factor: 0.2,
					algorithm: 'linear'
				}
			},
			velocity: {
				min: 0,
				max: 2,
				algorithm: 'linear',
				smoothing: {
					active: true,
					factor: 0.5
				}
			}
		});

		scroller.subscribe((data: ScrollState) => {
			$scrollState = data;

			if (data.movement) {
				position.x += data.movement.x;
				position.y += data.movement.y;
			}

			// Simplified boundary checks since we're using absolute values
			const maxX = (canvas.width - BASE_BALL_SIZE) / 2;
			const maxY = (canvas.height - BASE_BALL_SIZE) / 2;
			const bounceElasticity = 0.5;

			// Use Math.abs for position checks
			if (Math.abs(position.x) > maxX) {
				position.x = Math.sign(position.x) * maxX;
				// No need to flip velocity since it's handled by the library
			}

			if (Math.abs(position.y) > maxY) {
				position.y = Math.sign(position.y) * maxY;
				// No need to flip velocity since it's handled by the library
			}

			velocity = data.velocity;
			isMoving = velocity.x > VELOCITY_THRESHOLD || velocity.y > VELOCITY_THRESHOLD;

			drawBall();
		});

		scroller.start();
		drawBall();

		const handleResize = () => updateDimensions();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (scroller) scroller.destroy();
		};
	});
</script>

<div class="relative h-screen w-screen">
	<canvas class="absolute inset-0 touch-none overscroll-none" bind:this={canvas}> </canvas>
	<div class="font-system fixed bottom-8 left-1/2 -translate-x-1/2 text-center opacity-70">
		<p>Scroll or swipe to move the ball</p>
	</div>
</div>
