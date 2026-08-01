<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';
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
}>(), {
	modelValue: undefined,
	label: undefined,
	placeholder: undefined,
	id: undefined,
	disabled: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: T];
}>();

const stringValue = computed(() => props.modelValue === undefined || props.modelValue === null
	? undefined
	: String(props.modelValue));

function handleUpdate(next: string) {
	const match = props.options.find((option) => String(option.value) === next);
	emit('update:modelValue', (match ? match.value : next) as T);
}
</script>

<template>
	<div class="relative mt-1 flex w-full flex-col">
		<Select
			:model-value="stringValue"
			:disabled="disabled"
			@update:model-value="handleUpdate"
		>
			<SelectTrigger
				:id="id"
				class="order-2 h-10 w-full rounded border-theme-border bg-transparent text-sm text-theme-inverted"
			>
				<SelectValue :placeholder="placeholder" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem
					v-for="option in options"
					:key="String(option.value)"
					:value="String(option.value)"
					:disabled="option.disabled"
				>
					{{ option.label }}
				</SelectItem>
			</SelectContent>
		</Select>
		<label
			v-if="label"
			:for="id"
			class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label"
		>{{ label }}</label>
	</div>
</template>
