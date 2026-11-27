import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	dayLabel, earliestMeteredSince, eventLabel, fillDays, liveCount, meteredSinceNote, parseServerDetail, parseServerDevices,
	parseServerList, parseServerNode, rolesLabel, serverLink, serverPeriod, sortServers, statusOf, type ServerNode,
} from '../utils/servers.ts';

const NOW = new Date('2026-11-26T12:00:00Z');

const item = (over: Record<string, unknown> = {}) => ({
	node_id: 'usc1-1',
	region: 'us-central1',
	roles: ['api', 'device'],
	version: '0.16.2',
	started_at: '2026-11-20T08:00:00Z',
	heartbeat_at: '2026-11-26T11:59:40Z',
	status: 'live',
	online_devices: 41,
	organizations: 3,
	connects_24h: 12,
	disconnects_24h: 10,
	transfer_today: { in: 100, out: 200 },
	transfer_period: { in: 1000, out: 2000 },
	metered_since: '2026-11-26',
	...over,
});

describe('parseServerNode', () => {
	it('reads a list item', () => {
		assert.deepEqual(parseServerNode(item(), NOW), {
			id: 'usc1-1',
			region: 'us-central1',
			roles: ['api', 'device'],
			version: '0.16.2',
			startedAt: '2026-11-20T08:00:00Z',
			heartbeatAt: '2026-11-26T11:59:40Z',
			status: 'live',
			peerAddress: null,
			onlineDevices: 41,
			organizations: 3,
			connects24h: 12,
			disconnects24h: 10,
			transferToday: { in: 100, out: 200 },
			transferPeriod: { in: 1000, out: 2000 },
			meteredSince: '2026-11-26',
		});
	});
	it('drops a row without a node id', () => {
		assert.equal(parseServerNode({ region: 'x' }, NOW), null);
		assert.equal(parseServerNode('usc1-1', NOW), null);
		assert.equal(parseServerNode(null, NOW), null);
	});
	it('turns missing and mistyped fields into nulls and zeros', () => {
		const n = parseServerNode({ node_id: 'n1', roles: 'api', version: 7, online_devices: '4', transfer_today: null, transfer_period: { in: -5, out: Number.NaN }, metered_since: 'nope' }, NOW);
		assert.equal(n?.region, null);
		assert.deepEqual(n?.roles, []);
		assert.equal(n?.version, null);
		assert.equal(n?.onlineDevices, 0);
		assert.deepEqual(n?.transferToday, { in: 0, out: 0 });
		assert.deepEqual(n?.transferPeriod, { in: 0, out: 0 });
		assert.equal(n?.meteredSince, null);
		assert.equal(n?.status, 'gone');
	});
	it('reads metered_since as a timestamp too, and the peer address when sent', () => {
		const n = parseServerNode(item({ metered_since: '2026-11-25T00:00:00Z', peer_address: '10.0.0.5:8443' }), NOW);
		assert.equal(n?.meteredSince, '2026-11-25');
		assert.equal(n?.peerAddress, '10.0.0.5:8443');
	});
});

describe('statusOf', () => {
	it('keeps a known status', () => {
		assert.equal(statusOf('stale', null, NOW), 'stale');
	});
	it('falls back on the heartbeat age, never guessing live', () => {
		assert.equal(statusOf(undefined, '2026-11-26T11:59:59Z', NOW), 'stale');
		assert.equal(statusOf('weird', '2026-11-24T11:00:00Z', NOW), 'gone');
		assert.equal(statusOf(undefined, null, NOW), 'gone');
		assert.equal(statusOf(undefined, 'garbage', NOW), 'gone');
	});
});

describe('sortServers', () => {
	const n = (id: string, status: string) => parseServerNode({ node_id: id, status }, NOW) as ServerNode;
	it('puts live first, stale next, gone last, by id within each', () => {
		const sorted = sortServers([n('c', 'gone'), n('node-10', 'live'), n('b', 'stale'), n('node-2', 'live'), n('a', 'gone')]);
		assert.deepEqual(sorted.map(x => x.id), ['node-2', 'node-10', 'b', 'a', 'c']);
	});
	it('does not change its input', () => {
		const input = [n('b', 'gone'), n('a', 'live')];
		sortServers(input);
		assert.deepEqual(input.map(x => x.id), ['b', 'a']);
	});
});

