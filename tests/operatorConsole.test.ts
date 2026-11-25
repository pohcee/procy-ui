import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	attentionLabel,
	attentionLink,
	billingStatusesOf,
	countAxis,
	dayTick,
	daySeries,
	orgSortDefaultDir,
	filterOrgs,
	inOf,
	invitedByLabel,
	isConsolePath,
	isFailedSignIn,
	lastDays,
	serverNow,
	latest,
	legacyOperatorRedirect,
	monthToDateQuery,
	orgConsoleLink,
	orgTab,
	outOf,
	parseActivity,
	parseConsoleInvitations,
	parseConsoleMembers,
	parseConsoleOrgs,
	parseOrgDevices,
	parseOverview,
	parseStatsReport,
	rangeQuery,
	seriesHasData,
	signInMethodLabel,
	sortAttention,
	sortOrgs,
	sourceLabel,
	timeAgo,
	type AttentionItem,
} from '../utils/operatorConsole.ts';
import { orgLink } from '../utils/usage.ts';

const NOW = new Date('2026-11-25T15:30:00Z');

describe('inOf / outOf', () => {
	it('prefers the server fields', () => {
		assert.equal(inOf({ in: 5, tunnel_bytes_to_device: 100 }), 5);
		assert.equal(outOf({ out: 7, tunnel_bytes_to_user: 100 }), 7);
	});
	it('adds the raw metrics when in/out are missing', () => {
		const t = { tunnel_bytes_to_device: 1, upload_bytes_to_devices: 2, tunnel_bytes_to_user: 10, api_bytes_out: 20 };
		assert.equal(inOf(t), 3);
		assert.equal(outOf(t), 30);
	});
	it('treats junk as 0', () => {
		assert.equal(inOf(null), 0);
		assert.equal(outOf('x'), 0);
		assert.equal(inOf({ in: Number.NaN }), 0);
	});
});

describe('days and ranges', () => {
	it('lists the last n UTC days, oldest first', () => {
		assert.deepEqual(lastDays(3, NOW), ['2026-11-23', '2026-11-24', '2026-11-25']);
		assert.deepEqual(lastDays(0, NOW), []);
	});
	it('maps a range to from/to (next midnight, excluded) and its days', () => {
		const q = rangeQuery('7d', NOW);
		assert.equal(q.from, '2026-11-19');
		assert.equal(q.to, '2026-11-26');
		assert.equal(q.granularity, 'day');
		assert.equal(q.days.length, 7);
		assert.equal(rangeQuery('90d', NOW).days.length, 90);
		assert.equal(rangeQuery('30d', NOW).from, '2026-10-27');
	});
	it('crosses month and year ends', () => {
		const q = rangeQuery('7d', new Date('2027-01-02T00:10:00Z'));
		assert.equal(q.from, '2026-12-27');
		assert.equal(q.to, '2027-01-03');
	});
	it('month to date', () => {
		assert.deepEqual(monthToDateQuery(NOW), { from: '2026-11-01', to: '2026-11-26', granularity: 'day' });
	});
	it('labels ticks with the month on the first tick and the 1st', () => {
		assert.equal(dayTick('2026-10-27', 0), 'Oct 27');
		assert.equal(dayTick('2026-10-28', 1), '28');
		assert.equal(dayTick('2026-11-01', 5), 'Nov 1');
	});
});

describe('daySeries', () => {
	const days = ['2026-11-23', '2026-11-24', '2026-11-25'];
	it('zero-fills every day', () => {
		const s = daySeries([], days);
		assert.deepEqual(s.in, [0, 0, 0]);
		assert.deepEqual(s.devices, [0, 0, 0]);
		assert.equal(seriesHasData(s), false);
	});
	it('places periods by UTC day, adds hours up and keeps the highest device count', () => {
		const s = daySeries([
			{ start: '2026-11-24T00:00:00Z', in: 10, out: 1, devices: 3, jobs_command: 1 },
			{ start: '2026-11-24T05:00:00Z', in: 5, out: 2, devices: 5, jobs_script: 2 },
			{ day: '2026-11-25', in: 1, out: 0, devices: 2, jobs_library: 4 },
			{ start: '2026-11-01T00:00:00Z', in: 999 },
			{ start: 'nope', in: 999 },
			null,
		], days);
		assert.deepEqual(s.in, [0, 15, 1]);
		assert.deepEqual(s.out, [0, 3, 0]);
		assert.deepEqual(s.devices, [0, 5, 2]);
		assert.deepEqual(s.jobsCommand, [0, 1, 0]);
		assert.deepEqual(s.jobsScript, [0, 2, 0]);
		assert.deepEqual(s.jobsLibrary, [0, 0, 4]);
		assert.equal(seriesHasData(s), true);
	});
	it('derives in/out from raw metrics in periods', () => {
		const s = daySeries([{ start: '2026-11-23T00:00:00Z', tunnel_bytes_to_device: 4, upload_bytes_to_devices: 1, tunnel_bytes_to_user: 7, api_bytes_out: 3 }], days);
		assert.deepEqual(s.in, [5, 0, 0]);
		assert.deepEqual(s.out, [10, 0, 0]);
	});
	it('accepts non-arrays', () => {
		assert.deepEqual(daySeries(null, days).in, [0, 0, 0]);
	});
});

