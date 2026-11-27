/**
 * Billing (Postgres servers with `[billing] enabled`, capability `billing`): the shapes of the billing API, the
 * status and pill mapping, the allowance meters, money from cents, form parsing and the app-wide banners. Shapes
 * follow the server's OpenAPI (api-doc/openapi/components/schemas/Billing*.yaml). Pure functions with no Vue or Nuxt
 * imports, so they run under `node --test` (see tests/billing.test.ts).
 */
import { formatBytes, formatCount } from './usage.ts';

export type BillingStatus = 'paying' | 'trial' | 'exempt' | 'comped';
export type TransferState = 'normal' | 'soft' | 'over' | 'capped';
export type DunningState = 'none' | 'past_due' | 'read_only' | 'suspension_proposed';
export type PeriodState = 'ready' | 'held' | 'not_charged' | 'never_charged' | 'reported';

/** A plan of the plans file. Sizes are bytes, rates bytes per second (0 is unlimited), prices USD. */
export interface BillingPlan {
	id: string;
	name?: string;
	base_price?: number;
	included_devices?: number;
	price_per_device?: number;
	/** null: unlimited */
	max_clients?: number | null;
	transfer_base?: number;
	transfer_per_device?: number;
	overage?: 'bill' | 'cap';
	overage_price_per_gib?: number;
	/** Percent of the allowance. */
	soft_cap?: number;
	/** Percent of the allowance; 0 is none. */
	hard_cap?: number;
	tunnel_rate_limit?: number;
	throttle_rate?: number;
}

/** The transfer policy of the current month (recomputed every 5 minutes). */
export interface BillingPolicy {
	organization?: string;
	plan?: string;
	transfer_state?: TransferState;
	allowance_bytes?: number;
	used_bytes?: number;
	soft_cap_bytes?: number;
	/** 0: no hard cap */
	hard_cap_bytes?: number;
	overage_cents?: number;
	tunnel_rate?: number;
	throttle_rate?: number;
	max_clients?: number | null;
	fail_open?: string;
}

/** GET /billing, GET /operator/billing (one row) and GET /operator/organizations/{id}/billing. */
export interface BillingAccount {
	organization: string;
	plan: string;
	status: BillingStatus | string;
	trial_ends_at?: string | null;
	/** The last day (UTC) a comped organization is not charged. */
	comped_until?: string | null;
	reason?: string;
	exempt_limits?: 'plan' | 'none' | string;
	spending_limit_cents?: number | null;
	has_payment_method?: boolean;
	cap_lifted_until?: string | null;
	extra_transfer_bytes?: number;
	extra_transfer_period?: string | null;
	started_at?: string;
	updated_at?: string;
	updated_by?: string;
	transfer_state?: TransferState | string;
	transfer_state_at?: string | null;
	fail_open_at?: string | null;
	plan_unassigned?: boolean;
	previous_status?: string;
	status_since?: string;
	previous_plan?: string;
	plan_since?: string;
	policy?: BillingPolicy | null;
	soft_cap_reached?: boolean;
	plan_details?: BillingPlan | null;
}

export interface BillingDunning {
	state?: DunningState | string;
	failed_at?: string | null;
	read_only_at?: string | null;
	suspension_proposed_at?: string | null;
	failed_invoice?: string;
}

/** GET /billing/payment. */
export interface BillingPayment {
	provider?: string;
	plan?: string;
	status?: string;
	/** False for exempt organizations: no checkout, no portal. */
	chargeable?: boolean;
	has_customer?: boolean;
	has_payment_method?: boolean;
	subscription_status?: string;
	access?: 'full' | 'read_only' | string;
	dunning?: BillingDunning | null;
	/** When the organization becomes read-only unless the payment succeeds (past due only). */
	read_only_from?: string;
}

/** GET /billing/invoices (amounts in cents). */
export interface BillingInvoice {
	id: string;
	number?: string;
	status?: 'open' | 'paid' | 'uncollectible' | 'void' | string;
	amount_due?: number;
	amount_paid?: number;
	total?: number;
	currency?: string;
	created?: string;
	period_start?: string;
	period_end?: string;
	hosted_url?: string;
	pdf?: string;
}

