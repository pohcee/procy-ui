import { HttpFactory } from '~/repository/factory';
import { parseDeletion, parseEmailStatus, type EmailStatus, type OrgDeletion } from '~/utils/signup';
import { httpStatusOf } from '~/utils/apiStatus';
import { parseOrgSignIn, type OrgSignIn } from '~/utils/oidc';

/**
 * The signed-in account's email confirmation, and its organization's export and deletion (servers with
 * `[signup] enabled`; 404 otherwise).
 */
class AccountModule extends HttpFactory {
	/** POST /me/email-confirmation: mails a confirmation link, or answers verified without mailing. */
	async requestEmailConfirmation(): Promise<EmailStatus> {
		return parseEmailStatus(await this.call<unknown>('POST', '/api/v1/me/email-confirmation'));
	}

	/** POST /me/email-confirmation/confirm { token }, signed in as the account that asked for the link. */
	async confirmEmail(token: string): Promise<EmailStatus> {
		return parseEmailStatus(await this.call<unknown>('POST', '/api/v1/me/email-confirmation/confirm', { token }));
	}

	/** GET /organization/export: the organization's configuration without secrets (administrators). */
	async exportOrganization(): Promise<unknown> {
		return (await this.call<{ data?: unknown }>('GET', '/api/v1/organization/export'))?.data ?? null;
	}

	/** POST /organization/deletion { confirm: <organization id>, reason }: suspended at once, deleted after the hold. */
	async requestDeletion(confirm: string, reason?: string): Promise<OrgDeletion | null> {
		return parseDeletion(await this.call<unknown>('POST', '/api/v1/organization/deletion', { confirm, ...(reason ? { reason } : {}) }));
	}

	/**
	 * GET /organization/sign-in → { require_oidc, oidc_enabled } (administrators), or null when the server has no
	 * such setting (404/405: standalone).
	 */
	async orgSignIn(): Promise<OrgSignIn | null> {
		try {
			return parseOrgSignIn(await this.call<unknown>('GET', '/api/v1/organization/sign-in'));
		}
		catch (e) {
			const status = httpStatusOf(e);
			if (status === 404 || status === 405) return null;
			throw e;
		}
	}

	/** PUT /organization/sign-in { require_oidc }: members must sign in with Google (needs [oidc] enabled). */
	async setOrgSignIn(requireOidc: boolean): Promise<OrgSignIn | null> {
		const raw = await this.call<unknown>('PUT', '/api/v1/organization/sign-in', { require_oidc: requireOidc });
		return parseOrgSignIn(raw) ?? { requireOidc, oidcEnabled: true };
	}
}

export default AccountModule;
