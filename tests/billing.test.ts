import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	ERR_BILLING_READ_ONLY, ERR_TRANSFER_LIMIT, READ_ONLY_MESSAGE, TRANSFER_LIMIT_MESSAGE,
	accountPill, apiErrorCode, billingBanners, billingErrorMessage, billingStatusSummary, daysUntil, deviceMeter,
	extraTransferError, formatCents, formatDay, formatPrice, invoiceStateInfo, isFreePlan, nextMonthStart,
	parseSpendingLimit, periodMonth, periodStateInfo, periodTransferLabel, planFacts, planIdError, reportStateInfo,
	spendingLimitLabel, spendingLimitText, statLabel, statusChangeBody, transferMeter,
	type BillingAccount, type BillingPlan,
} from '../utils/billing.ts';
import { apiErrorMessage } from '../utils/apiError.ts';

const GiB = 1024 ** 3;
const NOW = new Date('2026-11-24T15:30:00Z');

const team: BillingPlan = {
	id: 'team', name: 'Team', base_price: 49, included_devices: 50, price_per_device: 0.8, max_clients: null,
	transfer_base: 250 * GiB, transfer_per_device: 5 * GiB, overage: 'bill', overage_price_per_gib: 0.2, soft_cap: 80, hard_cap: 0,
};
const free: BillingPlan = { id: 'free', name: 'Free', max_clients: 10, transfer_base: 10 * GiB, overage: 'cap', soft_cap: 80, hard_cap: 100 };
const acct = (over: Partial<BillingAccount> = {}): BillingAccount => ({
	organization: 'acme', plan: 'team', status: 'paying', has_payment_method: true, spending_limit_cents: null,
	transfer_state: 'normal', plan_details: team,
	policy: { transfer_state: 'normal', allowance_bytes: 250 * GiB, used_bytes: 10 * GiB, soft_cap_bytes: 200 * GiB, hard_cap_bytes: 0 },
	...over,
});

describe('error codes', () => {
	const refusal = (code: string) => ({ data: { errors: [{ code, title: 'raw server text' }] } });
	it('reads the code of an API error', () => {
		assert.equal(apiErrorCode(refusal(ERR_TRANSFER_LIMIT)), ERR_TRANSFER_LIMIT);
		assert.equal(apiErrorCode({}), '');
		assert.equal(apiErrorCode(null), '');
		assert.equal(apiErrorCode({ data: { errors: [{ code: 403 }] } }), '');
	});
	it('explains the billing refusals', () => {
		assert.equal(billingErrorMessage(ERR_BILLING_READ_ONLY), READ_ONLY_MESSAGE);
		assert.equal(billingErrorMessage(ERR_TRANSFER_LIMIT), TRANSFER_LIMIT_MESSAGE);
		assert.equal(billingErrorMessage('ERR_CODE_OTHER'), null);
	});
	it('replaces the raw text in apiErrorMessage, nothing else', () => {
		assert.equal(apiErrorMessage(refusal(ERR_BILLING_READ_ONLY)), READ_ONLY_MESSAGE);
		assert.equal(apiErrorMessage(refusal(ERR_TRANSFER_LIMIT)), TRANSFER_LIMIT_MESSAGE);
		assert.equal(apiErrorMessage(refusal('ERR_CODE_X')), 'raw server text');
	});
});

