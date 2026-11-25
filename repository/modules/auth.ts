import type { FetchOptions } from 'ofetch';
import { HttpFactory } from '~/repository/factory';
import type { ApiLoginResponse, AuthProviderResponse, ILoginInput } from '~/types';

/**
 * The organization picked at login, for users of several organizations. Assumed to be a query parameter of
 * /login and /verify-2fa; adjust here when the membership API lands.
 */
const orgParam = (credentials: ILoginInput) => (credentials.organization ? `&organization=${encodeURIComponent(credentials.organization)}` : '');

class AuthModule extends HttpFactory {
	private RESOURCE = '/api/v1/login';

	async login(credentials: ILoginInput): Promise<ApiLoginResponse> {
		const token = btoa(`${credentials.username}:${credentials.password}`);
		const fetchOptions: FetchOptions<'json'> = {
			headers: {
				'Authorization': `Basic ${token}`,
				'Content-Type': 'application/json',
			},
		};
		return this.call<ApiLoginResponse>(
			'GET',
			`${this.RESOURCE}?token-lifetime=${credentials.remember_me}${orgParam(credentials)}`,
			undefined,
			fetchOptions,
		);
	}

	async provider(): Promise<AuthProviderResponse> {
		return this.call<AuthProviderResponse>(
			'GET',
			'/api/v1/provider',
			undefined,
		);
	}

	async logout(token: string): Promise<void> {
		const fetchOptions: FetchOptions<'json'> = {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		};
		return this.call<undefined>(
			'DELETE',
			'/api/v1/logout',
			undefined,
			fetchOptions,
		);
	}

	async verify2fa(credentials: ILoginInput, token: string, twofaToken: string): Promise<ApiLoginResponse> {
		const fetchOptions: FetchOptions<'json'> = {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		};
		return this.call<ApiLoginResponse>(
			'POST',
			`/api/v1/verify-2fa?token-lifetime=${credentials.remember_me}${orgParam(credentials)}`,
			{
				username: credentials.username,
				token: twofaToken,
			},
			fetchOptions,
		);
	}
}

export default AuthModule;
