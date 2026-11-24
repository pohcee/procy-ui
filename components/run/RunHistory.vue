<template>
	<!--
		Past runs, newest first, each expandable to its full output. With `client-id`: the runs on
		that device (one job each), filterable by status and library entry. Without: multi-device
		runs (GET /commands: an admin sees all, other users their own), optionally of one schedule.
	-->
	<AppCard
		:title="title"
		:description="description"
		flush
	>
		<template #actions>
			<AppButton
				variant="secondary"
				size="sm"
				:disabled="pending"
				@click="refresh"
			>
				<RefreshCw
					:class="['h-4 w-4', pending ? 'animate-spin' : '']"
					aria-hidden="true"
				/>
				Refresh
			</AppButton>
		</template>

		<div
			v-if="clientId"
			class="flex flex-wrap items-end gap-3 border-b border-app-border px-4 py-3 sm:px-[18px]"
		>
			<OpSegmented
				v-model="statusFilter"
				:options="STATUS_OPTIONS"
				label="Filter by status"
				size="sm"
			/>
			<div
				v-if="entryOptions.length > 1"
				class="w-full min-w-0 sm:w-[240px]"
			>
				<ThemedSelect
					:id="`${uid}-entry`"
					v-model="entryFilter"
					:options="entryOptions"
					label="Library entry"
				/>
			</div>
		</div>

		<OpEmpty
			v-if="pending && !hasRows"
			loading
			title="Loading run history…"
		/>
		<OpEmpty
			v-else-if="loadError"
			:icon="CircleAlert"
			:title="loadError"
		/>
		<OpEmpty
			v-else-if="!hasRows"
			:icon="History"
			:title="filtersActive ? 'No runs match these filters' : 'No runs yet'"
			:description="filtersActive ? 'Try another status or entry.' : emptyDescription"
		/>
		<template v-else>
			<ul
				v-if="clientId"
				aria-label="Runs on this device"
			>
				<RunHistoryJob
					v-for="job in shownJobs"
					:key="job.jid"
					:job="job"
					:entry-names="entryNames"
					:now="now"
				/>
			</ul>
			<ul
				v-else
				aria-label="Runs"
			>
				<RunHistoryRun
					v-for="run in runs"
					:key="run.jid"
					:run="run"
					:entry-names="entryNames"
					:hide-who="!!scheduleId"
					:run-error="run.jid === latestRunId ? latestRunError : ''"
					:now="now"
					:refresh-token="refreshToken"
					@loaded="onRunLoaded"
				/>
			</ul>
			<p
				v-if="clientId && entryFilter !== ANY && entryScanCapped"
				class="border-t border-app-border-subtle px-4 py-2 text-xs text-app-text-3 sm:px-[18px]"
			>
				Searched the latest {{ ENTRY_SCAN_LIMIT }} runs for this entry.
			</p>
		</template>
		<OpPagination
			v-if="count > perPage"
			:page="page"
			:per-page="perPage"
			:count="count"
			:shown="shownCount"
			@previous="page = Math.max(0, page - 1)"
			@next="page = page + 1"
		/>
	</AppCard>
</template>

<script setup lang="ts">
import { CircleAlert, History, RefreshCw } from 'lucide-vue-next';
import ThemedSelect from '~/components/custom/ThemedSelect.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpPagination from '~/components/operate/OpPagination.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import RunHistoryJob from '~/components/run/RunHistoryJob.vue';
import RunHistoryRun from '~/components/run/RunHistoryRun.vue';
import { useRunLibrary } from '~/composables/useRunLibrary';
import type { MultiJobSummary } from '~/repository/modules/jobs';
import type { CommandResult } from '~/types';
import { runState } from '~/utils/runHistory';

const props = withDefaults(defineProps<{
	/** The device whose runs to list. Omit for multi-device runs. */
	clientId?: string;
	/** Only the runs of this schedule (multi-device mode). */
	scheduleId?: string;
	title?: string;
	description?: string;
	perPage?: number;
	/** For a schedule: the error its last run reported, shown on that run when it has no jobs. */
	latestRunError?: string;
}>(), {
	clientId: undefined,
	scheduleId: undefined,
	title: 'Run history',
	description: undefined,
	perPage: 15,
	latestRunError: '',
});

const { $api } = useNuxtApp();
const library = useRunLibrary();
const uid = useId();

const ANY = '__any';
const NOT_LIBRARY = '__code';
const ENTRY_SCAN_LIMIT = 200;
type StatusFilter = 'all' | 'successful' | 'failed' | 'running';
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'successful', label: 'Succeeded' },
	{ value: 'failed', label: 'Failed' },
	{ value: 'running', label: 'Running' },
];

const page = ref(0);
const statusFilter = ref<StatusFilter>('all');
const entryFilter = ref<string>(ANY);
const pending = ref(false);
const loadError = ref('');
const jobs = ref<CommandResult[]>([]);
const runs = ref<MultiJobSummary[]>([]);
const count = ref(0);
const entryScanCapped = ref(false);
const entryNames = ref(new Map<string, string>());
const now = ref(Date.now());

const filtersActive = computed(() => statusFilter.value !== 'all' || entryFilter.value !== ANY);
const description = computed(() => props.description ?? (props.clientId
	? 'Everything that ran on this device, newest first. Open a run for its output.'
	: 'Runs on several devices, newest first. Open one for the result of each device.'));
