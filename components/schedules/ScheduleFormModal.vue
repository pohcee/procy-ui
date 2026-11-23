<template>
	<OpDialog
		v-model="isOpen"
		:title="`${isEditing ? 'Edit' : 'New'} schedule`"
		description="Run a command or script automatically on a cron schedule."
		size="xl"
		as-form
		@submit="save"
	>
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<OpField
					label="Schedule name"
					for-id="scheduleFormName"
				>
					<OpInput
						id="scheduleFormName"
						v-model="name"
						placeholder="e.g. Nightly cleanup"
					/>
				</OpField>
				<OpField
					label="Cron expression"
					for-id="scheduleFormCron"
					help="minute hour day month weekday, e.g. */15 * * * *"
				>
					<OpInput
						id="scheduleFormCron"
						v-model="cron"
						mono
						placeholder="*/15 * * * *"
						aria-describedby="scheduleFormCron-help"
					/>
				</OpField>
			</div>
			<div class="flex flex-col gap-2 rounded-xl border border-app-border p-4">
				<h4 class="text-sm font-semibold text-app-text">
					Targets
				</h4>
				<TargetSelector
					:initial="{ clientIds, groupIds, tags }"
					@update:target="onTargetChange"
				/>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<CustomThemedSelect
					id="scheduleFormInterpreter"
					v-model="interpreter"
					label="Interpreter"
					placeholder="Select…"
					:options="interpreterOptionsWith(interpreter)"
				/>
				<OpField
					label="Working directory"
					for-id="scheduleFormCwd"
				>
					<OpInput
						id="scheduleFormCwd"
						v-model="cwd"
						mono
						placeholder="e.g. /var/www"
					/>
				</OpField>
			</div>
			<div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
				<OpField
					label="Timeout (seconds)"
					for-id="scheduleFormTimeout"
				>
					<OpInput
						id="scheduleFormTimeout"
						v-model="timeoutSec"
						type="number"
						min="1"
					/>
				</OpField>
				<div class="flex flex-col sm:col-span-2 sm:flex-row sm:gap-5 sm:pb-1.5">
					<OpCheckbox v-model="isSudo">
						Run with sudo <span class="text-app-text-3">(Unix only)</span>
					</OpCheckbox>
					<OpCheckbox v-model="abortOnError">
						Abort on error
					</OpCheckbox>
					<OpCheckbox v-model="oneAtATime">
						One device at a time
					</OpCheckbox>
				</div>
			</div>
			<RunEditor
				v-model:code="content"
				v-model:kind="kindChoice"
				:detected-kind="detectedKind"
				compact
				@insert="openLoadModal"
			>
				<template #footer>
					<p
						class="border-t border-[#222B37] bg-[#131B25] px-3.5 py-2.5 text-xs text-[#A9B4C3]"
						aria-live="polite"
					>
						Runs as a <span class="font-medium text-[#E6EBF2]">{{ effectiveType }}</span>.
						<template v-if="kindChoice === 'auto'">
							A single full-path command (e.g. /usr/bin/uptime) runs as a command; anything else as a script.
						</template>
					</p>
				</template>
			</RunEditor>
		</div>
		<LibraryLoadModal
			v-model="isLoadModalOpen"
			title="Insert from library"
			:items="libraryItems"
			@select="loadFromLibrary"
			@delete="deleteFromLibrary"
		/>
		<template #footer>
			<AppButton
				variant="secondary"
				@click="close"
			>
				Cancel
			</AppButton>
			<span
				v-if="!canSave"
				class="ml-auto hidden text-xs text-app-text-3 sm:inline"
			>Name, cron, targets and a command or script are required.</span>
			<AppButton
				type="submit"
				:class="canSave ? 'ml-auto' : ''"
				:disabled="!canSave || isSaving"
			>
				{{ isEditing ? 'Save changes' : 'Create schedule' }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import TargetSelector from '~/components/custom/TargetSelector.vue';
import LibraryLoadModal from '~/components/custom/LibraryLoadModal.vue';
import RunEditor from '~/components/run/RunEditor.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import { useRunLibrary } from '~/composables/useRunLibrary';
import { detectRunKind, type LibraryPickItem, type RunKind } from '~/utils/runKind';
import type { JobClientTags, Schedule, SchedulePayload } from '~/types';

const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const name = ref('');
const cron = ref('');
const kindChoice = ref<'auto' | RunKind>('auto');
const clientIds = ref<string[]>([]);
const groupIds = ref<string[]>([]);
const tags = ref<JobClientTags | null>(null);
const cwd = ref('');
const interpreter = ref('default');
const isSudo = ref(false);
const abortOnError = ref(true);
const oneAtATime = ref(false);
const timeoutSec = ref(300);
const content = ref('');

const canSave = computed(() => !!name.value && !!cron.value && !!content.value && (clientIds.value.length > 0 || groupIds.value.length > 0 || !!tags.value));

const onTargetChange = (value: { clientIds: string[]; groupIds: string[]; tags: JobClientTags | null }) => {
	clientIds.value = value.clientIds;
	groupIds.value = value.groupIds;
	tags.value = value.tags;
};

const reset = () => {
	name.value = '';
	cron.value = '';
	kindChoice.value = 'auto';
	clientIds.value = [];
	groupIds.value = [];
	tags.value = null;
	cwd.value = '';
	interpreter.value = 'default';
	isSudo.value = false;
	abortOnError.value = true;
	oneAtATime.value = false;
	timeoutSec.value = 300;
	content.value = '';
	editingId.value = null;
};

const openForCreate = () => {
	reset();
	isEditing.value = false;
	isOpen.value = true;
};

const openForEdit = (schedule: Schedule) => {
	reset();
	isEditing.value = true;
	editingId.value = schedule.id;
	name.value = schedule.name;
	cron.value = schedule.schedule;
	clientIds.value = schedule.client_ids ?? [];
	groupIds.value = schedule.group_ids ?? [];
	tags.value = schedule.tags ?? null;
	cwd.value = schedule.cwd ?? '';
	interpreter.value = normalizeInterpreter(schedule.interpreter) || 'default';
	isSudo.value = schedule.is_sudo;
	abortOnError.value = schedule.abort_on_error ?? true;
	oneAtATime.value = schedule.execute_concurrently === false;
	timeoutSec.value = schedule.timeout_sec;
	content.value = (schedule.type === 'script' ? decodeScript(schedule.script ?? '') : schedule.command) ?? '';
	// Keep the saved type; show it as "Auto" when that is what Auto would pick anyway.
	kindChoice.value = schedule.type === detectRunKind(content.value, interpreterValue.value) ? 'auto' : schedule.type;
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const interpreterValue = computed(() => (interpreter.value === 'default' ? '' : interpreter.value));
const detectedKind = computed(() => detectRunKind(content.value, interpreterValue.value));
const effectiveType = computed<RunKind>(() => (kindChoice.value === 'auto' ? detectedKind.value : kindChoice.value));

// --- library -------------------------------------------------------------------
const library = useRunLibrary();
const isLoadModalOpen = ref(false);
const libraryItems = ref<LibraryPickItem[]>([]);

const openLoadModal = async () => {
	try {
		libraryItems.value = (await library.listAll()).map(e => ({ id: e.id, name: e.name, kind: e.kind }));
		isLoadModalOpen.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to load the library' });
	}
};

const loadFromLibrary = async (item: LibraryPickItem) => {
	if (!item.kind) return;
	try {
		const entry = await library.load(item.id, item.kind);
		if (!name.value) name.value = entry.name;
		content.value = entry.code;
		timeoutSec.value = entry.timeoutSec || 300;
		cwd.value = entry.cwd;
		isSudo.value = entry.isSudo;
		interpreter.value = normalizeInterpreter(entry.interpreter) || 'default';
		kindChoice.value = entry.kind === detectRunKind(entry.code, entry.interpreter) ? 'auto' : entry.kind;
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to load ${item.name}` });
	}
};

const deleteFromLibrary = async (item: LibraryPickItem) => {
	if (!item.kind) return;
	try {
		await library.remove(item.id, item.kind);
		libraryItems.value = libraryItems.value.filter(i => !(i.id === item.id && i.kind === item.kind));
		snackbar.add({ type: 'success', text: 'Removed from library' });
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to remove ${item.name}` });
	}
};

