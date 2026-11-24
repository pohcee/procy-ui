import type { Ref } from 'vue';
import type { CommandResult } from '~/types';
import { findStartedRun, mergeRunJobs, mergeSocketMessages, runState } from '~/utils/runHistory';

const POLL_MS = 4000;
/** How long to look for the server's record of a run before saying it has none. */
const FIND_TIMEOUT_MS = 20_000;

/**
 * Follows the run that was just started, independent of its websocket: the server only sends a
 * device's result when it finishes (plus streamed output, if the device supports it), so a long
 * run is silent for minutes and a dropped socket would lose it. This finds the run's multi-device
 * job on the server, polls its device jobs (running, finished, timed out) and fetches the output
 * of devices the socket didn't report.
 */
export const useRunTracker = (socketMessages: Ref<CommandResult[]>, socketOpen: Ref<boolean>) => {
	const { $api } = useNuxtApp();
	const profile = useProfile();

	const multiJobId = ref<string | null>(null);
	const polled = ref<CommandResult[]>([]);
	const fetched = ref(new Map<string, CommandResult>());
	const isTracking = ref(false);
	/** The server has no record of the run (it was rejected or never reached it). */
	const notRecorded = ref(false);
	const now = ref(Date.now());

	const taken = new Set<string>();
	let startedAt = 0;
	let generation = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let ticker: ReturnType<typeof setInterval> | undefined;
	const fetching = new Set<string>();

	const socketJobs = computed(() => mergeSocketMessages(socketMessages.value.filter(m => m && (m.jid || m.client_id))));

	const jobs = computed<CommandResult[]>(() => {
		const listed = polled.value.map(j => fetched.value.get(j.jid) ?? j);
		return mergeRunJobs(socketJobs.value, listed);
	});

	const anyRunning = computed(() => jobs.value.some(j => runState(j, now.value) === 'running'));

	const stop = () => {
		clearTimeout(timer);
		clearInterval(ticker);
		timer = undefined;
		ticker = undefined;
		isTracking.value = false;
	};

	/** Output of finished devices the socket didn't deliver. */
	const fetchMissingOutput = async (gen: number) => {
		const socketFinal = new Set(socketJobs.value.filter(j => j.status && j.status !== 'running').map(j => j.jid));
		const todo = polled.value.filter(j => j.status && j.status !== 'running' && !socketFinal.has(j.jid) && !fetched.value.has(j.jid) && !fetching.has(j.jid));
		await Promise.all(todo.map(async (j) => {
			fetching.add(j.jid);
			try {
				const { data } = await $api.jobs.showForClient(j.client_id, j.jid);
				if (gen !== generation) return;
				const next = new Map(fetched.value);
				next.set(j.jid, data);
				fetched.value = next;
			}
			catch { /* shown without output */ }
			finally {
				fetching.delete(j.jid);
			}
		}));
	};

	const poll = async (gen: number) => {
		if (gen !== generation) return;
		try {
			if (!multiJobId.value) {
				const fromSocket = socketJobs.value.find(j => j.multi_job_id)?.multi_job_id;
				if (fromSocket) multiJobId.value = fromSocket;
				else {
					const res = await $api.jobs.listRuns({ perPage: 10, createdBy: profile.profile?.username || undefined });
					if (gen !== generation) return;
					const found = findStartedRun(res.data ?? [], startedAt, profile.profile?.username, taken);
					if (found) multiJobId.value = found;
				}
				if (multiJobId.value) taken.add(multiJobId.value);
			}
			if (multiJobId.value) {
				const res = await $api.jobs.listRunJobs(multiJobId.value);
				if (gen !== generation) return;
				polled.value = res.data ?? [];
				await fetchMissingOutput(gen);
				if (gen !== generation) return;
			}
		}
		catch { /* try again on the next round */ }

		const elapsed = Date.now() - startedAt;
		if (!multiJobId.value && !socketOpen.value && elapsed > FIND_TIMEOUT_MS && !socketJobs.value.length) {
			notRecorded.value = true;
			stop();
			return;
		}
		const done = !socketOpen.value
			&& (multiJobId.value ? polled.value.length > 0 || elapsed > FIND_TIMEOUT_MS : socketJobs.value.length > 0)
			&& !anyRunning.value
			&& fetching.size === 0;
		if (done) {
			stop();
			return;
		}
		timer = setTimeout(() => poll(gen), POLL_MS);
	};

	/** Starts following a run that was started just now. */
	const start = () => {
		stop();
		generation++;
		startedAt = Date.now();
		multiJobId.value = null;
		polled.value = [];
		fetched.value = new Map();
		notRecorded.value = false;
		isTracking.value = true;
		now.value = Date.now();
		ticker = setInterval(() => {
			now.value = Date.now();
		}, 1000);
		if (!profile.profile?.username) profile.fetchProfile();
		const gen = generation;
		timer = setTimeout(() => poll(gen), 1500);
	};

	// The socket closing is a good moment to look again (it may have dropped mid-run).
	watch(socketOpen, (open) => {
		if (open || !isTracking.value) return;
		clearTimeout(timer);
		const gen = generation;
		timer = setTimeout(() => poll(gen), 500);
	});

	onBeforeUnmount(stop);

	return { start, stop, jobs, multiJobId, isTracking, notRecorded, anyRunning, now };
};
