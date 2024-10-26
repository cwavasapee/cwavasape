<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ScrollState } from '@cwavasape/doom-scroller';
	import { scroller, scrollerState } from '$lib/scroller';
	import type { RenderState, DotConfig } from './types';
	import { DEFAULT_CONFIG } from './config';
	import { DotPhysics } from './physics';
	import { DotRenderer } from './renderer';

	let canvas: HTMLCanvasElement;
	let state: RenderState = {
		context: null,
		width: 0,
		height: 0,
		position: { x: 0, y: 0 },
		velocity: { x: 0, y: 0 },
		center: { x: 0, y: 0 }
	};

	const config: DotConfig = DEFAULT_CONFIG;

	let animationFrame: number | undefined;
	let isMounted = false;
	let resizeObserver: ResizeObserver | undefined;

	/**
	 * Updates dot position and handles physics
	 */
	function updatePosition(): void {
		// Update position with velocity
		state.position.x += state.velocity.x;
		state.position.y += state.velocity.y;

		// Apply friction
		const newVelocity = DotPhysics.applyFriction(state.velocity, config.movement.friction);
		state.velocity = newVelocity;

		const currentVelocity = DotPhysics.getTotalVelocity(state.velocity);

		// Handle joystick return-to-center behavior
		if (config.joystick.enabled) {
			const distance = DotPhysics.getDistance(state.position, state.center);

			if (currentVelocity < config.movement.resetThreshold) {
				if (distance > config.joystick.returnThreshold) {
					const returnForce = DotPhysics.calculateReturnForce(
						state.position,
						state.center,
						config.joystick.returnStrength
					);
					state.velocity.x += returnForce.x;
					state.velocity.y += returnForce.y;
				} else if (
					distance <= config.joystick.returnThreshold &&
					currentVelocity < config.movement.minVelocity
				) {
					state.position = { ...state.center };
					state.velocity = { x: 0, y: 0 };
				}
			}
		}

		// Handle minimum velocity
		if (Math.abs(state.velocity.x) < config.movement.minVelocity) state.velocity.x = 0;
		if (Math.abs(state.velocity.y) < config.movement.minVelocity) state.velocity.y = 0;

		// Handle boundaries
		const { size } = config.appearance;
		if (state.position.x < size) {
			state.position.x = size;
			state.velocity.x = Math.abs(state.velocity.x);
		} else if (state.position.x > state.width - size) {
			state.position.x = state.width - size;
			state.velocity.x = -Math.abs(state.velocity.x);
		}

		if (state.position.y < size) {
			state.position.y = size;
			state.velocity.y = Math.abs(state.velocity.y);
		} else if (state.position.y > state.height - size) {
			state.position.y = state.height - size;
			state.velocity.y = -Math.abs(state.velocity.y);
		}
	}

	/**
	 * Renders the current frame
	 */
	function render(): void {
		if (!state.context) return;

		DotRenderer.clear(state);

		if (config.joystick.enabled) {
			DotRenderer.drawCenterPoint(state);
		}

		DotRenderer.drawDot(state, config.appearance);
	}

	/**
	 * Animation loop with optimized performance
	 */
	function animate(): void {
		if (!isMounted) return;

		updatePosition();
		render();

		animationFrame = requestAnimationFrame(animate);
	}

	/**
	 * Handles scroll events with throttling
	 */
	function handleScroll(scrollState: ScrollState): void {
		if (!isMounted) return;

		$scrollerState = scrollState;

		if (!scrollState.isScrolling) return;

		state.velocity.x += scrollState.delta.x * config.movement.speed;
		state.velocity.y += scrollState.delta.y * config.movement.speed;
	}

	/**
	 * Updates canvas dimensions with DPI handling
	 */
	function updateCanvasSize(): void {
		if (!canvas || !isMounted) return;

		const rect = canvas.getBoundingClientRect();
		state.width = rect.width;
		state.height = rect.height;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = state.width * dpr;
		canvas.height = state.height * dpr;

		if (state.context) {
			state.context.scale(dpr, dpr);
		}

		state.center = {
			x: state.width / 2,
			y: state.height / 2
		};

		state.position = { ...state.center };
	}

	/**
	 * Toggles joystick mode with position reset
	 */
	function toggleJoystickMode(): void {
		config.joystick.enabled = !config.joystick.enabled;
		if (config.joystick.enabled) {
			state.position = { ...state.center };
			state.velocity = { x: 0, y: 0 };
		}
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		isMounted = true;
		state.context = canvas.getContext('2d');

		if (!state.context) {
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

<button
	class="absolute top-20 right-4 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-400 transition-colors p-4 z-50"
	onclick={toggleJoystickMode}
>
	{config.joystick.enabled ? 'Disable' : 'Enable'} Joystick Mode
</button>

<canvas class="block overscroll-none touch-none fixed inset-0 w-full h-full" bind:this={canvas}>
</canvas>
