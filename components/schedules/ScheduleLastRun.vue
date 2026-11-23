<template>
	<!-- Last execution of a schedule: status dot + text, then when it ran. -->
	<span
		v-if="run?.started_at"
		class="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5"
		:title="detail || undefined"
	>
		<span :class="['inline-flex items-center gap-1.5 font-medium', meta.text]">
			<span
				:class="['h-2 w-2 shrink-0 rounded-full', meta.dot]"
				aria-hidden="true"
			/>
			{{ meta.label }}<template v-if="run.client_count">
				<span class="font-normal text-app-text-3">{{ run.success_count ?? 0 }}/{{ run.client_count }}</span>
			</template>
		</span>
		<span class="font-mono text-xs text-app-text-3">{{ useDateFormat(run.started_at, 'YYYY-MM-DD HH:mm').value }}</span>
		<span
			v-if="run.error"
			class="w-full max-w-[320px] truncate text-xs text-app-danger"
		>{{ run.error }}</span>
	</span>
	<span
		v-else
		class="inline-flex items-center gap-1.5 text-app-text-3"
	>
		<span
			class="h-2 w-2 shrink-0 rounded-full border border-app-text-4"
			aria-hidden="true"
		/>
		Never run
	</span>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import type { Schedule } from '~/types';

const props = defineProps<{ schedule: Schedule }>();

const run = computed(() => props.schedule.last_execution ?? null);
const detail = computed(() => [run.value?.error, run.value?.summary].filter(Boolean).join('\n'));
const meta = computed(() => {
	const status = run.value?.error ? 'failed' : run.value?.status;
	if (status === 'successful') return { label: 'Succeeded', dot: 'bg-[#22C55E]', text: 'text-app-ok' };
	if (status === 'failed') return { label: 'Failed', dot: 'bg-app-danger', text: 'text-app-danger' };
	if (status === 'running') return { label: 'Running', dot: 'bg-app-blue', text: 'text-app-blue' };
	if (status === 'partial_successful' || status === 'partially_successful') return { label: 'Partly failed', dot: 'bg-app-warn', text: 'text-app-warn' };
	if (status === 'skipped') return { label: 'Skipped', dot: 'bg-app-text-4', text: 'text-app-text-3' };
	return { label: status ? status.replace(/_/g, ' ') : 'Ran', dot: 'bg-app-warn', text: 'text-app-warn' };
});
</script>
