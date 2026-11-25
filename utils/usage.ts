/**
 * Usage metering logic for the Usage and operator pages: byte formatting, the estimated egress cost,
 * month ranges (UTC, as the server meters) and shaping a usage report into chart series.
 * Pure functions with no Vue or Nuxt imports, so they run under `node --test` (see tests/usage.test.ts).
 */

/** The usage of a period or a whole range (UsageTotals in the server's OpenAPI spec). Missing fields are 0. */
export interface UsageTotals {
	tunnel_bytes_to_user?: number;
	tunnel_bytes_to_device?: number;
	upload_bytes_to_devices?: number;
	transfer_bytes?: number;
	api_bytes_out?: number;
	jobs_run?: number;
	jobs_command?: number;
	jobs_script?: number;
	jobs_library?: number;
	device_hours?: number;
	devices_avg?: number;
	devices_peak?: number;
	device_days?: number;
	devices_billable?: number;
	devices_peak_day?: number;
	monitoring_rows?: number;
}

export interface UsagePeriod extends UsageTotals {
	start: string;
}

export interface UsageTopDevice {
	client_id: string;
	tunnel_bytes_to_user?: number;
	tunnel_bytes_to_device?: number;
	upload_bytes_to_devices?: number;
	transfer_bytes?: number;
}

/** GET /usage and GET /operator/organizations/{id}/usage. */
export interface UsageReport {
	from: string;
	to: string;
	granularity: 'hour' | 'day' | 'month';
	periods?: UsagePeriod[] | null;
	totals?: UsageTotals | null;
	top_devices?: UsageTopDevice[] | null;
}

/** One row of GET /operator/usage. */
export interface OrgUsageRow {
	id: string;
	name?: string;
	status?: string;
	totals?: UsageTotals | null;
}

/** The egress cost per GiB the estimate uses unless the operator sets another (USD). */
export const DEFAULT_COST_PER_GIB = 0.13;

const GIB = 1024 ** 3;
const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/**
 * Bytes in binary units ("1.5 GiB", "312 MiB", "0 B"). Three significant digits from KiB up,
 * whole bytes below. Negative, missing or non-finite input counts as 0.
 */
export const formatBytes = (bytes: number | null | undefined): string => {
	const n = typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
	if (n < 1024) return `${Math.round(n)} B`;
	let unit = 0;
	let value = n;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	const digits = (v: number) => (v >= 100 ? 0 : v >= 10 ? 1 : 2);
	// 1023.7 KiB would print as "1024 KiB": move up a unit instead.
	if (Number(value.toFixed(digits(value))) >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${Number(value.toFixed(digits(value)))} ${UNITS[unit]}`;
};

/** Bytes as GiB (for cost estimates). */
export const bytesToGiB = (bytes: number | null | undefined): number =>
	(typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : 0) / GIB;

/** Estimated egress cost in USD of `bytes` at `costPerGiB` (invalid or negative prices count as the default). */
export const estimateEgressCost = (bytes: number | null | undefined, costPerGiB: number = DEFAULT_COST_PER_GIB): number => {
	const price = Number.isFinite(costPerGiB) && costPerGiB >= 0 ? costPerGiB : DEFAULT_COST_PER_GIB;
	return bytesToGiB(bytes) * price;
};

/** USD with cents; amounts above 0 that round to $0.00 show as "< $0.01". */
export const formatUsd = (amount: number): string => {
	if (!Number.isFinite(amount) || amount <= 0) return '$0.00';
	if (amount < 0.005) return '< $0.01';
	return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Parses a $/GiB input; returns null for anything that isn't a non-negative number. */
export const parseCostPerGiB = (input: string | number | null | undefined): number | null => {
	if (input === null || input === undefined) return null;
	const text = String(input).trim().replace(/^\$/, '');
	if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) return null;
	const value = Number(text);
	return Number.isFinite(value) && value >= 0 ? value : null;
};

/** Counts with thousands separators; fractions to one decimal place. */
export const formatCount = (n: number | null | undefined): string => {
	const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
	return v.toLocaleString('en-US', { maximumFractionDigits: Number.isInteger(v) ? 0 : 1 });
};

// ---- Months (UTC, the server's metering calendar) ----

const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** The UTC month of `now` as YYYY-MM. */
export const currentMonth = (now: Date = new Date()): string =>
	`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

export const isMonth = (month: string | null | undefined): month is string => {
	const m = MONTH_RE.exec(month ?? '');
	return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
};

/** The month `delta` months after (or before) `month`. */
export const shiftMonth = (month: string, delta: number): string => {
	const m = MONTH_RE.exec(month);
	if (!m) return month;
	const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + delta, 1));
	return currentMonth(d);
};

/** "November 2026". */
export const monthLabel = (month: string): string => {
	const m = MONTH_RE.exec(month);
	if (!m) return month;
	return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
		.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
};

/**
 * Query parameters for GET /usage over a month. The current month leaves `to` out, so the server ends the
 * range now; a past month ends at the first day of the next month (excluded).
 */
export const monthQuery = (month: string, now: Date = new Date()): { from: string; to?: string } => {
	const from = `${month}-01`;
	if (month >= currentMonth(now)) return { from };
	return { from, to: `${shiftMonth(month, 1)}-01` };
};

