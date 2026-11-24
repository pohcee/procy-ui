<template>
	<!--
		Results of the current command/script run: one row per device (status, name, exit code ·
		duration, live elapsed time while running), each expandable to its output. Fed by the
		websocket results merged with what the server lists for the run (useRunTracker).
	-->
	<section
		aria-label="Results"
		class="overflow-hidden rounded-xl border border-app-border bg-app-surface"
	>
		<div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3.5 sm:px-[18px]">
			<div class="min-w-0">
				<h2 class="text-[15px] font-semibold text-app-text">
					{{ title }}
				</h2>
				<p
					class="mt-1 text-[13px] text-app-text-3"
					aria-live="polite"
				>
					<template v-if="startedAt">
						Started {{ startedAgo }} ·
					</template>
					{{ summary }}
				</p>
			</div>
			<div
				v-if="$slots.actions"
				class="flex flex-wrap gap-2"
			>
				<slot name="actions" />
			</div>
		</div>

		<p
			v-if="rows.length === 0"
			class="flex items-center gap-2 px-4 py-5 text-sm text-app-text-3 sm:px-[18px]"
		>
			<Loader2
				v-if="running"
				class="h-4 w-4 shrink-0 animate-spin"
				aria-hidden="true"
			/>
			<CircleAlert
				v-else
				class="h-4 w-4 shrink-0 text-app-danger"
				aria-hidden="true"
			/>
			{{ emptyText }}
		</p>

		<div
			v-for="row in rows"
			:key="row.key"
			:class="row.failed ? 'bg-app-danger-bg' : ''"
			class="border-b border-app-border-subtle last:border-b-0"
		>
			<div class="flex items-center gap-3 px-4 py-2.5 sm:gap-3.5 sm:px-[18px]">
				<span
					:class="[
						'inline-flex w-[96px] shrink-0 items-center gap-1.5 text-[13px] font-semibold sm:w-[104px]',
						stateMeta[row.state].text,
					]"
				>
					<component
						:is="stateMeta[row.state].icon"
						:class="['h-4 w-4 shrink-0', row.state === 'running' ? 'animate-spin' : '']"
						aria-hidden="true"
						:stroke-width="2.4"
					/>
					{{ RUN_STATE_LABELS[row.state] }}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate font-mono text-[13px] text-app-text">{{ row.name }}</span>
					<span
						v-if="row.entry || row.note"
						class="block truncate text-xs text-app-text-3"
					>{{ [row.entry, row.note].filter(Boolean).join(' — ') }}</span>
					<span class="block truncate font-mono text-xs text-app-text-3 sm:hidden">{{ row.meta }}</span>
				</span>
				<span class="hidden shrink-0 font-mono text-xs text-app-text-3 sm:inline">{{ row.meta }}</span>
				<button
					type="button"
					class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text disabled:opacity-30"
					:aria-expanded="isExpanded(row.key)"
					:aria-label="`${isExpanded(row.key) ? 'Hide' : 'Show'} output for ${row.name}`"
					:disabled="!row.expandable"
					@click="toggle(row.key)"
				>
					<ChevronDown
						:class="['h-4 w-4 transition-transform', isExpanded(row.key) ? 'rotate-180' : '']"
						aria-hidden="true"
					/>
				</button>
			</div>
			<div
				v-if="isExpanded(row.key) && row.expandable"
				:class="[
					'border-t px-4 pb-4 pt-3 sm:pl-[124px] sm:pr-[18px]',
					row.failed ? 'border-app-danger/20' : 'border-app-border-subtle bg-app-surface-2',
				]"
			>
				<RunOutput
					:stdout="row.stdout"
					:stderr="row.stderr"
					:error="row.error"
					:meta="row.pid ? `PID ${row.pid}` : ''"
					:empty-text="row.state === 'running' ? 'No output yet. The device sends its output as it runs (or when it finishes, for older clients).' : 'No output.'"
				/>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { Check, ChevronDown, CircleAlert, CircleHelp, Clock, Loader2, SkipForward, X } from 'lucide-vue-next';
import { useTimeAgo } from '@vueuse/core';
import RunOutput from '~/components/run/RunOutput.vue';
import type { CommandResult } from '~/types';
import { LIBRARY_OS_LABELS, toLibraryOs } from '~/composables/useRunLibrary';
import { RUN_STATE_LABELS, exitCodeOf, formatDuration, jobDurationMs, mergeSocketMessages, runState, summarizeJobs, type RunState } from '~/utils/runHistory';