describe('parseServerList', () => {
	it('reads the envelope and sorts the nodes', () => {
		const l = parseServerList({ data: {
			nodes: [item({ node_id: 'old', status: 'gone' }), item()],
			totals: { online_devices: 41, transfer_period: { in: 1000, out: 2000 } },
			unassigned_online: 2,
			days: 7,
		} }, 30, NOW);
		assert.deepEqual(l.nodes.map(x => x.id), ['usc1-1', 'old']);
		assert.deepEqual(l.totals, { onlineDevices: 41, transferPeriod: { in: 1000, out: 2000 } });
		assert.equal(l.unassignedOnline, 2);
		assert.equal(l.days, 7);
		assert.equal(liveCount(l.nodes), 1);
	});
	it('sums the totals when they are missing and uses the requested days', () => {
		const l = parseServerList({ data: { nodes: [item(), item({ node_id: 'b', online_devices: 9, transfer_period: { in: 1, out: 2 } }), { nope: 1 }], days: 500 } }, 90, NOW);
		assert.equal(l.nodes.length, 2);
		assert.deepEqual(l.totals, { onlineDevices: 50, transferPeriod: { in: 1001, out: 2002 } });
		assert.equal(l.days, 90);
		assert.equal(l.unassignedOnline, 0);
	});
	it('survives an empty or odd response', () => {
		for (const raw of [null, undefined, 'x', {}, { data: null }, { data: { nodes: 'x' } }]) {
			const l = parseServerList(raw, 30, NOW);
			assert.deepEqual(l.nodes, []);
			assert.deepEqual(l.totals, { onlineDevices: 0, transferPeriod: { in: 0, out: 0 } });
			assert.equal(l.days, 30);
		}
	});
	it('accepts a bare list of nodes', () => {
		assert.equal(parseServerList({ data: [item()] }, 30, NOW).nodes.length, 1);
	});
});

describe('fillDays', () => {
	it('zero-fills the period ending on the server\'s last day', () => {
		const rows = fillDays([{ day: '2026-11-25', in: 5, out: 6, connects: 1, disconnects: 0 }], 3, NOW);
		assert.deepEqual(rows.map(r => r.day), ['2026-11-23', '2026-11-24', '2026-11-25']);
		assert.equal(rows[2]!.in, 5);
		assert.equal(rows[0]!.in, 0);
	});
	it('uses this clock when the server sent no days', () => {
		assert.deepEqual(fillDays([], 2, NOW).map(r => r.day), ['2026-11-25', '2026-11-26']);
	});
	it('adds up a day sent twice', () => {
		const rows = fillDays([
			{ day: '2026-11-26', in: 1, out: 1, connects: 1, disconnects: 1 },
			{ day: '2026-11-26', in: 2, out: 3, connects: 4, disconnects: 5 },
		], 1, NOW);
		assert.deepEqual(rows, [{ day: '2026-11-26', in: 3, out: 4, connects: 5, disconnects: 6 }]);
	});
});