/** A closed billing period (a calendar month, UTC). */
export interface BillingPeriod {
	organization?: string;
	start: string;
	end?: string;
	billed_from?: string;
	proration?: number;
	plan?: string;
	status?: string;
	billable_devices?: number;
	peak_devices?: number;
	device_days?: number;
	extra_devices?: number;
	tunnel_bytes_to_user?: number;
	tunnel_bytes_to_device?: number;
	upload_bytes_to_devices?: number;
	transfer_bytes?: number;
	allowance_bytes?: number;
	overage_bytes?: number;
	overage_gib?: number;
	base_cents?: number;
	device_cents?: number;
	overage_cents?: number;
	total_cents?: number;
	state?: PeriodState | string;
	closed_at?: string;
	approved_by?: string | null;
	approved_at?: string | null;
	reported_at?: string | null;
}

/** An organization's account at the payment provider (GET /operator/billing/provider/accounts). */
export interface BillingProviderAccount extends BillingDunning {
	organization: string;
	provider?: string;
	customer_id?: string;
	billing_email?: string;
	subscription_id?: string;
	subscription_status?: string;
	price_ids?: string[];
	has_payment_method?: boolean;
	access?: 'full' | 'read_only' | string;
	suspension_proposed?: boolean;
	updated_at?: string;
	updated_by?: string;
}

/** One quantity of one closed period reported to the provider (GET /operator/billing/provider/reports). */
export interface BillingUsageReport {
	organization: string;
	period_start: string;
	period_end?: string;
	metric: 'extra_devices' | 'overage_gib' | string;
	identifier?: string;
	customer_id?: string;
	price_id?: string;
	quantity?: number;
	state?: 'sent' | 'confirmed' | 'mismatch' | 'failed' | string;
	attempts?: number;
	last_attempt_at?: string | null;
	sent_at?: string | null;
	confirmed_at?: string | null;
	provider_value?: number | null;
	last_error?: string;
}

// ---- Error codes ----

/** Every change of a read-only organization (payment overdue past the grace period) is refused with it (403). */
export const ERR_BILLING_READ_ONLY = 'ERR_CODE_BILLING_READ_ONLY';
/** New tunnels and uploads at the hard transfer cap are refused with it (403). */
export const ERR_TRANSFER_LIMIT = 'ERR_CODE_TRANSFER_LIMIT';

export const READ_ONLY_MESSAGE = 'This organization is read-only because a payment is overdue: changes are paused until the payment is made. Devices stay connected.';
export const TRANSFER_LIMIT_MESSAGE = 'This month’s transfer limit is reached: new tunnels and uploads are paused. Devices stay connected and open tunnels stay up.';

/** The error code of an API error (`{ errors: [{ code }] }`), or ''. */
export const apiErrorCode = (err: unknown): string => {
	const e = err as { data?: { errors?: { code?: unknown }[] } } | null;
	const code = e?.data?.errors?.[0]?.code;
	return typeof code === 'string' ? code : '';
};

/** A clear message for the billing refusals (by error code), or null for any other error. */
export const billingErrorMessage = (code: string | null | undefined): string | null => {
	if (code === ERR_BILLING_READ_ONLY) return READ_ONLY_MESSAGE;
	if (code === ERR_TRANSFER_LIMIT) return TRANSFER_LIMIT_MESSAGE;
	return null;
};

// ---- Dates (UTC: the server's billing calendar) ----

const DAY = 86_400_000;

const parseTime = (iso: string | null | undefined): number | null => {
	if (!iso) return null;
	const t = new Date(iso).getTime();
	return Number.isNaN(t) ? null : t;
};

/** "Dec 8, 2026" in UTC; '' for a missing or invalid date. */
export const formatDay = (iso: string | null | undefined): string => {
	const t = parseTime(iso);
	if (t === null) return '';
	return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(t));
};

/** YYYY-MM-DD in UTC (date inputs); '' for a missing or invalid date. */
export const isoDay = (iso: string | null | undefined): string => {
	const t = parseTime(iso);
	return t === null ? '' : new Date(t).toISOString().slice(0, 10);
};

