<script lang="ts">
	import { onMount } from 'svelte';
	import { type ScrollState } from '@cwavasape/doom-scroller';
	import { ScrollDebugger, type ScrollStats } from './debug';
	import { scroller, scrollerState } from '$lib/scroller';

	// Use $state for reactive values
	let stats = $state<ScrollStats | null>(null);
	let currentState = $state<ScrollState | null>(null);
	let tool_debugger: ScrollDebugger;
	let openDebugPanel = $state(false);

	// Initialize everything on mount
	onMount(() => {
		// Create debugger instance with custom options
		tool_debugger = new ScrollDebugger({
			enableLogging: true,
			logThrottle: 200,
			thresholds: {
				velocity: 5,
				onVelocityThreshold: (velocity) => {
					console.warn('High velocity detected:', velocity);
				}
			},
			historyLimit: 500
		});

		// Subscribe to scroll updates and pass to debugger
		$scroller.subscribe((state) => {
			currentState = state;
			tool_debugger.update(state);
			stats = tool_debugger.getStats();
		});
	});

	// Create reactive values for display
	const formattedVelocity = $derived(
		stats
			? `X: ${stats.peakVelocity.x.toFixed(2)}, Y: ${stats.peakVelocity.y.toFixed(2)}`
			: 'No data'
	);

	const formattedDistance = $derived(
		stats
			? `X: ${stats.totalDistance.x.toFixed(2)}, Y: ${stats.totalDistance.y.toFixed(2)}`
			: 'No data'
	);
</script>

<button
	class="absolute top-4 right-4 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-400 transition-colors p-4 z-50"
	onclick={() => (openDebugPanel = !openDebugPanel)}
>
	{openDebugPanel ? 'Close' : 'Open'} Debug Panel
</button>
{#if openDebugPanel}
	<div class="debug-panel">
		<h2>Scroll Debug Info</h2>

		<div class="stats-container">
			<div class="stat-item">
				<span class="label">Current Scrolling:</span>
				<span class="value">{currentState?.isScrolling ? 'Yes' : 'No'}</span>
			</div>

			{#if stats}
				<div class="stat-item">
					<span class="label">Peak Velocity:</span>
					<span class="value">{formattedVelocity}</span>
				</div>

				<div class="stat-item">
					<span class="label">Total Distance:</span>
					<span class="value">{formattedDistance}</span>
				</div>

				<div class="stat-item">
					<span class="label">Direction Changes:</span>
					<span class="value">
						H: {stats.directionChanges.horizontal}, V: {stats.directionChanges.vertical}
					</span>
				</div>

				<div class="stat-item">
					<span class="label">Scroll Duration:</span>
					<span class="value">{(stats.scrollDuration / 1000).toFixed(2)}s</span>
				</div>
			{/if}
		</div>
		<div>
			<pre>{JSON.stringify($scrollerState, null, 2)}</pre>
		</div>
	</div>
{/if}

<style>
	.debug-panel {
		position: absolute;
		bottom: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.614);
		color: white;
		padding: 16px;
		border-radius: 8px;
		font-family: monospace;
		min-width: 300px;
		z-index: 9999;
		min-width: 50%;
		max-width: 90%;
	}

	h2 {
		margin: 0 0 12px 0;
		font-size: 16px;
	}

	.stats-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		color: #aaa;
		margin-right: 12px;
	}

	.value {
		font-weight: bold;
	}
</style>
