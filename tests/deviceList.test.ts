import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	DEFAULT_FILTERS,
	activeFilterChips,
	compareVersions,
	defaultSortDir,
	filtersFromQuery,
	filtersToQuery,
	isOutdated,
	matchesFilters,
	newestVersion,
	platformOf,
	removeFilterChip,
	sortClients,
	type DeviceFilters,
	type DeviceLike,
} from '../utils/deviceList.ts';

const device = (over: Partial<DeviceLike> = {}): DeviceLike => ({
	id: 'id-1',
	name: 'alpha',
	os_kernel: 'linux',
	connection_state: 'connected',
	disconnected_at: null,
	ipv4: ['10.0.0.1'],
	groups: [],
	tags: [],
	...over,
});

const filters = (over: Partial<DeviceFilters> = {}): DeviceFilters => ({ ...DEFAULT_FILTERS, ...over });
const ctx = { isFavorite: (id: string) => id === 'fav', newest: '0.14.2' };

describe('compareVersions', () => {
	it('compares numerically, not as strings', () => {
		assert.equal(compareVersions('0.9.12', '0.14.2') < 0, true);
		assert.equal(compareVersions('0.14.2', '0.9.12') > 0, true);
		assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
	});
	it('treats missing parts as zero and ignores a v prefix', () => {
		assert.equal(compareVersions('v1.2', '1.2.0'), 0);
		assert.equal(compareVersions('1.2', '1.2.1') < 0, true);
	});
	it('orders a pre-release before its release', () => {
		assert.equal(compareVersions('0.14.2-alpha.1', '0.14.2') < 0, true);
		assert.equal(compareVersions('0.14.2', '0.14.2-rc1') > 0, true);
		assert.equal(compareVersions('0.14.2-alpha.2', '0.14.2-alpha.10') < 0, true);
	});
	it('sorts unknown versions below known ones', () => {
		assert.equal(compareVersions('', '0.1.0') < 0, true);
		assert.equal(compareVersions(undefined, undefined), 0);
		assert.equal(compareVersions('unknown', '0.0.1') < 0, true);
	});
});

describe('newestVersion / isOutdated', () => {
	it('finds the newest version in the fleet', () => {
		assert.equal(newestVersion(['0.9.12', '0.14.2', '', undefined, '0.14.2-alpha.1', '0.10.0']), '0.14.2');
		assert.equal(newestVersion([]), '');
	});
	it('flags versions older than the newest', () => {
		assert.equal(isOutdated('0.9.12', '0.14.2'), true);
		assert.equal(isOutdated('0.14.2', '0.14.2'), false);
		assert.equal(isOutdated('', '0.14.2'), false);
		assert.equal(isOutdated('0.9.12', ''), false);
	});
});

describe('platformOf', () => {
	it('uses the kernel, lower-cased', () => {
		assert.equal(platformOf(device({ os_kernel: 'Windows' })), 'windows');
		assert.equal(platformOf(device({ os_kernel: '', os: 'darwin' })), 'darwin');
		assert.equal(platformOf(device({ os_kernel: '', os: '' })), 'unknown');
	});
});

