<template>
	<span
		class="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-app-surface/60 backdrop-blur-[1px]"
		role="status"
	>
		<Loader2
			class="h-6 w-6 animate-spin text-app-accent"
			aria-hidden="true"
		/>
		<span class="sr-only">Loading…</span>
	</span>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
</script>
