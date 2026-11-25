/**
 * The operator console (/operator/...): parsers for the operator API's console endpoints (overview, organization
 * list with stats, organization stats, devices, members, invitations, activity), chart series shaping, table sort
 * and filter, the "needs attention" list, ranges and the redirects of the old operator URLs.
 * Shapes follow the contract in docs/superpowers/plans/2026-11-25-operator-console.md (umbrella repo). Every parser
 * is tolerant: missing or mistyped fields become null/0/[] rather than errors, so an older or newer server still
 * renders. Pure functions with no Vue or Nuxt imports, tested in tests/operatorConsole.test.ts.
 */

// ---- small readers ----

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const boolOrNull = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);
/** `{ data: X }` → X; anything else as it is. */
const unwrap = (raw: unknown): unknown => {
	const o = obj(raw);
	return o && 'data' in o ? o.data : raw;
};
const listOf = (raw: unknown): unknown[] => {
	if (Array.isArray(raw)) return raw;
	const d = unwrap(raw);
	return Array.isArray(d) ? d : [];
};

// ---- transfer directions ----

/** Bytes to and from devices. */
export interface InOut {
	in: number;
	out: number;
}

/**
 * In (to devices) of a usage period or totals: the server's `in`, or tunnel bytes to devices + uploads read by
 * devices when it isn't there.
 */
export const inOf = (t: unknown): number => {
	const o = obj(t);
	if (!o) return 0;
	if (typeof o.in === 'number' && Number.isFinite(o.in)) return o.in;
	return num(o.tunnel_bytes_to_device) + num(o.upload_bytes_to_devices);
};

/** Out (from devices): the server's `out`, or tunnel bytes to users + API bytes out. */
export const outOf = (t: unknown): number => {
	const o = obj(t);
	if (!o) return 0;
	if (typeof o.out === 'number' && Number.isFinite(o.out)) return o.out;
	return num(o.tunnel_bytes_to_user) + num(o.api_bytes_out);
};

const inOut = (v: unknown): InOut | null => {
	const o = obj(v);
	return o ? { in: num(o.in), out: num(o.out) } : null;
};

// ---- days (UTC) ----

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The UTC day of a date as YYYY-MM-DD. */
export const utcDay = (d: Date): string => d.toISOString().slice(0, 10);

/** The `n` UTC days ending today (oldest first). */
export const lastDays = (n: number, now: Date = new Date()): string[] => {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => utcDay(new Date(today - (n - 1 - i) * DAY_MS)));
};

/** The day (YYYY-MM-DD) of a period start or a day string, or null. */
const dayOf = (v: unknown): string | null => {
	const s = str(v);
	if (DAY_RE.test(s)) return s;
	const t = new Date(s);
	return s && !Number.isNaN(t.getTime()) ? utcDay(t) : null;
};

export type StatsRange = '7d' | '30d' | '90d';
export const STATS_RANGES: { value: StatsRange; label: string; days: number }[] = [
	{ value: '7d', label: '7 days', days: 7 },
	{ value: '30d', label: '30 days', days: 30 },
	{ value: '90d', label: '90 days', days: 90 },
];

export const isStatsRange = (v: unknown): v is StatsRange => STATS_RANGES.some(r => r.value === v);

/**
 * Query of GET …/stats for a range: the last n UTC days including today, `to` the next midnight (excluded), daily.
 */
export const rangeQuery = (range: StatsRange, now: Date = new Date()): { from: string; to: string; granularity: 'day'; days: string[] } => {
	const n = STATS_RANGES.find(r => r.value === range)?.days ?? 30;
	const days = lastDays(n, now);
	const tomorrow = utcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY_MS));
	return { from: days[0], to: tomorrow, granularity: 'day', days };
};

/** GET …/stats from the first day of the current UTC month to the next midnight ("this month"). */
export const monthToDateQuery = (now: Date = new Date()): { from: string; to: string; granularity: 'day' } => {
	const from = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
	const to = utcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY_MS));
	return { from, to, granularity: 'day' };
};

// ---- chart series ----

export interface DaySeries {
	days: string[];
	in: number[];
	out: number[];
	devices: number[];
	jobsCommand: number[];
	jobsScript: number[];
	jobsLibrary: number[];
}

