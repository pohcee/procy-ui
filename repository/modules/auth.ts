import type { FetchOptions } from 'ofetch';
import { HttpFactory } from '~/repository/factory';
import type { ApiLoginResponse, AuthProviderResponse, ILoginInput } from '~/types';

/**
 * The organization picked at login, for users of several organizations: the query parameter `organization` of
 * /login. (/verify-2fa takes the organization from its token and ignores the parameter.)
 */
const orgParam = (credentials: ILoginInput) => (credentials.organization ? `&organization=${encodeURIComponent(credentials.organization)}` : '');

class AuthModule extends HttpFactory {
	private RESOURCE = '/api/v1/login';

	async login(credentials: ILoginInput): Promise<ApiLoginResponse> {
		const query = `?token-lifetime=${credentials.remember_me}${orgParam(credentials)}`;
		if (credentials.new_password) {
			// An expired password is replaced with POST /login { username, password, new_password }.
			return this.call<ApiLoginResponse>('POST', `${this.RESOURCE}${query}`, {
				username: credentials.username,
				password: credentials.password,
				new_password: credentials.new_password,
			}, { headers: { 'Content-Type': 'application/json' } });
		}
		const token = btoa(`${credentials.username}:${credentials.password}`);
		const fetchOptions: FetchOptions<'json'> = {
			headers: {
				'Authorization': `Basic ${token}`,
				'Content-Type': 'application/json',
			},
		};
		return this.call<ApiLoginResponse>(
			'GET',
			`${this.RESOURCE}${query}`,
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
