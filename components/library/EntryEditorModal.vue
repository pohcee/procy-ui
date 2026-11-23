<template>
	<OpDialog
		v-model="isOpen"
		:title="title"
		:description="readonly ? 'Built-in entries can’t be changed. Duplicate it to make your own copy.' : 'Saved entries can be inserted on the Execute page and on devices. Each OS has its own code.'"
		size="xl"
		as-form
		@submit="save"
	>
		<div class="flex flex-col gap-4">
			<OpField
				label="Name"
				for-id="libEntryName"
			>
				<OpInput
					id="libEntryName"
					v-model="name"
					placeholder="e.g. Restart nginx"
					:readonly="readonly"
				/>
			</OpField>
			<OpField
				label="Description"
				hint="(optional)"
				for-id="libEntryDescription"
			>
				<OpInput
					id="libEntryDescription"
					v-model="description"
					:readonly="readonly"
				/>
			</OpField>
			<div
				v-if="readonly"
				class="flex flex-wrap gap-1"
			>
				<span
					v-for="tag in tags"
					:key="tag"
					class="rounded-md bg-app-chip px-2 py-0.5 font-mono text-xs text-app-text-2"
				>{{ tag }}</span>
			</div>
			<ExecutionTags
				v-else
				v-model="tags"
			/>

			<div class="flex flex-col gap-3">
				<div
					role="tablist"
					aria-label="Operating system"
					class="flex gap-1 border-b border-app-border"
					@keydown.right.prevent="moveTab(1)"
					@keydown.left.prevent="moveTab(-1)"
				>
					<button
						v-for="os in LIBRARY_OS_ORDER"
						:id="`libTab-${os}`"
						:key="os"
						type="button"
						role="tab"
						:aria-selected="activeOs === os"
						:aria-controls="`libPanel-${os}`"
						:tabindex="activeOs === os ? 0 : -1"
						:class="[
							'-mb-px inline-flex min-h-[44px] items-center gap-1.5 border-b-2 px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40',
							activeOs === os ? 'border-app-accent text-app-text' : 'border-transparent text-app-text-3 hover:text-app-text',
						]"
						@click="activeOs = os"
					>
						{{ LIBRARY_OS_LABELS[os] }}
						<span
							v-if="drafts[os].code.trim()"
							class="h-1.5 w-1.5 rounded-full bg-app-accent"
							aria-hidden="true"
						/>
						<span
							v-if="drafts[os].code.trim()"
							class="sr-only"
						>(implemented)</span>
					</button>
				</div>
				<div
					v-for="os in LIBRARY_OS_ORDER"
					v-show="activeOs === os"
					:id="`libPanel-${os}`"
					:key="os"
					role="tabpanel"
					:aria-labelledby="`libTab-${os}`"
				>
					<EntryOsTab
						v-model="drafts[os]"
						:label="LIBRARY_OS_LABELS[os]"
						:readonly="readonly"
						@insert="openInsert"
						@remove="drafts[os] = blankDraft()"
					/>
				</div>
			</div>

			<OpField
				v-if="!readonly"
				label="What changed"
				hint="(optional)"
				for-id="libEntryMessage"
			>
				<OpInput
					id="libEntryMessage"
					v-model="message"
					placeholder="Shown in the entry’s history"
				/>
			</OpField>

			<!-- Task 11: the version History panel goes here. -->
			<slot
				name="history"
				:entry="editing"
			/>
		</div>

		<LibraryLoadModal
			v-model="isInsertOpen"
			title="Insert from library"
			:items="pickItems"
			:default-os="activeOs"
			@select="insertFromLibrary"
		/>
		<EntryConflictDialog
			v-model="conflictOpen"
			:message="conflictMessage"
			:theirs="conflictTheirs"
			:mine="currentImplementations()"
			@reload="reloadTheirs"
			@copy="copyMine"
		/>

		<template #footer>
			<AppButton
				variant="secondary"
				@click="close"
			>
				{{ readonly ? 'Close' : 'Cancel' }}
			</AppButton>
			<AppButton
				v-if="readonly"
				class="ml-auto"
				@click="duplicate"
			>
				Duplicate
			</AppButton>
			<AppButton
				v-else
				type="submit"
				class="ml-auto"
				:disabled="!canSave || isSaving"
			>
				{{ editing ? 'Save changes' : 'Save to library' }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import ExecutionTags from '~/components/custom/ExecutionTags.vue';
import LibraryLoadModal from '~/components/custom/LibraryLoadModal.vue';
import EntryConflictDialog from '~/components/library/EntryConflictDialog.vue';
import EntryOsTab from '~/components/library/EntryOsTab.vue';
import { blankDraft, blankDrafts, draftFrom, implementationFromDraft, type OsDrafts } from '~/components/library/entryDraft';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import { LIBRARY_OS_LABELS, LIBRARY_OS_ORDER, implementationFor, isConflict, primaryOs, useRunLibrary, type LibraryEntry } from '~/composables/useRunLibrary';
import type { EntryImplementations, LibraryOS } from '~/types';
import { apiErrorMessage } from '~/utils/apiError';
import type { LibraryPickItem } from '~/utils/runKind';

const emit = defineEmits(['saved']);

const snackbar = useSnackbar();
const library = useRunLibrary();

const isOpen = ref(false);
const isSaving = ref(false);
/** The full entry being edited (null when creating). */
const editing = ref<LibraryEntry | null>(null);
const activeOs = ref<LibraryOS>('linux');

const name = ref('');
const description = ref('');
const tags = ref<string[]>([]);
const message = ref('');
const drafts = ref<OsDrafts>(blankDrafts());

const readonly = computed(() => !!editing.value?.builtinKey);
const title = computed(() => {
	if (readonly.value) return 'Built-in library entry';
	return editing.value ? 'Edit library entry' : 'New library entry';
});

const hasCode = computed(() => LIBRARY_OS_ORDER.some(os => drafts.value[os].code.trim()));
const canSave = computed(() => !!name.value.trim() && hasCode.value);

const reset = () => {
	name.value = '';
	description.value = '';
	tags.value = [];
	message.value = '';
	drafts.value = blankDrafts();
	activeOs.value = 'linux';
	editing.value = null;
};

const fill = (entry: LibraryEntry) => {
	editing.value = entry;
	name.value = entry.name;
	description.value = entry.description;
	tags.value = [...entry.tags];
	message.value = '';
	for (const os of LIBRARY_OS_ORDER) drafts.value[os] = draftFrom(entry.implementations[os]);
	activeOs.value = primaryOs(entry) ?? 'linux';
};

const openForCreate = () => {
	reset();
	isOpen.value = true;
};

const openForEdit = async (entry: Pick<LibraryEntry, 'id' | 'name'>) => {
	reset();
	try {
		fill(await library.load(entry.id));
		isOpen.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to open ${entry.name}` });
	}
};

/** A new-entry editor holding a copy of the open entry. */
const duplicate = () => {
	const copy = { name: `${name.value} (copy)`, description: description.value, tags: [...tags.value], drafts: drafts.value, os: activeOs.value };
	reset();
	name.value = copy.name;
	description.value = copy.description;
	tags.value = copy.tags;
	drafts.value = copy.drafts;
	activeOs.value = copy.os;
};

const close = () => {
	isOpen.value = false;
};

const moveTab = (step: number) => {
	const next = LIBRARY_OS_ORDER[(LIBRARY_OS_ORDER.indexOf(activeOs.value) + step + LIBRARY_OS_ORDER.length) % LIBRARY_OS_ORDER.length];
	activeOs.value = next;
	nextTick(() => document.getElementById(`libTab-${next}`)?.focus());
};

/** The OS tabs that have code, as the server stores them. */
const currentImplementations = (): EntryImplementations => {
	const out: EntryImplementations = {};
	for (const os of LIBRARY_OS_ORDER) {
		if (drafts.value[os].code.trim()) out[os] = implementationFromDraft(drafts.value[os]);
	}
	return out;
};

// Insert from library into the current tab.
const isInsertOpen = ref(false);
const pickItems = ref<LibraryPickItem[]>([]);

const openInsert = async () => {
	try {
		pickItems.value = (await library.listAll()).map(e => ({ id: e.id, name: e.name, os: e.os }));
		isInsertOpen.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to load the library' });
	}
};

const insertFromLibrary = async (item: LibraryPickItem, os?: LibraryOS) => {
	try {
		const picked = implementationFor(await library.load(item.id), os ?? activeOs.value);
		if (!picked) {
			snackbar.add({ type: 'error', text: `${item.name} has no implementation to insert` });
			return;
		}
		drafts.value[activeOs.value] = draftFrom(picked.implementation);
		isInsertOpen.value = false;
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to insert ${item.name}` });
	}
};

