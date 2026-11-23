<template>
	<OpDialog
		v-model="isOpen"
		:title="title"
		description="Saved entries can be inserted on the Execute page and on devices."
		size="xl"
		as-form
		@submit="save"
	>
		<div class="flex flex-col gap-4">
			<OpField
				label="Name"
				for-id="libItemName"
			>
				<OpInput
					id="libItemName"
					v-model="name"
					placeholder="e.g. Restart nginx"
				/>
			</OpField>
			<ExecutionTags v-model="tags" />
			<div class="flex flex-col gap-1.5">
				<span class="text-[13px] font-medium text-app-text-2">Command or script</span>
				<div class="max-h-[300px] min-h-[180px] overflow-auto rounded-xl border border-app-border bg-[#0F151D]">
					<CommandEditor
						v-model="content"
						class="min-h-[180px]"
						aria-label="Command or script"
					/>
				</div>
				<p
					class="text-xs text-app-text-3"
					aria-live="polite"
				>
					<template v-if="editing">
						Editing the {{ LIBRARY_OS_LABELS[editingOs] }} version.
					</template>
					<template v-else>
						Saved as the Linux version. Whether it runs as a command or a script is decided when it runs.
					</template>
				</p>
			</div>
			<div
				class="grid grid-cols-1 gap-4 sm:grid-cols-2"
			>
				<OpField
					label="Working directory"
					for-id="libItemCwd"
				>
					<OpInput
						id="libItemCwd"
						v-model="cwd"
						mono
					/>
				</OpField>
				<CustomThemedSelect
					id="libItemInterpreter"
					v-model="interpreter"
					label="Interpreter"
					placeholder="Select…"
					:options="interpreterOptionsWith(interpreter)"
				/>
			</div>
			<div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
				<OpField
					label="Timeout (seconds)"
					for-id="libItemTimeout"
				>
					<OpInput
						id="libItemTimeout"
						v-model="timeoutSec"
						type="number"
					/>
				</OpField>
				<OpCheckbox
					v-model="isSudo"
					class="sm:pb-1.5"
				>
					Use sudo <span class="text-app-text-3">(Unix only)</span>
				</OpCheckbox>
			</div>
		</div>
		<template #footer>
			<AppButton
				variant="secondary"
				@click="close"
			>
				Cancel
			</AppButton>
			<AppButton
				type="submit"
				class="ml-auto"
				:disabled="!name || !content || isSaving"
			>
				{{ editing ? 'Save changes' : 'Save to library' }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import ExecutionTags from '~/components/custom/ExecutionTags.vue';
import CommandEditor from '~/components/CommandEditor.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import { LIBRARY_OS_LABELS, implementationFor, isConflict, useRunLibrary, type LibraryEntry } from '~/composables/useRunLibrary';
import type { LibraryOS } from '~/types';

const emit = defineEmits(['saved']);

const snackbar = useSnackbar();
const library = useRunLibrary();

const isOpen = ref(false);
const isSaving = ref(false);
/** The full entry being edited, and which OS's implementation the form holds. */
const editing = ref<LibraryEntry | null>(null);
const editingOs = ref<LibraryOS>('linux');

const name = ref('');
const tags = ref<string[]>([]);
const cwd = ref('');
const interpreter = ref('default');
const isSudo = ref(false);
const timeoutSec = ref(300);
const content = ref('');
/** Kept from the loaded implementation so editing doesn't change how it runs. */
const implKind = ref<'auto' | 'command' | 'script'>('auto');

const title = computed(() => (editing.value ? 'Edit library entry' : 'New library entry'));

const reset = () => {
	name.value = '';
	tags.value = [];
	cwd.value = '';
	interpreter.value = 'default';
	isSudo.value = false;
	timeoutSec.value = 300;
	content.value = '';
	implKind.value = 'auto';
	editing.value = null;
	editingOs.value = 'linux';
};

const openForCreate = () => {
	reset();
	isOpen.value = true;
};

const openForEdit = async (entry: LibraryEntry) => {
	reset();
	try {
		const full = await library.load(entry.id);
		const picked = implementationFor(full);
		if (!picked) throw new Error('no implementation');
		editing.value = full;
		editingOs.value = picked.os;
		name.value = full.name;
		tags.value = full.tags;
		timeoutSec.value = picked.implementation.timeout_sec || 300;
		content.value = picked.implementation.code;
		cwd.value = picked.implementation.cwd;
		interpreter.value = normalizeInterpreter(picked.implementation.interpreter) || 'default';
		isSudo.value = picked.implementation.is_sudo;
		implKind.value = picked.implementation.kind;
		isOpen.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to open ${entry.name}` });
	}
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!name.value || !content.value) return;
	isSaving.value = true;
	try {
		await library.save({
			name: name.value.trim(),
			tags: tags.value,
			os: editingOs.value,
			kind: implKind.value,
			code: content.value,
			timeoutSec: Number(timeoutSec.value),
			cwd: cwd.value,
			isSudo: isSudo.value,
			interpreter: interpreter.value === 'default' ? '' : interpreter.value,
		}, editing.value);
		snackbar.add({ type: 'success', text: editing.value ? 'Library entry updated' : 'Saved to library' });
		emit('saved');
		close();
	}
	catch (e) {
		snackbar.add({
			type: 'error',
			text: isConflict(e)
				? 'Someone else saved this entry (or the name is already taken). Close this and open it again to see their version.'
				: 'Failed to save the library entry',
		});
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
