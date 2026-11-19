<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
    import "../app.css";

	let { children }: LayoutProps = $props();

    export const ssr = false;
    //export const prerender = true;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
