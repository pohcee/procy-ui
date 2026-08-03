import { HttpFactory } from '~/repository/factory';

export interface NotificationLog {
	state: string;
	notification_id: string;
	transport: string;
	timestamp: string;
	out?: string;
	err?: string;
}

export interface NotificationLogResponse {
	data: NotificationLog[];
	meta: { count: number };
}

class NotificationsModule extends HttpFactory {
	private RESOURCE = '/api/v1/notification-logs';

	async paginate(page = 0, itemsPerPage = 20): Promise<NotificationLogResponse> {
		return this.call<NotificationLogResponse>(
			'GET',
			`${this.RESOURCE}?sort=-timestamp&page[limit]=${itemsPerPage}&page[offset]=${page * itemsPerPage}`,
			undefined,
		);
	}

	async show(id: string): Promise<{ data: NotificationLog }> {
		return this.call<{ data: NotificationLog }>('GET', `${this.RESOURCE}/${id}`, undefined);
	}
}

export default NotificationsModule;
