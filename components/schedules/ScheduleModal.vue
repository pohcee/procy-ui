<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 w-full max-w-lg rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<h3 class="mb-4 text-lg font-semibold">
				Schedule {{ type === 'script' ? 'script' : 'command' }} execution
			</h3>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="save"
			>
				<div class="relative flex w-full flex-col">
					<input
						id="scheduleName"
						v-model="name"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						:class="{ error: !name }"
						placeholder=" "
						type="text"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="scheduleName"
					>Schedule name</label>
				</div>
				<div class="relative flex w-full flex-col">
					<input
						id="scheduleCron"
						v-model="cron"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						:class="{ error: !cron }"
						placeholder=" "
						type="text"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="scheduleCron"
					>Cron expression (e.g. */15 * * * *)</label>
				</div>
				<p class="text-xs text-gray-500">
					Runs on {{ clientIds.length }} client(s){{ groupIds.length ? ` and ${groupIds.length} group(s)` : '' }}.
				</p>
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
						:disabled="!name || !cron || isSaving"
					>
						Create schedule
					</button>
				</div>
			</form>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { BaseModal } from '~/components/ui/base-modal';
import type { JobClientTags, SchedulePayload } from '~/types';

const props = defineProps({
	clientIds: {
		type: Array as () => string[],
		default: () => [],
	},
	groupIds: {
		type: Array as () => string[],
		default: () => [],
	},
	tags: {
		type: Object as () => JobClientTags | null,
		default: null,
	},
});
const emit = defineEmits(['created']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const isOpen = ref(false);
const isSaving = ref(false);
const type = ref<'command' | 'script'>('command');
const name = ref('');
const cron = ref('');
let pendingDetails: Partial<SchedulePayload> = {};

const reset = () => {
	name.value = '';
	cron.value = '';
	pendingDetails = {};
};

const openForCommand = (data: { commandName: string; tagsValue: string[]; timeoutInSeconds: number; commandText: string }) => {
	reset();
	type.value = 'command';
	name.value = data.commandName;
	pendingDetails = {
		command: data.commandText,
		timeout_sec: Number(data.timeoutInSeconds),
		is_sudo: false,
		execute_concurrently: true,
		overlaps: false,
	};
	isOpen.value = true;
};

const openForScript = (data: {
	scriptName: string;
	tagsValue: string[];
	workingDirectory: string;
	timeoutInSeconds: number;
	scriptContent: string;
	useSudo: boolean;
	abortOnError: boolean;
	interpreter: string;
}) => {
	reset();
	type.value = 'script';
	name.value = data.scriptName;
	pendingDetails = {
		script: data.scriptContent,
		cwd: data.workingDirectory,
		timeout_sec: Number(data.timeoutInSeconds),
		is_sudo: data.useSudo,
		interpreter: data.interpreter,
		abort_on_error: data.abortOnError,
		execute_concurrently: true,
		overlaps: false,
	};
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!name.value || !cron.value) return;
	isSaving.value = true;
	try {
		const payload: SchedulePayload = {
			name: name.value,
			schedule: cron.value,
			type: type.value,
			client_ids: props.clientIds,
			group_ids: props.groupIds,
			tags: props.tags,
			is_sudo: false,
			timeout_sec: 300,
			execute_concurrently: true,
			overlaps: false,
			...pendingDetails,
		};
		await $api.schedules.create(payload);
		snackbar.add({ type: 'success', text: 'Schedule created' });
		emit('created');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to create schedule' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCommand, openForScript });
</script>
