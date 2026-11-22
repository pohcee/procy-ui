<template>
	<OpDialog
		v-model="isOpen"
		:title="`Schedule ${type === 'script' ? 'script' : 'command'} execution`"
		size="md"
		as-form
		@submit="save"
	>
		<div class="flex flex-col gap-4">
			<OpField
				label="Schedule name"
				for-id="scheduleName"
			>
				<OpInput
					id="scheduleName"
					v-model="name"
					:invalid="!name"
				/>
			</OpField>
			<OpField
				label="Cron expression"
				for-id="scheduleCron"
				help="minute hour day month weekday, e.g. */15 * * * *"
			>
				<OpInput
					id="scheduleCron"
					v-model="cron"
					mono
					placeholder="*/15 * * * *"
					aria-describedby="scheduleCron-help"
				/>
			</OpField>
			<p class="text-[13px] text-app-text-3">
				Runs on {{ clientIds.length }} device{{ clientIds.length === 1 ? '' : 's' }}{{ groupIds.length ? ` and ${groupIds.length} group(s)` : '' }}.
			</p>
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
				:disabled="!name || !cron || isSaving"
			>
				Create schedule
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import { encodeScript } from '~/components/schedules/ScheduleFormModal.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
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
		script: encodeScript(data.scriptContent),
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