describe('money', () => {
	it('formats cents', () => {
		assert.equal(formatCents(0), '$0.00');
		assert.equal(formatCents(1234), '$12.34');
		assert.equal(formatCents(4900), '$49.00');
		assert.equal(formatCents(123456789), '$1,234,567.89');
		assert.equal(formatCents(-500), '-$5.00');
		assert.equal(formatCents(5, 'eur'), '€0.05');
	});
	it('treats missing and invalid amounts as 0 and survives unknown currencies', () => {
		assert.equal(formatCents(undefined), '$0.00');
		assert.equal(formatCents(null), '$0.00');
		assert.equal(formatCents(Number.NaN), '$0.00');
		assert.equal(formatCents(1999, 'not-a-currency'), '19.99 NOT-A-CURRENCY');
	});
	it('rounds fractional cents', () => {
		assert.equal(formatCents(1234.6), '$12.35');
	});
	it('formats plan prices in dollars', () => {
		assert.equal(formatPrice(0.8), '$0.80');
		assert.equal(formatPrice(0.2), '$0.20');
		assert.equal(formatPrice(49), '$49.00');
		assert.equal(formatPrice(undefined), '$0.00');
	});
	it('labels the spending limit', () => {
		assert.equal(spendingLimitLabel(null), 'No limit');
		assert.equal(spendingLimitLabel(undefined), 'No limit');
		assert.equal(spendingLimitLabel(5000), '$50.00 per month');
		assert.equal(spendingLimitLabel(0), '$0.00 per month');
	});
	it('parses the spending limit input', () => {
		assert.deepEqual(parseSpendingLimit(''), { value: null, error: null });
		assert.deepEqual(parseSpendingLimit('  '), { value: null, error: null });
		assert.deepEqual(parseSpendingLimit('50'), { value: 50, error: null });
		assert.deepEqual(parseSpendingLimit('$49.99'), { value: 49.99, error: null });
		assert.deepEqual(parseSpendingLimit('1,000'), { value: 1000, error: null });
		assert.deepEqual(parseSpendingLimit('0'), { value: 0, error: null });
		assert.ok(parseSpendingLimit('-5').error);
		assert.ok(parseSpendingLimit('12.345').error);
		assert.ok(parseSpendingLimit('abc').error);
		assert.ok(parseSpendingLimit('2000000000').error);
	});
	it('shows a limit in the editor', () => {
		assert.equal(spendingLimitText(null), '');
		assert.equal(spendingLimitText(5000), '50');
		assert.equal(spendingLimitText(4999), '49.99');
		assert.equal(spendingLimitText(4990), '49.90');
	});
});

describe('dates', () => {
	it('counts days left, rounding up, never below 0', () => {
		assert.equal(daysUntil('2026-12-08T00:00:00Z', NOW), 14);
		assert.equal(daysUntil('2026-11-25T00:00:00Z', NOW), 1);
		assert.equal(daysUntil('2026-11-24T16:00:00Z', NOW), 1);
		assert.equal(daysUntil('2026-11-20T00:00:00Z', NOW), 0);
		assert.equal(daysUntil(null, NOW), null);
		assert.equal(daysUntil('nope', NOW), null);
	});
	it('formats days in UTC', () => {
		assert.equal(formatDay('2026-12-08T00:00:00Z'), 'Dec 8, 2026');
		assert.equal(formatDay('2026-12-31T23:59:59Z'), 'Dec 31, 2026');
		assert.equal(formatDay(''), '');
	});
	it('knows when a cap ends and which month a period is', () => {
		assert.equal(nextMonthStart(NOW), '2026-12-01T00:00:00.000Z');
		assert.equal(nextMonthStart(new Date('2026-12-15T00:00:00Z')), '2027-01-01T00:00:00.000Z');
		assert.equal(periodMonth('2026-10-01T00:00:00Z'), '2026-10');
		assert.equal(periodMonth(undefined), '');
	});
});

describe('billingStatusSummary', () => {
	it('shows a trial with the days left', () => {
		const s = billingStatusSummary(acct({ status: 'trial', trial_ends_at: '2026-12-08T00:00:00Z' }), NOW);
		assert.equal(s.kind, 'trial');
		assert.equal(s.detail, '14 days left · ends Dec 8, 2026');
		assert.equal(s.tone, 'info');
		assert.equal(billingStatusSummary(acct({ status: 'trial', trial_ends_at: '2026-11-26T00:00:00Z' }), NOW).tone, 'warn');
		assert.match(billingStatusSummary(acct({ status: 'trial', trial_ends_at: '2026-11-20T00:00:00Z' }), NOW).detail, /^Ends today/);
	});
	it('shows paying, free, exempt, comped and no plan', () => {
		assert.equal(billingStatusSummary(acct(), NOW).kind, 'paying');
		assert.equal(billingStatusSummary(acct({ has_payment_method: false }), NOW).detail, 'No payment method on file');
		assert.equal(billingStatusSummary(acct({ plan: 'free', plan_details: free }), NOW).kind, 'free');
		const ex = billingStatusSummary(acct({ status: 'exempt', reason: 'partner', exempt_limits: 'none' }), NOW);
		assert.equal(ex.kind, 'exempt');
		assert.equal(ex.detail, 'Never charged · no limits · partner');
		assert.equal(billingStatusSummary(acct({ status: 'comped', comped_until: '2027-03-31T00:00:00Z' }), NOW).detail, 'Not charged until Mar 31, 2027');
		assert.equal(billingStatusSummary(acct({ plan_unassigned: true }), NOW).kind, 'unassigned');
		assert.equal(billingStatusSummary(null).kind, 'unknown');
	});
	it('knows free plans', () => {
		assert.equal(isFreePlan(free), true);
		assert.equal(isFreePlan(team), false);
		assert.equal(isFreePlan({ id: 'x', overage: 'bill' }), false);
		assert.equal(isFreePlan(null), false);
	});
});

