/**
 * Device list logic: filter matching, sorting, client version comparison and the URL query
 * the filters live in. Pure functions with no Vue or Nuxt imports, so they run under
 * `node --test` (see tests/deviceList.test.ts).
 */

/** The client fields the device list works with (a subset of `Client`). */
export interface DeviceLike {
	id: string;
	name?: string;
	hostname?: string;
	os?: string;
	os_full_name?: string;
	os_kernel?: string;
	version?: string;
	connection_state?: string;
	disconnected_at?: string | Date | null;
	ipv4?: string[] | null;
	groups?: string[] | null;
	tags?: string[] | null;
	updates_status?: { updates_available?: number; security_updates_available?: number } | null;
}

export type StatusFilter = 'any' | 'online' | 'offline';
export type UpdatesFilter = 'any' | 'pending' | 'security' | 'unreported';
export type SortKey = 'name' | 'status' | 'ip' | 'version' | 'groups' | 'updates' | 'security';
export type SortDir = 'asc' | 'desc';
export interface DeviceSort { key: SortKey; dir: SortDir }

export interface DeviceFilters {
	/** Free text, matched against name, ID, hostname, OS, IPs, groups, tags and version. */
	q: string;
	status: StatusFilter;
	/** 'all', 'favorites' or a client group ID. */
	group: string;
	/** Kernels (linux, windows, darwin…); a device matches any of them. */
	platforms: string[];
	/** '' (any), 'outdated' (older than the newest in the fleet) or an exact version. */
	version: string;
	updates: UpdatesFilter;
	/** A device must carry every one of these tags. */
	tags: string[];
}

export const DEFAULT_FILTERS: Readonly<DeviceFilters> = Object.freeze({
	q: '',
	status: 'any',
	group: 'all',
	platforms: [],
	version: '',
	updates: 'any',
	tags: [],
});
export const DEFAULT_SORT: Readonly<DeviceSort> = Object.freeze({ key: 'name', dir: 'asc' });

const STATUS_VALUES: StatusFilter[] = ['any', 'online', 'offline'];
const UPDATES_VALUES: UpdatesFilter[] = ['any', 'pending', 'security', 'unreported'];
const SORT_KEYS: SortKey[] = ['name', 'status', 'ip', 'version', 'groups', 'updates', 'security'];

export function isOnline(client: DeviceLike): boolean {
	if (client.connection_state) return client.connection_state === 'connected';
	return client.disconnected_at == null;
}

// --- versions ------------------------------------------------------------------

interface ParsedVersion { nums: number[]; pre: string }

function parseVersion(value: string | null | undefined): ParsedVersion | null {
	const match = /^\s*v?(\d+(?:\.\d+)*)(?:[-+.]?(.*))?$/i.exec(value ?? '');
	if (!match) return null;
	return { nums: match[1]!.split('.').map(Number), pre: (match[2] ?? '').trim() };
}

/** Compares two pre-release tags part by part, numbers numerically (alpha.2 < alpha.10). */
function comparePre(a: string, b: string): number {
	if (a === b) return 0;
	if (!a) return 1; // a release sorts after its pre-releases
	if (!b) return -1;
	const pa = a.split(/[.-]/);
	const pb = b.split(/[.-]/);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const x = pa[i];
		const y = pb[i];
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		const nx = /^\d+$/.test(x) ? Number(x) : Number.NaN;
		const ny = /^\d+$/.test(y) ? Number(y) : Number.NaN;
		const diff = !Number.isNaN(nx) && !Number.isNaN(ny) ? nx - ny : x.localeCompare(y, undefined, { numeric: true });
		if (diff) return diff;
	}
	return 0;
}

/** Semantic version order; unparseable or missing versions sort below every real one. */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
	const va = parseVersion(a);
	const vb = parseVersion(b);
	if (!va || !vb) return (va ? 1 : 0) - (vb ? 1 : 0);
	for (let i = 0; i < Math.max(va.nums.length, vb.nums.length); i++) {
		const diff = (va.nums[i] ?? 0) - (vb.nums[i] ?? 0);
		if (diff) return diff;
	}
	return comparePre(va.pre, vb.pre);
}

export function newestVersion(versions: (string | null | undefined)[]): string {
	return versions.reduce<string>((best, v) => (v && parseVersion(v) && compareVersions(v, best) > 0 ? v : best), '');
}

/** A known version older than the fleet's newest. */
export function isOutdated(version: string | null | undefined, newest: string): boolean {
	return !!newest && !!parseVersion(version) && compareVersions(version, newest) < 0;
}

