<template>
	<div
		role="meter"
		:aria-label="label"
		aria-valuemin="0"
		aria-valuemax="100"
		:aria-valuenow="clamped"
		class="h-2 overflow-hidden rounded-full bg-app-chip"
	>
		<div
			:class="['h-2 rounded-full', clamped >= 90 ? 'bg-app-danger' : 'bg-app-accent']"
			:style="{ width: `${clamped}%` }"
		/>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	label: string;
	value: number;
}>();

const clamped = computed(() => Math.min(100, Math.max(0, Math.round(Number(props.value) || 0))));
</script>
