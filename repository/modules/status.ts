import { HttpFactory, HttpMethod } from '~/repository/factory';
import type { StatusResponse } from '~/types';

class StatusModule extends HttpFactory {
	private RESOURCE = '/api/v1/status';

	/** GET /api/v1/status, fetched every time (for stores and other code outside a component's setup). */
	get(): Promise<StatusResponse> {
		return this.call<StatusResponse>(HttpMethod.GET, `${this.RESOURCE}`, undefined);
	}

	/** The status as async data, for a page's setup. */
	async show() {
		return useAsyncData('server-status', () => this.get());
	}
}
export default StatusModule;