describe('matchesFilters', () => {
	it('matches everything with the default filters', () => {
		assert.equal(matchesFilters(device(), filters(), ctx), true);
	});
	it('filters by status', () => {
		const off = device({ connection_state: 'disconnected', disconnected_at: '2026-01-01T00:00:00Z' });
		assert.equal(matchesFilters(off, filters({ status: 'online' }), ctx), false);
		assert.equal(matchesFilters(off, filters({ status: 'offline' }), ctx), true);
	});
	it('filters by group and favorites', () => {
		assert.equal(matchesFilters(device({ groups: ['a'] }), filters({ group: 'a' }), ctx), true);
		assert.equal(matchesFilters(device({ groups: ['b'] }), filters({ group: 'a' }), ctx), false);
		assert.equal(matchesFilters(device({ id: 'fav' }), filters({ group: 'favorites' }), ctx), true);
		assert.equal(matchesFilters(device(), filters({ group: 'favorites' }), ctx), false);
	});
	it('filters by platform (any of)', () => {
		const f = filters({ platforms: ['windows', 'darwin'] });
		assert.equal(matchesFilters(device({ os_kernel: 'windows' }), f, ctx), true);
		assert.equal(matchesFilters(device(), f, ctx), false);
	});
	it('filters by client version, exact or outdated', () => {
		assert.equal(matchesFilters(device({ version: '0.9.12' }), filters({ version: 'outdated' }), ctx), true);
		assert.equal(matchesFilters(device({ version: '0.14.2' }), filters({ version: 'outdated' }), ctx), false);
		assert.equal(matchesFilters(device({ version: '0.14.2' }), filters({ version: '0.14.2' }), ctx), true);
		assert.equal(matchesFilters(device({ version: '0.9.1' }), filters({ version: '0.14.2' }), ctx), false);
	});
	it('filters by updates', () => {
		const none = device();
		const pending = device({ updates_status: { updates_available: 3, security_updates_available: 0 } });
		const sec = device({ updates_status: { updates_available: 3, security_updates_available: 1 } });
		const zero = device({ updates_status: { updates_available: 0, security_updates_available: 0 } });
		assert.deepEqual([none, pending, sec, zero].map(d => matchesFilters(d, filters({ updates: 'pending' }), ctx)), [false, true, true, false]);
		assert.deepEqual([none, pending, sec, zero].map(d => matchesFilters(d, filters({ updates: 'security' }), ctx)), [false, false, true, false]);
		assert.deepEqual([none, pending, sec, zero].map(d => matchesFilters(d, filters({ updates: 'unreported' }), ctx)), [true, false, false, false]);
	});
	it('requires every selected tag', () => {
		const f = filters({ tags: ['prod', 'eu'] });
		assert.equal(matchesFilters(device({ tags: ['prod', 'eu', 'x'] }), f, ctx), true);
		assert.equal(matchesFilters(device({ tags: ['prod'] }), f, ctx), false);
	});
	it('searches name, id, IP, groups, tags, OS and version', () => {
		const d = device({ name: 'Web-01', id: 'abc', ipv4: ['192.168.1.5'], groups: ['edge'], tags: ['blue'], os_full_name: 'Ubuntu 22.04', version: '0.14.2' });
		for (const q of ['web', 'ABC', '192.168', 'edge', 'blue', 'ubuntu', '0.14']) {
			assert.equal(matchesFilters(d, filters({ q }), ctx), true, q);
		}
		assert.equal(matchesFilters(d, filters({ q: 'nomatch' }), ctx), false);
	});
});

describe('sortClients', () => {
	const names = (list: DeviceLike[]) => list.map(d => d.name);

	it('sorts by name naturally, both directions', () => {
		const list = [device({ name: 'web-10' }), device({ name: 'web-2' }), device({ name: 'Alpha' })];
		assert.deepEqual(names(sortClients(list, 'name', 'asc')), ['Alpha', 'web-2', 'web-10']);
		assert.deepEqual(names(sortClients(list, 'name', 'desc')), ['web-10', 'web-2', 'Alpha']);
	});
	it('does not mutate the input', () => {
		const list = [device({ name: 'b' }), device({ name: 'a' })];
		sortClients(list, 'name', 'asc');
		assert.deepEqual(names(list), ['b', 'a']);
	});
	it('sorts status: online first, then most recently seen', () => {
		const list = [
			device({ name: 'old', connection_state: 'disconnected', disconnected_at: '2026-01-01T00:00:00Z' }),
			device({ name: 'on' }),
			device({ name: 'recent', connection_state: 'disconnected', disconnected_at: '2026-06-01T00:00:00Z' }),
		];
		assert.deepEqual(names(sortClients(list, 'status', 'asc')), ['on', 'recent', 'old']);
		assert.deepEqual(names(sortClients(list, 'status', 'desc')), ['old', 'recent', 'on']);
	});
	it('sorts IPv4 numerically with missing addresses last', () => {
		const list = [device({ name: 'c', ipv4: ['10.0.0.20'] }), device({ name: 'none', ipv4: [] }), device({ name: 'a', ipv4: ['10.0.0.3'] }), device({ name: 'b', ipv4: ['9.1.1.1'] })];
		assert.deepEqual(names(sortClients(list, 'ip', 'asc')), ['b', 'a', 'c', 'none']);
		assert.deepEqual(names(sortClients(list, 'ip', 'desc')), ['c', 'a', 'b', 'none']);
	});
	it('sorts by semantic client version with unknown last', () => {
		const list = [device({ name: 'n', version: '0.14.2' }), device({ name: 'u' }), device({ name: 'o', version: '0.9.12' }), device({ name: 'm', version: '0.10.0' })];
		assert.deepEqual(names(sortClients(list, 'version', 'asc')), ['o', 'm', 'n', 'u']);
		assert.deepEqual(names(sortClients(list, 'version', 'desc')), ['n', 'm', 'o', 'u']);
	});
	it('sorts by first group alphabetically, devices without groups last', () => {
		const list = [device({ name: 'x', groups: ['zeta'] }), device({ name: 'y', groups: [] }), device({ name: 'z', groups: ['beta', 'alpha'] })];
		assert.deepEqual(names(sortClients(list, 'groups', 'asc')), ['z', 'x', 'y']);
		assert.deepEqual(names(sortClients(list, 'groups', 'desc')), ['x', 'z', 'y']);
	});
	it('sorts by pending and security counts, unreported last', () => {
		const list = [
			device({ name: 'few', updates_status: { updates_available: 2, security_updates_available: 2 } }),
			device({ name: 'unrep' }),
			device({ name: 'many', updates_status: { updates_available: 9, security_updates_available: 0 } }),
		];
		assert.deepEqual(names(sortClients(list, 'updates', 'desc')), ['many', 'few', 'unrep']);
		assert.deepEqual(names(sortClients(list, 'security', 'desc')), ['few', 'many', 'unrep']);
		assert.deepEqual(names(sortClients(list, 'updates', 'asc')), ['few', 'many', 'unrep']);
	});
	it('breaks ties by name', () => {
		const list = [device({ name: 'b', version: '1.0.0' }), device({ name: 'a', version: '1.0.0' })];
		assert.deepEqual(names(sortClients(list, 'version', 'desc')), ['a', 'b']);
	});
	it('starts numeric columns descending', () => {
		assert.equal(defaultSortDir('updates'), 'desc');
		assert.equal(defaultSortDir('security'), 'desc');
		assert.equal(defaultSortDir('name'), 'asc');
	});
});

