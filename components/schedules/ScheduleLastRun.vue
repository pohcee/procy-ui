<template>
	<!--
		Last execution of a schedule: status dot + text with devices succeeded/total, then when it
		ran. For runs on several devices the server sends no status, so the state comes from the
		counts (all succeeded / some failed / all failed).
	-->
	<span
		v-if="state !== 'never'"
		class="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5"
		:title="detail || undefined"
	>
		<span :class="['inline-flex items-center gap-1.5 font-medium', meta.text]">
			<span
				:class="['h-2 w-2 shrink-0 rounded-full', meta.dot]"
				aria-hidden="true"
			/>
			{{ meta.label }}<template v-if="run?.client_count">
				<span
					class="font-normal text-app-text-3"
					:aria-label="`${run.success_count ?? 0} of ${run.client_count} devices succeeded`"
				>{{ run.success_count ?? 0 }}/{{ run.client_count }}</span>
			</template>
		</span>
		<span class="font-mono text-xs text-app-text-3">{{ useDateFormat(run?.started_at ?? '', 'YYYY-MM-DD HH:mm').value }}</span>
		<span
			v-if="run?.error"
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
import { lastRunState } from '~/utils/runHistory';

const props = defineProps<{ schedule: Schedule }>();

const run = computed(() => props.schedule.last_execution ?? null);
const state = computed(() => lastRunState(run.value));
const detail = computed(() => [run.value?.error, run.value?.summary].filter(Boolean).join('\n'));
const meta = computed(() => {
	switch (state.value) {
		case 'successful': return { label: 'Succeeded', dot: 'bg-[#22C55E]', text: 'text-app-ok' };
		case 'partial': return { label: 'Partly failed', dot: 'bg-app-warn', text: 'text-app-warn' };
		case 'running': return { label: 'Running', dot: 'bg-app-blue', text: 'text-app-blue' };
		case 'skipped': return { label: 'Skipped', dot: 'bg-app-text-4', text: 'text-app-text-3' };
		case 'none': return { label: 'No devices', dot: 'bg-app-text-4', text: 'text-app-text-3' };
		default: return { label: 'Failed', dot: 'bg-app-danger', text: 'text-app-danger' };
	}
});
</script>
