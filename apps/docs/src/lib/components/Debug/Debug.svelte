<script lang="ts">
	import { scrollState } from '$lib/stores';
</script>

{#if $scrollState}
	<div class="fixed left-0 top-0 w-1/2 bg-red-400/30 p-4 text-black">
		<pre>
          {JSON.stringify($scrollState, null, 2)}
     </pre>
	</div>
{/if}