describe('countAxis', () => {
	it('gives at least one per step', () => {
		assert.deepEqual(countAxis(0), { max: 4, step: 1 });
		assert.deepEqual(countAxis(3), { max: 4, step: 1 });
	});
	it('rounds to 1/2/5 steps', () => {
		assert.deepEqual(countAxis(17), { max: 20, step: 5 });
		assert.deepEqual(countAxis(130), { max: 200, step: 50 });
	});
});

describe('parseOverview', () => {
	it('reads the contract shape', () => {
		const o = parseOverview({ data: {
			generated_at: '2026-11-25T15:00:00Z',
			organizations: { total: 12, active: 10, suspended: 2, trial: 3 },
			devices: { online: 40, total: 55 },
			metering: true,
			transfer: { last_24h: { in: 1, out: 2 }, last_30d: { in: 3, out: 4 } },
			signups_awaiting: 2,
			oldest_signup_waiting_since: '2026-11-24T00:00:00Z',
			invitations_pending: 4,
			attention: [
				{ kind: 'trial_ending', severity: 'warning', organization: { id: 'b', name: 'B' }, message: 'Trial ends in 2 days' },
				{ kind: 'device_limit', severity: 'critical', organization: { id: 'a', name: 'A' }, message: '10 of 10 devices', value: 10, limit: 10 },
				{ kind: 'signup_waiting', severity: 'warning', message: '1 signup waiting' },
				{ severity: 'critical' },
			],
			series: [{ day: '2026-10-27', in: 0, out: 0, devices: 0 }],
		} });
		assert.equal(o.organizations.trial, 3);
		assert.equal(o.devices.online, 40);
		assert.equal(o.metering, true);
		assert.deepEqual(o.transfer, { last24h: { in: 1, out: 2 }, last30d: { in: 3, out: 4 } });
		assert.equal(o.signupsAwaiting, 2);
		assert.equal(o.invitationsPending, 4);
		assert.equal(o.attention.length, 3);
		assert.equal(o.attention[0].kind, 'device_limit');
		assert.equal(o.attention[2].organization, null);
		assert.equal(o.series?.length, 1);
	});
	it('without metering or signup: nulls', () => {
		const o = parseOverview({ data: { metering: false, transfer: null, series: null, signups_awaiting: null } });
		assert.equal(o.metering, false);
		assert.equal(o.transfer, null);
		assert.equal(o.series, null);
		assert.equal(o.signupsAwaiting, null);
	});
	it('survives an empty or broken body', () => {
		const o = parseOverview(undefined);
		assert.equal(o.organizations.total, 0);
		assert.deepEqual(o.attention, []);
		assert.equal(o.metering, false);
	});
});

describe('attention', () => {
	const item = (kind: string, severity: AttentionItem['severity'], org: string | null = 'acme'): AttentionItem =>
		({ kind, severity, organization: org ? { id: org, name: org } : null, message: '', value: null, limit: null });
	it('sorts most severe first and keeps the server order within a severity', () => {
		const sorted = sortAttention([item('a', 'warning'), item('b', 'info'), item('c', 'critical'), item('d', 'warning')]);
		assert.deepEqual(sorted.map(i => i.kind), ['c', 'a', 'd', 'b']);
	});
	it('labels kinds', () => {
		assert.equal(attentionLabel('device_limit'), 'Device limit');
		assert.equal(attentionLabel('devices_drop'), 'Devices dropped');
		assert.equal(attentionLabel('new_thing'), 'New thing');
		assert.equal(attentionLabel(''), 'Notice');
	});
	it('links to the tab that explains it', () => {
		assert.equal(attentionLink(item('transfer_cap', 'critical')), '/operator/organizations/acme?tab=billing');
		assert.equal(attentionLink(item('trial_ending', 'warning')), '/operator/organizations/acme?tab=billing');
		assert.equal(attentionLink(item('devices_drop', 'warning')), '/operator/organizations/acme?tab=devices');
		assert.equal(attentionLink(item('device_limit', 'warning')), '/operator/organizations/acme?tab=settings');
		assert.equal(attentionLink(item('signup_waiting', 'warning', null)), '/operator/signups');
		assert.equal(attentionLink(item('other', 'info', null)), null);
	});
});

