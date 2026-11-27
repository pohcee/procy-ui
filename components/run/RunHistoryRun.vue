<template>
	<!--
		One multi-device run in the history (Execute page, schedule history): overall status with
		devices succeeded/total, what ran, when, who, duration; expands to one row per device.
	-->
	<li class="border-b border-app-border-subtle last:border-b-0">
		<button
			type="button"
			class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-hidden sm:gap-3.5 sm:px-[18px]"
			:aria-expanded="open"
			@click="open = !open"
		>
			<RunStatusPill
				:state="loading && !jobs.length ? 'running' : summary.state"
				:label="pillLabel"
				class="w-[128px] justify-start"
			/>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-[13px] font-medium text-app-text">{{ what }}</span>
				<span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-app-text-3">
					<time
						:datetime="new Date(run.started_at).toISOString()"
						:title="useDateFormat(run.started_at, 'YYYY-MM-DD HH:mm:ss').value"
					>{{ useDateFormat(run.started_at, 'YYYY-MM-DD HH:mm').value }} ({{ ago }})</time>
					<template v-if="!hideWho">
						<span aria-hidden="true">·</span>
						<span
							v-if="run.schedule_id"
							class="inline-flex items-center gap-1 font-medium text-app-text-2"
						>
							<CalendarClock
								class="h-3.5 w-3.5"
								aria-hidden="true"
							/>
							Schedule
						</span>
						<span v-else>by {{ run.created_by || '—' }}</span>
					</template>
					<span aria-hidden="true">·</span>
					<span>{{ deviceLabel }}</span>
					<template v-if="duration">
						<span
							class="sm:hidden"
							aria-hidden="true"
						>·</span>
						<span class="font-mono sm:hidden">{{ duration }}</span>
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
			class="border-t border-app-border-subtle bg-app-surface-2 sm:pl-[24px]"
		>
			<p
				v-if="run.schedule_id && !hideWho"
				class="px-4 pb-2 pt-3 text-xs"
			>
				<NuxtLink
					:to="{ path: '/schedules', query: { history: run.schedule_id } }"
					class="inline-flex items-center gap-1 font-medium text-app-link hover:underline"
				>
					<CalendarClock
						class="h-3.5 w-3.5"
						aria-hidden="true"
					/>
					Started by a schedule: see its run history
				</NuxtLink>
			</p>
			<p
				v-if="loadError"
				class="px-4 py-3 text-[13px] text-app-danger"
			>
				{{ loadError }}
			</p>
			<p
				v-else-if="!loading && !jobs.length"
				class="px-4 py-3 text-[13px] text-app-text-3"
			>
				No device jobs were recorded for this run{{ runError ? `: ${runError}` : '.' }}
			</p>
			<ul
				v-else
				:aria-label="`Devices of the run at ${useDateFormat(run.started_at, 'YYYY-MM-DD HH:mm').value}`"
				class="border-l border-app-border-subtle bg-app-surface"
			>
				<RunHistoryJob
					v-for="job in jobs"
					:key="job.jid"
					:job="job"
					:entry-names="entryNames"
					:now="now"
					show-device
					hide-who
					hide-when
				/>
			</ul>
		</div>
	</li>
</template>

<script setup lang="ts">
import { CalendarClock, ChevronDown } from 'lucide-vue-next';
import { useDateFormat, useTimeAgo } from '@vueuse/core';
import RunHistoryJob from '~/components/run/RunHistoryJob.vue';
import RunStatusPill from '~/components/run/RunStatusPill.vue';
import type { MultiJobSummary } from '~/repository/modules/jobs';
import type { CommandResult } from '~/types';
import { RUN_SUMMARY_LABELS, formatDuration, summarizeJobs, whatRan } from '~/utils/runHistory';

const props = withDefaults(defineProps<{
	run: MultiJobSummary;
	entryNames?: Map<string, string>;
	hideWho?: boolean;
	/** Shown when the run has no device jobs (e.g. what the schedule's last run reported). */
	runError?: string;
	now?: number;
	/** Changing it reloads the devices of the run. */
	refreshToken?: number;
}>(), {
	entryNames: () => new Map(),
	hideWho: false,
	runError: '',
	now: 0,
	refreshToken: 0,
});

const emit = defineEmits<{
	(e: 'loaded', value: { jid: string; running: boolean }): void;
}>();

const { $api } = useNuxtApp();
const open = ref(false);
const loading = ref(true);
const loadError = ref('');
const jobs = ref<CommandResult[]>([]);

const clock = computed(() => props.now || Date.now());
const summary = computed(() => summarizeJobs(jobs.value, clock.value));
const ago = useTimeAgo(computed(() => props.run.started_at));

const pillLabel = computed(() => {
	if (loading.value && !jobs.value.length) return 'Loading';
	const s = summary.value;
	const label = RUN_SUMMARY_LABELS[s.state];
	if (s.total > 1 || s.state === 'partial') return `${label} ${s.counts.successful}/${s.total}`;
	return label;
});

const what = computed(() => {
	const first = jobs.value.find(j => j.library_entry_id) ?? jobs.value[0];
	if (!first) return loading.value ? 'Loading…' : 'Run';
	return whatRan(first, props.entryNames);
});

const deviceLabel = computed(() => {
	const n = jobs.value.length;
	const skipped = summary.value.counts.skipped;
	if (!n) return loading.value ? '…' : 'no devices';
	return `${n} device${n === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`;
});

const duration = computed(() => {
	const s = summary.value;
	const start = s.startedAt ?? new Date(props.run.started_at).getTime();
	const end = s.finishedAt ?? (s.state === 'running' ? clock.value : null);
	const d = end === null ? '' : formatDuration(end - start);
	return d && s.state === 'running' ? `${d} so far` : d;
});

let timer: ReturnType<typeof setTimeout> | undefined;
let unmounted = false;
const load = async () => {
	clearTimeout(timer);
	try {
		jobs.value = (await $api.jobs.listRunJobs(props.run.jid)).data ?? [];
		loadError.value = '';
	}
	catch (e) {
		const status = (e as { response?: { status?: number } })?.response?.status;
		loadError.value = status === 403
			? 'Only an administrator or the user who started this run can see its devices.'
			: 'Couldn’t load the devices of this run.';
	}
	finally {
		loading.value = false;
		const running = summary.value.state === 'running';
		emit('loaded', { jid: props.run.jid, running });
		// follow a run in progress
		if (running && !unmounted) timer = setTimeout(load, 5000);
	}
};

onMounted(load);
watch(() => props.refreshToken, load);
onBeforeUnmount(() => {
	unmounted = true;
	clearTimeout(timer);
});
defineExpose({ reload: load });
</script>
