import { HttpFactory } from '~/repository/factory';
import type { Schedule, ScheduleResponse, SchedulePayload } from '~/types';

class SchedulesModule extends HttpFactory {
	private RESOURCE = '/api/v1/schedules';

	async list(): Promise<ScheduleResponse> {
		const response = await this.call<ScheduleResponse | { data: ScheduleResponse }>('GET', this.RESOURCE, undefined);
		return Array.isArray(response.data) ? response as ScheduleResponse : (response as { data: ScheduleResponse }).data;
	}

	async show(id: string): Promise<{ data: Schedule }> {
		return this.call<{ data: Schedule }>('GET', `${this.RESOURCE}/${id}`, undefined);
	}

	async create(payload: SchedulePayload): Promise<{ data: Schedule }> {
		return this.call<{ data: Schedule }>('POST', this.RESOURCE, payload);
	}

	async update(id: string, payload: SchedulePayload): Promise<{ data: Schedule }> {
		return this.call<{ data: Schedule }>('PUT', `${this.RESOURCE}/${id}`, payload);
	}

	async delete(id: string): Promise<void> {
		await this.call('DELETE', `${this.RESOURCE}/${id}`, undefined);
	}
}

export default SchedulesModule;