describe('links and tabs', () => {
	it('builds console links', () => {
		assert.equal(orgConsoleLink('acme'), '/operator/organizations/acme');
		assert.equal(orgConsoleLink('acme', 'members'), '/operator/organizations/acme?tab=members');
		assert.equal(orgLink('acme'), '/operator/organizations/acme');
	});
	it('reads the tab query', () => {
		assert.equal(orgTab('devices'), 'devices');
		assert.equal(orgTab(['activity']), 'activity');
		assert.equal(orgTab('bogus'), 'overview');
		assert.equal(orgTab(undefined), 'overview');
	});
	it('knows console paths', () => {
		assert.equal(isConsolePath('/operator'), true);
		assert.equal(isConsolePath('/Operator/organizations/x'), true);
		assert.equal(isConsolePath('/operators'), false);
		assert.equal(isConsolePath('/dashboard'), false);
	});
});

describe('legacyOperatorRedirect', () => {
	it('maps the organization detail query to a path', () => {
		assert.deepEqual(legacyOperatorRedirect('/organizations', { id: 'acme' }), { path: '/operator/organizations/acme', query: {} });
		assert.deepEqual(legacyOperatorRedirect('/Organizations/', { id: ['acme'], x: '1' }), { path: '/operator/organizations/acme', query: { x: '1' } });
	});
	it('maps the list and the moved pages, keeping the query', () => {
		assert.deepEqual(legacyOperatorRedirect('/organizations'), { path: '/operator/organizations', query: {} });
		assert.deepEqual(legacyOperatorRedirect('/platform-usage', { month: '2026-10' }), { path: '/operator/usage', query: { month: '2026-10' } });
		assert.equal(legacyOperatorRedirect('/Platform-Billing')?.path, '/operator/billing');
		assert.equal(legacyOperatorRedirect('/signups')?.path, '/operator/signups');
		assert.equal(legacyOperatorRedirect('/deletions')?.path, '/operator/deletions');
	});
	it('leaves other paths alone', () => {
		assert.equal(legacyOperatorRedirect('/organization'), null);
		assert.equal(legacyOperatorRedirect('/usage'), null);
		assert.equal(legacyOperatorRedirect('/operator/organizations'), null);
		assert.equal(legacyOperatorRedirect('/signup'), null);
	});
});