/** The UTC month of a period start, YYYY-MM ('' when invalid). */
export const periodMonth = (start: string | null | undefined): string => isoDay(start).slice(0, 7);

/** Whole days from `now` until `iso`, rounded up (0 once it passed); null without a valid date. */
export const daysUntil = (iso: string | null | undefined, now: Date = new Date()): number | null => {
	const t = parseTime(iso);
	if (t === null) return null;
	return Math.max(0, Math.ceil((t - now.getTime()) / DAY));
};

/** "today", "1 day", "12 days". */
export const daysLabel = (days: number): string => (days <= 0 ? 'today' : days === 1 ? '1 day' : `${days} days`);

/** The first day of the next UTC month: when a hard cap ends. */
export const nextMonthStart = (now: Date = new Date()): string =>
	new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

/** The day after a comped organization's last free day (the end is that day's end, UTC). */
const compedEnd = (iso: string | null | undefined): string | null => {
	const t = parseTime(iso);
	if (t === null) return null;
	const d = new Date(t);
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
};

// ---- Money ----

/**
 * Cents as money ("$12.34", "-$5.00", "€9.00"). Unknown currencies fall back to "12.34 XYZ"; a missing or
 * non-finite amount is $0.00.
 */
export const formatCents = (cents: number | null | undefined, currency = 'usd'): string => {
	const n = typeof cents === 'number' && Number.isFinite(cents) ? Math.round(cents) : 0;
	const cur = (currency || 'usd').toUpperCase();
	try {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n / 100);
	}
	catch {
		return `${(n / 100).toFixed(2)} ${cur}`;
	}
};

/** A USD price of the plans file (dollars, not cents). */
export const formatPrice = (usd: number | null | undefined): string =>
	formatCents(typeof usd === 'number' && Number.isFinite(usd) ? Math.round(usd * 100) : 0);

/** "No limit" or "$50.00 per month". */
export const spendingLimitLabel = (cents: number | null | undefined): string =>
	cents === null || cents === undefined ? 'No limit' : `${formatCents(cents)} per month`;

/** The spending limit input in USD: empty is no limit (null); otherwise 0–1,000,000,000 with at most 2 decimals. */
export const parseSpendingLimit = (input: string | number | null | undefined): { value: number | null; error: string | null } => {
	const text = input === null || input === undefined ? '' : String(input).trim().replace(/^\$\s*/, '').replace(/,/g, '');
	if (text === '') return { value: null, error: null };
	if (!/^\d+(\.\d{1,2})?$/.test(text)) return { value: null, error: 'Enter an amount in USD (for example 50 or 49.99), or leave it empty for no limit.' };
	const value = Number(text);
	if (value > 1e9) return { value: null, error: 'At most $1,000,000,000.' };
	return { value, error: null };
};

/** The spending limit in cents as the editor's text ("" for none, "50", "49.99"). */
export const spendingLimitText = (cents: number | null | undefined): string => {
	if (cents === null || cents === undefined || !Number.isFinite(cents)) return '';
	return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
};

/** A plan's terms as short facts ("$49.00 per month", "50 devices included", …). */
export const planFacts = (plan: BillingPlan | null | undefined): string[] => {
	if (!plan) return [];
	const out: string[] = [];
	out.push(plan.base_price && plan.base_price > 0 ? `${formatPrice(plan.base_price)} per month` : 'No monthly price');
	if (plan.included_devices) out.push(`${formatCount(plan.included_devices)} devices included`);
	if (plan.price_per_device && plan.price_per_device > 0) out.push(`${formatPrice(plan.price_per_device)} per extra device`);
	out.push(plan.max_clients === null || plan.max_clients === undefined ? 'No device limit' : `Up to ${formatCount(plan.max_clients)} devices`);
	if (plan.transfer_base || plan.transfer_per_device) {
		out.push(`${formatBytes(plan.transfer_base ?? 0)} transfer${plan.transfer_per_device ? ` + ${formatBytes(plan.transfer_per_device)} per device` : ''}`);
	}
	if (plan.overage === 'bill') out.push(`Overage ${formatPrice(plan.overage_price_per_gib ?? 0)} per GiB`);
	else if (plan.overage === 'cap') out.push('Transfer stops at the limit');
	return out;
};

