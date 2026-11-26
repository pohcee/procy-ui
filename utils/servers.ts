/**
 * The operator console's Servers section (/operator/servers): parsers for GET /operator/nodes,
 * GET /operator/nodes/{id} and GET /operator/nodes/{id}/devices, plus sorting and labels.
 * Contract: pohcee/procy#14 (operator console, per-node view). Every parser is tolerant: missing or mistyped
 * fields become null/0/[] rather than errors, so an older or newer server still renders. Pure functions with no
 * Vue or Nuxt imports, tested in tests/servers.test.ts.
 */
import { lastDays, utcDay, type InOut } from './operatorConsole.ts';

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);
/** `{ data: X }` → X; anything else as it is. */
const unwrap = (raw: unknown): unknown => {
	const o = obj(raw);
	return o && 'data' in o ? o.data : raw;
};
const inOut = (v: unknown): InOut => {
	const o = obj(v);
	return { in: num(o?.in), out: num(o?.out) };
};

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The day (YYYY-MM-DD) of a day string or a timestamp, or null. */
const dayOf = (v: unknown): string | null => {
	const s = str(v);
	if (DAY_RE.test(s)) return s;
	const t = s ? Date.parse(s) : Number.NaN;
	return Number.isNaN(t) ? null : utcDay(new Date(t));
};

// ---- periods ----

export const SERVER_PERIODS: { value: number; label: string }[] = [
	{ value: 7, label: '7 days' },
	{ value: 30, label: '30 days' },
	{ value: 90, label: '90 days' },
];
export const DEFAULT_SERVER_DAYS = 30;

/** A period of the page (7, 30 or 90 days) from a query value; else the default. */
export const serverPeriod = (v: unknown): number => {
	const n = Number(Array.isArray(v) ? v[0] : v);
	return SERVER_PERIODS.some(p => p.value === n) ? n : DEFAULT_SERVER_DAYS;
};

/** The server's days value (1–90), else the fallback. */
const daysOf = (v: unknown, fallback: number): number => {
	const n = numOrNull(v);
	return n !== null && n >= 1 && n <= 90 ? Math.floor(n) : fallback;
};

// ---- nodes ----

export type ServerStatus = 'live' | 'stale' | 'gone';

export interface ServerNode {
	id: string;
	region: string | null;
	roles: string[];
	version: string | null;
	startedAt: string | null;
	heartbeatAt: string | null;
	status: ServerStatus;
	/** Only when the server sends it (not part of the list contract). */
	peerAddress: string | null;
	onlineDevices: number;
	organizations: number;
	connects24h: number;
	disconnects24h: number;
	transferToday: InOut;
	transferPeriod: InOut;
	/** The first day with traffic attributed to this node (YYYY-MM-DD), or null when none is. */
	meteredSince: string | null;
}

/**
 * The status the server sent; without one (or an unknown one), from the heartbeat's age: up to a day stale, older
 * or none gone. "live" is never guessed, since the heartbeat interval isn't known here.
 */
export const statusOf = (v: unknown, heartbeatAt: string | null, now: Date = new Date()): ServerStatus => {
	if (v === 'live' || v === 'stale' || v === 'gone') return v;
	const t = heartbeatAt ? Date.parse(heartbeatAt) : Number.NaN;
	if (Number.isNaN(t)) return 'gone';
	return now.getTime() - t <= DAY_MS ? 'stale' : 'gone';
};

export const parseServerNode = (r: unknown, now: Date = new Date()): ServerNode | null => {
	const o = obj(r);
	const id = str(o?.node_id) || str(o?.id);
	if (!o || !id) return null;
	const heartbeatAt = strOrNull(o.heartbeat_at);
	return {
		id,
		region: strOrNull(o.region),
		roles: strList(o.roles),
		version: strOrNull(o.version),
		startedAt: strOrNull(o.started_at),
		heartbeatAt,
		status: statusOf(o.status, heartbeatAt, now),
		peerAddress: strOrNull(o.peer_address),
		onlineDevices: num(o.online_devices),
		organizations: num(o.organizations),
		connects24h: num(o.connects_24h),
		disconnects24h: num(o.disconnects_24h),
		transferToday: inOut(o.transfer_today),
		transferPeriod: inOut(o.transfer_period),
		meteredSince: dayOf(o.metered_since),
	};
};

const STATUS_RANK: Record<ServerStatus, number> = { live: 0, stale: 1, gone: 2 };

