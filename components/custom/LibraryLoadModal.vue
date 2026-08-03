<template>
	<BaseModal v-model="internalIsOpen">
		<div
			class="relative z-20 flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded border border-slate-400 bg-white text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<div class="flex items-center justify-between border-b border-slate-300 p-4 dark:border-slate-600">
				<h3 class="text-sm font-semibold">
					{{ title }}
				</h3>
				<button
					type="button"
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
					@click="close"
				>
					&times;
				</button>
			</div>
			<div class="overflow-y-auto p-2">
				<p
					v-if="items.length === 0"
					class="p-4 text-center text-sm text-gray-500"
				>
					Nothing saved yet.
				</p>
				<button
					v-for="item in items"
					:key="item.id"
					type="button"
					class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
					@click="select(item.id)"
				>
					<span>{{ item.name }}</span>
					<Trash2
						class="h-4 w-4 shrink-0 text-gray-400 hover:text-red-600"
						@click.stop="$emit('delete', item.id)"
					/>
				</button>
			</div>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import { BaseModal } from '~/components/ui/base-modal';

const props = defineProps({
	modelValue: Boolean,
	items: {
		type: Array as () => { id: string; name: string }[],
		default: () => [],
	},
	title: {
		type: String,
		default: 'Load from library',
	},
});
const emit = defineEmits(['update:modelValue', 'select', 'delete']);
const internalIsOpen = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
	internalIsOpen.value = newValue;
});

const close = () => {
	internalIsOpen.value = false;
	emit('update:modelValue', false);
};
const select = (id: string) => {
	emit('select', id);
	close();
};
</script>
