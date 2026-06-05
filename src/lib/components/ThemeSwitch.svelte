<script lang="ts">
	interface Props {
		on: boolean;
		onchange: () => void;
	}

	let { on, onchange }: Props = $props();
</script>

<!-- iOS-style toggle switch -->
<button
	role="switch"
	aria-checked={on}
	aria-label="Toggle dark mode"
	onclick={onchange}
	style="
		width: 44px;
		height: 26px;
		border-radius: 13px;
		padding: 3px;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: {on ? 'flex-end' : 'flex-start'};
		background: {on ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'};
		transition: background 0.18s ease;
		flex-shrink: 0;
	"
>
	<span
		style="
			width: 20px;
			height: 20px;
			border-radius: 50%;
			background: {on ? 'hsl(var(--primary-foreground))' : 'hsl(var(--background))'};
			box-shadow: 0 1px 3px rgba(0,0,0,0.25);
			transition: background 0.18s ease;
			display: block;
		"
	></span>
</button>
