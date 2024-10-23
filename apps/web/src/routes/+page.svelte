<script lang="ts">
	import { DoomScroller, type ScrollState } from '@fcastrovilli/doom-scroller';
	import { onMount } from 'svelte';

	let scroller: DoomScroller | undefined = $state(undefined);

	onMount(() => {
		scroller = new DoomScroller({
			speedMultiplier: 1.2,
			directionThreshold: 0.2,
			smoothingFactor: 0.4
		});
	});

	let scrollState: ScrollState | undefined = $state();

	$effect(() => {
		scroller?.subscribe((state) => {
			scrollState = state;
			console.log(state.delta);
		});
		return () => scroller?.destroy();
	});
</script>

<h1 class="text-3xl">Doom Scroller Testing</h1>

<div class="rounded flex flex-col justify-center items-start gap-2 p-4 bg-gray-100 shadow-lg">
	<p>Is Scrolling: {scrollState?.isScrolling}</p>
	<div class="flex flex-row gap-2">
		<span>Direction:</span>
		<pre>{JSON.stringify(scrollState?.direction)}</pre>
	</div>
	<div class="flex flex-row gap-2">
		<span>Velocity:</span>
		<pre>{JSON.stringify(scrollState?.velocity)}</pre>
	</div>
</div>