const emptyDescription = computed(() => (props.clientId
	? 'Commands, scripts and library entries run here, by you or a schedule, show up here.'
	: (props.scheduleId ? 'This schedule hasn’t run yet.' : 'Runs you start on the Execute page show up here.')));

// Library entries that appear in the runs, for the filter and the names.
const entriesSeen = ref(new Set<string>());
const entryOptions = computed(() => {
	const options = [{ value: ANY, label: 'Any entry or code' }, { value: NOT_LIBRARY, label: 'Code (not from the library)' }];
	[...entryNames.value.entries()]
		.filter(([id]) => entriesSeen.value.has(id) || entryFilter.value === id)
		.sort((a, b) => a[1].localeCompare(b[1]))
		.forEach(([id, name]) => options.push({ value: id, label: name }));
	return entriesSeen.value.size || entryFilter.value !== ANY ? options : [];
});

const matchesEntry = (job: CommandResult) => {
	if (entryFilter.value === ANY) return true;
	if (entryFilter.value === NOT_LIBRARY) return !job.library_entry_id;
	return job.library_entry_id === entryFilter.value;
};

// With an entry filter the server can't filter, so a larger slice is filtered and paged here.
const filteredJobs = computed(() => jobs.value.filter(matchesEntry));
const shownJobs = computed(() => (entryFilter.value === ANY
	? filteredJobs.value
	: filteredJobs.value.slice(page.value * props.perPage, (page.value + 1) * props.perPage)));
const hasRows = computed(() => (props.clientId ? shownJobs.value.length > 0 : runs.value.length > 0));
const shownCount = computed(() => (props.clientId ? shownJobs.value.length : runs.value.length));

const statusQuery = (): string[] | undefined => {
	switch (statusFilter.value) {
		case 'successful': return ['successful'];
		case 'failed': return ['failed'];
		case 'running': return ['running'];
		default: return undefined;
	}
};

let generation = 0;
const load = async () => {
	const gen = ++generation;
	pending.value = true;
	try {
		if (props.clientId) {
			const byEntry = entryFilter.value !== ANY;
			const res = await $api.jobs.listForClient(props.clientId, {
				page: byEntry ? 0 : page.value,
				perPage: byEntry ? ENTRY_SCAN_LIMIT : props.perPage,
				status: statusQuery(),
			});
			if (gen !== generation) return;
			jobs.value = res.data ?? [];
			const seen = new Set(entriesSeen.value);
			jobs.value.forEach(j => j.library_entry_id && seen.add(j.library_entry_id));
			entriesSeen.value = seen;
			entryScanCapped.value = byEntry && (res.meta?.count ?? 0) > ENTRY_SCAN_LIMIT;
			count.value = byEntry ? filteredJobs.value.length : (res.meta?.count ?? 0);
		}
		else {
			const res = await $api.jobs.listRuns({ page: page.value, perPage: props.perPage, scheduleId: props.scheduleId });
			if (gen !== generation) return;
			runs.value = res.data ?? [];
			count.value = res.meta?.count ?? 0;
		}
		loadError.value = '';
	}
	catch {
		if (gen !== generation) return;
		loadError.value = 'Couldn’t load the run history.';
	}
	finally {
		if (gen === generation) pending.value = false;
	}
};

const refreshToken = ref(0);
const refresh = () => {
	refreshToken.value++;
	return load();
};

watch(page, load);
watch([statusFilter, entryFilter], () => {
	if (page.value !== 0) page.value = 0;
	else load();
});
watch(() => [props.clientId, props.scheduleId], () => {
	page.value = 0;
	load();
});

// Library names (for "OS updates v3" and the filter); runs show "Library entry" without them.
const loadEntries = async () => {
	try {
		const all = await library.listAll();
		const deleted = await library.listAll(true).catch(() => []);
		entryNames.value = new Map([...deleted, ...all].map(e => [e.id, e.name]));
	}
	catch { /* names stay generic */ }
};

const latestRunId = computed(() => runs.value[0]?.jid);

// Keep the list current while something in it runs.
const runningRuns = ref(new Set<string>());
const onRunLoaded = ({ jid, running }: { jid: string; running: boolean }) => {
	const next = new Set(runningRuns.value);
	if (running) next.add(jid);
	else next.delete(jid);
	runningRuns.value = next;
};
const anyRunning = computed(() => (props.clientId
	? jobs.value.some(j => runState(j, now.value) === 'running')
	: runningRuns.value.size > 0));
let ticker: ReturnType<typeof setInterval> | undefined;
let refresher: ReturnType<typeof setInterval> | undefined;
watch(anyRunning, (running) => {
	clearInterval(ticker);
	clearInterval(refresher);
	if (!running) return;
	ticker = setInterval(() => {
		now.value = Date.now();
	}, 1000);
	// device runs: reload the page; multi-device runs follow themselves (RunHistoryRun)
	if (props.clientId) {
		refresher = setInterval(() => {
			if (!pending.value) load();
		}, 10_000);
	}
});

onMounted(() => {
	load();
	loadEntries();
});
onBeforeUnmount(() => {
	clearInterval(ticker);
	clearInterval(refresher);
});

defineExpose({ refresh });
</script>
