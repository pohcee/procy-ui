<template>
	<!--
		Segmented control. `tabs` renders it as a tablist (role="tab" + aria-selected);
		otherwise it is a group of toggle buttons (aria-pressed).
	-->
	<div
		:role="tabs ? 'tablist' : 'group'"
		:aria-label="label"
		:class="['inline-flex max-w-full rounded-[10px] bg-app-muted p-[3px]', block ? 'flex w-full' : '']"
	>
		<button
			v-for="option in options"
			:key="String(option.value)"
			type="button"
			:role="tabs ? 'tab' : undefined"
			:aria-selected="tabs ? option.value === modelValue : undefined"
			:aria-pressed="tabs ? undefined : option.value === modelValue"
			:class="[
				'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-accent',
				size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-[38px]',
				block ? 'flex-1' : '',
				option.value === modelValue
					? 'bg-app-raised font-semibold text-app-text shadow-[0_1px_2px_rgba(16,22,31,0.12)]'
					: 'font-medium text-app-text-2 hover:text-app-text',
			]"
			@click="$emit('update:modelValue', option.value)"
		>
			<component
				:is="option.icon"
				v-if="option.icon"
				class="h-4 w-4"
				aria-hidden="true"
			/>
			{{ option.label }}
			<span
				v-if="option.count !== undefined"
				class="rounded-md bg-app-chip px-1.5 text-xs font-medium text-app-text-3"
			>{{ option.count }}</span>
		</button>
	</div>
</template>

<script setup lang="ts" generic="T extends string | number">
import type { Component } from 'vue';

withDefaults(defineProps<{
	modelValue: T;
	options: { value: T; label: string; icon?: Component; count?: number }[];
	label: string;
	tabs?: boolean;
	block?: boolean;
	size?: 'sm' | 'md';
}>(), {
	tabs: false,
	block: false,
	size: 'md',
});

defineEmits<{
	(e: 'update:modelValue', value: T): void;
}>();
</script>