describe('accountPill', () => {
	it('puts the payment state first', () => {
		assert.equal(accountPill(acct(), { organization: 'acme', suspension_proposed: true, state: 'suspension_proposed' }).kind, 'suspension_proposed');
		assert.equal(accountPill(acct(), { organization: 'acme', access: 'read_only', state: 'read_only' }).kind, 'read_only');
		assert.equal(accountPill(acct(), { organization: 'acme', state: 'past_due', access: 'full' }).kind, 'grace');
		assert.equal(accountPill(acct(), { organization: 'acme', state: 'none', access: 'full' }).kind, 'paying');
	});
	it('then the billing status', () => {
		assert.equal(accountPill(acct({ status: 'trial' })).kind, 'trial');
		assert.equal(accountPill(acct({ status: 'comped' })).kind, 'comped');
		assert.equal(accountPill(acct({ status: 'exempt' })).kind, 'exempt');
		assert.equal(accountPill(acct({ plan: 'free', plan_details: free })).kind, 'free');
		assert.equal(accountPill(acct()).label, 'Paying');
		assert.equal(accountPill(null).kind, 'unknown');
	});
	it('labels period, report and invoice states', () => {
		assert.equal(periodStateInfo('held').tone, 'warn');
		assert.equal(periodStateInfo('reported').label, 'Invoiced');
		assert.equal(periodStateInfo('weird').label, 'weird');
		assert.equal(reportStateInfo('mismatch').tone, 'danger');
		assert.equal(invoiceStateInfo('open').label, 'Due');
	});
	it('labels the provider counters', () => {
		assert.deepEqual(statLabel('webhooks_unverified'), { label: 'Webhooks unverified', bad: true });
		assert.deepEqual(statLabel('reports_sent'), { label: 'Reports sent', bad: false });
		assert.deepEqual(statLabel('new_counter'), { label: 'New counter', bad: false });
	});
});

describe('transferMeter', () => {
	const policy = (used: number, over: object = {}) => ({ allowance_bytes: 10 * GiB, used_bytes: used, soft_cap_bytes: 8 * GiB, hard_cap_bytes: 10 * GiB, ...over });
	it('is ok below the soft cap', () => {
		const m = transferMeter(policy(5 * GiB));
		assert.equal(m.tone, 'ok');
		assert.equal(m.percentLabel, '50%');
		assert.equal(m.fill, 50);
		assert.equal(m.softMark, 80);
		assert.equal(m.limitMark, null);
	});
	it('turns amber at the soft cap (80%) and red at the hard cap', () => {
		assert.equal(transferMeter(policy(8 * GiB)).tone, 'warn');
		assert.equal(transferMeter(policy(7.9 * GiB, { transfer_state: 'soft' })).tone, 'warn');
		assert.equal(transferMeter(policy(10 * GiB)).tone, 'danger');
		assert.equal(transferMeter(policy(3 * GiB), 'capped').tone, 'danger');
	});
	it('uses 80% when the server sends no soft cap', () => {
		assert.equal(transferMeter({ allowance_bytes: 100, used_bytes: 80 }).tone, 'warn');
		assert.equal(transferMeter({ allowance_bytes: 100, used_bytes: 79 }).tone, 'ok');
	});
	it('scales past 100% on plans that bill overage and marks the allowance', () => {
		const m = transferMeter({ allowance_bytes: 100 * GiB, used_bytes: 125 * GiB, soft_cap_bytes: 80 * GiB, hard_cap_bytes: 0, transfer_state: 'over' });
		assert.equal(m.tone, 'warn');
		assert.equal(m.percentLabel, '125%');
		assert.equal(m.fill, 100);
		assert.equal(m.limitMark, 80);
		assert.equal(m.softMark, 64);
	});
	it('marks a hard cap above the allowance', () => {
		const m = transferMeter({ allowance_bytes: 100, used_bytes: 50, soft_cap_bytes: 80, hard_cap_bytes: 120 });
		assert.equal(Math.round(m.limitMark ?? 0), 83);
		assert.equal(m.tone, 'ok');
	});
	it('has no limit without an allowance', () => {
		const m = transferMeter({ allowance_bytes: 0, used_bytes: 5 * GiB });
		assert.equal(m.ratio, null);
		assert.equal(m.percentLabel, '');
		assert.equal(transferMeter(null).ratio, null);
	});
	it('shows tiny use as "< 1%"', () => {
		assert.equal(transferMeter({ allowance_bytes: 1000, used_bytes: 1 }).percentLabel, '< 1%');
		assert.equal(transferMeter({ allowance_bytes: 1000, used_bytes: 0 }).percentLabel, '0%');
	});
});