// Conflict (409): never overwrite; show theirs next to mine.
const conflictOpen = ref(false);
const conflictMessage = ref('');
const conflictTheirs = ref<EntryImplementations | null>(null);

const showConflict = async (err: unknown) => {
	const msg = apiErrorMessage(err);
	// Other 409s (the name is taken) have nothing to compare.
	if (!editing.value || !/saved by .+ at .+\(version \d+\)/.test(msg)) {
		snackbar.add({ type: 'error', text: msg });
		return;
	}
	conflictMessage.value = msg;
	try {
		conflictTheirs.value = (await library.load(editing.value.id)).implementations;
	}
	catch {
		conflictTheirs.value = null;
	}
	conflictOpen.value = true;
};

const reloadTheirs = async () => {
	if (!editing.value) return;
	try {
		fill(await library.load(editing.value.id));
		conflictOpen.value = false;
		emit('saved');
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to reload the entry' });
	}
};

const copyMine = async () => {
	try {
		await navigator.clipboard.writeText(drafts.value[activeOs.value].code);
		snackbar.add({ type: 'success', text: `Copied your ${LIBRARY_OS_LABELS[activeOs.value]} code` });
	}
	catch {
		snackbar.add({ type: 'error', text: 'Couldn’t copy to the clipboard' });
	}
};

const save = async () => {
	if (!canSave.value || readonly.value) return;
	isSaving.value = true;
	try {
		await library.saveContent({
			name: name.value.trim(),
			description: description.value.trim(),
			tags: tags.value,
			implementations: currentImplementations(),
		}, editing.value, message.value.trim());
		snackbar.add({ type: 'success', text: editing.value ? 'Library entry updated' : 'Saved to library' });
		emit('saved');
		close();
	}
	catch (e) {
		if (isConflict(e)) await showConflict(e);
		else snackbar.add({ type: 'error', text: 'Failed to save the library entry' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
