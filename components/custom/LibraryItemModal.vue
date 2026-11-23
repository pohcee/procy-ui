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
						Saved as a {{ editing.kind }}.
					</template>
					<template v-else>
						Will be saved as a <span class="font-medium text-app-text-2">{{ kind }}</span>. A single full-path command (e.g. /usr/bin/uptime) is saved as a command; anything else — pipes, several lines, a working directory, sudo or an interpreter — as a script.
					</template>
				</p>
			</div>
			<div
				v-if="showScriptFields"
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
					v-if="showScriptFields"
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
import { libraryKindFor, useRunLibrary, type LibraryEntry } from '~/composables/useRunLibrary';
import type { RunKind } from '~/utils/runKind';

const emit = defineEmits(['saved']);

const snackbar = useSnackbar();
const library = useRunLibrary();

const isOpen = ref(false);
const isSaving = ref(false);
/** The entry being edited (it stays in its own command/script store). */
const editing = ref<{ id: string; kind: RunKind } | null>(null);

const name = ref('');
const tags = ref<string[]>([]);
const cwd = ref('');
const interpreter = ref('default');
const isSudo = ref(false);
const timeoutSec = ref(300);
const content = ref('');

const draft = computed(() => ({
	name: name.value.trim(),
	tags: tags.value,
	code: content.value,
	timeoutSec: Number(timeoutSec.value),
	cwd: cwd.value,
	isSudo: isSudo.value,
	interpreter: interpreter.value === 'default' ? '' : interpreter.value,
}));
const kind = computed<RunKind>(() => editing.value?.kind ?? libraryKindFor(draft.value));
// Saved commands can't hold these; new entries can use them (which makes them scripts).
const showScriptFields = computed(() => !editing.value || editing.value.kind === 'script');
const title = computed(() => (editing.value ? `Edit ${editing.value.kind}` : 'New library entry'));

const reset = () => {
	name.value = '';
	tags.value = [];
	cwd.value = '';
	interpreter.value = 'default';
	isSudo.value = false;
	timeoutSec.value = 300;
	content.value = '';
	editing.value = null;
};

const openForCreate = () => {
	reset();
	isOpen.value = true;
};

const openForEdit = async (entry: LibraryEntry) => {
	reset();
	try {
		const full = await library.load(entry.id, entry.kind);
		editing.value = { id: full.id, kind: full.kind };
		name.value = full.name;
		tags.value = full.tags;
		timeoutSec.value = full.timeoutSec || 300;
		content.value = full.code;
		cwd.value = full.cwd;
		interpreter.value = normalizeInterpreter(full.interpreter) || 'default';
		isSudo.value = full.isSudo;
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
		const saved = await library.save(draft.value, editing.value);
		snackbar.add({ type: 'success', text: editing.value ? 'Library entry updated' : `Saved to library as a ${saved.kind}` });
		emit('saved');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save the library entry' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
