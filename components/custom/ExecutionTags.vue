<template>
	<div class="relative flex flex-col gap-1.5">
		<label
			:for="inputId"
			class="text-[13px] font-medium text-app-text-2"
		>{{ label }}</label>
		<TagsInput
			:model-value="modelValue"
			class="flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-[10px] border border-app-border-strong bg-app-surface-2 px-1.5 py-1.5 focus-within:border-app-accent focus-within:ring-2 focus-within:ring-app-accent/25"
			@update:model-value="$emit('update:modelValue', $event)"
		>
			<TagsInputItem
				v-for="item in modelValue"
				:key="item"
				class="inline-flex h-[30px] w-max items-center gap-1 rounded-lg bg-app-chip pl-2.5 pr-1 font-mono text-xs text-app-text"
				:value="item"
			>
				<TagsInputItemText />
				<TagsInputItemDelete
					class="mr-0 inline-flex h-6 w-6 items-center justify-center rounded-md text-app-text-2 hover:bg-app-hover hover:text-app-text"
					:aria-label="`Remove tag ${item}`"
				/>
			</TagsInputItem>
			<TagsInputInput
				:id="inputId"
				ref="inputRef"
				class="h-8 min-w-[120px] flex-1 border-none bg-transparent px-1.5 text-sm text-app-text placeholder:text-app-text-4 outline-none"
				:placeholder="modelValue.length ? 'Add another…' : placeholder"
				@input="handleInput"
				@focus="isFocused = true"
				@blur="isFocused = false"
			/>
		</TagsInput>
		<ul
			v-if="isFocused && suggestions.length > 0"
			class="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-[10px] border border-app-border bg-app-surface p-1 shadow-lg"
		>
			<li
				v-for="tag in suggestions"
				:key="tag"
			>
				<button
					type="button"
					class="block min-h-[36px] w-full rounded-lg px-2.5 text-left font-mono text-[13px] text-app-text hover:bg-app-hover"
					@mousedown.prevent="selectSuggestion(tag)"
				>
					{{ tag }}
				</button>
			</li>
		</ul>
		<p class="text-xs text-app-text-3">
			<template v-if="currentInput.length > 0">
				Press Enter to add this tag.
			</template>
			<template v-else-if="modelValue.length > 0">
				Backspace removes the last tag.
			</template>
			<template v-else>
				Type a tag and press Enter.
			</template>
		</p>
	</div>
</template>

<script setup lang="ts">
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from '~/components/ui/tags-input';

const props = defineProps({
	modelValue: {
		type: Array as () => string[],
		default: () => [],
	},
	availableTags: {
		type: Array as () => string[],
		default: () => [],
	},
	label: {
		type: String,
		default: 'Tags',
	},
	placeholder: {
		type: String,
		default: 'Add a tag by typing',
	},
});
const emit = defineEmits(['update:modelValue']);

const inputId = useId();
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
