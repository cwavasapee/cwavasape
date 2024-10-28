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

	const BALL_SIZE = 50;
	const BALL_COLOR = '#ff3e00';
	const GLOW_COLOR = 'rgba(255, 62, 0, 0.6)';
	const VELOCITY_THRESHOLD = 0.01;

	$effect(() => {
		if (canvas) {
			canvas.width = width;
			canvas.height = height;
			drawBall();
		}
	});

	function drawBall() {
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Calculate ball scale based on velocity
		const scale = isMoving ? 1 + Math.min(0.3, Math.abs(velocity.x) + Math.abs(velocity.y)) : 1;
		const scaledSize = BALL_SIZE * scale;

		// Update glow effect
		ctx.shadowBlur = isMoving ? 20 : 0;
		ctx.shadowColor = GLOW_COLOR;

		// Draw ball using position deltas
		const centerX = canvas.width / 2 + position.x;
		const centerY = canvas.height / 2 + position.y;

		ctx.beginPath();
		ctx.fillStyle = BALL_COLOR;
		ctx.arc(centerX, centerY, scaledSize / 2, 0, Math.PI * 2);
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
			debounceTime: 150,
			smoothing: {
				active: false
			},
			events: {
				wheel: true,
				touch: true,
				mouse: false
			}
		});

		scroller.subscribe((data: ScrollState) => {
			$scrollState = data;

			if (data.movement) {
				position.x += data.movement.x;
				position.y += data.movement.y;
			}

			// Constrain position
			const maxX = (canvas.width - BALL_SIZE) / 2;
			const maxY = (canvas.height - BALL_SIZE) / 2;
			position.x = Math.max(-maxX, Math.min(position.x, maxX));
			position.y = Math.max(-maxY, Math.min(position.y, maxY));

			velocity = data.velocity;
			isMoving =
				Math.abs(data.velocity.x) > VELOCITY_THRESHOLD ||
				Math.abs(data.velocity.y) > VELOCITY_THRESHOLD;

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
	<canvas class="absolute inset-0 touch-none overscroll-none" bind:this={canvas}></canvas>
	<div class="font-system fixed bottom-8 left-1/2 -translate-x-1/2 text-center opacity-70">
		<p>Scroll or swipe to move the ball</p>
	</div>
</div>