describe('organization list', () => {
	const raw = { data: [
		{ id: 'b', name: 'Bravo', status: 'active', created_at: '2026-01-02T00:00:00Z', device_count: 5, device_limit: 10, user_count: 2,
			stats: { devices_online: 3, transfer_in: 100, transfer_out: 50, jobs: 1, last_device_at: '2026-11-20T00:00:00Z', last_login_at: '2026-11-24T00:00:00Z', source: 'signup' },
			billing: { plan: 'starter', status: 'trial', transfer_state: 'normal', trial_ends_at: '2026-12-01T00:00:00Z' } },
		{ id: 'a', name: 'Alpha', status: 'suspended', created_at: '2026-03-01T00:00:00Z', device_count: 1, device_limit: null, user_count: 9,
			stats: { devices_online: 0, transfer_in: null, transfer_out: null, jobs: null, source: 'operator' } },
		{ id: 'c', status: 'active', created_at: 'bad', device_count: 2, user_count: 1, billing: { plan: 'free', status: 'paying' } },
		{ name: 'no id' },
	] };
	const rows = parseConsoleOrgs(raw);

	it('parses rows and tolerates missing stats/billing', () => {
		assert.equal(rows.length, 3);
		assert.equal(rows[0].stats?.lastActivityAt, '2026-11-24T00:00:00Z');
		assert.equal(rows[1].billing, null);
		assert.equal(rows[2].stats, null);
		assert.equal(rows[2].name, 'c');
		assert.equal(rows[2].device_limit, null);
	});
	it('sorts by text and numbers, missing values last either way', () => {
		assert.deepEqual(sortOrgs(rows, 'name', 'asc').map(r => r.id), ['a', 'b', 'c']);
		assert.deepEqual(sortOrgs(rows, 'users', 'desc').map(r => r.id), ['a', 'b', 'c']);
		assert.deepEqual(sortOrgs(rows, 'transfer_in', 'desc').map(r => r.id), ['b', 'a', 'c']);
		assert.deepEqual(sortOrgs(rows, 'transfer_in', 'asc').map(r => r.id), ['b', 'a', 'c']);
		assert.deepEqual(sortOrgs(rows, 'created', 'asc').map(r => r.id), ['b', 'a', 'c']);
		assert.deepEqual(sortOrgs(rows, 'plan', 'asc').map(r => r.id), ['c', 'b', 'a']);
	});
	it('default directions', () => {
		assert.equal(orgSortDefaultDir('name'), 'asc');
		assert.equal(orgSortDefaultDir('transfer_out'), 'desc');
	});
	it('filters by search, status and billing', () => {
		assert.deepEqual(filterOrgs(rows, { q: 'alp' }).map(r => r.id), ['a']);
		assert.deepEqual(filterOrgs(rows, { q: 'C' }).map(r => r.id), ['c']);
		assert.deepEqual(filterOrgs(rows, { status: 'active' }).map(r => r.id), ['b', 'c']);
		assert.deepEqual(filterOrgs(rows, { billing: 'trial' }).map(r => r.id), ['b']);
		assert.deepEqual(filterOrgs(rows, { status: 'all', billing: 'all', q: '' }).length, 3);
	});
	it('lists billing statuses in a fixed order', () => {
		assert.deepEqual(billingStatusesOf(rows), ['trial', 'paying']);
	});
	it('labels sources', () => {
		assert.equal(sourceLabel('signup'), 'Signup');
		assert.equal(sourceLabel(null), '—');
	});
	it('latest of two timestamps', () => {
		assert.equal(latest(null, null), null);
		assert.equal(latest('2026-01-01T00:00:00Z', null), '2026-01-01T00:00:00Z');
		assert.equal(latest('2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'), '2026-02-01T00:00:00Z');
	});
});

describe('parseStatsReport', () => {
	it('reads totals with in/out and devices', () => {
		const r = parseStatsReport({ data: { periods: [{ start: '2026-11-25T00:00:00Z', in: 1 }], totals: { in: 10, out: 20, devices: 4, jobs_run: 6, jobs_command: 3, jobs_script: 2, jobs_library: 1 } } });
		assert.equal(r.metering, true);
		assert.equal(r.periods.length, 1);
		assert.deepEqual(r.totals, { in: 10, out: 20, devices: 4, jobs: 6, jobsCommand: 3, jobsScript: 2, jobsLibrary: 1 });
	});
	it('metering off', () => {
		assert.deepEqual(parseStatsReport({ data: { metering: false, periods: [] } }), { metering: false, periods: [], totals: null });
		assert.deepEqual(parseStatsReport({ metering: false }), { metering: false, periods: [], totals: null });
	});
	it('without totals', () => {
		assert.equal(parseStatsReport({ data: {} }).totals, null);
	});
});

describe('parseOrgDevices', () => {
	it('reads the contract shape', () => {
		const d = parseOrgDevices({ data: { total: 2, online: 1,
			devices: [{ id: 'd1', name: 'One', online: true, node_id: 'n1', version: '0.15.0', os: 'Ubuntu 24.04', last_seen_at: 'x' }, { id: 'd2' }],
			by_version: [{ value: '0.14.0', count: 1 }, { value: '0.15.0', count: 3 }], by_os: [] } });
		assert.equal(d.total, 2);
		assert.equal(d.devices[1].name, 'd2');
		assert.equal(d.devices[1].online, false);
		assert.equal(d.byVersion[0].value, '0.15.0');
		assert.deepEqual(d.byOs, []);
	});
	it('counts itself when aggregates are missing', () => {
		const d = parseOrgDevices({ data: { devices: [{ id: 'a', online: true, version: '1' }, { id: 'b', version: '1' }, { id: 'c' }] } });
		assert.equal(d.total, 3);
		assert.equal(d.online, 1);
		assert.deepEqual(d.byVersion, [{ value: '1', count: 2 }, { value: 'Unknown', count: 1 }]);
	});
	it('empty body', () => {
		assert.deepEqual(parseOrgDevices(null), { total: 0, online: 0, devices: [], byVersion: [], byOs: [] });
	});
});

