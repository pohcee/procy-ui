import { HttpFactory } from '~/repository/factory';
import type { UserGroup, UserGroupResponse } from '~/types';

class UserGroupsModule extends HttpFactory {
	private RESOURCE = '/api/v1/user-groups';

	async all(): Promise<UserGroup[]> {
		const response = await this.call<UserGroupResponse>(
			'GET',
			`${this.RESOURCE}`,
			undefined,
		);
		return response.data;
	}

	async show(name: string): Promise<UserGroup> {
		const response = await this.call<{ data: UserGroup }>(
			'GET',
			`${this.RESOURCE}/${encodeURIComponent(name)}`,
			undefined,
		);
		return response.data;
	}

	async save(name: string, group: Partial<UserGroup>): Promise<UserGroup> {
		const response = await this.call<{ data: UserGroup }>(
			'PUT',
			`${this.RESOURCE}/${encodeURIComponent(name)}`,
			group,
		);
		return response.data;
	}

	async delete(name: string): Promise<void> {
		await this.call(
			'DELETE',
			`${this.RESOURCE}/${encodeURIComponent(name)}`,
			undefined,
		);
	}
}

export default UserGroupsModule;