/** The days (YYYY-MM-DD) of `month`, up to and including today for the current month, none for a future one. */
export const daysOfMonth = (month: string, now: Date = new Date()): string[] => {
	const m = MONTH_RE.exec(month);
	if (!m) return [];
	const year = Number(m[1]);
	const mon = Number(m[2]) - 1;
	const last = new Date(Date.UTC(year, mon + 1, 0)).getUTCDate();
	const cur = currentMonth(now);
	const until = month === cur ? now.getUTCDate() : month > cur ? 0 : last;
	return Array.from({ length: until }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};

// ---- Chart data ----

export interface DailyTransferSeries {
	/** YYYY-MM-DD, one per day of the month so far. */
	days: string[];
	toUser: number[];
	toDevice: number[];
	uploads: number[];
	/** The largest daily total (all three stacked). */
	max: number;
}

/**
 * The daily transfer of a month for a stacked chart: one entry per day (days without usage are 0), tunnel bytes
 * to users, tunnel bytes to devices and upload bytes read by devices. Periods outside the month are ignored;
 * several periods of the same UTC day (hourly reports) are added up.
 */
export const dailyTransferSeries = (periods: UsagePeriod[] | null | undefined, month: string, now: Date = new Date()): DailyTransferSeries => {
	const days = daysOfMonth(month, now);
	const index = new Map(days.map((d, i) => [d, i]));
	const toUser = days.map(() => 0);
	const toDevice = days.map(() => 0);
	const uploads = days.map(() => 0);
	for (const p of periods ?? []) {
		const t = new Date(p.start);
		if (Number.isNaN(t.getTime())) continue;
		const i = index.get(t.toISOString().slice(0, 10));
		if (i === undefined) continue;
		toUser[i] += p.tunnel_bytes_to_user ?? 0;
		toDevice[i] += p.tunnel_bytes_to_device ?? 0;
		uploads[i] += p.upload_bytes_to_devices ?? 0;
	}
	const max = days.reduce((m, _, i) => Math.max(m, toUser[i] + toDevice[i] + uploads[i]), 0);
	return { days, toUser, toDevice, uploads, max };
};

/** A tidy byte axis: the smallest 1/2/5 × 1024^k bound ≥ max, as `steps` equal ticks. */
export const byteAxis = (max: number, steps = 4): { max: number; ticks: number[] } => {
	if (!Number.isFinite(max) || max <= 0) return { max: 0, ticks: [0] };
	const rawStep = max / steps;
	let unit = 1;
	while (unit * 1024 <= rawStep) unit *= 1024;
	const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1024].map(f => f * unit).find(s => s >= rawStep) ?? unit * 1024;
	return { max: step * steps, ticks: Array.from({ length: steps + 1 }, (_, i) => i * step) };
};

/** Organizations heaviest first by transfer, then by name/id; rows without totals count as 0. */
export const sortByTransfer = <T extends OrgUsageRow>(rows: T[]): T[] =>
	[...rows].sort((a, b) => (b.totals?.transfer_bytes ?? 0) - (a.totals?.transfer_bytes ?? 0)
		|| (a.name || a.id).localeCompare(b.name || b.id));

/** The transfer of a set of totals: the server's sum, or the parts when an older report lacks it. */
export const transferOf = (t: UsageTotals | null | undefined): number =>
	t?.transfer_bytes ?? ((t?.tunnel_bytes_to_user ?? 0) + (t?.tunnel_bytes_to_device ?? 0) + (t?.upload_bytes_to_devices ?? 0));

/** "12.4 MiB ↓ · 1.1 MiB ↑" for a metered tunnel's bytes, null when the tunnel isn't metered. */
export const tunnelBytesLabel = (bytes: { to_user?: number; to_device?: number } | null | undefined): { toUser: string; toDevice: string; total: string } | null => {
	if (!bytes || (typeof bytes.to_user !== 'number' && typeof bytes.to_device !== 'number')) return null;
	return {
		toUser: formatBytes(bytes.to_user),
		toDevice: formatBytes(bytes.to_device),
		total: formatBytes((bytes.to_user ?? 0) + (bytes.to_device ?? 0)),
	};
};

// ---- Operator forms ----

/** Organization ids the server accepts: 1–63 lower-case letters, digits, '-' or '_', starting with a letter or digit. */
export const ORG_ID_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

/** Why an organization id can't be used, or null when it can. */
export const orgIdError = (id: string): string | null => {
	const v = id.trim();
	if (!v) return 'Enter an ID.';
	if (v === 'default' || v.startsWith('_')) return 'This ID is reserved.';
	if (!ORG_ID_RE.test(v)) return 'Use 1–63 lower-case letters, digits, “-” or “_”, starting with a letter or digit.';
	return null;
};

/** A device limit input: empty is unlimited (null), otherwise a whole number ≥ 0. */
export const parseDeviceLimit = (input: string | number | null | undefined): { value: number | null; error: string | null } => {
	const text = input === null || input === undefined ? '' : String(input).trim();
	if (text === '') return { value: null, error: null };
	if (!/^\d+$/.test(text)) return { value: null, error: 'Enter a whole number, or leave it empty for no limit.' };
	const value = Number(text);
	if (!Number.isSafeInteger(value)) return { value: null, error: 'That number is too large.' };
	return { value, error: null };
};

/** "12 / 50", "12 / no limit". */
export const deviceLimitLabel = (count: number | null | undefined, limit: number | null | undefined): string =>
	`${formatCount(count ?? 0)} / ${limit === null || limit === undefined ? 'no limit' : formatCount(limit)}`;

/** Share of the device limit in use (0–1+), null when unlimited. */
export const deviceLimitUse = (count: number | null | undefined, limit: number | null | undefined): number | null => {
	if (limit === null || limit === undefined) return null;
	if (limit === 0) return (count ?? 0) > 0 ? Infinity : 1;
	return (count ?? 0) / limit;
};

/** The operator page of one organization (a query, so a reload works from the static build). */
export const orgLink = (id: string): string => `/organizations?id=${encodeURIComponent(id)}`;
