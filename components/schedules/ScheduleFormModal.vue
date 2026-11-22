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
			<div
				v-if="showScriptFields"
				class="grid grid-cols-1 gap-4 sm:grid-cols-2"
			>
				<OpField
					label="Working directory"
					for-id="scheduleFormCwd"
				>
					<OpInput
						id="scheduleFormCwd"
						v-model="cwd"
						mono
					/>
				</OpField>
				<CustomThemedSelect
					id="scheduleFormInterpreter"
					v-model="interpreter"
					label="Interpreter"
					placeholder="Select…"
					:options="[{ value: 'default', label: '/bin/sh or shebang' }, { value: 'tacoscript', label: 'Tacoscript' }]"
				/>
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
					/>
				</OpField>
				<div class="flex flex-col sm:col-span-2 sm:flex-row sm:gap-5 sm:pb-1.5">
					<OpCheckbox
						v-if="showScriptFields"
						v-model="isSudo"
					>
						Use sudo
					</OpCheckbox>
					<OpCheckbox v-model="abortOnError">
						Abort on error
					</OpCheckbox>
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<span class="text-[13px] font-medium text-app-text-2">Command or script</span>
				<div class="max-h-[260px] min-h-[160px] overflow-auto rounded-xl border border-app-border bg-[#0F151D]">
					<CommandEditor
						v-model="content"
						class="min-h-[160px]"
						aria-label="Command or script"
					/>
				</div>
				<p
					class="text-xs text-app-text-3"
					aria-live="polite"
				>
					<template v-if="isEditing">
						Runs as a {{ effectiveType }} (fixed once a schedule is created).
					</template>
					<template v-else>
						Runs as a <span class="font-medium text-app-text-2">{{ effectiveType }}</span>. A single full-path command (e.g. /usr/bin/uptime) runs as a command; anything else — pipes, several lines, a working directory, sudo or an interpreter — as a script.
					</template>
				</p>
			</div>
		</div>
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
import CommandEditor from '~/components/CommandEditor.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import { libraryKindFor } from '~/composables/useRunLibrary';
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
const type = ref<'command' | 'script'>('command');
const clientIds = ref<string[]>([]);
const groupIds = ref<string[]>([]);
const tags = ref<JobClientTags | null>(null);
const cwd = ref('');
const interpreter = ref('default');
const isSudo = ref(false);
const abortOnError = ref(true);
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
	type.value = 'command';
	clientIds.value = [];
	groupIds.value = [];
	tags.value = null;
	cwd.value = '';
	interpreter.value = 'default';
	isSudo.value = false;
	abortOnError.value = true;
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
	type.value = schedule.type;
	clientIds.value = schedule.client_ids ?? [];
	groupIds.value = schedule.group_ids ?? [];
	tags.value = schedule.tags ?? null;
	cwd.value = schedule.cwd ?? '';
	interpreter.value = normalizeInterpreter(schedule.interpreter) || 'default';
	isSudo.value = schedule.is_sudo;
	abortOnError.value = schedule.abort_on_error ?? true;
	timeoutSec.value = schedule.timeout_sec;
	content.value = (schedule.type === 'script' ? decodeScript(schedule.script ?? '') : schedule.command) ?? '';
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

// The schedule's type is fixed once created; for new ones it follows the content.
const effectiveType = computed<'command' | 'script'>(() => (isEditing.value
	? type.value
	: libraryKindFor({
			name: name.value,
			tags: [],
			code: content.value,
			timeoutSec: Number(timeoutSec.value),
			cwd: cwd.value,
			isSudo: isSudo.value,
			interpreter: interpreter.value === 'default' ? '' : interpreter.value,
		})));
// Commands can't carry these; new schedules can use them (which makes them scripts).
const showScriptFields = computed(() => !isEditing.value || type.value === 'script');

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
			is_sudo: effectiveType.value === 'script' ? isSudo.value : false,
			execute_concurrently: true,
			abort_on_error: abortOnError.value,
			overlaps: false,
			...(effectiveType.value === 'script'
				? { script: encodeScript(content.value), cwd: cwd.value, interpreter: interpreter.value === 'default' ? '' : interpreter.value }
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
