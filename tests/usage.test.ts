import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	DEFAULT_COST_PER_GIB,
	byteAxis,
	currentMonth,
	dailyTransferSeries,
	daysOfMonth,
	deviceLimitLabel,
	deviceLimitUse,
	estimateEgressCost,
	formatBytes,
	formatUsd,
	isMonth,
	monthLabel,
	monthQuery,
	orgIdError,
	parseCostPerGiB,
	parseDeviceLimit,
	shiftMonth,
	sortByTransfer,
	transferOf,
	tunnelBytesLabel,
} from '../utils/usage.ts';

const GiB = 1024 ** 3;
const NOW = new Date('2026-11-24T15:30:00Z');

describe('formatBytes', () => {
	it('uses binary units with three significant digits', () => {
		assert.equal(formatBytes(0), '0 B');
		assert.equal(formatBytes(512), '512 B');
		assert.equal(formatBytes(1024), '1 KiB');
		assert.equal(formatBytes(1536), '1.5 KiB');
		assert.equal(formatBytes(12.34 * 1024 * 1024), '12.3 MiB');
		assert.equal(formatBytes(312 * 1024 * 1024), '312 MiB');
		assert.equal(formatBytes(1.5 * GiB), '1.5 GiB');
		assert.equal(formatBytes(2048 * GiB), '2 TiB');
	});
	it('moves up a unit instead of printing 1024', () => {
		assert.equal(formatBytes(1024 * 1024 - 1), '1 MiB');
	});
	it('treats missing, negative and non-finite input as 0', () => {
		assert.equal(formatBytes(undefined), '0 B');
		assert.equal(formatBytes(null), '0 B');
		assert.equal(formatBytes(-5), '0 B');
		assert.equal(formatBytes(Number.NaN), '0 B');
	});
});

describe('estimateEgressCost', () => {
	it('defaults to $0.13 per GiB', () => {
		assert.equal(DEFAULT_COST_PER_GIB, 0.13);
		assert.equal(estimateEgressCost(10 * GiB), 1.3);
		assert.equal(estimateEgressCost(1024 * GiB), 133.12);
	});
	it('uses the given price, and the default for invalid prices', () => {
		assert.equal(estimateEgressCost(100 * GiB, 0.085), 8.5);
		assert.equal(estimateEgressCost(100 * GiB, 0), 0);
		assert.equal(estimateEgressCost(10 * GiB, -1), 1.3);
		assert.equal(estimateEgressCost(10 * GiB, Number.NaN), 1.3);
	});
	it('is 0 without bytes', () => {
		assert.equal(estimateEgressCost(undefined), 0);
	});
});

describe('formatUsd', () => {
	it('formats cents and thousands', () => {
		assert.equal(formatUsd(0), '$0.00');
		assert.equal(formatUsd(1.3), '$1.30');
		assert.equal(formatUsd(1234.567), '$1,234.57');
		assert.equal(formatUsd(0.001), '< $0.01');
	});
});

describe('parseCostPerGiB', () => {
	it('accepts non-negative numbers, with or without a dollar sign', () => {
		assert.equal(parseCostPerGiB('0.13'), 0.13);
		assert.equal(parseCostPerGiB('$0.085'), 0.085);
		assert.equal(parseCostPerGiB('.2'), 0.2);
		assert.equal(parseCostPerGiB('1'), 1);
		assert.equal(parseCostPerGiB(0.5), 0.5);
	});
	it('rejects anything else', () => {
		assert.equal(parseCostPerGiB(''), null);
		assert.equal(parseCostPerGiB('-1'), null);
		assert.equal(parseCostPerGiB('abc'), null);
		assert.equal(parseCostPerGiB('1e3'), null);
		assert.equal(parseCostPerGiB(undefined), null);
	});
});

describe('months', () => {
	it('uses the UTC month', () => {
		assert.equal(currentMonth(new Date('2026-11-30T23:30:00-05:00')), '2026-12');
		assert.equal(currentMonth(NOW), '2026-11');
	});
	it('shifts across years', () => {
		assert.equal(shiftMonth('2026-01', -1), '2025-12');
		assert.equal(shiftMonth('2026-12', 1), '2027-01');
		assert.equal(shiftMonth('2026-11', 0), '2026-11');
	});
	it('validates and labels', () => {
		assert.ok(isMonth('2026-11'));
		assert.ok(!isMonth('2026-13'));
		assert.ok(!isMonth('2026-1'));
		assert.equal(monthLabel('2026-11'), 'November 2026');
	});
	it('leaves `to` out for the current month and ends a past month at the next month', () => {
		assert.deepEqual(monthQuery('2026-11', NOW), { from: '2026-11-01' });
		assert.deepEqual(monthQuery('2026-10', NOW), { from: '2026-10-01', to: '2026-11-01' });
		assert.deepEqual(monthQuery('2025-12', NOW), { from: '2025-12-01', to: '2026-01-01' });
	});
	it('lists the days so far of the current month and every day of a past one', () => {
		assert.equal(daysOfMonth('2026-11', NOW).length, 24);
		assert.equal(daysOfMonth('2026-11', NOW)[23], '2026-11-24');
		assert.equal(daysOfMonth('2026-02', NOW).length, 28);
		assert.equal(daysOfMonth('2024-02', NOW).length, 29);
		assert.equal(daysOfMonth('2026-12', NOW).length, 0);
		assert.deepEqual(daysOfMonth('bad', NOW), []);
	});
});

