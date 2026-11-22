import { HttpFactory } from '~/repository/factory';
import type { VaultStatus, VaultItem, VaultItemResponse, VaultItemPayload } from '~/types';

class VaultModule extends HttpFactory {
	private RESOURCE = '/api/v1/vault-admin';
	private ITEMS_RESOURCE = '/api/v1/vault';

	public async status(): Promise<VaultStatus> {
		const response = await this.call<{ data: VaultStatus }>(
			'GET',
			`${this.RESOURCE}`,
			undefined,
		);
		return response.data;
	}

	public async init(password: string): Promise<void> {
		await this.call(
			'POST',
			`${this.RESOURCE}/init`,
			{ password },
		);
	}

	public async unlock(password: string): Promise<void> {
		await this.call(
			'POST',
			`${this.RESOURCE}/sesame`,
			{ password },
		);
	}

	public async lock(): Promise<void> {
		await this.call(
			'DELETE',
			`${this.RESOURCE}/sesame`,
			undefined,
		);
	}

	public async listItems(): Promise<VaultItemResponse> {
		return this.call<VaultItemResponse>('GET', this.ITEMS_RESOURCE, undefined);
	}

	public async showItem(id: number): Promise<{ data: VaultItem }> {
		return this.call<{ data: VaultItem }>('GET', `${this.ITEMS_RESOURCE}/${id}`, undefined);
	}

	public async createItem(payload: VaultItemPayload): Promise<{ data: VaultItem }> {
		return this.call<{ data: VaultItem }>('POST', this.ITEMS_RESOURCE, payload);
	}

	public async updateItem(id: number, payload: VaultItemPayload): Promise<{ data: VaultItem }> {
		return this.call<{ data: VaultItem }>('PUT', `${this.ITEMS_RESOURCE}/${id}`, payload);
	}

	public async deleteItem(id: number): Promise<void> {
		await this.call('DELETE', `${this.ITEMS_RESOURCE}/${id}`, undefined);
	}
}
export default VaultModule;