export const emptySeries = (days: string[]): DaySeries => ({
	days,
	in: days.map(() => 0),
	out: days.map(() => 0),
	devices: days.map(() => 0),
	jobsCommand: days.map(() => 0),
	jobsScript: days.map(() => 0),
	jobsLibrary: days.map(() => 0),
});

/**
 * Daily series over `days` (every day present, zero-filled) from periods of a stats report or the overview's
 * `series`. Periods are matched by their UTC day (`start` or `day`); several periods of one day add up (hourly
 * data), except devices, which keep the day's highest. Periods outside `days` are ignored.
 */
export const daySeries = (periods: unknown, days: string[]): DaySeries => {
	const s = emptySeries(days);
	const index = new Map(days.map((d, i) => [d, i]));
	for (const p of Array.isArray(periods) ? periods : []) {
		const o = obj(p);
		if (!o) continue;
		const day = dayOf(o.start ?? o.day);
		const i = day === null ? undefined : index.get(day);
		if (i === undefined) continue;
		s.in[i] += inOf(o);
		s.out[i] += outOf(o);
		s.devices[i] = Math.max(s.devices[i], num(o.devices ?? o.devices_peak_day ?? o.devices_peak));
		s.jobsCommand[i] += num(o.jobs_command);
		s.jobsScript[i] += num(o.jobs_script);
		s.jobsLibrary[i] += num(o.jobs_library);
	}
	return s;
};

export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);
export const maxOf = (values: number[]): number => values.reduce((a, b) => Math.max(a, b), 0);

/** Whether any day has transfer, devices or jobs (else the charts show their empty state). */
export const seriesHasData = (s: DaySeries): boolean =>
	[s.in, s.out, s.devices, s.jobsCommand, s.jobsScript, s.jobsLibrary].some(a => a.some(v => v > 0));

/** "27" for the axis; the month name is added on the first day and the first of each month ("Nov 1"). */
export const dayTick = (day: string, i: number): string => {
	const d = Number(day.slice(8, 10));
	if (i === 0 || d === 1) {
		const m = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
		return `${m} ${d}`;
	}
	return String(d);
};

/** "Tue, Nov 25" (UTC) for tooltips and tables. */
export const dayLong = (day: string): string => {
	const t = new Date(`${day}T00:00:00Z`);
	if (Number.isNaN(t.getTime())) return day;
	return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(t);
};

/** A tidy count axis bound: the smallest 1/2/5 × 10^k step × `steps` ≥ max (at least 1 per step). */
export const countAxis = (max: number, steps = 4): { max: number; step: number } => {
	if (!Number.isFinite(max) || max <= 0) return { max: steps, step: 1 };
	const raw = max / steps;
	let unit = 1;
	while (unit * 10 <= raw) unit *= 10;
	const step = [1, 2, 5, 10].map(f => f * unit).find(s => s >= raw) ?? unit * 10;
	return { max: step * steps, step: Math.max(1, step) };
};

// ---- GET /operator/overview ----

export type Severity = 'critical' | 'warning' | 'info';

export interface AttentionItem {
	kind: string;
	severity: Severity;
	organization: { id: string; name: string } | null;
	message: string;
	value: number | null;
	limit: number | null;
}

export interface Overview {
	generatedAt: string | null;
	organizations: { total: number; active: number; suspended: number; trial: number };
	devices: { online: number; total: number };
	metering: boolean;
	transfer: { last24h: InOut; last30d: InOut } | null;
	/** null: signup isn't enabled. */
	signupsAwaiting: number | null;
	oldestSignupWaitingSince: string | null;
	invitationsPending: number | null;
	attention: AttentionItem[];
	/** Daily platform samples ({ day, in, out, devices }); null without metering. */
	series: unknown[] | null;
}

const severityOf = (v: unknown): Severity => (v === 'critical' || v === 'warning' ? v : 'info');

const parseAttention = (raw: unknown): AttentionItem[] => (Array.isArray(raw) ? raw : []).flatMap((r) => {
	const o = obj(r);
	const kind = str(o?.kind);
	if (!o || !kind) return [];
	const org = obj(o.organization);
	const orgId = str(org?.id);
	return [{
		kind,
		severity: severityOf(o.severity),
		organization: orgId ? { id: orgId, name: str(org?.name) || orgId } : null,
		message: str(o.message),
		value: numOrNull(o.value),
		limit: numOrNull(o.limit),
	}];
});