/** A period's transfer against its allowance ("12.4 GiB of 250 GiB", or just the transfer without an allowance). */
export const periodTransferLabel = (p: Pick<BillingPeriod, 'transfer_bytes' | 'allowance_bytes'>): string =>
	p.allowance_bytes ? `${formatBytes(p.transfer_bytes)} of ${formatBytes(p.allowance_bytes)}` : formatBytes(p.transfer_bytes);

// ---- Status ----

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export interface StatusSummary {
	kind: 'trial' | 'paying' | 'free' | 'exempt' | 'comped' | 'unassigned' | 'unknown';
	label: string;
	detail: string;
	tone: Tone;
}

/** Whether the plan costs nothing (the free plan, or a plan without a base or device price). */
export const isFreePlan = (plan: BillingPlan | null | undefined): boolean =>
	!!plan && (!(plan.base_price && plan.base_price > 0) && !(plan.price_per_device && plan.price_per_device > 0) && plan.overage !== 'bill');

/** What an organization's billing status means, for the Billing page and the operator screens. */
export const billingStatusSummary = (a: BillingAccount | null | undefined, now: Date = new Date()): StatusSummary => {
	if (!a) return { kind: 'unknown', label: 'Unknown', detail: '', tone: 'neutral' };
	if (a.status === 'trial') {
		const days = daysUntil(a.trial_ends_at, now);
		const end = formatDay(a.trial_ends_at);
		const detail = days === null ? 'Trial' : `${days <= 0 ? 'Ends today' : `${daysLabel(days)} left`}${end ? ` · ends ${end}` : ''}`;
		return { kind: 'trial', label: 'Trial', detail, tone: days !== null && days <= 3 ? 'warn' : 'info' };
	}
	if (a.status === 'comped') {
		const until = formatDay(a.comped_until);
		return { kind: 'comped', label: 'Complimentary', detail: until ? `Not charged until ${until}` : 'Not charged', tone: 'info' };
	}
	if (a.status === 'exempt') {
		const limits = a.exempt_limits === 'none' ? 'no limits' : 'plan limits apply';
		return { kind: 'exempt', label: 'Exempt', detail: `Never charged · ${limits}${a.reason ? ` · ${a.reason}` : ''}`, tone: 'neutral' };
	}
	if (a.plan_unassigned) return { kind: 'unassigned', label: 'No plan yet', detail: 'Metered, without limits', tone: 'neutral' };
	if (a.status === 'paying') {
		if (isFreePlan(a.plan_details)) return { kind: 'free', label: 'Free', detail: 'Nothing to pay', tone: 'neutral' };
		return { kind: 'paying', label: 'Paying', detail: a.has_payment_method === false ? 'No payment method on file' : 'Billed monthly', tone: 'ok' };
	}
	return { kind: 'unknown', label: a.status || 'Unknown', detail: '', tone: 'neutral' };
};

export interface Pill {
	kind: 'paying' | 'trial' | 'grace' | 'read_only' | 'suspension_proposed' | 'exempt' | 'comped' | 'free' | 'unknown';
	label: string;
	tone: Tone;
}

/**
 * The operator pill of an organization: the payment state wins over the billing status (suspension proposed,
 * read-only, grace after a failed payment), then trial, comped, exempt, free or paying.
 */
export const accountPill = (a: BillingAccount | null | undefined, p?: BillingProviderAccount | null): Pill => {
	if (p?.suspension_proposed || p?.state === 'suspension_proposed') return { kind: 'suspension_proposed', label: 'Suspension proposed', tone: 'danger' };
	if (p?.access === 'read_only' || p?.state === 'read_only') return { kind: 'read_only', label: 'Read-only', tone: 'danger' };
	if (p?.state === 'past_due') return { kind: 'grace', label: 'Grace period', tone: 'warn' };
	switch (a?.status) {
		case 'trial': return { kind: 'trial', label: 'Trial', tone: 'info' };
		case 'comped': return { kind: 'comped', label: 'Comped', tone: 'info' };
		case 'exempt': return { kind: 'exempt', label: 'Exempt', tone: 'neutral' };
		case 'paying': return isFreePlan(a.plan_details)
			? { kind: 'free', label: 'Free', tone: 'neutral' }
			: { kind: 'paying', label: 'Paying', tone: 'ok' };
	}
	return { kind: 'unknown', label: a?.status || 'Unknown', tone: 'neutral' };
};

