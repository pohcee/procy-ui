<template>
	<!--
		One device job in the run history: status, what ran (or the device), when, who, duration;
		expands to its code and full output, fetched on first open.
	-->
	<li class="border-b border-app-border-subtle last:border-b-0">
		<button
			type="button"
			class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none sm:gap-3.5 sm:px-[18px]"
			:aria-expanded="open"
			@click="toggle"
		>
			<RunStatusPill
				:state="state"
				class="w-[104px] justify-start"
			/>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-[13px] font-medium text-app-text">
					<template v-if="showDevice">
						<span class="font-mono">{{ job.client_name || job.client_id }}</span>
					</template>
					<template v-else>
						{{ what }}
					</template>
				</span>
				<span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-app-text-3">
					<template
						v-for="(part, i) in subParts"
						:key="part.key"
					>
						<span
							v-if="i > 0"
							:class="part.mobileOnly ? 'sm:hidden' : ''"
							aria-hidden="true"
						>·</span>
						<time
							v-if="part.key === 'when'"
							:datetime="startedIso"
							:title="startedFull"
						>{{ startedShort }}</time>
						<span
							v-else-if="part.key === 'schedule'"
							class="inline-flex items-center gap-1 font-medium text-app-text-2"
						>
							<CalendarClock
								class="h-3.5 w-3.5"
								aria-hidden="true"
							/>
							Schedule
						</span>
						<span
							v-else
							:class="[part.mono ? 'font-mono' : '', part.mobileOnly ? 'sm:hidden' : '']"
						>{{ part.text }}</span>
					</template>
				</span>
			</span>
			<span class="hidden shrink-0 font-mono text-xs text-app-text-3 sm:inline">{{ duration }}</span>
			<ChevronDown
				:class="['h-4 w-4 shrink-0 text-app-text-2 transition-transform', open ? 'rotate-180' : '']"
				aria-hidden="true"
			/>
		</button>
		<div
			v-if="open"
			class="border-t border-app-border-subtle bg-app-surface-2 px-4 pb-4 pt-3 sm:pl-[136px] sm:pr-[18px]"
		>
			<dl class="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
				<template
					v-for="item in facts"
					:key="item.label"
				>
					<dt class="text-app-text-3">
						{{ item.label }}
					</dt>
					<dd class="min-w-0 break-words font-mono text-app-text-2">
						{{ item.value }}
					</dd>
				</template>
			</dl>
			<p
				v-if="job.schedule_id && !hideWho"
				class="mb-3 text-xs"
			>
				<NuxtLink
					:to="{ path: '/schedules', query: { history: job.schedule_id } }"
					class="inline-flex items-center gap-1 font-medium text-app-link hover:underline"
				>
					<CalendarClock
						class="h-3.5 w-3.5"
						aria-hidden="true"
					/>
					Started by a schedule: see its run history
				</NuxtLink>
			</p>
			<details
				v-if="detail?.command"
				class="mb-3"
			>
				<summary class="cursor-pointer text-xs font-medium text-app-text-2 hover:text-app-text">
					{{ detail.is_script ? 'Script' : 'Command' }} that ran
				</summary>
				<pre class="mt-2 max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-app-border-subtle bg-app-bg p-3 font-mono text-xs leading-5 text-app-text-2">{{ detail.command }}</pre>
			</details>
			<RunOutput
				:stdout="detail?.result?.stdout"
				:stderr="detail?.result?.stderr"
				:error="detail?.error ?? job.error"
				:loading="loading"
				:empty-text="loadError || (state === 'running' ? 'No output yet: the device sends it when the job finishes.' : 'This job produced no output.')"
			/>
		</div>
	</li>
</template>

<script setup lang="ts">
import { CalendarClock, ChevronDown } from 'lucide-vue-next';
import { useDateFormat, useTimeAgo } from '@vueuse/core';
import RunOutput from '~/components/run/RunOutput.vue';
import RunStatusPill from '~/components/run/RunStatusPill.vue';
import { LIBRARY_OS_LABELS, toLibraryOs } from '~/composables/useRunLibrary';
import type { CommandResult } from '~/types';
import { exitCodeOf, formatDuration, jobDurationMs, runState, whatRan } from '~/utils/runHistory';