export const parseOverview = (raw: unknown): Overview => {
	const d = obj(unwrap(raw)) ?? {};
	const orgs = obj(d.organizations) ?? {};
	const devices = obj(d.devices) ?? {};
	const transfer = obj(d.transfer);
	const metering = d.metering !== false && (d.metering === true || !!transfer || Array.isArray(d.series));
	const last24h = inOut(transfer?.last_24h);
	const last30d = inOut(transfer?.last_30d);
	return {
		generatedAt: strOrNull(d.generated_at),
		organizations: { total: num(orgs.total), active: num(orgs.active), suspended: num(orgs.suspended), trial: num(orgs.trial) },
		devices: { online: num(devices.online), total: num(devices.total) },
		metering,
		transfer: metering && (last24h || last30d) ? { last24h: last24h ?? { in: 0, out: 0 }, last30d: last30d ?? { in: 0, out: 0 } } : null,
		signupsAwaiting: numOrNull(d.signups_awaiting),
		oldestSignupWaitingSince: strOrNull(d.oldest_signup_waiting_since),
		invitationsPending: numOrNull(d.invitations_pending),
		attention: sortAttention(parseAttention(d.attention)),
		series: metering && Array.isArray(d.series) ? d.series : null,
	};
};

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** Most severe first; the server's order within a severity is kept. */
export const sortAttention = (items: AttentionItem[]): AttentionItem[] =>
	items.map((item, i) => ({ item, i }))
		.sort((a, b) => SEVERITY_RANK[a.item.severity] - SEVERITY_RANK[b.item.severity] || a.i - b.i)
		.map(x => x.item);

const ATTENTION_LABELS: Record<string, string> = {
	device_limit: 'Device limit',
	transfer_cap: 'Transfer cap',
	trial_ending: 'Trial ending',
	devices_drop: 'Devices dropped',
	signup_waiting: 'Signup waiting',
};

/** "Device limit" etc.; unknown kinds read as their words ("some_kind" → "Some kind"). */
export const attentionLabel = (kind: string): string => {
	if (ATTENTION_LABELS[kind]) return ATTENTION_LABELS[kind];
	const words = kind.replace(/[_-]+/g, ' ').trim();
	return words ? words[0].toUpperCase() + words.slice(1) : 'Notice';
};

export const severityLabel = (s: Severity): string => (s === 'critical' ? 'Critical' : s === 'warning' ? 'Warning' : 'Notice');

/** Where an attention item leads: the organization's tab that explains it, or the signup queue. */
export const attentionLink = (item: AttentionItem): string | null => {
	if (item.kind === 'signup_waiting') return '/operator/signups';
	if (!item.organization) return null;
	const tab: OrgTab = item.kind === 'transfer_cap' || item.kind === 'trial_ending'
		? 'billing'
		: item.kind === 'devices_drop' ? 'devices' : item.kind === 'device_limit' ? 'settings' : 'overview';
	return orgConsoleLink(item.organization.id, tab);
};

// ---- organization detail tabs and links ----

export const ORG_TABS = ['overview', 'devices', 'members', 'billing', 'activity', 'settings'] as const;
export type OrgTab = typeof ORG_TABS[number];

export const ORG_TAB_LABELS: Record<OrgTab, string> = {
	overview: 'Overview',
	devices: 'Devices',
	members: 'Members',
	billing: 'Billing',
	activity: 'Activity',
	settings: 'Settings',
};

export const orgTab = (v: unknown): OrgTab => {
	const s = Array.isArray(v) ? v[0] : v;
	return (ORG_TABS as readonly string[]).includes(s as string) ? s as OrgTab : 'overview';
};

/** The console page of one organization, at a tab (overview is the default and has no query). */
export const orgConsoleLink = (id: string, tab: OrgTab = 'overview'): string =>
	`/operator/organizations/${encodeURIComponent(id)}${tab === 'overview' ? '' : `?tab=${tab}`}`;

// ---- redirects of the old operator pages ----

const LEGACY: Record<string, string> = {
	'/organizations': '/operator/organizations',
	'/platform-usage': '/operator/usage',
	'/platform-billing': '/operator/billing',
	'/signups': '/operator/signups',
	'/deletions': '/operator/deletions',
};

