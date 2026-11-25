import { HttpFactory, HttpMethod } from '~/repository/factory';
import type { APITokenPayload, APITokenResponse, APITokensResponse, IpResponse, Profile, ProfileResponse, TotP } from '~/types';

class ProfileModule extends HttpFactory {
	private RESOURCE = '/api/v1/me';

	async get(): Promise<Profile> {
		const response = await this.call<ProfileResponse>(
			'GET',
			`${this.RESOURCE}`,
			undefined,
		);
		return response.data;
	}

	async updateProfile(payload: { username?: string; two_fa_send_to?: string; password?: string; old_password?: string }): Promise<void> {
		await this.call(
			HttpMethod.PUT,
			`${this.RESOURCE}`,
			payload,
		);
	}

	/** PUT /me/sign-in { method }: how the user signs in (`oidc` needs a linked Google account). */
	async setSignIn(method: 'both' | 'password' | 'oidc'): Promise<void> {
		await this.call(HttpMethod.PUT, `${this.RESOURCE}/sign-in`, { method });
	}

	async getTotP(): Promise<TotP> {
		return this.call<TotP>(
			HttpMethod.GET,
			`${this.RESOURCE}/totp-secret`,
			undefined,
		);
	}

	async createTotP(): Promise<TotP> {
		return this.call<TotP>(
			HttpMethod.POST,
			`${this.RESOURCE}/totp-secret`,
			undefined,
		);
	}

	async deleteTotP(): Promise<void> {
		await this.call(
			HttpMethod.DELETE,
			`${this.RESOURCE}/totp-secret`,
			undefined,
		);
	}

	async apiTokens(): Promise<APITokensResponse> {
		return this.call<APITokensResponse>(
			'GET',
			`${this.RESOURCE}/tokens`,
			undefined,
		);
	}

	async create(payload: APITokenPayload): Promise<APITokenResponse> {
		return this.call<APITokenResponse>(
			HttpMethod.POST,
			`${this.RESOURCE}/tokens`,
			payload,
		);
	}

	async update(payload: APITokenPayload): Promise<APITokenResponse> {
		return this.call<APITokenResponse>(
			HttpMethod.PUT,
			`${this.RESOURCE}/tokens/${payload.prefix}`,
			payload,
		);
	}

	async delete(tokenPrefix: string): Promise<never> {
		return this.call(
			HttpMethod.DELETE,
			`${this.RESOURCE}/tokens/${tokenPrefix}`,
			undefined,
		);
	}

	async ip(): Promise<IpResponse> {
		return this.call<IpResponse>(
			HttpMethod.GET,
			`${this.RESOURCE}/ip`,
			undefined,
		);
	}
}

export default ProfileModule;
