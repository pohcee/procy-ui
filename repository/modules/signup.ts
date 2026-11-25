import { HttpFactory } from '~/repository/factory';
import { httpStatusOf } from '~/utils/apiStatus';
import { parseSignupConfig, verifyOutcome, type SignupConfig, type VerifyOutcome } from '~/utils/signup';

/**
 * Self-service signup (Postgres servers with `[signup] enabled`; public routes, sent without a session):
 *   GET  /signup                  → { data: { enabled, captcha, captcha_site_key, require_approval, password_min_length, trial_days } } (404: off)
 *   POST /signup                  { email, organization, captcha } → 202 { data: { status: "sent", message } } (always the same answer)
 *   POST /signup/verify           { token, password } → 201 completed | 202 awaiting_approval (SignupResult)
 *   POST /signup/cancel-deletion  { token } → { data: { organization, state } }
 */
class SignupModule extends HttpFactory {
	/** The signup settings, or null when this server has no signup (404, or `enabled` not true). */
	async config(): Promise<SignupConfig | null> {
		try {
			return parseSignupConfig(await this.call<unknown>('GET', '/api/v1/signup'));
		}
		catch (e) {
			const status = httpStatusOf(e);
			if (status === 404 || status === 405) return null;
			throw e;
		}
	}

	async request(body: { email: string; organization: string; captcha?: string }): Promise<string> {
		const res = await this.call<{ data?: { message?: string } }>('POST', '/api/v1/signup', body);
		return res?.data?.message ?? '';
	}

	/** The token of the link and the password the new administrator chooses (a refused password keeps the link usable). */
	async verify(token: string, password: string): Promise<VerifyOutcome> {
		return verifyOutcome(await this.call<unknown>('POST', '/api/v1/signup/verify', { token, password }));
	}

	async cancelDeletion(token: string): Promise<{ organization: string }> {
		const res = await this.call<{ data?: { organization?: string } }>('POST', '/api/v1/signup/cancel-deletion', { token });
		return { organization: res?.data?.organization ?? '' };
	}
}

export default SignupModule;