/**
 * Where an old operator URL lives now: `/organizations?id=X` → `/operator/organizations/X`, the other pages
 * to their /operator equivalents (other query parameters kept). null for every other path. Paths are matched
 * case-insensitively without a trailing slash (the page files were capitalised: /Organizations).
 */
export const legacyOperatorRedirect = (path: string, query: Record<string, unknown> = {}): { path: string; query: Record<string, string> } | null => {
	const p = (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '').toLowerCase();
	const target = LEGACY[p];
	if (!target) return null;
	const rest: Record<string, string> = {};
	for (const [k, v] of Object.entries(query)) {
		const value = Array.isArray(v) ? v[0] : v;
		if (typeof value === 'string') rest[k] = value;
	}
	if (p === '/organizations' && rest.id) {
		const { id, ...others } = rest;
		return { path: `/operator/organizations/${encodeURIComponent(id)}`, query: others };
	}
	return { path: target, query: rest };
};

/** Whether a path is in the operator console. */
export const isConsolePath = (path: string): boolean => {
	const p = (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '').toLowerCase();
	return p === '/operator' || p.startsWith('/operator/');
};

// ---- GET /operator/organizations?stats=… ----

export interface OrgStats {
	devicesOnline: number | null;
	transferIn: number | null;
	transferOut: number | null;
	jobs: number | null;
	lastDeviceAt: string | null;
	lastLoginAt: string | null;
	lastActivityAt: string | null;
	source: string | null;
}

export interface OrgBillingSummary {
	plan: string | null;
	status: string | null;
	transferState: string | null;
	trialEndsAt: string | null;
}

export interface ConsoleOrg {
	id: string;
	name: string;
	status: string;
	created_at: string;
	device_count: number;
	device_limit: number | null;
	user_count: number;
	require_oidc?: boolean;
	stats: OrgStats | null;
	billing: OrgBillingSummary | null;
}

const parseStats = (v: unknown): OrgStats | null => {
	const o = obj(v);
	if (!o) return null;
	const lastDeviceAt = strOrNull(o.last_device_at);
	const lastLoginAt = strOrNull(o.last_login_at);
	return {
		devicesOnline: numOrNull(o.devices_online),
		transferIn: numOrNull(o.transfer_in),
		transferOut: numOrNull(o.transfer_out),
		jobs: numOrNull(o.jobs),
		lastDeviceAt,
		lastLoginAt,
		lastActivityAt: strOrNull(o.last_activity_at) ?? latest(lastDeviceAt, lastLoginAt),
		source: strOrNull(o.source),
	};
};

const parseBillingSummary = (v: unknown): OrgBillingSummary | null => {
	const o = obj(v);
	if (!o) return null;
	return { plan: strOrNull(o.plan), status: strOrNull(o.status), transferState: strOrNull(o.transfer_state), trialEndsAt: strOrNull(o.trial_ends_at) };
};

/** The later of two timestamps (either may be null). */
export const latest = (a: string | null, b: string | null): string | null => {
	const ta = a ? Date.parse(a) : Number.NaN;
	const tb = b ? Date.parse(b) : Number.NaN;
	if (Number.isNaN(ta)) return Number.isNaN(tb) ? null : b;
	if (Number.isNaN(tb)) return a;
	return ta >= tb ? a : b;
};

export const parseConsoleOrg = (r: unknown): ConsoleOrg | null => {
	const o = obj(r);
	const id = str(o?.id);
	if (!o || !id) return null;
	return {
		id,
		name: str(o.name) || id,
		status: str(o.status) || 'active',
		created_at: str(o.created_at),
		device_count: num(o.device_count),
		device_limit: numOrNull(o.device_limit),
		user_count: num(o.user_count),
		...(typeof o.require_oidc === 'boolean' ? { require_oidc: o.require_oidc } : {}),
		stats: parseStats(o.stats),
		billing: parseBillingSummary(o.billing),
	};
};

export const parseConsoleOrgs = (raw: unknown): ConsoleOrg[] =>
	listOf(raw).map(parseConsoleOrg).filter((o): o is ConsoleOrg => !!o);

export type OrgSortKey = 'name' | 'status' | 'plan' | 'devices' | 'users' | 'transfer_in' | 'transfer_out' | 'last_activity' | 'created' | 'source';
export type OrgSortDir = 'asc' | 'desc';