describe('deviceMeter', () => {
	it('is unlimited without a limit', () => {
		assert.equal(deviceMeter(12, null).ratio, null);
		assert.equal(deviceMeter(12, undefined).tone, 'ok');
	});
	it('turns amber at 80% and red at the limit', () => {
		assert.equal(deviceMeter(7, 10).tone, 'ok');
		assert.equal(deviceMeter(8, 10).tone, 'warn');
		assert.equal(deviceMeter(10, 10).tone, 'danger');
		assert.equal(deviceMeter(12, 10).percentLabel, '120%');
		assert.equal(deviceMeter(0, 0).tone, 'danger');
	});
});

describe('plan facts', () => {
	it('summarises a paid plan', () => {
		assert.deepEqual(planFacts(team), ['$49.00 per month', '50 devices included', '$0.80 per extra device', 'No device limit', '250 GiB transfer + 5 GiB per device', 'Overage $0.20 per GiB']);
	});
	it('summarises the free plan', () => {
		assert.deepEqual(planFacts(free), ['No monthly price', 'Up to 10 devices', '10 GiB transfer', 'Transfer stops at the limit']);
		assert.deepEqual(planFacts(null), []);
	});
	it('labels a period\'s transfer', () => {
		assert.equal(periodTransferLabel({ transfer_bytes: 5 * GiB, allowance_bytes: 10 * GiB }), '5 GiB of 10 GiB');
		assert.equal(periodTransferLabel({ transfer_bytes: 5 * GiB, allowance_bytes: 0 }), '5 GiB');
	});
});

describe('operator forms', () => {
	it('checks the extra transfer', () => {
		assert.equal(extraTransferError('50GiB'), null);
		assert.equal(extraTransferError('1.5 TiB'), null);
		assert.equal(extraTransferError('500MB'), null);
		assert.equal(extraTransferError('0'), null);
		assert.ok(extraTransferError('50'));
		assert.ok(extraTransferError('50 parsecs'));
		assert.ok(extraTransferError(''));
		assert.ok(extraTransferError('-1GiB'));
	});
	it('checks plan ids', () => {
		assert.equal(planIdError('team'), null);
		assert.ok(planIdError(''));
		assert.ok(planIdError('a plan'));
	});
	it('builds the status change', () => {
		assert.deepEqual(statusChangeBody({ status: 'paying' }, NOW), { body: { status: 'paying' }, error: null });
		assert.deepEqual(statusChangeBody({ status: 'trial', trialEndsAt: '2026-12-08' }, NOW).body, { status: 'trial', trial_ends_at: '2026-12-08T00:00:00Z' });
		assert.ok(statusChangeBody({ status: 'trial', trialEndsAt: '2026-11-24' }, NOW).error);
		assert.ok(statusChangeBody({ status: 'trial' }, NOW).error);
		assert.deepEqual(statusChangeBody({ status: 'comped', compedUntil: '2026-11-24', reason: ' launch ' }, NOW).body, { status: 'comped', comped_until: '2026-11-24T00:00:00Z', reason: 'launch' });
		assert.ok(statusChangeBody({ status: 'comped', compedUntil: '2026-11-23' }, NOW).error);
		assert.ok(statusChangeBody({ status: 'exempt' }, NOW).error);
		assert.deepEqual(statusChangeBody({ status: 'exempt', reason: 'partner', exemptLimits: 'none' }, NOW).body, { status: 'exempt', reason: 'partner', exempt_limits: 'none' });
		assert.deepEqual(statusChangeBody({ status: 'exempt', reason: 'partner' }, NOW).body?.exempt_limits, 'plan');
		assert.ok(statusChangeBody({ status: 'paying', reason: 'x'.repeat(501) }, NOW).error);
	});
});

