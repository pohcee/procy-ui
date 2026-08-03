<template>
	<div
		class="relative flex flex-col mt-1"
	>
		<label
			class="text-sm font-normal text-white"
		>Tags</label>
		<TagsInput
			:model-value="modelValue"
			class="mt-1 flex min-h-[40px] flex-wrap overflow-hidden rounded border border-white"
			@update:model-value="$emit('update:modelValue', $event)"
		>
			<TagsInputItem
				v-for="item in modelValue"
				:key="item"
				class="inline-flex items-center bg-gray-100 px-2 py-0.5 text-sm text-gray-800 rounded m-1 flex w-max"
				:value="item"
			>
				<TagsInputItemText />
			</TagsInputItem>
			<TagsInputInput
				ref="inputRef"
				class="flex-auto border-none bg-transparent p-2 text-sm text-white placeholder-gray-300 outline-none"
				placeholder="Add a tag by typing"
				@input="handleInput"
				@focus="isFocused = true"
				@blur="isFocused = false"
			/>
		</TagsInput><!---->
		<div
			v-if="isFocused && suggestions.length > 0"
			class="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded border border-[#133B66] bg-[#15325a] shadow-lg"
		>
			<button
				v-for="tag in suggestions"
				:key="tag"
				type="button"
				class="block w-full px-2 py-1.5 text-left text-sm text-white hover:bg-white hover:bg-opacity-10"
				@mousedown.prevent="selectSuggestion(tag)"
			>
				{{ tag }}
			</button>
		</div>
		<p
			v-if="currentInput.length > 0 && modelValue.length == 0"
			class="mt-1 pl-1 text-xs text-gray-300"
		>
			Press ENTER to add this tag
		</p>
		<p
			v-if="modelValue.length > 0"
			class="mt-1 pl-1 text-xs text-gray-300"
		>
			Press BACKSPACE to remove the last tag
		</p>
		<!---->
	</div>
</template>

<script setup lang="ts">
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemText } from '~/components/ui/tags-input';

const props = defineProps({
	modelValue: {
		type: Array as () => string[],
		default: () => [],
	},
	availableTags: {
		type: Array as () => string[],
		default: () => [],
	},
});
const emit = defineEmits(['update:modelValue']);

const currentInput = ref<string>('');
const isFocused = ref(false);
const inputRef = ref<{ $el: HTMLInputElement } | null>(null);

const suggestions = computed(() => {
	const term = currentInput.value.trim().toLowerCase();
	return props.availableTags
		.filter(tag => !props.modelValue.includes(tag) && (term.length === 0 || tag.toLowerCase().includes(term)))
		.slice(0, 8);
});

const handleInput = (event: Event) => {
	currentInput.value = (event.target as HTMLInputElement).value;
};

const selectSuggestion = (tag: string) => {
	if (!props.modelValue.includes(tag)) {
		emit('update:modelValue', [...props.modelValue, tag]);
	}
	currentInput.value = '';
	const el = inputRef.value?.$el;
	if (el) {
		el.value = '';
		el.focus();
	}
};
</script>
