/**
 * Run history logic: job status mapping (incl. timed out and lost runs), exit codes, durations,
 * per-run summaries of device jobs, schedule last-run states and merging live socket messages.
 * Pure functions with no Vue or Nuxt imports, so they run under `node --test`
 * (see tests/runHistory.test.ts).
 */

/** The job fields the history works with (a subset of `CommandResult`). */
export interface JobLike {
	jid?: string;
	status?: string | null;
	client_id?: string;
	client_name?: string;
	started_at?: string | Date | null;
	finished_at?: string | Date | null;
	error?: string | null;
	pid?: number | null;
	timeout_sec?: number | null;
	created_by?: string;
	command?: string;
	is_script?: boolean;
	multi_job_id?: string | null;
	schedule_id?: string | null;
	library_entry_id?: string;
	library_version?: number;
	os?: string;
	result?: { stdout?: string; stderr?: string; summary?: string } | null;
}

/**
 * What the UI shows for a job. `lost`: the server still lists it as running long after its
 * timeout, so its result will never arrive (the device restarted or the server lost it).
 */
export type RunState = 'successful' | 'failed' | 'timed_out' | 'running' | 'lost' | 'skipped' | 'unknown';

/** How long past its timeout a "running" job may stay before it counts as lost. */
export const LOST_GRACE_MS = 10 * 60_000;
/** The server's default when a job has no timeout. */
export const DEFAULT_TIMEOUT_SEC = 300;

const TIMEOUT_ERROR = /timeout exceeded|timed out|deadline exceeded/i;

const toMs = (value?: string | Date | null) => {
	if (!value) return NaN;
	return new Date(value).getTime();
};

export const runState = (job: JobLike, now: number = Date.now()): RunState => {
	const status = job.status ?? '';
	if (status === 'successful') return 'successful';
	if (status === 'skipped') return 'skipped';
	if (status === 'failed') return TIMEOUT_ERROR.test(job.error ?? '') ? 'timed_out' : 'failed';
	if (status === '' || status === 'running') {
		const started = toMs(job.started_at);
		const timeoutMs = (job.timeout_sec || DEFAULT_TIMEOUT_SEC) * 1000;
		// Only a job the server listed (it has a start time) can be lost; live socket rows can't.
		if (status === 'running' && Number.isFinite(started) && now - started > timeoutMs + LOST_GRACE_MS) return 'lost';
		return 'running';
	}
	return 'unknown';
};

export const RUN_STATE_LABELS: Record<RunState, string> = {
	successful: 'Succeeded',
	failed: 'Failed',
	timed_out: 'Timed out',
	running: 'Running',
	lost: 'No result',
	skipped: 'Skipped',
	unknown: 'Unknown',
};

export const isFinished = (state: RunState) => state !== 'running';

/** The exit code: 0 on success, otherwise from "exit status N" in the error (null when unknown). */
export const exitCodeOf = (job: JobLike): number | null => {
	if (job.status === 'successful') return 0;
	const match = /exit status (-?\d+)/.exec(job.error ?? '');
	return match ? Number(match[1]) : null;
};