// --- filtering -----------------------------------------------------------------

export function platformOf(client: DeviceLike): string {
	return (client.os_kernel || client.os || '').trim().toLowerCase() || 'unknown';
}

export interface MatchContext {
	isFavorite: (id: string) => boolean;
	/** Newest client version in the fleet, for the 'outdated' version filter. */
	newest: string;
}

export function matchesFilters(client: DeviceLike, f: DeviceFilters, ctx: MatchContext): boolean {
	if (f.group === 'favorites' && !ctx.isFavorite(client.id)) return false;
	if (f.group !== 'all' && f.group !== 'favorites' && !(client.groups ?? []).includes(f.group)) return false;
	if (f.status !== 'any' && (f.status === 'online') !== isOnline(client)) return false;
	if (f.platforms.length && !f.platforms.includes(platformOf(client))) return false;
	if (f.version === 'outdated' && !isOutdated(client.version, ctx.newest)) return false;
	if (f.version && f.version !== 'outdated' && client.version !== f.version) return false;
	if (f.updates !== 'any') {
		const status = client.updates_status;
		if (f.updates === 'unreported') {
			if (status) return false;
		}
		else if (!status) return false;
		else if (f.updates === 'pending' && !(status.updates_available ?? 0)) return false;
		else if (f.updates === 'security' && !(status.security_updates_available ?? 0)) return false;
	}
	if (f.tags.length && !f.tags.every(t => (client.tags ?? []).includes(t))) return false;
	const q = f.q.trim().toLowerCase();
	if (q) {
		const haystack = [
			client.name, client.id, client.hostname, client.os_full_name, client.os_kernel, client.os, client.version,
			...(client.ipv4 ?? []), ...(client.groups ?? []), ...(client.tags ?? []),
		].filter(Boolean).join(' ').toLowerCase();
		if (!haystack.includes(q)) return false;
	}
	return true;
}

// --- sorting -------------------------------------------------------------------

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const displayName = (c: DeviceLike) => c.name || c.hostname || c.id;

function ipValue(c: DeviceLike): number | null {
	const ip = c.ipv4?.[0];
	if (!ip) return null;
	const parts = ip.split('.').map(Number);
	if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return null;
	return parts.reduce((n, p) => n * 256 + p, 0);
}

function lastSeen(c: DeviceLike): number {
	const t = c.disconnected_at ? new Date(c.disconnected_at).getTime() : Number.NaN;
	return Number.isNaN(t) ? 0 : t;
}

/**
 * Compares the sort key only. `null` from `missing` means the device has no value and sorts
 * last whichever the direction.
 */
const comparators: Record<SortKey, { missing?: (c: DeviceLike) => boolean; compare: (a: DeviceLike, b: DeviceLike) => number }> = {
	name: { compare: (a, b) => collator.compare(displayName(a), displayName(b)) },
	// Ascending: online first, then offline devices seen most recently.
	status: {
		compare: (a, b) => (Number(isOnline(b)) - Number(isOnline(a))) || (lastSeen(b) - lastSeen(a)),
	},
	ip: { missing: c => ipValue(c) === null, compare: (a, b) => ipValue(a)! - ipValue(b)! },
	version: { missing: c => !parseVersion(c.version), compare: (a, b) => compareVersions(a.version, b.version) },
	groups: {
		missing: c => !c.groups?.length,
		compare: (a, b) => {
			const first = (c: DeviceLike) => [...(c.groups ?? [])].sort(collator.compare)[0]!;
			return collator.compare(first(a), first(b)) || (a.groups!.length - b.groups!.length);
		},
	},
	updates: {
		missing: c => !c.updates_status,
		compare: (a, b) => (a.updates_status!.updates_available ?? 0) - (b.updates_status!.updates_available ?? 0),
	},
	security: {
		missing: c => !c.updates_status,
		compare: (a, b) => ((a.updates_status!.security_updates_available ?? 0) - (b.updates_status!.security_updates_available ?? 0))
			|| ((a.updates_status!.updates_available ?? 0) - (b.updates_status!.updates_available ?? 0)),
	},
};

/** Returns a sorted copy; ties fall back to the device name (A→Z). */
export function sortClients<T extends DeviceLike>(clients: T[], key: SortKey, dir: SortDir): T[] {
	const { missing, compare } = comparators[key];
	const sign = dir === 'asc' ? 1 : -1;
	return [...clients].sort((a, b) => {
		const ma = missing?.(a) ?? false;
		const mb = missing?.(b) ?? false;
		if (ma !== mb) return ma ? 1 : -1;
		const primary = ma ? 0 : sign * compare(a, b);
		return primary || collator.compare(displayName(a), displayName(b));
	});
}