/** Live first, then stale, gone last; by node id (numbers in order: node-2 before node-10) within each. */
export const sortServers = (nodes: ServerNode[]): ServerNode[] => [...nodes].sort((a, b) =>
	STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.id.localeCompare(b.id, 'en', { numeric: true }));

export interface ServerList {
	nodes: ServerNode[];
	totals: { onlineDevices: number; transferPeriod: InOut };
	unassignedOnline: number;
	days: number;
}

/** GET /operator/nodes: `{ data: { nodes, totals, unassigned_online, days } }`; nodes sorted (sortServers). */
export const parseServerList = (raw: unknown, requestedDays = DEFAULT_SERVER_DAYS, now: Date = new Date()): ServerList => {
	const d = unwrap(raw);
	const o = obj(d) ?? {};
	const list = Array.isArray(d) ? d : Array.isArray(o.nodes) ? o.nodes : [];
	const nodes = sortServers(list.flatMap((r) => {
		const n = parseServerNode(r, now);
		return n ? [n] : [];
	}));
	const t = obj(o.totals);
	return {
		nodes,
		totals: {
			onlineDevices: numOrNull(t?.online_devices) ?? nodes.reduce((a, n) => a + n.onlineDevices, 0),
			transferPeriod: obj(t?.transfer_period)
				? inOut(t?.transfer_period)
				: nodes.reduce((a, n) => ({ in: a.in + n.transferPeriod.in, out: a.out + n.transferPeriod.out }), { in: 0, out: 0 }),
		},
		unassignedOnline: num(o.unassigned_online),
		days: daysOf(o.days, requestedDays),
	};
};

/** Servers live / all servers. */
export const liveCount = (nodes: ServerNode[]): number => nodes.filter(n => n.status === 'live').length;

// ---- detail ----

export interface ServerDay {
	day: string;
	in: number;
	out: number;
	connects: number;
	disconnects: number;
}

export interface ServerOrg {
	id: string;
	name: string;
	onlineDevices: number;
}

export interface ServerEvent {
	at: string;
	organization: string;
	organizationName: string | null;
	clientId: string;
	deviceName: string;
	/** `connected`, `disconnected` or what the server sent. */
	event: string;
}

export interface ServerDetail {
	node: ServerNode | null;
	days: number;
	daily: ServerDay[];
	organizations: ServerOrg[];
	events: ServerEvent[];
}

/**
 * The daily rows over every day of the period, oldest first, zero-filled: `n` days (or more, when the server sent
 * more) ending on the server's last day (its UTC days); when it sent none, the last `n` days of this clock.
 */
export const fillDays = (rows: ServerDay[], n: number, now: Date = new Date()): ServerDay[] => {
	const byDay = new Map<string, ServerDay>();
	for (const r of rows) {
		const prev = byDay.get(r.day);
		byDay.set(r.day, prev
			? { day: r.day, in: prev.in + r.in, out: prev.out + r.out, connects: prev.connects + r.connects, disconnects: prev.disconnects + r.disconnects }
			: r);
	}
	let days: string[];
	if (byDay.size) {
		const sorted = [...byDay.keys()].sort();
		const first = Date.parse(`${sorted[0]}T00:00:00Z`);
		const last = Date.parse(`${sorted[sorted.length - 1]}T00:00:00Z`);
		// The period ends on the last day the server sent; gaps are zero; at most 90 days.
		const count = Math.min(90, Math.max(n, Math.round((last - first) / DAY_MS) + 1));
		days = Array.from({ length: count }, (_, i) => utcDay(new Date(last - (count - 1 - i) * DAY_MS)));
	}
	else {
		days = lastDays(n, now);
	}
	return days.map(day => byDay.get(day) ?? { day, in: 0, out: 0, connects: 0, disconnects: 0 });
};

