/**
 * The public plan catalog (GET /api/v1/plans, no session; 404 when the server has no `[billing]` plans) as the home
 * page shows it: parsing (shape of the server's billing.PlanInfo: USD cents, bytes), prices, the features of a plan
 * in plain words, and the free trial card that always comes first (also the fallback when there is no catalog).
 * Pure functions, tested in tests/plans.test.ts.
 */
import { formatBytes } from './usage.ts';

export interface PublicPlan {
	id: string;
	name: string;
	/** The monthly price including includedDevices. */
	monthlyPriceCents: number;
	includedDevices: number;
	/** Monthly, for each device above includedDevices (0: none). */
	pricePerDeviceCents: number;
	/** null: unlimited. */
	maxClients: number | null;
	transferBaseBytes: number;
	transferPerDeviceBytes: number;
	overage: 'bill' | 'cap' | string;
	overagePricePerGibCents: number;
	free: boolean;
	trial: boolean;
	trialDays: number;
	purchasable: boolean;
}

/** The trial length the home page promises when the server doesn't say. */
export const DEFAULT_TRIAL_DAYS = 14;

const int = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const toPlan = (r: unknown): PublicPlan | null => {
	if (!r || typeof r !== 'object') return null;
	const o = r as Record<string, unknown>;
	const id = str(o.id).trim();
	if (!id) return null;
	return {
		id,
		name: str(o.name).trim() || id,
		monthlyPriceCents: int(o.monthly_price_cents),
		includedDevices: int(o.included_devices),
		pricePerDeviceCents: int(o.price_per_device_cents),
		maxClients: typeof o.max_clients === 'number' && Number.isFinite(o.max_clients) ? Math.max(0, Math.floor(o.max_clients)) : null,
		transferBaseBytes: int(o.transfer_base_bytes),
		transferPerDeviceBytes: int(o.transfer_per_device_bytes),
		overage: str(o.overage),
		overagePricePerGibCents: int(o.overage_price_per_gib_cents),
		free: o.free === true,
		trial: o.trial === true,
		trialDays: int(o.trial_days),
		purchasable: o.purchasable === true,
	};
};

/** `{ data: PlanInfo[] }` or a bare list; rows without an id are dropped. */
export const parsePlans = (raw: unknown): PublicPlan[] => {
	const list = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data : [];
	return list.map(toPlan).filter((p): p is PublicPlan => !!p);
};

/** The trial plan's days, else the fallback (e.g. the signup settings' trial_days), else 14. */
export const trialDaysOf = (plans: PublicPlan[], fallback = 0): number =>
	plans.find(p => p.trial && p.trialDays > 0)?.trialDays || int(fallback) || DEFAULT_TRIAL_DAYS;

/** "$29", "$2.50": whole dollars without cents. */
export const formatPlanPrice = (cents: number): string => {
	const n = int(cents);
	return new Intl.NumberFormat('en-US', {
		style: 'currency', currency: 'USD', minimumFractionDigits: n % 100 === 0 ? 0 : 2, maximumFractionDigits: 2,
	}).format(n / 100);
};

const devices = (n: number) => `${n} device${n === 1 ? '' : 's'}`;

/** What a plan includes, one short line each. */
export const planFeatures = (p: PublicPlan): string[] => {
	const out: string[] = [];
	const included = p.includedDevices > 0 && (p.maxClients === null || p.includedDevices < p.maxClients);
	if (included) out.push(`${devices(p.includedDevices)} included`);
	if (p.pricePerDeviceCents > 0) out.push(`${formatPlanPrice(p.pricePerDeviceCents)} a month for each device after that`);
	out.push(p.maxClients === null ? 'No device limit' : `Up to ${devices(p.maxClients)}`);
	if (p.transferBaseBytes > 0 || p.transferPerDeviceBytes > 0) {
		const base = p.transferBaseBytes > 0 ? `${formatBytes(p.transferBaseBytes)} of tunnel traffic a month` : 'Tunnel traffic';
		out.push(p.transferPerDeviceBytes > 0
			? `${base}${p.transferBaseBytes > 0 ? ', plus' : ''} ${formatBytes(p.transferPerDeviceBytes)} per device`
			: base);
		if (p.overage === 'bill' && p.overagePricePerGibCents > 0) out.push(`Extra traffic ${formatPlanPrice(p.overagePricePerGibCents)} per GiB`);
		else if (p.overage === 'cap') out.push('Tunnels pause when the month\'s traffic is used up');
	}
	return out;
};

export interface HomePlanCard {
	id: string;
	name: string;
	/** "Free" or "$29". */
	price: string;
	/** "a month", or "" for a free plan. */
	period: string;
	features: string[];
	/** New organizations try this plan. */
	trial: boolean;
}

export interface HomePlans {
	trial: { title: string; summary: string; detail: string };
	plans: HomePlanCard[];
	/** No catalog (billing off, an older server, or unreachable): only the trial card and a note show. */
	fallback: boolean;
}

/** The plans section of the home page: the free trial first, then the catalog in its order. */
export const homePlans = (plans: PublicPlan[] | null, trialDaysFallback = 0): HomePlans => {
	const list = plans ?? [];
	const days = trialDaysOf(list, trialDaysFallback);
	const trialPlan = list.find(p => p.trial);
	return {
		trial: {
			title: 'Free trial',
			summary: `${days} days, no card`,
			detail: trialPlan
				? `Every new organization starts on ${trialPlan.name} for ${days} days. Add a payment method only if you stay.`
				: `Every new organization starts with a ${days}-day trial. No payment method needed to start.`,
		},
		plans: list.map(p => ({
			id: p.id,
			name: p.name,
			price: p.free ? 'Free' : formatPlanPrice(p.monthlyPriceCents),
			period: p.free ? '' : 'a month',
			features: planFeatures(p),
			trial: p.trial,
		})),
		fallback: list.length === 0,
	};
};
