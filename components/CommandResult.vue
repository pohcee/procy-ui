<template>
	<!--
		Live results of a command/script run: one row per device (status, name, PID · duration),
		each expandable to its output. Fed by useRemoteRun() `results`.
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
				class="h-4 w-4 animate-spin"
				aria-hidden="true"
			/>
			{{ running ? 'Waiting for the first device to respond…' : 'No results yet.' }}
		</p>

		<div
			v-for="row in rows"
			:key="row.key"
			:class="row.state === 'failed' ? 'bg-app-danger-bg' : ''"
			class="border-b border-app-border-subtle last:border-b-0"
		>
			<div class="flex items-center gap-3 px-4 py-2.5 sm:gap-3.5 sm:px-[18px]">
				<span
					:class="[
						'inline-flex w-[84px] shrink-0 items-center gap-1.5 text-[13px] font-semibold sm:w-[92px]',
						stateMeta[row.state].text,
					]"
				>
					<component
						:is="stateMeta[row.state].icon"
						:class="['h-4 w-4 shrink-0', row.state === 'running' ? 'animate-spin' : '']"
						aria-hidden="true"
						:stroke-width="2.4"
					/>
					{{ stateMeta[row.state].label }}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate font-mono text-[13px] text-app-text">{{ row.name }}</span>
					<span class="block truncate font-mono text-xs text-app-text-3 sm:hidden">{{ row.meta }}</span>
				</span>
				<span class="hidden shrink-0 font-mono text-xs text-app-text-3 sm:inline">{{ row.meta }}</span>
				<button
					type="button"
					class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text disabled:opacity-30"
					:aria-expanded="isExpanded(row.key)"
					:aria-label="`${isExpanded(row.key) ? 'Hide' : 'Show'} output for ${row.name}`"
					:disabled="!row.hasOutput"
					@click="toggle(row.key)"
				>
					<ChevronDown
						:class="['h-4 w-4 transition-transform', isExpanded(row.key) ? 'rotate-180' : '']"
						aria-hidden="true"
					/>
				</button>
			</div>
			<div
				v-if="isExpanded(row.key) && row.hasOutput"
				:class="[
					'border-t px-4 pb-4 pt-3 sm:pl-[124px] sm:pr-[18px]',
					row.state === 'failed' ? 'border-app-danger/20' : 'border-app-border-subtle bg-app-surface-2',
				]"
			>
				<p
					v-if="row.error || row.pid"
					class="mb-2 flex flex-wrap gap-x-3 text-[13px]"
				>
					<span
						v-if="row.error"
						class="font-medium text-app-danger"
					>{{ row.error }}</span>
					<span
						v-if="row.pid"
						class="font-mono text-xs leading-5 text-app-text-3"
					>PID {{ row.pid }}</span>
				</p>
				<pre
					v-if="row.stdout"
					class="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-app-text"
				>{{ row.stdout }}</pre>
				<template v-if="row.stderr">
					<p
						v-if="row.stdout"
						class="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-app-text-3"
					>
						stderr
					</p>
					<pre class="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-app-danger">{{ row.stderr }}</pre>
				</template>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { Check, ChevronDown, CircleHelp, Loader2, X } from 'lucide-vue-next';
import { useTimeAgo } from '@vueuse/core';
import type { CommandResult } from '~/types';

type RowState = 'successful' | 'failed' | 'running' | 'unknown';

const props = defineProps({
	results: {
		type: Array as PropType<CommandResult[]>,
		default: () => [],
	},
	// Kept for backwards compatibility with older call sites (output is plain text now).
	language: { type: String, default: 'vim' },
	code: { type: String, default: undefined },
	title: { type: String, default: 'Results' },
	running: { type: Boolean, default: false },
	startedAt: { type: Date as PropType<Date | null>, default: null },
});

const stateMeta = {
	successful: { label: 'Success', icon: Check, text: 'text-app-ok' },
	failed: { label: 'Failed', icon: X, text: 'text-app-danger' },
	running: { label: 'Running', icon: Loader2, text: 'text-app-blue' },
	unknown: { label: 'Unknown', icon: CircleHelp, text: 'text-app-text-3' },
} as const;

const toState = (status?: string): RowState => {
	if (status === 'successful') return 'successful';
	if (status === 'failed') return 'failed';
	if (!status || status === 'running') return 'running';
	return 'unknown';
};

const formatDuration = (start?: Date | string, end?: Date | string) => {
	if (!start || !end) return null;
	const ms = new Date(end).getTime() - new Date(start).getTime();
	if (!Number.isFinite(ms) || ms < 0) return null;
	if (ms < 1000) return `${ms} ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
	return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
};

// The socket can send several updates for one job; keep the latest per job (or device).
const rows = computed(() => {
	const byKey = new Map<string, CommandResult>();
	for (const result of props.results) {
		const key = result.jid || result.client_id;
		if (!key) continue;
		byKey.set(key, result);
	}
	return [...byKey.entries()].map(([key, result]) => {
		const state = toState(result.status);
		const parts: string[] = [];
		const exitCode = state === 'successful' ? '0' : /exit status (\d+)/.exec(result.error ?? '')?.[1];
		if (exitCode !== undefined) parts.push(`exit ${exitCode}`);
		else if (result.pid) parts.push(`PID ${result.pid}`);
		const duration = formatDuration(result.started_at, result.finished_at);
		if (duration) parts.push(duration);
		const stdout = result.result?.stdout ?? '';
		const stderr = result.result?.stderr ?? '';
		return {
			key,
			state,
			name: result.client_name || result.client_id,
			meta: parts.join(' · ') || (state === 'running' ? 'in progress' : ''),
			stdout,
			stderr,
			error: result.error ?? '',
			pid: result.pid,
			hasOutput: !!(stdout || stderr || result.error),
		};
	});
});

const counts = computed(() => {
	const c = { successful: 0, failed: 0, running: 0, unknown: 0 };
	rows.value.forEach(row => c[row.state]++);
	return c;
});

const summary = computed(() => {
	const parts: string[] = [];
	if (counts.value.successful) parts.push(`${counts.value.successful} succeeded`);
	if (counts.value.failed) parts.push(`${counts.value.failed} failed`);
	if (counts.value.running) parts.push(`${counts.value.running} running`);
	if (counts.value.unknown) parts.push(`${counts.value.unknown} unknown`);
	if (!parts.length) return props.running ? 'Waiting for results' : 'No results';
	return parts.join(' · ');
});

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

// Open failures automatically, and the output of a single-device run.
watch(rows, (value) => {
	const next = new Set(expanded.value);
	value.forEach((row) => {
		if (manuallyToggled.has(row.key) || !row.hasOutput) return;
		if (row.state === 'failed' || value.length === 1) next.add(row.key);
	});
	expanded.value = next;
}, { immediate: true });
</script>
