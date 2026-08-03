<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-y-auto rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<h3 class="mb-4 text-lg font-semibold">
				{{ isEditing ? 'Edit' : 'New' }} schedule
			</h3>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="save"
			>
				<div class="grid grid-cols-2 gap-4">
					<div class="relative flex w-full flex-col">
						<input
							id="scheduleFormName"
							v-model="name"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							:class="{ error: !name }"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="scheduleFormName"
						>Schedule name</label>
					</div>
					<div class="relative flex w-full flex-col">
						<input
							id="scheduleFormCron"
							v-model="cron"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							:class="{ error: !cron }"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="scheduleFormCron"
						>Cron expression (e.g. */15 * * * *)</label>
					</div>
				</div>
				<CustomThemedSelect
					id="scheduleFormType"
					v-model="type"
					label="Type"
					:disabled="isEditing"
					:options="[{ value: 'command', label: 'Command' }, { value: 'script', label: 'Script' }]"
				/>
				<div>
					<h4 class="mb-2 text-sm font-semibold">
						Target clients
					</h4>
					<div class="rounded bg-[#1c3f68] p-4">
						<TargetSelector
							:initial="{ clientIds, groupIds, tags }"
							@update:target="onTargetChange"
						/>
					</div>
				</div>
				<div
					v-if="type === 'script'"
					class="grid grid-cols-2 gap-4"
				>
					<div class="relative flex w-full flex-col">
						<input
							id="scheduleFormCwd"
							v-model="cwd"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="scheduleFormCwd"
						>Working directory</label>
					</div>
					<CustomThemedSelect
						id="scheduleFormInterpreter"
						v-model="interpreter"
						label="Interpreter"
						placeholder="Select..."
						:options="[{ value: 'default', label: '/bin/sh or shebang' }, { value: 'tacoscript', label: 'Tacoscript' }]"
					/>
				</div>
				<div class="grid grid-cols-3 gap-4">
					<div class="relative flex w-full flex-col">
						<input
							id="scheduleFormTimeout"
							v-model="timeoutSec"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="number"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="scheduleFormTimeout"
						>Timeout (seconds)</label>
					</div>
					<label
						v-if="type === 'script'"
						class="flex cursor-pointer select-none items-center gap-2 text-sm text-theme-label"
					>
						<input
							v-model="isSudo"
							type="checkbox"
							class="h-[16px] w-[16px] rounded"
						>Use sudo
					</label>
					<label class="flex cursor-pointer select-none items-center gap-2 text-sm text-theme-label">
						<input
							v-model="abortOnError"
							type="checkbox"
							class="h-[16px] w-[16px] rounded"
						>Abort on error
					</label>
				</div>
				<div class="flex flex-col">
					<label class="mb-1 text-sm font-normal text-theme-label">{{ type === 'script' ? 'Script' : 'Command' }}</label>
					<div class="max-h-[220px] min-h-[160px] overflow-auto rounded border border-slate-400 bg-[#224A75] text-xs text-gray-200">
						<CommandEditor v-model="content" />
					</div>
				</div>
				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						class="bg-vtd-secondary-600 hover:bg-vtd-secondary-400 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="button"
						@click="close"
					>
						Cancel
					</button>
					<button
						class="bg-vtd-primary-500 hover:bg-vtd-primary-700 disabled:bg-gray-400 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="submit"
						:disabled="!canSave || isSaving"
					>
						{{ isEditing ? 'Update' : 'Create' }}
					</button>
				</div>
			</form>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { BaseModal } from '~/components/ui/base-modal';
import TargetSelector from '~/components/custom/TargetSelector.vue';
import CommandEditor from '~/components/CommandEditor.vue';
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
	interpreter.value = schedule.interpreter || 'default';
	isSudo.value = schedule.is_sudo;
	abortOnError.value = schedule.abort_on_error ?? true;
	timeoutSec.value = schedule.timeout_sec;
	content.value = (schedule.type === 'script' ? schedule.script : schedule.command) ?? '';
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!canSave.value) return;
	isSaving.value = true;
	try {
		const payload: SchedulePayload = {
			name: name.value,
			schedule: cron.value,
			type: type.value,
			client_ids: clientIds.value,
			group_ids: groupIds.value,
			tags: tags.value,
			timeout_sec: Number(timeoutSec.value),
			is_sudo: type.value === 'script' ? isSudo.value : false,
			execute_concurrently: true,
			abort_on_error: abortOnError.value,
			overlaps: false,
			...(type.value === 'script'
				? { script: content.value, cwd: cwd.value, interpreter: interpreter.value === 'default' ? '' : interpreter.value }
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