const props = withDefaults(defineProps<{
	job: CommandResult;
	entryNames?: Map<string, string>;
	/** Inside a multi-device run: name the device instead of what ran. */
	showDevice?: boolean;
	hideWho?: boolean;
	hideWhen?: boolean;
	now?: number;
}>(), {
	entryNames: () => new Map(),
	showDevice: false,
	hideWho: false,
	hideWhen: false,
	now: 0,
});

const { $api } = useNuxtApp();
const open = ref(false);
const loading = ref(false);
const loadError = ref('');
const detail = ref<CommandResult | null>(null);

const clock = computed(() => props.now || Date.now());
const merged = computed(() => ({ ...props.job, ...(detail.value ?? {}) }));
const state = computed(() => runState(merged.value, clock.value));
const exitCode = computed(() => exitCodeOf(merged.value));
const what = computed(() => whatRan(merged.value, props.entryNames));
const duration = computed(() => {
	if (state.value === 'skipped') return '';
	const d = formatDuration(jobDurationMs(merged.value, clock.value));
	return d && state.value === 'running' ? `${d} so far` : d;
});
const startedIso = computed(() => (props.job.started_at ? new Date(props.job.started_at).toISOString() : ''));
const startedFull = computed(() => (props.job.started_at ? useDateFormat(props.job.started_at, 'YYYY-MM-DD HH:mm:ss').value : ''));
const ago = useTimeAgo(computed(() => props.job.started_at ?? new Date()));
const startedShort = computed(() => (props.job.started_at ? `${useDateFormat(props.job.started_at, 'YYYY-MM-DD HH:mm').value} (${ago.value})` : 'not started'));

/** The line under the title: when · who · exit code · (phones) duration, or why it was skipped. */
const subParts = computed(() => {
	const parts: { key: string; text?: string; mono?: boolean; mobileOnly?: boolean }[] = [];
	if (state.value === 'skipped') {
		parts.push({ key: 'skip', text: merged.value.result?.summary || merged.value.error || 'skipped' });
		return parts;
	}
	if (!props.hideWhen) parts.push({ key: 'when' });
	if (!props.hideWho) parts.push(props.job.schedule_id ? { key: 'schedule' } : { key: 'who', text: `by ${props.job.created_by || '—'}` });
	if (exitCode.value !== null && exitCode.value !== 0) parts.push({ key: 'exit', text: `exit ${exitCode.value}`, mono: true });
	if (state.value === 'lost') parts.push({ key: 'lost', text: 'never reported back' });
	if (duration.value) parts.push({ key: 'duration', text: duration.value, mono: true, mobileOnly: true });
	return parts;
});

const facts = computed(() => {
	const j = merged.value;
	const items: { label: string; value: string }[] = [];
	if (props.showDevice && !j.library_entry_id) items.push({ label: 'Ran', value: what.value });
	const os = toLibraryOs(j.os);
	if (j.library_entry_id) items.push({ label: 'Library', value: [what.value, os ? LIBRARY_OS_LABELS[os] : j.os].filter(Boolean).join(' · ') });
	if (j.started_at) items.push({ label: 'Started', value: useDateFormat(j.started_at, 'YYYY-MM-DD HH:mm:ss').value });
	if (j.finished_at) items.push({ label: 'Finished', value: useDateFormat(j.finished_at, 'YYYY-MM-DD HH:mm:ss').value });
	if (duration.value) items.push({ label: 'Duration', value: duration.value });
	if (exitCode.value !== null) items.push({ label: 'Exit code', value: String(exitCode.value) });
	if (j.timeout_sec) items.push({ label: 'Timeout', value: `${j.timeout_sec} s` });
	if (j.interpreter) items.push({ label: 'Interpreter', value: j.interpreter });
	if (j.is_sudo) items.push({ label: 'Sudo', value: 'yes' });
	items.push({ label: 'Job ID', value: j.jid });
	return items;
});

const load = async () => {
	if (detail.value || loading.value || !props.job.client_id) return;
	loading.value = true;
	loadError.value = '';
	try {
		detail.value = (await $api.jobs.showForClient(props.job.client_id, props.job.jid)).data;
	}
	catch {
		loadError.value = 'Couldn’t load the output of this job.';
	}
	finally {
		loading.value = false;
	}
};

const toggle = () => {
	open.value = !open.value;
	if (open.value) load();
};

// A running job's output arrives when it finishes: fetch again when its status changes.
watch(() => props.job.status, () => {
	detail.value = null;
	if (open.value) load();
});
</script>
