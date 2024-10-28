<script lang="ts">
	import '../app.css';
	let { children } = $props();
	import Debug from '$lib/components/Debug/Debug.svelte';
</script>

<div class="h-screen w-screen overscroll-none" onscroll={({ preventDefault }) => preventDefault()}>
	{@render children()}
	<Debug />
</div>