describe('members and sign-in', () => {
	it('parses members with the new fields', () => {
		const list = parseConsoleMembers({ data: [
			{ username: 'zed', groups: ['Administrators'], organizations: 2, sign_in: 'both', has_password: true, oidc_linked: false, two_fa: true, last_login_at: '2026-11-25T00:00:00Z' },
			{ username: 'amy' },
			{ groups: [] },
		] });
		assert.deepEqual(list.map(m => m.username), ['amy', 'zed']);
		assert.equal(list[0].hasPassword, null);
		assert.equal(list[0].organizations, 1);
		assert.equal(list[1].twoFa, true);
	});
	const m = (signIn: string, hasPassword: boolean | null, oidcLinked: boolean | null) => ({ signIn, hasPassword, oidcLinked });
	it('labels the sign-in method', () => {
		assert.equal(signInMethodLabel(m('oidc', true, true)), 'Google');
		assert.equal(signInMethodLabel(m('password', true, true)), 'Password');
		assert.equal(signInMethodLabel(m('both', true, true)), 'Password or Google');
		assert.equal(signInMethodLabel(m('both', true, false)), 'Password');
		assert.equal(signInMethodLabel(m('both', false, true)), 'Google');
		assert.equal(signInMethodLabel(m('both', null, null)), 'Password or Google');
		assert.equal(signInMethodLabel(m('', true, true)), 'Password or Google');
		assert.equal(signInMethodLabel(m('', null, null)), '');
		assert.equal(signInMethodLabel(m('both', true, false), true), 'Google');
	});
});

describe('invitations', () => {
	it('parses and sorts newest first', () => {
		const list = parseConsoleInvitations({ data: [
			{ organization: 'a', organization_name: 'A', username: 'x', groups: ['G'], invited_by: 'operator:op', created_at: '2026-11-01T00:00:00Z' },
			{ organization: 'b', username: 'y', created_at: '2026-11-20T00:00:00Z' },
			{ organization: 'c' },
		] });
		assert.deepEqual(list.map(i => i.username), ['y', 'x']);
		assert.equal(list[0].organizationName, 'b');
	});
	it('labels the inviter', () => {
		assert.equal(invitedByLabel('operator:op'), 'op (operator)');
		assert.equal(invitedByLabel('admin'), 'admin');
		assert.equal(invitedByLabel(''), '—');
	});
});

describe('parseActivity', () => {
	const entry = { id: 7, timestamp: '2026-11-25T00:00:00Z', source: 'operator', application: 'auth.login', action: 'failed', username: 'u', remote_ip: '192.0.2.1', affected_id: 'acme' };
	it('reads { data, next }', () => {
		const p = parseActivity({ data: [entry, { id: 1 }], next: 'c1' });
		assert.equal(p.entries.length, 1);
		assert.equal(p.entries[0].id, '7');
		assert.equal(p.entries[0].remoteIp, '192.0.2.1');
		assert.equal(p.next, 'c1');
		assert.equal(isFailedSignIn(p.entries[0]), true);
	});
	it('reads nested and meta cursors', () => {
		assert.equal(parseActivity({ data: { entries: [entry], next: 'n' } }).next, 'n');
		assert.equal(parseActivity({ data: [entry], meta: { next: 42 } }).next, '42');
		assert.equal(parseActivity({ data: [entry], next: null }).next, null);
		assert.equal(parseActivity([entry]).entries.length, 1);
	});
});

describe('timeAgo', () => {
	it('reads relative times', () => {
		assert.equal(timeAgo(null, NOW), '—');
		assert.equal(timeAgo('bad', NOW), '—');
		assert.equal(timeAgo('2026-11-25T15:29:40Z', NOW), 'just now');
		assert.equal(timeAgo('2026-11-25T15:00:00Z', NOW), '30 min ago');
		assert.equal(timeAgo('2026-11-25T10:30:00Z', NOW), '5 h ago');
		assert.equal(timeAgo('2026-11-24T12:00:00Z', NOW), '1 day ago');
		assert.equal(timeAgo('2026-11-21T12:00:00Z', NOW), '4 days ago');
		assert.equal(timeAgo('2026-01-02T12:00:00Z', NOW), 'Jan 2, 2026');
		assert.equal(timeAgo('2026-11-26T12:00:00Z', NOW), 'just now');
	});
});

describe('serverNow', () => {
	it('takes the server clock when it is known, else the fallback', () => {
		const fallback = new Date('2026-11-25T23:59:00Z');
		assert.equal(serverNow('2026-11-26T00:01:00Z', fallback).toISOString(), '2026-11-26T00:01:00.000Z');
		assert.equal(serverNow(null, fallback), fallback);
		assert.equal(serverNow('garbage', fallback), fallback);
	});
});