/** GET /operator/nodes/{id}: `{ data: { node, daily, organizations, events } }`. Events newest first. */
export const parseServerDetail = (raw: unknown, requestedDays = DEFAULT_SERVER_DAYS, now: Date = new Date()): ServerDetail => {
	const o = obj(unwrap(raw)) ?? {};
	const node = parseServerNode(o.node, now);
	const days = daysOf(o.days, requestedDays);
	const daily = (Array.isArray(o.daily) ? o.daily : []).flatMap((r) => {
		const x = obj(r);
		const day = dayOf(x?.day);
		if (!x || !day) return [];
		return [{ day, in: num(x.in), out: num(x.out), connects: num(x.connects), disconnects: num(x.disconnects) }];
	});
	const organizations = (Array.isArray(o.organizations) ? o.organizations : []).flatMap((r) => {
		const x = obj(r);
		const id = str(x?.organization) || str(x?.id);
		if (!x || !id) return [];
		return [{ id, name: str(x.organization_name) || str(x.name) || id, onlineDevices: num(x.online_devices) }];
	}).sort((a, b) => b.onlineDevices - a.onlineDevices || a.name.localeCompare(b.name));
	const events = (Array.isArray(o.events) ? o.events : []).flatMap((r) => {
		const x = obj(r);
		const at = str(x?.at);
		if (!x || !at || Number.isNaN(Date.parse(at))) return [];
		const clientId = str(x.client_id);
		return [{
			at,
			organization: str(x.organization),
			organizationName: strOrNull(x.organization_name),
			clientId,
			deviceName: str(x.device_name) || clientId,
			event: str(x.event),
		}];
	}).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
	return { node, days, daily: fillDays(daily, days, now), organizations, events };
};

// ---- devices ----

export interface ServerDevice {
	id: string;
	name: string;
	organization: string;
	organizationName: string;
	version: string | null;
	os: string | null;
	connectedAt: string | null;
}

export interface ServerDevicePage {
	devices: ServerDevice[];
	/** All devices with a live session on the node (for the pager). */
	count: number;
}

/**
 * GET /operator/nodes/{id}/devices: `{ data: [...], meta: { count } }` (the operator lists' paging), or
 * `{ data: { devices, total } }`. Without a count, the rows on this page plus the offset.
 */
export const parseServerDevices = (raw: unknown, offset = 0): ServerDevicePage => {
	const top = obj(raw);
	const d = unwrap(raw);
	const dObj = obj(d);
	const list = Array.isArray(d) ? d : Array.isArray(dObj?.devices) ? dObj.devices as unknown[] : [];
	const devices = list.flatMap((r) => {
		const x = obj(r);
		const id = str(x?.id) || str(x?.client_id);
		if (!x || !id) return [];
		const organization = str(x.organization);
		return [{
			id,
			name: str(x.name) || id,
			organization,
			organizationName: str(x.organization_name) || organization,
			version: strOrNull(x.version),
			os: strOrNull(x.os),
			connectedAt: strOrNull(x.connected_at),
		}];
	});
	const count = numOrNull(obj(top?.meta)?.count) ?? numOrNull(dObj?.total) ?? numOrNull(top?.total) ?? offset + devices.length;
	return { devices, count: Math.max(count, offset + devices.length) };
};

// ---- labels ----

export const STATUS_LABELS: Record<ServerStatus, string> = { live: 'Live', stale: 'Stale', gone: 'Gone' };

const ROLE_LABELS: Record<string, string> = { all: 'All', api: 'API', device: 'Device' };

/** "API, Device", "All", or "—" when the server doesn't say (a node on the previous release). */
export const rolesLabel = (roles: string[]): string =>
	roles.length ? roles.map(r => ROLE_LABELS[r] ?? r).join(', ') : '—';

/** "Connected" / "Disconnected" for the two known events, else the event as it is (or "Event"). */
export const eventLabel = (event: string): string =>
	event === 'connected' ? 'Connected' : event === 'disconnected' ? 'Disconnected' : (event || 'Event');

/**
 * The day traffic attribution started, when it is after the period's first day (traffic before it isn't attributed
 * to a node, so the totals cover less than the period); else null.
 */
export const meteredSinceNote = (meteredSince: string | null, periodStart: string | null | undefined): string | null =>
	meteredSince && periodStart && meteredSince > periodStart ? meteredSince : null;

/** The earliest metered_since of the nodes (the list's "since" note), or null. */
export const earliestMeteredSince = (nodes: ServerNode[]): string | null =>
	nodes.reduce<string | null>((m, n) => (n.meteredSince && (!m || n.meteredSince < m) ? n.meteredSince : m), null);

/** "Nov 26, 2026" for a YYYY-MM-DD day (UTC), or ''. */
export const dayLabel = (day: string | null | undefined): string => {
	if (!day || !DAY_RE.test(day)) return '';
	return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
};

/** The console page of one server. */
export const serverLink = (id: string): string => `/operator/servers/${encodeURIComponent(id)}`;
