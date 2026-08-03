<template>
	<div class="h-full w-full flex-1">
		<div class="relative">
			<ScriptEditor
				:is-loading="isLoading"
				@script-data="handleScriptData"
				@schedule-request="openScheduleModal"
			/>
			<CommandResult
				v-if="results.length > 0"
				language="vim"
				:results="results"
			/>
		</div>
		<ScheduleModal
			ref="scheduleModal"
			:client-ids="[id]"
		/>
	</div>
</template>

<script setup lang="ts">
import ScriptEditor from '~/components/scripts/ScriptEditor.vue';
import ScheduleModal from '~/components/schedules/ScheduleModal.vue';
import { useScriptExecution } from '~/composables/useScriptExecution';

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
});

const { executeScript, isLoading, results } = useScriptExecution();
const scheduleModal = ref<InstanceType<typeof ScheduleModal> | null>(null);

const handleScriptData = (data: {
	scriptName: string;
	tagsValue: string[];
	workingDirectory: string;
	timeoutInSeconds: number;
	scriptContent: string;
	useSudo: boolean;
	abortOnError: boolean;
	interpreter: string;
}) => {
	executeScript(
		data.scriptContent,
		[props.id],
		[],
		data.workingDirectory,
		false,
		data.useSudo,
		data.timeoutInSeconds,
		data.interpreter,
		data.tagsValue?.length ? { tags: data.tagsValue, operator: 'AND' } : null,
		data.abortOnError,
	);
};

const openScheduleModal = (data: {
	scriptName: string;
	tagsValue: string[];
	workingDirectory: string;
	timeoutInSeconds: number;
	scriptContent: string;
	useSudo: boolean;
	abortOnError: boolean;
	interpreter: string;
}) => {
	scheduleModal.value?.openForScript(data);
};
</script>
