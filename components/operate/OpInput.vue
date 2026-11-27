<template>
	<!-- 44px text/number input in the Procy style. Extra attrs (id, placeholder, aria-*…) pass through. -->
	<input
		v-model="model"
		:type="type"
		:class="[
			'h-11 w-full min-w-0 rounded-[10px] border bg-app-surface-2 px-3 text-app-text placeholder:text-app-text-4',
			'focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/25',
			'read-only:cursor-default read-only:opacity-60 disabled:cursor-not-allowed disabled:opacity-50',
			invalid ? 'border-app-danger' : 'border-app-border-strong',
			mono ? 'font-mono text-[13px]' : 'text-sm',
		]"
		:aria-invalid="invalid || undefined"
		autocomplete="off"
	>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	type?: string;
	mono?: boolean;
	invalid?: boolean;
}>(), {
	type: 'text',
	mono: false,
	invalid: false,
});

const model = defineModel<string | number | null | undefined>();
</script>