/** A closed period's state. */
export const periodStateInfo = (state: string | null | undefined): { label: string; tone: Tone } => {
	switch (state) {
		case 'ready': return { label: 'To be charged', tone: 'info' };
		case 'held': return { label: 'Held for review', tone: 'warn' };
		case 'not_charged': return { label: 'Not charged', tone: 'neutral' };
		case 'never_charged': return { label: 'Never charged', tone: 'neutral' };
		case 'reported': return { label: 'Invoiced', tone: 'ok' };
	}
	return { label: state || '—', tone: 'neutral' };
};

/** A usage report's reconciliation state. */
export const reportStateInfo = (state: string | null | undefined): { label: string; tone: Tone } => {
	switch (state) {
		case 'confirmed': return { label: 'Confirmed', tone: 'ok' };
		case 'sent': return { label: 'Sent', tone: 'info' };
		case 'mismatch': return { label: 'Mismatch', tone: 'danger' };
		case 'failed': return { label: 'Failed', tone: 'danger' };
	}
	return { label: state || '—', tone: 'neutral' };
};

/** An invoice's state. */
export const invoiceStateInfo = (state: string | null | undefined): { label: string; tone: Tone } => {
	switch (state) {
		case 'paid': return { label: 'Paid', tone: 'ok' };
		case 'open': return { label: 'Due', tone: 'warn' };
		case 'uncollectible': return { label: 'Uncollectible', tone: 'danger' };
		case 'void': return { label: 'Void', tone: 'neutral' };
	}
	return { label: state || '—', tone: 'neutral' };
};

/** "Extra devices", "Overage GiB". */
export const metricLabel = (metric: string): string =>
	metric === 'extra_devices' ? 'Extra devices' : metric === 'overage_gib' ? 'Overage GiB' : metric;

const STATS: Record<string, { label: string; bad?: boolean }> = {
	webhooks_accepted: { label: 'Webhooks accepted' },
	webhooks_duplicate: { label: 'Webhooks repeated' },
	webhooks_unverified: { label: 'Webhooks unverified', bad: true },
	webhooks_failed: { label: 'Webhooks failed', bad: true },
	reports_sent: { label: 'Reports sent' },
	reports_failed: { label: 'Reports failed', bad: true },
	mismatches: { label: 'Mismatches', bad: true },
};

/** A provider counter's label, and whether any count above 0 is a problem. Unknown keys are shown as they are. */
export const statLabel = (key: string): { label: string; bad: boolean } => {
	const s = STATS[key];
	return s ? { label: s.label, bad: !!s.bad } : { label: key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), bad: false };
};

// ---- Meters ----

export interface Meter {
	/** used / limit (may pass 1); null when there is no limit. */
	ratio: number | null;
	/** "73%", "112%", "" without a limit. */
	percentLabel: string;
	/** Width of the filled bar, 0–100 (the bar's scale is the largest of the limit, the hard cap and the use). */
	fill: number;
	/** Position of the soft cap and the limit (100%) on the bar, 0–100; null when not shown. */
	softMark: number | null;
	limitMark: number | null;
	tone: 'ok' | 'warn' | 'danger';
}

const pct = (v: number, scale: number) => (scale > 0 ? Math.min(100, Math.max(0, (v / scale) * 100)) : 0);
const pctLabel = (ratio: number) => `${ratio > 0 && ratio < 0.01 ? '< 1' : Math.floor(ratio * 100)}%`;

/**
 * The month's transfer against the allowance: amber from the soft cap (80% by default), red at the hard cap or
 * while capped. A plan that bills overage turns amber past 100% (overage accrues) and red only when capped by the
 * spending limit. Without an allowance (no plan yet) there is no limit.
 */
