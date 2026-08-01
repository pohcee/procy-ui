import { HttpFactory } from '~/repository/factory';
import type { VaultStatus } from '~/types';

class VaultModule extends HttpFactory {
	private RESOURCE = 'api/v1/vault-admin';

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
}
export default VaultModule;
