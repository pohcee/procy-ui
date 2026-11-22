<template>
	<!-- Pending update count: a coloured pill when > 0, an em dash otherwise. -->
	<span
		v-if="count"
		:class="[
			'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-xs font-semibold',
			kind === 'security' ? 'bg-app-danger-bg text-app-danger' : 'bg-app-blue-bg text-app-blue',
		]"
	>
		{{ count }}<span
			v-if="labelled"
			class="font-sans font-medium"
		>{{ kind === 'security' ? 'security' : 'updates' }}</span>
	</span>
	<span
		v-else-if="!labelled"
		class="text-[13px] text-app-text-4"
	>—</span>
</template>

<script setup lang="ts">
defineProps<{
	count?: number | null;
	kind: 'updates' | 'security';
	labelled?: boolean;
}>();
</script>
