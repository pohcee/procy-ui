import { HttpFactory } from '~/repository/factory';

/** Billing (Postgres servers with a billing provider). Only the checkout a new signup may need is used here. */
class BillingModule extends HttpFactory {
	/** POST /billing/checkout { plan } → { data: { url, plan_changed } } (administrators). */
	async checkout(plan: string): Promise<{ url: string; planChanged: boolean }> {
		const res = await this.call<{ data?: { url?: string; plan_changed?: boolean } }>('POST', '/api/v1/billing/checkout', { plan });
		return { url: res?.data?.url ?? '', planChanged: res?.data?.plan_changed === true };
	}
}

export default BillingModule;
