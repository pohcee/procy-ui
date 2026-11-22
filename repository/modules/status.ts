import { HttpFactory, HttpMethod } from '~/repository/factory';
import type { StatusResponse } from '~/types';

class StatusModule extends HttpFactory {
	private RESOURCE = 'api/v1/status';

	async show() {
		return useAsyncData(() => {
			return this.call<StatusResponse>(
				HttpMethod.GET,
				`${this.RESOURCE}`,
				undefined,
			);
		});
	}
}
export default StatusModule;