const props = defineProps({
	results: {
		type: Array as PropType<CommandResult[]>,
		default: () => [],
	},
	// Kept for backwards compatibility with older call sites (output is plain text now).
	language: { type: String, default: 'vim' },
	code: { type: String, default: undefined },
	title: { type: String, default: 'Results' },
	/** Still waiting for (some) devices. */
	running: { type: Boolean, default: false },
	/** Name of the library entry when this is a library run (shown on each result). */
	entryName: { type: String, default: '' },
	startedAt: { type: Date as PropType<Date | null>, default: null },
	/** The clock for elapsed times (ticks while the run is followed). */
	now: { type: Number, default: 0 },
	/** Shown instead of the device rows when there are none. */
	emptyMessage: { type: String, default: '' },
});

const stateMeta: Record<RunState, { icon: unknown; text: string }> = {
	successful: { icon: Check, text: 'text-app-ok' },
	failed: { icon: X, text: 'text-app-danger' },
	timed_out: { icon: Clock, text: 'text-app-danger' },
	running: { icon: Loader2, text: 'text-app-blue' },
	lost: { icon: CircleHelp, text: 'text-app-text-3' },
	skipped: { icon: SkipForward, text: 'text-app-text-3' },
	unknown: { icon: CircleHelp, text: 'text-app-text-3' },
};

const clock = computed(() => props.now || Date.now());

// The socket can send several messages for one job (streamed output, then the result).
const jobs = computed(() => mergeSocketMessages(props.results.filter(r => r && (r.jid || r.client_id))));

const rows = computed(() => jobs.value.map((result) => {
	const key = result.jid || result.client_id;
	const state = runState(result, clock.value);
	const parts: string[] = [];
	const exitCode = exitCodeOf(result);
	if (exitCode !== null) parts.push(`exit ${exitCode}`);
	else if (result.pid && state === 'running') parts.push(`PID ${result.pid}`);
	const duration = formatDuration(jobDurationMs(result, clock.value));
	if (duration) parts.push(state === 'running' ? `${duration} so far` : duration);
	const stdout = result.result?.stdout ?? '';
	const stderr = result.result?.stderr ?? '';
	const libOs = toLibraryOs(result.os);
	const entry = result.library_entry_id
		? [props.entryName, result.library_version ? `v${result.library_version}` : '', libOs ? LIBRARY_OS_LABELS[libOs] : (result.os ?? '')]
				.filter(Boolean).join(' · ')
		: '';
	// A skipped device carries the reason ("no macOS implementation") as its summary.
	const note = state === 'skipped'
		? (result.result?.summary || result.error || '')
		: (state === 'lost' ? 'The server never received a result' : '');
	return {
		key,
		state,
		failed: state === 'failed' || state === 'timed_out',
		entry,
		note,
		name: result.client_name || result.client_id,
		meta: parts.join(' · ') || (state === 'running' ? 'starting' : ''),
		stdout,
		stderr,
		error: result.error ?? '',
		pid: result.pid,
		hasOutput: !!(stdout || stderr || result.error),
		expandable: state !== 'skipped' && (state === 'running' || !!(stdout || stderr || result.error)),
	};
}));

const summary = computed(() => {
	const s = summarizeJobs(jobs.value, clock.value);
	const parts: string[] = [];
	const ok = s.counts.successful;
	const failed = s.counts.failed;
	if (ok) parts.push(`${ok} succeeded`);
	if (failed) parts.push(`${failed} failed`);
	if (s.counts.timed_out) parts.push(`${s.counts.timed_out} timed out`);
	if (s.counts.running) parts.push(`${s.counts.running} running`);
	if (s.counts.lost) parts.push(`${s.counts.lost} without result`);
	if (s.counts.skipped) parts.push(`${s.counts.skipped} skipped`);
	if (s.counts.unknown) parts.push(`${s.counts.unknown} unknown`);
	if (!parts.length) return props.running ? 'Waiting for the devices' : 'No results';
	return parts.join(' · ');
});

const emptyText = computed(() => props.emptyMessage
	|| (props.running ? 'Starting the run… Results appear as each device finishes.' : 'No device reported a result.'));

const startedAgo = useTimeAgo(computed(() => props.startedAt ?? new Date()));

const expanded = ref<Set<string>>(new Set());
const manuallyToggled = new Set<string>();
const isExpanded = (key: string) => expanded.value.has(key);
const toggle = (key: string) => {
	manuallyToggled.add(key);
	const next = new Set(expanded.value);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	expanded.value = next;
};

// Open failures automatically, and the output (live or final) of a single-device run.
watch(rows, (value) => {
	const next = new Set(expanded.value);
	value.forEach((row) => {
		if (manuallyToggled.has(row.key) || !row.expandable) return;
		if (row.failed || value.length === 1) next.add(row.key);
	});
	expanded.value = next;
}, { immediate: true });
</script>
