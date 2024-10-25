<script lang="ts">
	import ScrollDot from '$lib/components/ScrollDot.svelte';
</script>

<div
	class="w-full h-screen flex items-center justify-center overscroll-none"
	onscroll={(scroll) => scroll.preventDefault()}
>
	<ScrollDot />
</div>