/** "850 ms", "4.2 s", "3 min 12 s", "2 h 5 min". */
export const formatDuration = (ms: number | null | undefined): string => {
	if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '';
	if (ms < 1000) return `${Math.round(ms)} ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
	const totalSec = Math.round(ms / 1000);
	if (totalSec < 3600) return `${Math.floor(totalSec / 60)} min ${totalSec % 60} s`;
	const totalMin = Math.floor(totalSec / 60);
	if (totalMin < 24 * 60) return `${Math.floor(totalMin / 60)} h ${totalMin % 60} min`;
	return `${Math.floor(totalMin / 1440)} d ${Math.floor((totalMin % 1440) / 60)} h`;
};

/** Run time of a job: until it finished, or until `now` while it runs. Null when unknown. */
export const jobDurationMs = (job: JobLike, now: number = Date.now()): number | null => {
	const start = toMs(job.started_at);
	if (!Number.isFinite(start)) return null;
	const end = job.finished_at ? toMs(job.finished_at) : (runState(job, now) === 'running' ? now : NaN);
	if (!Number.isFinite(end) || end < start) return null;
	return end - start;
};

/** The first meaningful line of a command or script, for a one-line "what ran". */
export const codeExcerpt = (code?: string, max = 80): string => {
	const lines = (code ?? '').split('\n').map(l => l.trim()).filter(Boolean);
	const line = lines.find(l => !l.startsWith('#!') && !l.startsWith('#') && !/^(@echo off|rem\b)/i.test(l)) ?? lines[0] ?? '';
	return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** "OS updates v3", "Script: apt-get update", "Command: uptime". */
export const whatRan = (job: JobLike, entryNames: Map<string, string> = new Map()): string => {
	if (job.library_entry_id) {
		const name = entryNames.get(job.library_entry_id) ?? 'Library entry';
		return job.library_version ? `${name} v${job.library_version}` : name;
	}
	const excerpt = codeExcerpt(job.command);
	const kind = job.is_script ? 'Script' : 'Command';
	return excerpt ? `${kind}: ${excerpt}` : kind;
};

/** Who started a run: "Schedule" for scheduled runs, else the user. */
export const startedBy = (job: { created_by?: string; schedule_id?: string | null }) => (job.schedule_id ? 'Schedule' : (job.created_by || '—'));

// --- runs of several devices -------------------------------------------------

export type RunSummaryState = 'successful' | 'partial' | 'failed' | 'timed_out' | 'running' | 'lost' | 'skipped' | 'none';

export interface RunSummary {
	state: RunSummaryState;
	total: number;
	counts: Record<RunState, number>;
	/** Earliest start and latest finish over the devices (null while unknown / running). */
	startedAt: number | null;
	finishedAt: number | null;
}

export const RUN_SUMMARY_LABELS: Record<RunSummaryState, string> = {
	successful: 'Succeeded',
	partial: 'Partly failed',
	failed: 'Failed',
	timed_out: 'Timed out',
	running: 'Running',
	lost: 'No result',
	skipped: 'Skipped',
	none: 'No devices',
};

/** One state for a run over all its device jobs. Skipped devices don't make a run fail. */
export const summarizeJobs = (jobs: JobLike[], now: number = Date.now()): RunSummary => {
	const counts: Record<RunState, number> = { successful: 0, failed: 0, timed_out: 0, running: 0, lost: 0, skipped: 0, unknown: 0 };
	let startedAt: number | null = null;
	let finishedAt: number | null = null;
	jobs.forEach((job) => {
		counts[runState(job, now)]++;
		const s = toMs(job.started_at);
		if (Number.isFinite(s)) startedAt = startedAt === null ? s : Math.min(startedAt, s);
		const f = toMs(job.finished_at);
		if (Number.isFinite(f)) finishedAt = finishedAt === null ? f : Math.max(finishedAt, f);
	});
	const ran = jobs.length - counts.skipped;
	let state: RunSummaryState;
	if (jobs.length === 0) state = 'none';
	else if (counts.running) state = 'running';
	else if (ran === 0) state = 'skipped';
	else if (counts.successful === ran) state = 'successful';
	else if (counts.successful > 0) state = 'partial';
	else if (counts.timed_out === ran) state = 'timed_out';
	else if (counts.lost === ran) state = 'lost';
	else state = 'failed';
	return { state, total: ran, counts, startedAt, finishedAt: counts.running ? null : finishedAt };
};

// --- schedules ---------------------------------------------------------------

export interface ExecutionLike {
	started_at?: string | Date | null;
	client_count?: number | null;
	success_count?: number | null;
	status?: string | null;
	error?: string | null;
}

/**
 * The state of a schedule's last run. The server only fills `status` for single-device runs
 * (for more devices it sends null), so a multi-device state comes from the counts:
 * all succeeded / some / none.
 */
export const lastRunState = (run: ExecutionLike | null | undefined): RunSummaryState | 'never' => {
	if (!run?.started_at) return 'never';
	if (run.error) return 'failed';
	const total = run.client_count ?? 0;
	const ok = run.success_count ?? 0;
	switch (run.status) {
		case 'successful': return 'successful';
		case 'running': return 'running';
		case 'skipped': return 'skipped';
		case 'failed': return ok > 0 ? 'partial' : 'failed';
		case 'partial_successful':
		case 'partially_successful': return 'partial';
	}
	if (total === 0) return 'none';
	if (ok >= total) return 'successful';
	return ok > 0 ? 'partial' : 'failed';
};

/** Schedules are made as code (a command or a script) or from the library. */
export type ScheduleKind = 'code' | 'library';
export const scheduleKind = (type?: string): ScheduleKind => (type === 'library' ? 'library' : 'code');

// --- the run that is happening now ---------------------------------------------

/**
 * Socket messages for a run: final results (with a status) and streamed output chunks
 * (no status, only a piece of stdout or stderr). Returns one job per device, the chunks
 * appended until the final result replaces them.
 */
export const mergeSocketMessages = <T extends JobLike>(messages: T[]): T[] => {
	const byKey = new Map<string, T>();
	for (const message of messages) {
		const key = message.jid || message.client_id;
		if (!key) continue;
		const previous = byKey.get(key);
		if (!message.status && previous && !previous.status) {
			// another chunk of live output
			byKey.set(key, {
				...previous,
				result: {
					stdout: (previous.result?.stdout ?? '') + (message.result?.stdout ?? ''),
					stderr: (previous.result?.stderr ?? '') + (message.result?.stderr ?? ''),
					summary: previous.result?.summary ?? '',
				},
			});
			continue;
		}
		if (!message.status && previous?.status) continue; // a late chunk after the result
		byKey.set(key, { ...previous, ...message });
	}
	return [...byKey.values()];
};

/**
 * Jobs of the current run as the server lists them, merged with what the socket sent: the socket
 * wins once it has a final result, the server list fills in devices the socket hasn't reported
 * (yet, or ever, if the socket dropped).
 */
export const mergeRunJobs = <T extends JobLike>(socket: T[], polled: T[]): T[] => {
	const byKey = new Map<string, T>();
	const keyOf = (j: T) => j.jid || j.client_id || '';
	polled.forEach(j => byKey.set(keyOf(j), j));
	socket.forEach((j) => {
		const key = keyOf(j);
		const listed = byKey.get(key);
		if (!listed) {
			byKey.set(key, j);
			return;
		}
		if (j.status && j.status !== 'running') {
			byKey.set(key, { ...listed, ...j });
			return;
		}
		// still running on the socket: keep the server's state (it may have finished) and the live output
		const finishedOnServer = listed.status && listed.status !== 'running';
		byKey.set(key, {
			...j,
			...listed,
			result: finishedOnServer && listed.result ? listed.result : (j.result ?? listed.result),
		});
	});
	return [...byKey.values()];
};

export interface MultiJobSummaryLike {
	jid: string;
	started_at: string | Date;
	created_by?: string;
	schedule_id?: string | null;
}

/**
 * The multi-device job the server made for a run started at `startedAt` by `user`: the oldest
 * one by them, not from a schedule, that started no earlier than a few seconds before (clocks
 * of browser and server differ a little) and isn't already taken by another run.
 */
export const findStartedRun = (
	summaries: MultiJobSummaryLike[],
	startedAt: number,
	user: string | undefined,
	taken: Set<string> = new Set(),
	skewMs = 30_000,
): string | null => {
	const candidates = summaries
		.filter(s => !s.schedule_id && !taken.has(s.jid) && (!user || s.created_by === user))
		.filter(s => toMs(s.started_at) >= startedAt - skewMs)
		.sort((a, b) => toMs(a.started_at) - toMs(b.started_at));
	return candidates[0]?.jid ?? null;
};
