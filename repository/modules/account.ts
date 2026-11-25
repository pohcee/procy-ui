import { HttpFactory } from '~/repository/factory';
import { parseDeletion, parseEmailStatus, type EmailStatus, type OrgDeletion } from '~/utils/signup';

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
}

export default AccountModule;
