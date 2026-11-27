import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPlanPrice, homePlans, parsePlans, planFeatures, trialDaysOf } from '../utils/plans.ts';

const GiB = 1024 ** 3;

const catalog = {
	data: [
		{ id: 'free', name: 'Free', monthly_price_cents: 0, included_devices: 3, price_per_device_cents: 0, max_clients: 3, transfer_base_bytes: 1 * GiB, transfer_per_device_bytes: 0, overage: 'cap', overage_price_per_gib_cents: 0, free: true, trial: false, purchasable: false },
		{ id: 'team', name: 'Team', monthly_price_cents: 2900, included_devices: 10, price_per_device_cents: 250, max_clients: null, transfer_base_bytes: 50 * GiB, transfer_per_device_bytes: 2 * GiB, overage: 'bill', overage_price_per_gib_cents: 10, free: false, trial: true, trial_days: 21, purchasable: true },
		{ name: 'no id' },
		'junk',
	],
};

describe('parsePlans', () => {
	it('reads the public catalog and drops rows without an id', () => {
		const plans = parsePlans(catalog);
		assert.equal(plans.length, 2);
		assert.deepEqual(plans[1], {
			id: 'team', name: 'Team', monthlyPriceCents: 2900, includedDevices: 10, pricePerDeviceCents: 250, maxClients: null,
			transferBaseBytes: 50 * GiB, transferPerDeviceBytes: 2 * GiB, overage: 'bill', overagePricePerGibCents: 10,
			free: false, trial: true, trialDays: 21, purchasable: true,
		});
		assert.equal(plans[0]!.maxClients, 3);
	});
	it('accepts a bare list and tolerates garbage', () => {
		assert.equal(parsePlans(catalog.data).length, 2);
		assert.deepEqual(parsePlans(undefined), []);
		assert.deepEqual(parsePlans({ data: 'x' }), []);
	});
	it('names a plan by its id when it has no name', () => {
		assert.equal(parsePlans([{ id: 'pro' }])[0]!.name, 'pro');
	});
});

describe('trialDaysOf', () => {
	it('takes the trial plan\'s days, else the fallback, else 14', () => {
		assert.equal(trialDaysOf(parsePlans(catalog)), 21);
		assert.equal(trialDaysOf([], 30), 30);
		assert.equal(trialDaysOf([]), 0, 'unknown: never promise a number of days');
	});
});

describe('formatPlanPrice', () => {
	it('drops the cents of whole dollars', () => {
		assert.equal(formatPlanPrice(2900), '$29');
		assert.equal(formatPlanPrice(250), '$2.50');
		assert.equal(formatPlanPrice(10), '$0.10');
		assert.equal(formatPlanPrice(0), '$0');
	});
});

describe('planFeatures', () => {
	it('describes a paid plan', () => {
		assert.deepEqual(planFeatures(parsePlans(catalog)[1]!), [
			'10 devices included',
			'$2.50 a month for each device after that',
			'No device limit',
			'50 GiB of tunnel traffic a month, plus 2 GiB per device',
			'Extra traffic $0.10 per GiB',
		]);
	});
	it('describes a free plan with a cap', () => {
		assert.deepEqual(planFeatures(parsePlans(catalog)[0]!), [
			'Up to 3 devices',
			'1 GiB of tunnel traffic a month',
			'Tunnels pause when the month\'s traffic is used up',
		]);
	});
});

describe('homePlans', () => {
	it('starts with the free trial, then the catalog', () => {
		const h = homePlans(parsePlans(catalog));
		assert.equal(h.fallback, false);
		assert.equal(h.trial.title, 'Free trial');
		assert.equal(h.trial.summary, '21 days, no card');
		assert.match(h.trial.detail, /Team/);
		assert.deepEqual(h.plans.map(p => [p.id, p.price, p.period]), [['free', 'Free', ''], ['team', '$29', 'a month']]);
		assert.equal(h.plans[1]!.trial, true);
	});
	it('falls back to the trial alone when there is no catalog', () => {
		const h = homePlans(null);
		assert.equal(h.fallback, true);
		assert.equal(h.trial.summary, 'No card needed', 'no trial known: no number of days');
		assert.doesNotMatch(h.trial.detail, /\d/);
		assert.deepEqual(h.plans, []);
		assert.equal(homePlans([], 30).trial.summary, '30 days, no card');
		assert.equal(homePlans([]).fallback, true);
	});
});
