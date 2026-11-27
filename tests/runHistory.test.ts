import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	LOST_GRACE_MS,
	codeExcerpt,
	exitCodeOf,
	findStartedRun,
	formatDuration,
	jobDurationMs,
	lastRunState,
	mergeRunJobs,
	mergeSocketMessages,
	runState,
	scheduleKind,
	startedBy,
	summarizeJobs,
	whatRan,
	type JobLike,
} from '../utils/runHistory.ts';

const T0 = Date.parse('2026-11-24T09:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

describe('runState', () => {
	it('maps the server statuses', () => {
		assert.equal(runState({ status: 'successful' }), 'successful');
		assert.equal(runState({ status: 'failed', error: 'exit status 1' }), 'failed');
		assert.equal(runState({ status: 'skipped' }), 'skipped');
		assert.equal(runState({ status: 'unknown' }), 'unknown');
		assert.equal(runState({ status: 'weird' }), 'unknown');
	});
	it('tells a timeout from another failure', () => {
		assert.equal(runState({ status: 'failed', error: 'command execution timeout exceeded' }), 'timed_out');
		assert.equal(runState({ status: 'failed', error: 'context deadline exceeded' }), 'timed_out');
	});
	it('treats a socket row without status as running', () => {
		assert.equal(runState({}), 'running');
	});
	it('marks a run listed as running long past its timeout as lost', () => {
		const job: JobLike = { status: 'running', started_at: iso(T0), timeout_sec: 300 };
		assert.equal(runState(job, T0 + 300_000), 'running');
		assert.equal(runState(job, T0 + 300_000 + LOST_GRACE_MS + 1), 'lost');
		// default timeout when none is set
		assert.equal(runState({ status: 'running', started_at: iso(T0) }, T0 + 60_000), 'running');
		// years-old "running" job
		assert.equal(runState({ status: 'running', started_at: '2024-05-05T17:31:20Z', timeout_sec: 300 }, T0), 'lost');
	});
});

describe('exitCodeOf', () => {
	it('is 0 on success and parsed from the error otherwise', () => {
		assert.equal(exitCodeOf({ status: 'successful' }), 0);
		assert.equal(exitCodeOf({ status: 'failed', error: 'exit status 100' }), 100);
		assert.equal(exitCodeOf({ status: 'failed', error: 'client is paused' }), null);
		assert.equal(exitCodeOf({ status: 'running' }), null);
	});
});

describe('formatDuration', () => {
	it('picks a unit by size', () => {
		assert.equal(formatDuration(850), '850 ms');
		assert.equal(formatDuration(4200), '4.2 s');
		assert.equal(formatDuration(192_000), '3 min 12 s');
		assert.equal(formatDuration(2 * 3_600_000 + 5 * 60_000), '2 h 5 min');
		assert.equal(formatDuration(3 * 86_400_000 + 4 * 3_600_000), '3 d 4 h');
	});
	it('is empty for unknown or negative durations', () => {
		assert.equal(formatDuration(null), '');
		assert.equal(formatDuration(-1), '');
		assert.equal(formatDuration(Number.NaN), '');
	});
});

describe('jobDurationMs', () => {
	it('runs from start to finish, or to now while running', () => {
		assert.equal(jobDurationMs({ status: 'successful', started_at: iso(T0), finished_at: iso(T0 + 11_000) }), 11_000);
		assert.equal(jobDurationMs({ status: 'running', started_at: iso(T0) }, T0 + 5000), 5000);
		assert.equal(jobDurationMs({ status: 'failed', started_at: iso(T0) }, T0 + 5000), null);
		assert.equal(jobDurationMs({ status: 'successful' }), null);
	});
});

describe('whatRan / codeExcerpt / startedBy', () => {
	it('names a library entry with its version', () => {
		const names = new Map([['e1', 'OS updates']]);
		assert.equal(whatRan({ library_entry_id: 'e1', library_version: 2 }, names), 'OS updates v2');
		assert.equal(whatRan({ library_entry_id: 'gone' }, names), 'Library entry');
	});
	it('shows the first meaningful line of code', () => {
		assert.equal(codeExcerpt('#!/bin/sh\n# comment\n\napt-get update\n'), 'apt-get update');
		assert.equal(codeExcerpt('#!/bin/sh\n'), '#!/bin/sh');
		assert.equal(codeExcerpt('x'.repeat(100), 10), `${'x'.repeat(9)}…`);
		assert.equal(whatRan({ is_script: true, command: '#!/bin/sh\nuptime' }), 'Script: uptime');
		assert.equal(whatRan({ command: 'hostname' }), 'Command: hostname');
	});
	it('says Schedule for scheduled runs', () => {
		assert.equal(startedBy({ created_by: 'admin', schedule_id: 's1' }), 'Schedule');
		assert.equal(startedBy({ created_by: 'alice', schedule_id: null }), 'alice');
	});
});

describe('summarizeJobs', () => {
	const ok = { status: 'successful', started_at: iso(T0), finished_at: iso(T0 + 1000) };
	const bad = { status: 'failed', error: 'exit status 1', started_at: iso(T0 + 500), finished_at: iso(T0 + 3000) };
	it('is successful only when every device that ran succeeded', () => {
		const s = summarizeJobs([ok, ok, { status: 'skipped' }]);
		assert.equal(s.state, 'successful');
		assert.equal(s.total, 2);
		assert.equal(s.counts.skipped, 1);
	});
	it('is partial with some failures, failed with none succeeding', () => {
		assert.equal(summarizeJobs([ok, bad]).state, 'partial');
		assert.equal(summarizeJobs([bad, bad]).state, 'failed');
		assert.equal(summarizeJobs([{ status: 'failed', error: 'timeout exceeded' }]).state, 'timed_out');
	});
	it('is running while any device runs, and spans the device times', () => {
		const s = summarizeJobs([ok, { status: 'running', started_at: iso(T0) }], T0 + 2000);
		assert.equal(s.state, 'running');
		assert.equal(s.finishedAt, null);
		const done = summarizeJobs([ok, bad]);
		assert.equal(done.startedAt, T0);
		assert.equal(done.finishedAt, T0 + 3000);
	});
	it('handles empty and all-skipped runs', () => {
		assert.equal(summarizeJobs([]).state, 'none');
		assert.equal(summarizeJobs([{ status: 'skipped' }]).state, 'skipped');
	});
});

describe('lastRunState', () => {
	it('uses the status of a single-device run', () => {
		assert.equal(lastRunState({ started_at: iso(T0), client_count: 1, success_count: 0, status: 'failed' }), 'failed');
		assert.equal(lastRunState({ started_at: iso(T0), client_count: 1, success_count: 1, status: 'successful' }), 'successful');
	});
	it('derives a multi-device state from the counts (the server sends status null)', () => {
		assert.equal(lastRunState({ started_at: iso(T0), client_count: 2, success_count: 2, status: null }), 'successful');
		assert.equal(lastRunState({ started_at: iso(T0), client_count: 3, success_count: 1, status: null }), 'partial');
		assert.equal(lastRunState({ started_at: iso(T0), client_count: 2, success_count: 0, status: null }), 'failed');
	});
	it('fails a run that never started and knows never-run schedules', () => {
		assert.equal(lastRunState({ started_at: iso(T0), error: 'library entry deleted' }), 'failed');
		assert.equal(lastRunState(null), 'never');
		assert.equal(lastRunState({ started_at: null }), 'never');
	});
});

describe('scheduleKind', () => {
	it('groups commands and scripts as code', () => {
		assert.equal(scheduleKind('command'), 'code');
		assert.equal(scheduleKind('script'), 'code');
		assert.equal(scheduleKind('library'), 'library');
	});
});

describe('mergeSocketMessages', () => {
	it('appends streamed chunks and lets the final result replace them', () => {
		const merged = mergeSocketMessages([
			{ jid: 'j1', client_id: 'c1', result: { stdout: 'Reading ' } },
			{ jid: 'j1', client_id: 'c1', result: { stdout: 'lists…\n' } },
			{ jid: 'j2', client_id: 'c2', status: 'failed', error: 'exit status 2' },
		]);
		assert.equal(merged.length, 2);
		assert.equal(merged[0]!.result?.stdout, 'Reading lists…\n');
		assert.equal(merged[0]!.status, undefined);
		const final = mergeSocketMessages([
			{ jid: 'j1', client_id: 'c1', result: { stdout: 'partial' } },
			{ jid: 'j1', client_id: 'c1', status: 'successful', result: { stdout: 'full output' } },
			{ jid: 'j1', client_id: 'c1', result: { stdout: 'late chunk' } },
		]);
		assert.equal(final.length, 1);
		assert.equal(final[0]!.status, 'successful');
		assert.equal(final[0]!.result?.stdout, 'full output');
	});
});

describe('mergeRunJobs', () => {
	it('fills in devices only the server lists and prefers final socket results', () => {
		const merged = mergeRunJobs(
			[{ jid: 'j1', client_id: 'c1', status: 'successful', result: { stdout: 'done' } }],
			[
				{ jid: 'j1', client_id: 'c1', status: 'running', started_at: iso(T0) },
				{ jid: 'j2', client_id: 'c2', status: 'running', started_at: iso(T0) },
			],
		);
		assert.equal(merged.length, 2);
		assert.equal(merged.find(j => j.jid === 'j1')?.status, 'successful');
		assert.equal(merged.find(j => j.jid === 'j1')?.result?.stdout, 'done');
		assert.equal(merged.find(j => j.jid === 'j2')?.status, 'running');
	});
	it('keeps live output while the server says running, and the server state once it finished', () => {
		const live: JobLike[] = [{ jid: 'j1', client_id: 'c1', result: { stdout: 'chunk' } }];
		const running = mergeRunJobs<JobLike>(live, [{ jid: 'j1', client_id: 'c1', status: 'running', started_at: iso(T0) }]);
		assert.equal(running[0]!.status, 'running');
		assert.equal(running[0]!.result?.stdout, 'chunk');
		const finished = mergeRunJobs<JobLike>(live, [{ jid: 'j1', client_id: 'c1', status: 'failed', error: 'exit status 1', result: { stdout: 'all' } }]);
		assert.equal(finished[0]!.status, 'failed');
		assert.equal(finished[0]!.result?.stdout, 'all');
	});
});

describe('findStartedRun', () => {
	const runs = [
		{ jid: 'old', started_at: iso(T0 - 120_000), created_by: 'admin' },
		{ jid: 'sched', started_at: iso(T0 + 1000), created_by: 'admin', schedule_id: 's1' },
		{ jid: 'other-user', started_at: iso(T0 + 1000), created_by: 'bob' },
		{ jid: 'mine', started_at: iso(T0 + 2000), created_by: 'admin' },
		{ jid: 'mine-later', started_at: iso(T0 + 9000), created_by: 'admin' },
	];
	it('picks the oldest own, unscheduled run since the start', () => {
		assert.equal(findStartedRun(runs, T0, 'admin'), 'mine');
		assert.equal(findStartedRun(runs, T0, 'admin', new Set(['mine'])), 'mine-later');
		assert.equal(findStartedRun(runs, T0 + 60_000, 'admin'), null);
	});
	it('allows for some clock skew', () => {
		assert.equal(findStartedRun(runs, T0 + 20_000, 'admin'), 'mine');
	});
});