describe('parseServerDetail', () => {
	it('reads the node, daily rows, organizations and events', () => {
		const d = parseServerDetail({ data: {
			node: item(),
			days: 7,
			daily: Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-${20 + i}`, in: i, out: i * 2, connects: i, disconnects: 0 })),
			organizations: [{ organization: 'a', organization_name: 'Alpha', online_devices: 1 }, { organization: 'b', organization_name: '', online_devices: 5 }, { nope: true }],
			events: [
				{ at: '2026-11-26T10:00:00Z', organization: 'a', client_id: 'c1', device_name: 'host-1', event: 'connected' },
				{ at: '2026-11-26T11:00:00Z', organization: 'b', client_id: 'c2', device_name: '', event: 'disconnected' },
				{ at: 'bad', organization: 'b', client_id: 'c3', event: 'connected' },
			],
		} }, 30, NOW);
		assert.equal(d.node?.id, 'usc1-1');
		assert.equal(d.days, 7);
		assert.equal(d.daily.length, 7);
		assert.equal(d.daily[6]!.out, 12);
		assert.deepEqual(d.organizations, [{ id: 'b', name: 'b', onlineDevices: 5 }, { id: 'a', name: 'Alpha', onlineDevices: 1 }]);
		assert.deepEqual(d.events.map(e => e.clientId), ['c2', 'c1']);
		assert.equal(d.events[0]!.deviceName, 'c2');
	});
	it('survives an empty response', () => {
		const d = parseServerDetail({}, 7, NOW);
		assert.equal(d.node, null);
		assert.equal(d.daily.length, 7);
		assert.deepEqual(d.organizations, []);
		assert.deepEqual(d.events, []);
	});
});

describe('parseServerDevices', () => {
	it('reads the paged list with meta.count', () => {
		const p = parseServerDevices({ data: [{ id: 'c1', name: 'host-1', organization: 'acme', organization_name: 'Acme', version: '1.0', os: 'Linux', connected_at: '2026-11-26T10:00:00Z' }, { name: 'no id' }], meta: { count: 120 } }, 50);
		assert.deepEqual(p.devices, [{ id: 'c1', name: 'host-1', organization: 'acme', organizationName: 'Acme', version: '1.0', os: 'Linux', connectedAt: '2026-11-26T10:00:00Z' }]);
		assert.equal(p.count, 120);
	});
	it('reads { devices, total } and defaults names', () => {
		const p = parseServerDevices({ data: { devices: [{ id: 'c1', organization: 'acme' }], total: 3 } });
		assert.equal(p.devices[0]!.name, 'c1');
		assert.equal(p.devices[0]!.organizationName, 'acme');
		assert.equal(p.count, 3);
	});
	it('counts the rows when the server sends no count', () => {
		assert.equal(parseServerDevices({ data: [{ id: 'a' }, { id: 'b' }] }, 50).count, 52);
		assert.deepEqual(parseServerDevices(null), { devices: [], count: 0 });
	});
});

describe('labels', () => {
	it('labels roles', () => {
		assert.equal(rolesLabel(['api', 'device']), 'API, Device');
		assert.equal(rolesLabel(['all']), 'All');
		assert.equal(rolesLabel(['peer']), 'peer');
		assert.equal(rolesLabel([]), '—');
	});
	it('labels events', () => {
		assert.equal(eventLabel('connected'), 'Connected');
		assert.equal(eventLabel('disconnected'), 'Disconnected');
		assert.equal(eventLabel('kicked'), 'kicked');
		assert.equal(eventLabel(''), 'Event');
	});
	it('notes a metered start inside the period only', () => {
		assert.equal(meteredSinceNote('2026-11-20', '2026-10-28'), '2026-11-20');
		assert.equal(meteredSinceNote('2026-10-01', '2026-10-28'), null);
		assert.equal(meteredSinceNote('2026-10-28', '2026-10-28'), null);
		assert.equal(meteredSinceNote(null, '2026-10-28'), null);
	});
	it('finds the earliest metered start', () => {
		const ns = ['2026-11-20', null, '2026-11-10'].map((m, i) => parseServerNode({ node_id: `n${i}`, metered_since: m }, NOW) as ServerNode);
		assert.equal(earliestMeteredSince(ns), '2026-11-10');
		assert.equal(earliestMeteredSince([]), null);
	});
	it('formats days and links', () => {
		assert.equal(dayLabel('2026-11-26'), 'Nov 26, 2026');
		assert.equal(dayLabel('x'), '');
		assert.equal(serverLink('usc1/1'), '/operator/servers/usc1%2F1');
	});
	it('reads a period from the query', () => {
		assert.equal(serverPeriod('7'), 7);
		assert.equal(serverPeriod(['90']), 90);
		assert.equal(serverPeriod('14'), 30);
		assert.equal(serverPeriod(undefined), 30);
	});
});