describe('billingBanners', () => {
	const ids = (input: Parameters<typeof billingBanners>[0]) => billingBanners({ now: NOW, ...input }).map(b => b.id);
	it('shows nothing for a healthy account', () => {
		assert.deepEqual(ids({ account: acct(), payment: { access: 'full', dunning: { state: 'none' } }, isAdmin: true }), []);
		assert.deepEqual(ids({ isAdmin: false }), []);
	});
	it('shows read-only first, with the portal for administrators', () => {
		const b = billingBanners({ account: acct({ transfer_state: 'capped' }), payment: { access: 'read_only', dunning: { state: 'read_only' } }, isAdmin: true, now: NOW });
		assert.deepEqual(b.map(x => x.id), ['read-only', 'capped']);
		assert.equal(b[0]!.action?.kind, 'portal');
		assert.equal(b[0]!.dismissible, false);
	});
	it('shows read-only to members from a refusal, without an action', () => {
		const [b] = billingBanners({ isAdmin: false, sawReadOnly: true, now: NOW });
		assert.ok(b);
		assert.equal(b.id, 'read-only');
		assert.equal(b.action, undefined);
		assert.match(b.text, /Ask an administrator/);
	});
	it('shows a failed payment with the days until read-only', () => {
		const [b] = billingBanners({ account: acct(), payment: { access: 'full', dunning: { state: 'past_due' }, read_only_from: '2026-12-01T00:00:00Z' }, isAdmin: true, now: NOW });
		assert.ok(b);
		assert.equal(b.id, 'past-due');
		assert.match(b.text, /in 7 days \(Dec 1, 2026\)/);
	});
	it('shows the hard cap with the day it ends, and that devices stay connected', () => {
		const [b] = billingBanners({ account: acct({ plan_details: free, transfer_state: 'capped' }), isAdmin: true, now: NOW });
		assert.ok(b);
		assert.equal(b.id, 'capped');
		assert.equal(b.title, 'Transfer limit reached');
		assert.match(b.text, /paused until Dec 1, 2026/);
		assert.match(b.text, /Devices stay connected/);
		const [s] = billingBanners({ account: acct({ transfer_state: 'capped', spending_limit_cents: 5000 }), isAdmin: true, now: NOW });
		assert.ok(s);
		assert.equal(s.title, 'Spending limit reached');
		assert.deepEqual(ids({ isAdmin: false, sawTransferLimit: true }), ['capped']);
	});
	it('warns at the soft cap and past the allowance (administrators only)', () => {
		const soft = acct({ plan_details: free, transfer_state: 'soft', soft_cap_reached: true, policy: { allowance_bytes: 10 * GiB, used_bytes: 8.5 * GiB } });
		const [b] = billingBanners({ account: soft, isAdmin: true, now: NOW });
		assert.ok(b);
		assert.equal(b.id, 'soft-cap');
		assert.equal(b.title, '85% of this month’s transfer used');
		assert.equal(b.dismissible, true);
		assert.deepEqual(ids({ account: soft, isAdmin: false }), []);
		const [o] = billingBanners({ account: acct({ transfer_state: 'over', policy: { overage_cents: 340 } }), isAdmin: true, now: NOW });
		assert.ok(o);
		assert.equal(o.id, 'over');
		assert.match(o.text, /\$0\.20 per GiB \(about \$3\.40 so far\)/);
	});
	it('announces a trial ending within 14 days', () => {
		const trial = (end: string, pm = false) => acct({ status: 'trial', trial_ends_at: end, has_payment_method: pm });
		assert.deepEqual(ids({ account: trial('2026-12-20T00:00:00Z'), isAdmin: true }), []);
		const [b] = billingBanners({ account: trial('2026-12-04T00:00:00Z'), isAdmin: true, hasProvider: true, now: NOW });
		assert.ok(b);
		assert.equal(b.title, 'Your trial ends in 10 days');
		assert.equal(b.action?.kind, 'checkout');
		assert.equal(b.tone, 'info');
		const [c] = billingBanners({ account: trial('2026-11-26T00:00:00Z', true), isAdmin: true, hasProvider: true, now: NOW });
		assert.ok(c);
		assert.equal(c.action, undefined);
		assert.equal(c.tone, 'warn');
		assert.match(c.text, /payment method on file/);
	});
	it('announces a complimentary period ending', () => {
		assert.deepEqual(ids({ account: acct({ status: 'comped', comped_until: '2026-11-30T00:00:00Z', has_payment_method: false }), isAdmin: true }), ['comped-ending']);
		assert.deepEqual(ids({ account: acct({ status: 'comped', comped_until: '2026-11-30T00:00:00Z', has_payment_method: true }), isAdmin: true }), []);
	});
	it('has no payment actions without a provider', () => {
		const [b] = billingBanners({ account: acct(), payment: null, isAdmin: true, sawReadOnly: true, hasProvider: false, now: NOW });
		assert.ok(b);
		assert.equal(b.action, undefined);
	});
});
