import { HttpFactory } from '~/repository/factory';
import type { AuditLogResponse } from '~/types';

export interface AuditLogFilters {
	username?: string;
	application?: string;
	action?: string;
	client_id?: string;
	client_hostname?: string;
}

class AuditLogModule extends HttpFactory {
	private RESOURCE = '/api/v1/auditlog';

	async paginate(page = 0, itemsPerPage = 20, filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
		let params = `?sort=-timestamp&page[limit]=${itemsPerPage}&page[offset]=${page * itemsPerPage}`;
		for (const [key, value] of Object.entries(filters)) {
			if (value) {
				params += `&filter[${key}]=${encodeURIComponent(value)}`;
			}
		}
		return this.call<AuditLogResponse>('GET', `${this.RESOURCE}${params}`, undefined);
	}
}

export default AuditLogModule;
