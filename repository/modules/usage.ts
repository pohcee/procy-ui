import { HttpFactory } from '~/repository/factory';
import type { UsageReport } from '~/utils/usage';

/** The organization's own usage (capability `usage`, Administrators only). */
class UsageModule extends HttpFactory {
	async report(params: { from?: string; to?: string; granularity?: 'hour' | 'day' | 'month' }): Promise<UsageReport> {
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
		const s = q.toString();
		return (await this.call<{ data: UsageReport }>('GET', `/api/v1/usage${s ? `?${s}` : ''}`)).data;
	}
}

export default UsageModule;
