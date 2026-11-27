<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';
import type { AcceptableValue } from 'reka-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

interface SelectOption<T> {
	value: T;
	label: string;
	disabled?: boolean;
}

const props = withDefaults(defineProps<{
	modelValue?: T;
	options: SelectOption<T>[];
	label?: string;
	placeholder?: string;
	id?: string;
	disabled?: boolean;
	mono?: boolean;
}>(), {
	modelValue: undefined,
	label: undefined,
	placeholder: undefined,
	id: undefined,
	disabled: false,
	mono: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: T];
}>();

const stringValue = computed(() => props.modelValue === undefined || props.modelValue === null
	? undefined
	: String(props.modelValue));

function handleUpdate(raw: AcceptableValue) {
	const next = String(raw);
	const match = props.options.find(option => String(option.value) === next);
	emit('update:modelValue', (match ? match.value : next) as T);
}
</script>

<template>
	<div class="flex w-full min-w-0 flex-col gap-1.5">
		<label
			v-if="label"
			:for="id"
			class="text-[13px] font-medium text-app-text-2"
		>{{ label }}</label>
		<Select
			:model-value="stringValue"
			:disabled="disabled"
			@update:model-value="handleUpdate"
		>
			<SelectTrigger
				:id="id"
				:class="[
					'h-11 w-full rounded-[10px] border-app-border-strong bg-app-surface-2 px-3 text-app-text ring-offset-0 focus:border-app-accent focus:ring-2 focus:ring-app-accent/25 focus:ring-offset-0',
					mono ? 'font-mono text-[13px]' : 'text-sm',
				]"
			>
				<SelectValue :placeholder="placeholder" />
			</SelectTrigger>
			<SelectContent class="border-app-border bg-app-surface text-app-text">
				<SelectItem
					v-for="option in options"
					:key="String(option.value)"
					:value="String(option.value)"
					:disabled="option.disabled"
					:class="mono ? 'font-mono text-[13px]' : ''"
				>
					{{ option.label }}
				</SelectItem>
			</SelectContent>
		</Select>
	</div>
</template>
