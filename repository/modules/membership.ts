import { HttpFactory } from '~/repository/factory';
import { httpStatusOf } from '~/utils/apiStatus';
import {
	inviteOutcome, parseMyInvitations, parseOrgList, parsePendingInvitations,
	type InviteOutcome, type MyInvitation, type OrgRef, type PendingInvitation,
} from '~/utils/membership';

const enc = encodeURIComponent;

/** null for 404/405: the server has no membership API (standalone, SQLite). */
const unlessMissing = async <T>(p: Promise<T>): Promise<T | null> => {
	try {
		return await p;
	}
	catch (e) {
		const status = httpStatusOf(e);
		if (status === 404 || status === 405) return null;
		throw e;
	}
};

/**
 * Organization membership (Postgres servers, capability `organizations`; see the server's OpenAPI):
 *   GET    /me/organizations              → { data: [{ id, name, current }] }
 *   POST   /me/organization?token-lifetime { organization } → { data: { token, organization } }
 *   GET    /me/invitations                → { data: [{ id, name, invited_by, created_at }] }
 *   POST   /me/invitations/{org}          accept (session token only)
 *   DELETE /me/invitations/{org}          decline
 *   POST   /organization/members          { username, groups, two_fa_send_to } → OrganizationInvited (admins)
 *   GET    /organization/invitations      → PendingInvitation[] (admins)
 *   DELETE /organization/invitations/{login} withdraw (admins)
 * Removing a member is DELETE /users/{login} (its other memberships stay).
 */
class MembershipModule extends HttpFactory {
	/** The user's organizations, or null when the server has no membership API (404). */
	async list(): Promise<OrgRef[] | null> {
		const raw = await unlessMissing(this.call<unknown>('GET', '/api/v1/me/organizations'));
		return raw === null ? null : parseOrgList(raw);
	}

	/**
	 * Switches the session to another organization; returns the new session token. `lifetime` (seconds) keeps
	 * the sign-in's "remember me" (the server's default is 10 minutes).
	 */
	async switchTo(id: string, lifetime?: number | null): Promise<string | null> {
		const q = lifetime ? `?token-lifetime=${lifetime}` : '';
		const res = await this.call<{ data?: { token?: string } }>('POST', `/api/v1/me/organization${q}`, { organization: id });
		return res?.data?.token ?? null;
	}

	/** The signed-in login's pending invitations, or null without the membership API. */
	async myInvitations(): Promise<MyInvitation[] | null> {
		const raw = await unlessMissing(this.call<unknown>('GET', '/api/v1/me/invitations'));
		return raw === null ? null : parseMyInvitations(raw);
	}

	async accept(org: string): Promise<void> {
		await this.call('POST', `/api/v1/me/invitations/${enc(org)}`);
	}

	async decline(org: string): Promise<void> {
		await this.call('DELETE', `/api/v1/me/invitations/${enc(org)}`);
	}

	/** Invites a login into the organization of the session (administrators). */
	async invite(body: { username: string; groups: string[]; two_fa_send_to?: string }): Promise<InviteOutcome> {
		return inviteOutcome(await this.call<unknown>('POST', '/api/v1/organization/members', body), body.username);
	}

	/** The organization's pending invitations (administrators), or null without the membership API. */
	async pendingInvitations(): Promise<PendingInvitation[] | null> {
		const raw = await unlessMissing(this.call<unknown>('GET', '/api/v1/organization/invitations'));
		return raw === null ? null : parsePendingInvitations(raw);
	}

	async withdraw(username: string): Promise<void> {
		await this.call('DELETE', `/api/v1/organization/invitations/${enc(username)}`);
	}
}

export default MembershipModule;