export const transferMeter = (policy: BillingPolicy | null | undefined, state?: string | null): Meter => {
	const used = Math.max(0, policy?.used_bytes ?? 0);
	const allowance = Math.max(0, policy?.allowance_bytes ?? 0);
	const st = state ?? policy?.transfer_state ?? 'normal';
	if (!allowance) return { ratio: null, percentLabel: '', fill: 0, softMark: null, limitMark: null, tone: st === 'capped' ? 'danger' : 'ok' };
	const soft = Math.max(0, policy?.soft_cap_bytes ?? 0) || allowance * 0.8;
	const hard = Math.max(0, policy?.hard_cap_bytes ?? 0);
	const scale = Math.max(allowance, hard, used);
	const ratio = used / allowance;
	let tone: Meter['tone'] = 'ok';
	if (st === 'capped' || (hard > 0 && used >= hard)) tone = 'danger';
	else if (st === 'soft' || st === 'over' || used >= soft) tone = 'warn';
	return {
		ratio,
		percentLabel: pctLabel(ratio),
		fill: pct(used, scale),
		softMark: soft < allowance ? pct(soft, scale) : null,
		limitMark: scale > allowance ? pct(allowance, scale) : null,
		tone,
	};
};

/** Devices against the plan's device limit: amber from 80%, red at the limit; no limit (null) is unlimited. */
export const deviceMeter = (count: number | null | undefined, limit: number | null | undefined, softPercent = 80): Meter => {
	const used = Math.max(0, count ?? 0);
	if (limit === null || limit === undefined) return { ratio: null, percentLabel: '', fill: 0, softMark: null, limitMark: null, tone: 'ok' };
	if (limit <= 0) return { ratio: used > 0 ? Infinity : 1, percentLabel: '100%', fill: 100, softMark: null, limitMark: null, tone: 'danger' };
	const ratio = used / limit;
	const scale = Math.max(limit, used);
	return {
		ratio,
		percentLabel: pctLabel(ratio),
		fill: pct(used, scale),
		softMark: pct(limit * (softPercent / 100), scale),
		limitMark: scale > limit ? pct(limit, scale) : null,
		tone: ratio >= 1 ? 'danger' : ratio >= softPercent / 100 ? 'warn' : 'ok',
	};
};

// ---- Operator forms ----

/** The override's extra transfer: a size as the server reads it ("50GiB", "500 MB", "0" removes it). Null when valid. */
export const extraTransferError = (input: string): string | null => {
	const m = /^\s*(\d+(?:\.\d+)?)\s*([A-Za-z]*)\s*$/.exec(input);
	if (!m) return 'Enter a size such as 50GiB, or 0 to remove the extra transfer.';
	const [, amount = '', unit = ''] = m;
	if (!['', 'b', 'kib', 'mib', 'gib', 'tib', 'kb', 'mb', 'gb', 'tb'].includes(unit.toLowerCase())) return 'Units: B, KiB, MiB, GiB, TiB (or KB, MB, GB, TB).';
	if (Number(amount) !== 0 && unit === '') return 'Add a unit, for example 50GiB.';
	return null;
};