const sortValue = (o: ConsoleOrg, key: OrgSortKey): string | number | null => {
	switch (key) {
		case 'name': return (o.name || o.id).toLowerCase();
		case 'status': return o.status;
		case 'plan': return o.billing?.plan ?? null;
		case 'devices': return o.device_count;
		case 'users': return o.user_count;
		case 'transfer_in': return o.stats?.transferIn ?? null;
		case 'transfer_out': return o.stats?.transferOut ?? null;
		case 'last_activity': {
			const t = o.stats?.lastActivityAt ? Date.parse(o.stats.lastActivityAt) : Number.NaN;
			return Number.isNaN(t) ? null : t;
		}
		case 'created': {
			const t = Date.parse(o.created_at);
			return Number.isNaN(t) ? null : t;
		}
		case 'source': return o.stats?.source ?? null;
	}
};

/** Sorted by a column; missing values go last in either direction, ties by name. */
export const sortOrgs = (rows: ConsoleOrg[], key: OrgSortKey, dir: OrgSortDir): ConsoleOrg[] => {
	const sign = dir === 'asc' ? 1 : -1;
	const byName = (a: ConsoleOrg, b: ConsoleOrg) => (a.name || a.id).localeCompare(b.name || b.id) || a.id.localeCompare(b.id);
	return [...rows].sort((a, b) => {
		const va = sortValue(a, key);
		const vb = sortValue(b, key);
		if (va === null || vb === null) return va === vb ? byName(a, b) : va === null ? 1 : -1;
		const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
		return c * sign || byName(a, b);
	});
};

/** The direction a column sorts in first: numbers and dates largest first, text A–Z. */
export const orgSortDefaultDir = (key: OrgSortKey): OrgSortDir => (['name', 'status', 'plan', 'source'].includes(key) ? 'asc' : 'desc');

export interface OrgFilter {
	q?: string;
	status?: string;
	billing?: string;
}

export const filterOrgs = (rows: ConsoleOrg[], f: OrgFilter): ConsoleOrg[] => {
	const needle = (f.q ?? '').trim().toLowerCase();
	return rows.filter(o => (!f.status || f.status === 'all' || o.status === f.status)
		&& (!f.billing || f.billing === 'all' || (o.billing?.status ?? '') === f.billing)
		&& (!needle || o.id.toLowerCase().includes(needle) || o.name.toLowerCase().includes(needle)));
};

/** Billing statuses present in the list, for the filter (in a fixed order, unknown ones after). */
export const billingStatusesOf = (rows: ConsoleOrg[]): string[] => {
	const order = ['trial', 'paying', 'comped', 'exempt'];
	const seen = [...new Set(rows.map(o => o.billing?.status).filter((s): s is string => !!s))];
	return seen.sort((a, b) => {
		const ia = order.indexOf(a);
		const ib = order.indexOf(b);
		return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
	});
};

export const sourceLabel = (source: string | null | undefined): string =>
	source === 'signup' ? 'Signup' : source === 'operator' ? 'Operator' : source ? source : '—';

// ---- GET …/stats ----

export interface OrgStatsReport {
	metering: boolean;
	periods: unknown[];
	totals: { in: number; out: number; devices: number; jobs: number; jobsCommand: number; jobsScript: number; jobsLibrary: number } | null;
}

export const parseStatsReport = (raw: unknown): OrgStatsReport => {
	const d = obj(unwrap(raw)) ?? {};
	const periods = Array.isArray(d.periods) ? d.periods : [];
	if (d.metering === false) return { metering: false, periods: [], totals: null };
	const t = obj(d.totals);
	const totals = t
		? {
				in: inOf(t),
				out: outOf(t),
				devices: num(t.devices ?? t.devices_peak_day ?? t.devices_peak),
				jobs: num(t.jobs_run) || num(t.jobs_command) + num(t.jobs_script) + num(t.jobs_library),
				jobsCommand: num(t.jobs_command),
				jobsScript: num(t.jobs_script),
				jobsLibrary: num(t.jobs_library),
			}
		: null;
	return { metering: true, periods, totals };
};

// ---- GET …/devices ----

export interface ConsoleDevice {
	id: string;
	name: string;
	online: boolean;
	nodeId: string | null;
	version: string | null;
	os: string | null;
	osFamily: string | null;
	connectedAt: string | null;
	lastSeenAt: string | null;
	firstSeenAt: string | null;
}

export interface ValueCount {
	value: string;
	count: number;
}

