<template>
	<!-- Status of a run or a device job: icon + label in the state's colour. -->
	<span
		:class="[
			'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-semibold',
			meta.class,
		]"
	>
		<component
			:is="meta.icon"
			:class="['h-3.5 w-3.5 shrink-0', state === 'running' ? 'animate-spin' : '']"
			aria-hidden="true"
			:stroke-width="2.4"
		/>
		{{ label ?? meta.label }}
	</span>
</template>

<script setup lang="ts">
import { AlertTriangle, Check, CircleHelp, Clock, Loader2, SkipForward, X } from 'lucide-vue-next';
import type { RunState, RunSummaryState } from '~/utils/runHistory';
import { RUN_STATE_LABELS, RUN_SUMMARY_LABELS } from '~/utils/runHistory';

const props = defineProps<{
	state: RunState | RunSummaryState;
	/** Replaces the default label (e.g. "Partly failed 1/3"). */
	label?: string;
}>();

const STYLES = {
	successful: { icon: Check, class: 'bg-app-ok-bg text-app-ok' },
	failed: { icon: X, class: 'bg-app-danger-bg text-app-danger' },
	timed_out: { icon: Clock, class: 'bg-app-danger-bg text-app-danger' },
	partial: { icon: AlertTriangle, class: 'bg-app-warn-bg text-app-warn' },
	running: { icon: Loader2, class: 'bg-app-blue-bg text-app-blue' },
	lost: { icon: CircleHelp, class: 'bg-app-chip text-app-text-2' },
	skipped: { icon: SkipForward, class: 'bg-app-chip text-app-text-3' },
	unknown: { icon: CircleHelp, class: 'bg-app-chip text-app-text-3' },
	none: { icon: CircleHelp, class: 'bg-app-chip text-app-text-3' },
} as const;

const meta = computed(() => {
	const style = STYLES[props.state] ?? STYLES.unknown;
	const label = (RUN_STATE_LABELS as Record<string, string>)[props.state] ?? (RUN_SUMMARY_LABELS as Record<string, string>)[props.state] ?? props.state;
	return { ...style, label };
});
</script>