/** The direction a column sorts in when first clicked: counts start with the largest. */
export function defaultSortDir(key: SortKey): SortDir {
	return key === 'updates' || key === 'security' ? 'desc' : 'asc';
}

// --- URL query -----------------------------------------------------------------

type QueryValue = string | null | undefined | (string | null)[];

const first = (v: QueryValue): string => (Array.isArray(v) ? v[0] ?? '' : v ?? '');
const list = (v: QueryValue): string[] => (Array.isArray(v) ? v : first(v).split(','))
	.map(s => (s ?? '').trim()).filter(Boolean);

export function filtersFromQuery(query: Record<string, QueryValue>): { filters: DeviceFilters; sort: DeviceSort } {
	const status = first(query.status) as StatusFilter;
	const updates = first(query.updates) as UpdatesFilter;
	const sortRaw = first(query.sort);
	const sortKey = sortRaw.replace(/^-/, '') as SortKey;
	return {
		filters: {
			q: first(query.q),
			status: STATUS_VALUES.includes(status) ? status : 'any',
			group: first(query.group) || 'all',
			platforms: list(query.os),
			version: first(query.version),
			updates: UPDATES_VALUES.includes(updates) ? updates : 'any',
			tags: list(query.tags),
		},
		sort: SORT_KEYS.includes(sortKey)
			? { key: sortKey, dir: sortRaw.startsWith('-') ? 'desc' : 'asc' }
			: { ...DEFAULT_SORT },
	};
}

/** Query parameters for the filters and sort; defaults are `undefined` (left out of the URL). */
export function filtersToQuery(f: DeviceFilters, sort: DeviceSort): Record<string, string | undefined> {
	const isDefaultSort = sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir;
	return {
		q: f.q || undefined,
		status: f.status === 'any' ? undefined : f.status,
		group: f.group === 'all' ? undefined : f.group,
		os: f.platforms.length ? f.platforms.join(',') : undefined,
		version: f.version || undefined,
		updates: f.updates === 'any' ? undefined : f.updates,
		tags: f.tags.length ? f.tags.join(',') : undefined,
		sort: isDefaultSort ? undefined : `${sort.dir === 'desc' ? '-' : ''}${sort.key}`,
	};
}

// --- active filter chips -------------------------------------------------------

export interface FilterChip {
	key: string;
	label: string;
	field: 'status' | 'group' | 'platforms' | 'version' | 'updates' | 'tags';
	value: string;
}

const UPDATES_LABELS: Record<UpdatesFilter, string> = {
	any: '',
	pending: 'Updates pending',
	security: 'Security updates',
	unreported: 'Updates not reported',
};

/** One removable chip per active filter (the search text is shown by the search box instead). */
export function activeFilterChips(f: DeviceFilters, opts: { platformLabel?: (p: string) => string } = {}): FilterChip[] {
	const chips: FilterChip[] = [];
	if (f.status !== 'any') chips.push({ key: 'status', label: f.status === 'online' ? 'Online' : 'Offline', field: 'status', value: f.status });
	if (f.group !== 'all') chips.push({ key: 'group', label: f.group === 'favorites' ? 'Favorites' : `Group: ${f.group}`, field: 'group', value: f.group });
	for (const p of f.platforms) chips.push({ key: `os:${p}`, label: opts.platformLabel?.(p) ?? p, field: 'platforms', value: p });
	if (f.version) chips.push({ key: 'version', label: f.version === 'outdated' ? 'Outdated client' : `Client ${f.version}`, field: 'version', value: f.version });
	if (f.updates !== 'any') chips.push({ key: 'updates', label: UPDATES_LABELS[f.updates], field: 'updates', value: f.updates });
	for (const t of f.tags) chips.push({ key: `tag:${t}`, label: `Tag: ${t}`, field: 'tags', value: t });
	return chips;
}

export function removeFilterChip(f: DeviceFilters, chip: FilterChip): DeviceFilters {
	switch (chip.field) {
		case 'platforms':
		case 'tags':
			return { ...f, [chip.field]: f[chip.field].filter(v => v !== chip.value) };
		default:
			return { ...f, [chip.field]: DEFAULT_FILTERS[chip.field] };
	}
}

/** Number of filters set beyond search, status and group (the ones in the "Filters" panel). */
export function panelFilterCount(f: DeviceFilters): number {
	return f.platforms.length + (f.version ? 1 : 0) + (f.updates !== 'any' ? 1 : 0) + f.tags.length;
}
