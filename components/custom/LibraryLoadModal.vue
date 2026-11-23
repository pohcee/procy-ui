<template>
	<OpDialog
		:model-value="internalIsOpen"
		:title="title"
		size="sm"
		@update:model-value="v => !v && close()"
	>
		<div
			v-if="choosing"
			class="flex flex-col gap-3"
		>
			<p class="text-sm text-app-text-2">
				<span class="font-medium text-app-text">{{ choosing.name }}</span> has a version for each OS. Which one do you want to insert?
			</p>
			<ul class="-mx-1 flex flex-col">
				<li
					v-for="os in choosing.os"
					:key="os"
				>
					<button
						type="button"
						class="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-app-text hover:bg-app-hover"
						@click="choose(os)"
					>
						<span class="flex-1">{{ LIBRARY_OS_LABELS[os] }}</span>
						<span
							v-if="os === preferredOs(choosing)"
							class="shrink-0 rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
						>{{ defaultOs && choosing.os.includes(defaultOs) ? 'Target OS' : 'Primary' }}</span>
					</button>
				</li>
			</ul>
		</div>
		<OpEmpty
			v-else-if="items.length === 0"
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
						<span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
						<span
							v-for="os in item.os"
							:key="os"
							class="shrink-0 rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
						>{{ LIBRARY_OS_LABELS[os] }}</span>
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
import { BookOpen, Trash2 } from 'lucide-vue-next';
import { LIBRARY_OS_LABELS, LIBRARY_OS_ORDER } from '~/composables/useRunLibrary';
import type { LibraryPickItem } from '~/utils/runKind';
import type { LibraryOS } from '~/types';
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
	/** The OS of the targeted device (when exactly one OS is targeted); preferred when an entry has several. */
	defaultOs: {
		type: String as () => LibraryOS | undefined,
		default: undefined,
	},
});
const emit = defineEmits(['update:modelValue', 'select', 'delete']);
const internalIsOpen = ref(props.modelValue);
const search = ref('');
/** An entry with several OSes, waiting for the user to pick one. */
const choosing = ref<LibraryPickItem | null>(null);

watch(() => props.modelValue, (newValue) => {
	internalIsOpen.value = newValue;
	if (newValue) {
		search.value = '';
		choosing.value = null;
	}
});

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	return term ? props.items.filter(item => item.name.toLowerCase().includes(term)) : props.items;
});

const close = () => {
	internalIsOpen.value = false;
	emit('update:modelValue', false);
};
/** The OS inserted by default: the target's if the entry has it, else the first of linux, windows, macOS. */
const preferredOs = (item: LibraryPickItem): LibraryOS | undefined =>
	(props.defaultOs && item.os.includes(props.defaultOs) ? props.defaultOs : LIBRARY_OS_ORDER.find(os => item.os.includes(os)));

const select = (item: LibraryPickItem) => {
	if (item.os.length > 1) {
		choosing.value = item;
		return;
	}
	emit('select', item, item.os[0]);
	close();
};
const choose = (os: LibraryOS) => {
	if (!choosing.value) return;
	emit('select', choosing.value, os);
	close();
};
</script>
