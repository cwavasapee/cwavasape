<script lang="ts">
	interface DotPosition {
		x: number;
		y: number;
	}

	interface DotConfig {
		size: number;
		color: string;
		speed: number;
		friction: number;
	}

	import { onMount, onDestroy } from 'svelte';
	import { DoomScroller, type ScrollState } from '@cwavasape/doom-scroller';

	let config: DotConfig = { size: 20, color: '#ff3e00', speed: 1.5, friction: 0.2 };
	let canvas: HTMLCanvasElement;
	let context: CanvasRenderingContext2D | null;
	let scroller: DoomScroller;
	let animationFrame: number;
	let height = 0;
	let width = 0;

	let stateObj: ScrollState | undefined = $state();
	const position = $state<DotPosition>({ x: 0, y: 0 });
	const velocity = $state<DotPosition>({ x: 0, y: 0 });

	function handleScroll(state: ScrollState): void {
		stateObj = state;
		if (!state.isScrolling) return;
		velocity.x += state.velocity.x * config.speed;
		velocity.y += state.velocity.y * config.speed;
	}

	function updatePosition(): void {
		position.x += velocity.x;
		position.y += velocity.y;
		velocity.x *= config.friction;
		velocity.y *= config.friction;

		if (Math.abs(velocity.x) < 0.01) velocity.x = 0;
		if (Math.abs(velocity.y) < 0.01) velocity.y = 0;

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

	function draw(): void {
		if (!context) return;
		context.clearRect(0, 0, width, height);
		context.beginPath();
		context.arc(position.x, position.y, config.size, 0, Math.PI * 2);
		context.fillStyle = config.color;
		context.fill();
		context.closePath();
	}

	function animate(): void {
		updatePosition();
		draw();
		animationFrame = requestAnimationFrame(animate);
	}

	function updateCanvasSize() {
		if (typeof window !== 'undefined') {
			width = window.innerWidth;
			height = window.innerHeight;
			if (context) {
				canvas.width = width;
				canvas.height = height;
			}
			position.x = width / 2;
			position.y = height / 2;
		}
	}

	onMount(() => {
		context = canvas.getContext('2d');
		if (!context) throw new Error('Could not get canvas context');

		scroller = new DoomScroller({
			smoothingFactor: 0.5,
			directionThreshold: 0.15,
			debounceTime: 200
		});

		scroller.init();
		scroller.subscribe(handleScroll);

		updateCanvasSize();
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateCanvasSize);
		}

		animate();
	});

	onDestroy(() => {
		if (scroller) scroller.destroy();
		if (animationFrame) cancelAnimationFrame(animationFrame);
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', updateCanvasSize);
		}
	});
</script>

<canvas class="block overscroll-none" bind:this={canvas}> </canvas>

<div class="absolute top-0 left-0">
	<div class="flex flex-col gap-2">
		<label for="velocity">Velocity</label>
		<pre>{JSON.stringify(velocity, null, 2)}</pre>
	</div>
	<pre>{JSON.stringify(stateObj, null, 2)}</pre>
</div>