export interface OrgDevices {
	total: number;
	online: number;
	devices: ConsoleDevice[];
	byVersion: ValueCount[];
	byOs: ValueCount[];
}

const parseCounts = (v: unknown): ValueCount[] => (Array.isArray(v) ? v : []).flatMap((r) => {
	const o = obj(r);
	if (!o) return [];
	return [{ value: str(o.value) || 'Unknown', count: num(o.count) }];
}).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

/** Counts of a field over the devices, when the server leaves the aggregate out. */
const countBy = (devices: ConsoleDevice[], pick: (d: ConsoleDevice) => string | null): ValueCount[] => {
	const m = new Map<string, number>();
	for (const d of devices) {
		const k = pick(d) || 'Unknown';
		m.set(k, (m.get(k) ?? 0) + 1);
	}
	return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

export const parseOrgDevices = (raw: unknown): OrgDevices => {
	const d = obj(unwrap(raw)) ?? {};
	const devices = (Array.isArray(d.devices) ? d.devices : Array.isArray(unwrap(raw)) ? unwrap(raw) as unknown[] : []).flatMap((r) => {
		const o = obj(r);
		const id = str(o?.id);
		if (!o || !id) return [];
		return [{
			id,
			name: str(o.name) || id,
			online: o.online === true,
			nodeId: strOrNull(o.node_id),
			version: strOrNull(o.version),
			os: strOrNull(o.os),
			osFamily: strOrNull(o.os_family),
			connectedAt: strOrNull(o.connected_at),
			lastSeenAt: strOrNull(o.last_seen_at),
			firstSeenAt: strOrNull(o.first_seen_at),
		}];
	});
	return {
		total: numOrNull(d.total) ?? devices.length,
		online: numOrNull(d.online) ?? devices.filter(x => x.online).length,
		devices,
		byVersion: Array.isArray(d.by_version) ? parseCounts(d.by_version) : countBy(devices, x => x.version),
		byOs: Array.isArray(d.by_os) ? parseCounts(d.by_os) : countBy(devices, x => x.os),
	};
};

// ---- GET …/members ----

export interface ConsoleMember {
	username: string;
	groups: string[];
	/** How many organizations the login belongs to, this one included. */
	organizations: number;
	/** `both`, `password`, `oidc`, or '' when the server doesn't say. */
	signIn: string;
	hasPassword: boolean | null;
	oidcLinked: boolean | null;
	twoFa: boolean | null;
	lastLoginAt: string | null;
}

export const parseConsoleMembers = (raw: unknown): ConsoleMember[] => listOf(raw).flatMap((r) => {
	const o = obj(r);
	const username = str(o?.username);
	if (!o || !username) return [];
	const n = typeof o.organizations === 'number' && Number.isFinite(o.organizations) && o.organizations >= 1 ? Math.floor(o.organizations) : 1;
	return [{
		username,
		groups: strList(o.groups),
		organizations: n,
		signIn: str(o.sign_in),
		hasPassword: boolOrNull(o.has_password),
		oidcLinked: boolOrNull(o.oidc_linked),
		twoFa: boolOrNull(o.two_fa),
		lastLoginAt: strOrNull(o.last_login_at),
	}];
}).sort((a, b) => a.username.localeCompare(b.username));

/**
 * How a member can sign in: "Password", "Google" or "Password or Google". The member's setting (`sign_in`)
 * limits it first, the organization's Google requirement next; within "both", what the account actually has
 * (a password, a linked Google account) decides when the server says. '' when nothing is known.
 */
export const signInMethodLabel = (m: Pick<ConsoleMember, 'signIn' | 'hasPassword' | 'oidcLinked'>, orgRequiresOidc = false): string => {
	if (orgRequiresOidc || m.signIn === 'oidc') return 'Google';
	if (m.signIn === 'password') return 'Password';
	if (m.signIn !== 'both' && m.hasPassword === null && m.oidcLinked === null) return '';
	const password = m.hasPassword !== false;
	const google = m.oidcLinked === true || (m.signIn === 'both' && m.oidcLinked === null);
	if (password && google) return 'Password or Google';
	if (google) return 'Google';
	if (password) return 'Password';
	return 'Password or Google';
};

// ---- invitations ----

export interface ConsoleInvitation {
	organization: string;
	organizationName: string;
	username: string;
	groups: string[];
	invitedBy: string;
	createdAt: string | null;
}

export const parseConsoleInvitation = (r: unknown): ConsoleInvitation | null => {
	const o = obj(unwrap(r));
	const username = str(o?.username);
	const organization = str(o?.organization ?? o?.organization_id);
	if (!o || !username || !organization) return null;
	return {
		organization,
		organizationName: str(o.organization_name) || organization,
		username,
		groups: strList(o.groups),
		invitedBy: str(o.invited_by),
		createdAt: strOrNull(o.created_at),
	};
};

/** Newest first (as the server sends them, re-sorted in case it doesn't). */
export const parseConsoleInvitations = (raw: unknown): ConsoleInvitation[] =>
	listOf(raw).map(parseConsoleInvitation).filter((x): x is ConsoleInvitation => !!x)
		.sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0));

