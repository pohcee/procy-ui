import { HttpFactory } from '~/repository/factory';
import { httpStatusOf } from '~/utils/apiStatus';
import { parseOrgList, type OrgRef } from '~/utils/membership';

/**
 * Organization membership for users of several organizations. NOT FINAL: written against the planned API
 * (feat/org-membership); adjust the paths and shapes here when it lands.
 *   GET  /api/v1/me/organizations  → { data: [{ id, name, current? }] }   (404 on servers without it)
 *   POST /api/v1/me/organization   { organization: id } → { data: { token } } (a session for that organization)
 */
class MembershipModule extends HttpFactory {
	/** The user's organizations, or null when the server has no membership API (404). */
	async list(): Promise<OrgRef[] | null> {
		try {
			return parseOrgList(await this.call<unknown>('GET', '/api/v1/me/organizations'));
		}
		catch (e) {
			const status = httpStatusOf(e);
			if (status === 404 || status === 405) return null;
			throw e;
		}
	}

	/** Switches the session to another organization; returns the new session token when the server issues one. */
	async switchTo(id: string): Promise<string | null> {
		const res = await this.call<{ data?: { token?: string } }>('POST', '/api/v1/me/organization', { organization: id });
		return res?.data?.token ?? null;
	}
}

export default MembershipModule;