describe('dailyTransferSeries', () => {
	it('fills every day and adds up hourly periods of the same UTC day', () => {
		const s = dailyTransferSeries([
			{ start: '2026-11-02T00:00:00Z', tunnel_bytes_to_user: 100, tunnel_bytes_to_device: 10 },
			{ start: '2026-11-02T13:00:00Z', tunnel_bytes_to_user: 50, upload_bytes_to_devices: 5 },
			{ start: '2026-11-05T00:00:00Z', tunnel_bytes_to_device: 400 },
		], '2026-11', NOW);
		assert.equal(s.days.length, 24);
		assert.equal(s.toUser[1], 150);
		assert.equal(s.toDevice[1], 10);
		assert.equal(s.uploads[1], 5);
		assert.equal(s.toDevice[4], 400);
		assert.equal(s.toUser[0], 0);
		assert.equal(s.max, 400);
	});
	it('ignores periods outside the month and invalid dates', () => {
		const s = dailyTransferSeries([
			{ start: '2026-10-31T23:00:00Z', tunnel_bytes_to_user: 999 },
			{ start: 'nope', tunnel_bytes_to_user: 999 },
		], '2026-11', NOW);
		assert.equal(s.max, 0);
	});
	it('copes with no periods', () => {
		assert.equal(dailyTransferSeries(null, '2026-10', NOW).days.length, 31);
	});
});

describe('byteAxis', () => {
	it('rounds up to tidy steps', () => {
		const a = byteAxis(3.3 * GiB);
		assert.ok(a.max >= 3.3 * GiB);
		assert.equal(a.ticks.length, 5);
		assert.equal(a.ticks[1], 1 * GiB);
		assert.equal(byteAxis(700).ticks[1], 200);
	});
	it('is flat for no data', () => {
		assert.deepEqual(byteAxis(0), { max: 0, ticks: [0] });
	});
});

describe('sortByTransfer', () => {
	it('puts the heaviest first, then by name', () => {
		const rows = sortByTransfer([
			{ id: 'b', name: 'Beta', totals: { transfer_bytes: 5 } },
			{ id: 'a', name: 'Alpha', totals: null },
			{ id: 'c', name: 'Gamma', totals: { transfer_bytes: 50 } },
			{ id: 'd', name: 'Delta' },
		]);
		assert.deepEqual(rows.map(r => r.id), ['c', 'b', 'a', 'd']);
	});
});

describe('transferOf', () => {
	it('uses the server sum, else the parts', () => {
		assert.equal(transferOf({ transfer_bytes: 7, tunnel_bytes_to_user: 1 }), 7);
		assert.equal(transferOf({ tunnel_bytes_to_user: 1, tunnel_bytes_to_device: 2, upload_bytes_to_devices: 3 }), 6);
		assert.equal(transferOf(null), 0);
	});
});

describe('tunnelBytesLabel', () => {
	it('labels metered tunnels only', () => {
		assert.deepEqual(tunnelBytesLabel({ to_user: 2048, to_device: 1024 }), { toUser: '2 KiB', toDevice: '1 KiB', total: '3 KiB' });
		assert.deepEqual(tunnelBytesLabel({ to_user: 0, to_device: 0 }), { toUser: '0 B', toDevice: '0 B', total: '0 B' });
		assert.equal(tunnelBytesLabel(undefined), null);
		assert.equal(tunnelBytesLabel({}), null);
	});
});

describe('operator forms', () => {
	it('validates organization ids like the server', () => {
		assert.equal(orgIdError('acme'), null);
		assert.equal(orgIdError('acme-2_x'), null);
		assert.ok(orgIdError(''));
		assert.ok(orgIdError('Acme'));
		assert.ok(orgIdError('-acme'));
		assert.ok(orgIdError('_system'));
		assert.ok(orgIdError('default'));
		assert.ok(orgIdError('a'.repeat(64)));
	});
	it('parses device limits: empty is unlimited', () => {
		assert.deepEqual(parseDeviceLimit(''), { value: null, error: null });
		assert.deepEqual(parseDeviceLimit(' 25 '), { value: 25, error: null });
		assert.deepEqual(parseDeviceLimit(0), { value: 0, error: null });
		assert.ok(parseDeviceLimit('-1').error);
		assert.ok(parseDeviceLimit('2.5').error);
		assert.ok(parseDeviceLimit('99999999999999999999').error);
	});
	it('labels devices against the limit', () => {
		assert.equal(deviceLimitLabel(12, 50), '12 / 50');
		assert.equal(deviceLimitLabel(1200, null), '1,200 / no limit');
		assert.equal(deviceLimitUse(45, 50), 0.9);
		assert.equal(deviceLimitUse(3, null), null);
		assert.equal(deviceLimitUse(1, 0), Infinity);
	});
});