/** "operator:alice" → "alice (operator)". */
export const invitedByLabel = (by: string): string => {
	if (!by) return '—';
	const m = /^operator:(.+)$/.exec(by);
	return m ? `${m[1]} (operator)` : by;
};

// ---- GET …/activity ----

export type ActivityKind = 'all' | 'sign_in' | 'admin';

export const ACTIVITY_KINDS: { value: ActivityKind; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'sign_in', label: 'Sign-ins' },
	{ value: 'admin', label: 'Admin' },
];

export interface ActivityEntry {
	id: string;
	timestamp: string;
	source: string;
	application: string;
	action: string;
	username: string;
	remoteIp: string;
	affectedId: string;
}

export interface ActivityPage {
	entries: ActivityEntry[];
	next: string | null;
}

/**
 * `{ data: [...], next }`, `{ data: { entries|items: [...], next } }`, `{ data: [...], meta: { next } }` or a bare
 * list. Entries without a timestamp are dropped. `next` as a string or a number cursor.
 */
export const parseActivity = (raw: unknown): ActivityPage => {
	const top = obj(raw);
	const d = unwrap(raw);
	const dObj = obj(d);
	const list = Array.isArray(d) ? d : Array.isArray(dObj?.entries) ? dObj.entries as unknown[] : Array.isArray(dObj?.items) ? dObj.items as unknown[] : [];
	const cursor = top?.next ?? dObj?.next ?? obj(top?.meta)?.next;
	const next = typeof cursor === 'string' && cursor ? cursor : typeof cursor === 'number' && Number.isFinite(cursor) ? String(cursor) : null;
	const entries = list.flatMap((r, i) => {
		const o = obj(r);
		const timestamp = str(o?.timestamp);
		if (!o || !timestamp) return [];
		return [{
			id: o.id === undefined || o.id === null ? `${timestamp}-${i}` : String(o.id),
			timestamp,
			source: str(o.source) || 'organization',
			application: str(o.application),
			action: str(o.action),
			username: str(o.username),
			remoteIp: str(o.remote_ip),
			affectedId: str(o.affected_id),
		}];
	});
	return { entries, next };
};

/** Whether an entry is a failed sign-in (the action of auth.login is `failed`). */
export const isFailedSignIn = (e: Pick<ActivityEntry, 'application' | 'action'>): boolean =>
	e.application.startsWith('auth') && /fail/i.test(e.action);

// ---- time ----

/**
 * "just now", "5 min ago", "3 h ago", "2 days ago", then the date ("Nov 2, 2026"); "—" for none. Future times
 * (clock skew) read as "just now".
 */
export const timeAgo = (iso: string | null | undefined, now: Date = new Date()): string => {
	if (!iso) return '—';
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return '—';
	const s = Math.max(0, (now.getTime() - t) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)} min ago`;
	if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
	if (s < 30 * 86_400) {
		const d = Math.floor(s / 86_400);
		return `${d} ${d === 1 ? 'day' : 'days'} ago`;
	}
	return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(t));
};

/** "Nov 2, 2026" or ''. */
export const shortDate = (iso: string | null | undefined): string => {
	const t = iso ? Date.parse(iso) : Number.NaN;
	return Number.isNaN(t) ? '' : new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(t));
};

/** "Nov 2, 2026, 14:05" (local time) or ''. */
export const dateTime = (iso: string | null | undefined): string => {
	const t = iso ? Date.parse(iso) : Number.NaN;
	return Number.isNaN(t)
		? ''
		: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t));
};
