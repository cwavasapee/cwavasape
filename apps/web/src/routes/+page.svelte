<script lang="ts">
	import Dot from '$lib/components/Dot.svelte';
</script>

<div
	class="w-full h-screen flex items-center justify-center overscroll-none"
	onscroll={(scroll) => scroll.preventDefault()}
>
	<Dot />
</div>