describe('URL query round trip', () => {
	it('omits defaults', () => {
		assert.deepEqual(filtersToQuery(filters(), { key: 'name', dir: 'asc' }), {
			q: undefined, status: undefined, group: undefined, os: undefined, version: undefined, updates: undefined, tags: undefined, sort: undefined,
		});
	});
	it('round-trips every filter and the sort', () => {
		const f = filters({ q: 'web', status: 'online', group: 'edge', platforms: ['linux', 'windows'], version: 'outdated', updates: 'security', tags: ['a', 'b'] });
		const query = filtersToQuery(f, { key: 'version', dir: 'desc' });
		assert.equal(query.sort, '-version');
		assert.deepEqual(filtersFromQuery(query), { filters: f, sort: { key: 'version', dir: 'desc' } });
	});
	it('ignores invalid values', () => {
		const parsed = filtersFromQuery({ status: 'bogus', updates: 'x', sort: '-nope', os: ['linux', 'darwin'] });
		assert.equal(parsed.filters.status, 'any');
		assert.equal(parsed.filters.updates, 'any');
		assert.deepEqual(parsed.filters.platforms, ['linux', 'darwin']);
		assert.deepEqual(parsed.sort, { key: 'name', dir: 'asc' });
	});
});

describe('active filter chips', () => {
	it('lists each active filter and removes one at a time', () => {
		const f = filters({ status: 'offline', group: 'edge', platforms: ['linux'], version: 'outdated', updates: 'pending', tags: ['a', 'b'] });
		const chips = activeFilterChips(f, { platformLabel: p => p.toUpperCase() });
		assert.deepEqual(chips.map(c => c.label), ['Offline', 'Group: edge', 'LINUX', 'Outdated client', 'Updates pending', 'Tag: a', 'Tag: b']);
		const without = removeFilterChip(f, chips.find(c => c.label === 'Tag: a')!);
		assert.deepEqual(without.tags, ['b']);
		assert.equal(removeFilterChip(f, chips[0]!).status, 'any');
		assert.equal(removeFilterChip(f, chips[1]!).group, 'all');
	});
	it('labels favorites and exact versions', () => {
		const chips = activeFilterChips(filters({ group: 'favorites', version: '0.9.1' }));
		assert.deepEqual(chips.map(c => c.label), ['Favorites', 'Client 0.9.1']);
	});
	it('does not include the search text (the search box shows it)', () => {
		assert.deepEqual(activeFilterChips(filters({ q: 'x' })), []);
	});
});
