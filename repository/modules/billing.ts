import { HttpFactory } from '~/repository/factory';
import type {
	BillingAccount, BillingInvoice, BillingPayment, BillingPeriod, BillingProviderAccount, BillingUsageReport, PeriodState,
} from '~/utils/billing';

const list = <T>(res: { data?: T[] | null } | null | undefined): T[] => (Array.isArray(res?.data) ? res.data : []);
const operatorOrg = (id: string) => `/api/v1/operator/organizations/${encodeURIComponent(id)}/billing`;
const providerAccount = (id: string) => `/api/v1/operator/billing/provider/accounts/${encodeURIComponent(id)}`;
const q = (params: Record<string, string | number | undefined>) => {
	const s = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
	const t = s.toString();
	return t ? `?${t}` : '';
};

/**
 * Billing (Postgres servers with `[billing] enabled`, capability `billing`). The organization routes are for its
 * Administrators; payment, invoices, portal and checkout exist only with a payment provider (404 without one).
 * The operator routes are for platform operators.
 */
class BillingModule extends HttpFactory {
	// ---- An organization's administrators ----

	/** GET /billing: plan, status, the month's transfer against the allowance, caps, spending limit. */
	async account(): Promise<BillingAccount> {
		return (await this.call<{ data: BillingAccount }>('GET', '/api/v1/billing')).data;
	}

	/** GET /billing/periods: the closed periods, newest first. */
	async periods(): Promise<BillingPeriod[]> {
		return list(await this.call<{ data?: BillingPeriod[] }>('GET', '/api/v1/billing/periods'));
	}

	/** PUT /billing/spending-limit { spending_limit: USD | null }. */
	async setSpendingLimit(usd: number | null): Promise<BillingAccount> {
		return (await this.call<{ data: BillingAccount }>('PUT', '/api/v1/billing/spending-limit', { spending_limit: usd })).data;
	}

	/** GET /billing/payment: subscription, payment method and overdue state (404 without a payment provider). */
	async payment(): Promise<BillingPayment> {
		return (await this.call<{ data: BillingPayment }>('GET', '/api/v1/billing/payment')).data;
	}

	/** GET /billing/invoices?limit: the newest invoices. */
	async invoices(limit = 24): Promise<BillingInvoice[]> {
		return list(await this.call<{ data?: BillingInvoice[] }>('GET', `/api/v1/billing/invoices${q({ limit })}`));
	}

	/** POST /billing/portal → the provider's customer portal. */
	async portal(): Promise<string> {
		return (await this.call<{ data?: { url?: string } }>('POST', '/api/v1/billing/portal'))?.data?.url ?? '';
	}

	/** POST /billing/checkout { plan } → { data: { url, plan_changed } } (administrators). */
	async checkout(plan: string): Promise<{ url: string; planChanged: boolean }> {
		const res = await this.call<{ data?: { url?: string; plan_changed?: boolean } }>('POST', '/api/v1/billing/checkout', { plan });
		return { url: res?.data?.url ?? '', planChanged: res?.data?.plan_changed === true };
	}

	// ---- Platform operators ----

	/** GET /operator/billing: every organization's account. */
	async operatorAccounts(): Promise<BillingAccount[]> {
		return list(await this.call<{ data?: BillingAccount[] }>('GET', '/api/v1/operator/billing'));
	}

	/** GET /operator/billing/periods?state: every organization's closed periods. */
	async operatorPeriods(state?: PeriodState): Promise<BillingPeriod[]> {
		return list(await this.call<{ data?: BillingPeriod[] }>('GET', `/api/v1/operator/billing/periods${q({ state })}`));
	}

	async orgAccount(id: string): Promise<BillingAccount> {
		return (await this.call<{ data: BillingAccount }>('GET', operatorOrg(id))).data;
	}

	async orgPeriods(id: string, state?: PeriodState): Promise<BillingPeriod[]> {
		return list(await this.call<{ data?: BillingPeriod[] }>('GET', `${operatorOrg(id)}/periods${q({ state })}`));
	}

	async setPlan(id: string, plan: string): Promise<BillingAccount> {
		return (await this.call<{ data: BillingAccount }>('PUT', `${operatorOrg(id)}/plan`, { plan })).data;
	}

	async setStatus(id: string, body: Record<string, string>): Promise<BillingAccount> {
		return (await this.call<{ data: BillingAccount }>('PUT', `${operatorOrg(id)}/status`, body)).data;
	}

	async setOverride(id: string, body: { cap_lifted_until?: string; end_cap_lift?: boolean; extra_transfer?: string; clear_fail_open?: boolean }): Promise<BillingAccount> {
		return (await this.call<{ data: BillingAccount }>('PUT', `${operatorOrg(id)}/override`, body)).data;
	}

	/** Releases a held period (month YYYY-MM). */
	async approvePeriod(id: string, month: string): Promise<BillingPeriod> {
		return (await this.call<{ data: BillingPeriod }>('POST', `${operatorOrg(id)}/periods/${encodeURIComponent(month)}/approve`)).data;
	}

	/** GET /operator/billing/provider/accounts (404 without a payment provider). */
	async providerAccounts(): Promise<BillingProviderAccount[]> {
		return list(await this.call<{ data?: BillingProviderAccount[] }>('GET', '/api/v1/operator/billing/provider/accounts'));
	}

	async providerReports(period?: string): Promise<BillingUsageReport[]> {
		return list(await this.call<{ data?: BillingUsageReport[] }>('GET', `/api/v1/operator/billing/provider/reports${q({ period })}`));
	}

	async providerStats(): Promise<Record<string, number>> {
		return (await this.call<{ data?: Record<string, number> }>('GET', '/api/v1/operator/billing/provider/stats'))?.data ?? {};
	}

	async restore(id: string): Promise<BillingProviderAccount> {
		return (await this.call<{ data: BillingProviderAccount }>('POST', `${providerAccount(id)}/restore`)).data;
	}

	async confirmSuspension(id: string): Promise<void> {
		await this.call<unknown>('POST', `${providerAccount(id)}/confirm-suspension`);
	}
}

export default BillingModule;
