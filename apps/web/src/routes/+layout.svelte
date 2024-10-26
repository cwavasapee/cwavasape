<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	let { children } = $props();
	import Debug from '$lib/debug/Debug.svelte';
	import { scroller } from '$lib/scroller';

	onMount(() => {
		// Initialize DoomScroller with comprehensive config
		$scroller.init();
	});
</script>

<div class="w-screen h-screen overscroll-none" onscroll={({ preventDefault }) => preventDefault()}>
	{@render children()}
</div>

<Debug />