const save = async () => {
	if (!canSave.value) return;
	isSaving.value = true;
	try {
		const payload: SchedulePayload = {
			name: name.value,
			schedule: cron.value,
			type: effectiveType.value,
			// Leave empty id lists out: the server rejects `client_ids: []` next to tags.
			client_ids: (clientIds.value.length ? clientIds.value : undefined) as unknown as string[],
			group_ids: (groupIds.value.length ? groupIds.value : undefined) as unknown as string[],
			tags: tags.value,
			timeout_sec: Number(timeoutSec.value),
			// Like Execute: commands take the working directory, sudo and interpreter too.
			cwd: cwd.value,
			interpreter: interpreterValue.value,
			is_sudo: isSudo.value,
			execute_concurrently: !oneAtATime.value,
			abort_on_error: abortOnError.value,
			overlaps: false,
			...(effectiveType.value === 'script'
				? { script: encodeScript(content.value) }
				: { command: content.value }),
		};
		if (editingId.value) {
			await $api.schedules.update(editingId.value, payload);
		}
		else {
			await $api.schedules.create(payload);
		}
		snackbar.add({ type: 'success', text: `Schedule ${isEditing.value ? 'updated' : 'created'}` });
		emit('saved');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save schedule' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>

<script lang="ts">
// The schedules API stores scripts base64-encoded (commands stay plain text).
export const encodeScript = (script: string) => btoa(String.fromCharCode(...new TextEncoder().encode(script)));
export const decodeScript = (encoded: string) => {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)));
	}
	catch {
		return encoded;
	}
};
</script>