export interface StatusForm {
	status: BillingStatus;
	/** YYYY-MM-DD */
	trialEndsAt?: string;
	/** YYYY-MM-DD, the last day not charged */
	compedUntil?: string;
	reason?: string;
	exemptLimits?: 'plan' | 'none';
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The body of PUT /operator/organizations/{id}/billing/status from the editor, or the reason it can't be sent
 * (the server's own rules: a trial ends in the future, comped needs a day not in the past, exempt needs a reason).
 */
export const statusChangeBody = (f: StatusForm, now: Date = new Date()): { body: Record<string, string> | null; error: string | null } => {
	const reason = (f.reason ?? '').trim();
	if (reason.length > 500) return { body: null, error: 'The reason is at most 500 characters.' };
	const today = now.toISOString().slice(0, 10);
	switch (f.status) {
		case 'paying':
			return { body: { status: 'paying', ...(reason ? { reason } : {}) }, error: null };
		case 'trial': {
			const d = f.trialEndsAt ?? '';
			if (!DAY_RE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) return { body: null, error: 'Pick the day the trial ends.' };
			if (d <= today) return { body: null, error: 'A trial ends in the future.' };
			return { body: { status: 'trial', trial_ends_at: `${d}T00:00:00Z`, ...(reason ? { reason } : {}) }, error: null };
		}
		case 'comped': {
			const d = f.compedUntil ?? '';
			if (!DAY_RE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) return { body: null, error: 'Pick the last day not charged.' };
			if (d < today) return { body: null, error: 'The last free day can’t be in the past.' };
			return { body: { status: 'comped', comped_until: `${d}T00:00:00Z`, ...(reason ? { reason } : {}) }, error: null };
		}
		case 'exempt':
			if (!reason) return { body: null, error: 'An exempt organization needs a reason.' };
			return { body: { status: 'exempt', reason, exempt_limits: f.exemptLimits === 'none' ? 'none' : 'plan' }, error: null };
	}
	return { body: null, error: 'Pick a status.' };
};

/** A plan id for PUT …/billing/plan or a checkout. Null when acceptable. */
export const planIdError = (id: string): string | null => {
	const v = id.trim();
	if (!v) return 'Enter a plan ID.';
	if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/.test(v)) return 'A plan ID is letters, digits, “-”, “_” or “.”.';
	return null;
};

// ---- Banners ----

export interface BillingBanner {
	id: 'read-only' | 'past-due' | 'capped' | 'soft-cap' | 'over' | 'trial-ending' | 'comped-ending';
	tone: 'danger' | 'warn' | 'info';
	title: string;
	text: string;
	/** portal: the provider's customer portal; checkout: add a payment method for the plan; billing: the Billing page. */
	action?: { label: string; kind: 'portal' | 'checkout' | 'billing' };
	/** Warnings can be hidden for the session; refusals can't. */
	dismissible: boolean;
}

export interface BannerInput {
	account?: BillingAccount | null;
	payment?: BillingPayment | null;
	/** The user is an administrator (sees the account and can act on it). */
	isAdmin: boolean;
	/** A request was refused with ERR_CODE_BILLING_READ_ONLY in this session. */
	sawReadOnly?: boolean;
	/** A request was refused with ERR_CODE_TRANSFER_LIMIT in this session. */
	sawTransferLimit?: boolean;
	/** Whether a payment provider is configured (checkout and portal exist). */
	hasProvider?: boolean;
	now?: Date;
}

/** Days before a trial or complimentary period ends that the banner shows (as the server's emails: 14 and 3). */
export const ENDING_SOON_DAYS = 14;

/** The app-wide billing banners, most severe first. */
export const billingBanners = (input: BannerInput): BillingBanner[] => {
	const { account: a, payment: pay, isAdmin, hasProvider = !!input.payment } = input;
	const now = input.now ?? new Date();
	const out: BillingBanner[] = [];
	const dunning = pay?.dunning?.state;
	const readOnly = pay?.access === 'read_only' || dunning === 'read_only' || dunning === 'suspension_proposed' || !!input.sawReadOnly;

	if (readOnly) {
		out.push({
			id: 'read-only',
			tone: 'danger',
			title: 'Read-only: a payment is overdue',
			text: `You can see everything, but changes, new jobs, tunnels and uploads are refused and scheduled runs are paused. Devices stay connected and open tunnels stay up.${isAdmin ? ' Paying the overdue invoice restores everything at once.' : ' Ask an administrator of your organization to pay the overdue invoice.'}`,
			action: isAdmin && hasProvider ? { label: 'Pay now', kind: 'portal' } : undefined,
			dismissible: false,
		});
	}
	else if (dunning === 'past_due') {
		const days = daysUntil(pay?.read_only_from, now);
		const when = days === null ? '' : ` in ${daysLabel(days)}${pay?.read_only_from ? ` (${formatDay(pay.read_only_from)})` : ''}`;
		out.push({
			id: 'past-due',
			tone: 'warn',
			title: 'A payment failed',
			text: `Everything keeps working during the grace period. Update the payment method, or the organization becomes read-only${when || ' when the grace period ends'}.`,
			action: isAdmin && hasProvider ? { label: 'Update payment', kind: 'portal' } : undefined,
			dismissible: false,
		});
	}

	const state = a?.transfer_state ?? a?.policy?.transfer_state;
	const capped = state === 'capped' || !!input.sawTransferLimit;
	if (capped) {
		const plan = a?.plan_details;
		const limitHit = plan?.overage === 'bill' && a?.spending_limit_cents !== null && a?.spending_limit_cents !== undefined;
		out.push({
			id: 'capped',
			tone: 'danger',
			title: limitHit ? 'Spending limit reached' : 'Transfer limit reached',
			text: `New tunnels and uploads are paused until ${formatDay(nextMonthStart(now))}, and open tunnels are slowed. Devices stay connected; commands, scripts, schedules and monitoring keep working.${isAdmin ? (limitHit ? ' Raise the spending limit to resume.' : ' Upgrade the plan to resume.') : ' Ask an administrator of your organization.'}`,
			action: isAdmin ? { label: limitHit ? 'Spending limit' : 'See plans', kind: 'billing' } : undefined,
			dismissible: false,
		});
	}
	else if (isAdmin && a && state === 'over') {
		const price = a.plan_details?.overage_price_per_gib;
		const so = a.policy?.overage_cents;
		out.push({
			id: 'over',
			tone: 'warn',
			title: 'Past this month’s transfer allowance',
			text: `Transfer beyond the allowance is billed${price ? ` at ${formatPrice(price)} per GiB` : ' as overage'}${so ? ` (about ${formatCents(so)} so far)` : ''}.${a.spending_limit_cents === null || a.spending_limit_cents === undefined ? ' Set a spending limit to cap it.' : ''}`,
			action: { label: 'Billing', kind: 'billing' },
			dismissible: true,
		});
	}
	else if (isAdmin && a && (state === 'soft' || a.soft_cap_reached)) {
		const used = a.policy?.used_bytes ?? 0;
		const allowance = a.policy?.allowance_bytes ?? 0;
		const ratio = allowance ? used / allowance : 0;
		const willCap = a.plan_details?.overage !== 'bill';
		out.push({
			id: 'soft-cap',
			tone: 'warn',
			title: `${allowance ? pctLabel(ratio) : 'Most'} of this month’s transfer used`,
			text: willCap
				? 'At the limit, new tunnels and uploads pause until next month (devices stay connected).'
				: 'Past the allowance, transfer is billed as overage.',
			action: { label: 'Billing', kind: 'billing' },
			dismissible: true,
		});
	}

	if (isAdmin && a?.status === 'trial') {
		const days = daysUntil(a.trial_ends_at, now);
		if (days !== null && days <= ENDING_SOON_DAYS) {
			const planName = a.plan_details?.name || a.plan;
			out.push({
				id: 'trial-ending',
				tone: days <= 3 ? 'warn' : 'info',
				title: days <= 0 ? 'Your trial ends today' : `Your trial ends in ${daysLabel(days)}`,
				text: a.has_payment_method
					? `On ${formatDay(a.trial_ends_at)} you continue on ${planName} with the payment method on file.`
					: `Add a payment method to stay on ${planName}; without one the organization moves to the free plan on ${formatDay(a.trial_ends_at)}.`,
				action: !a.has_payment_method && hasProvider ? { label: 'Add payment method', kind: 'checkout' } : undefined,
				dismissible: true,
			});
		}
	}
	if (isAdmin && a?.status === 'comped' && !a.has_payment_method) {
		const days = daysUntil(compedEnd(a.comped_until), now);
		if (days !== null && days <= ENDING_SOON_DAYS) {
			out.push({
				id: 'comped-ending',
				tone: 'info',
				title: `Complimentary period ends in ${daysLabel(days)}`,
				text: `${formatDay(a.comped_until)} is the last day not charged. Add a payment method to stay on ${a.plan_details?.name || a.plan}.`,
				action: hasProvider ? { label: 'Add payment method', kind: 'checkout' } : undefined,
				dismissible: true,
			});
		}
	}
	return out;
};
