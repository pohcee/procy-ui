<template>
	<OpDialog
		:model-value="internalIsOpen"
		:title="title"
		size="sm"
		@update:model-value="v => !v && close()"
	>
		<OpEmpty
			v-if="items.length === 0"
			:icon="BookOpen"
			title="Nothing saved yet"
			description="Save a command or script to the library to reuse it here."
		/>
		<div
			v-else
			class="flex flex-col gap-3"
		>
			<input
				v-if="items.length > 6"
				v-model="search"
				type="search"
				aria-label="Search the library"
				placeholder="Search…"
				class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-sm text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
			>
			<ul class="-mx-1 flex flex-col">
				<li
					v-for="item in filtered"
					:key="item.id"
					class="flex items-center gap-1 rounded-lg hover:bg-app-hover"
				>
					<button
						type="button"
						class="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 text-left text-sm text-app-text"
						@click="select(item)"
					>
						<component
							:is="item.kind === 'command' ? SquareTerminal : FileCode2"
							class="h-4 w-4 shrink-0 text-app-text-3"
							aria-hidden="true"
						/>
						<span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
						<span
							v-if="item.kind"
							class="shrink-0 rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
						>{{ item.kind === 'script' ? 'Script' : 'Command' }}</span>
					</button>
					<button
						type="button"
						class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-danger-bg hover:text-app-danger"
						:aria-label="`Delete ${item.name} from the library`"
						@click="$emit('delete', item)"
					>
						<Trash2
							class="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
				</li>
			</ul>
			<p
				v-if="filtered.length === 0"
				class="py-4 text-center text-sm text-app-text-3"
			>
				No matches.
			</p>
		</div>
	</OpDialog>
</template>

<script setup lang="ts">
import { BookOpen, FileCode2, SquareTerminal, Trash2 } from 'lucide-vue-next';
import type { LibraryPickItem } from '~/utils/runKind';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';

const props = defineProps({
	modelValue: Boolean,
	items: {
		type: Array as () => LibraryPickItem[],
		default: () => [],
	},
	title: {
		type: String,
		default: 'Load from library',
	},
});
const emit = defineEmits(['update:modelValue', 'select', 'delete']);
const internalIsOpen = ref(props.modelValue);
const search = ref('');

watch(() => props.modelValue, (newValue) => {
	internalIsOpen.value = newValue;
	if (newValue) search.value = '';
});

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	return term ? props.items.filter(item => item.name.toLowerCase().includes(term)) : props.items;
});

const close = () => {
	internalIsOpen.value = false;
	emit('update:modelValue', false);
};
const select = (item: LibraryPickItem) => {
	emit('select', item);
	close();
};
</script>
