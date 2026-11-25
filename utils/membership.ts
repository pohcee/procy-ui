/**
 * Organization membership (a login that belongs to several organizations, Postgres servers): the org list of a
 * login response and of GET /me/organizations, invitations, members and the session lifetime kept across a
 * switch. Shapes follow the server's OpenAPI (api-doc/openapi/paths/me_*.yaml, organization_*.yaml). Pure
 * functions, tested in tests/membership.test.ts.
 */

export interface OrgRef {
	id: string;
	name: string;
	/** The organization of the current session (GET /me/organizations may mark it). */
	current?: boolean;
}

const toOrgRef = (raw: unknown): OrgRef | null => {
	if (!raw || typeof raw !== 'object') return null;
	const { id, name, current } = raw as { id?: unknown; name?: unknown; current?: unknown };
	if (typeof id !== 'string' || !id) return null;
	return { id, name: typeof name === 'string' && name ? name : id, ...(current === true ? { current: true } : {}) };
};

/** A list of organizations from any of the assumed shapes (`[...]`, `{ data: [...] }`), invalid entries dropped. */
export const parseOrgList = (raw: unknown): OrgRef[] => {
	const list = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data : [];
	const seen = new Set<string>();
	return list.map(toOrgRef).filter((o): o is OrgRef => {
		if (!o || seen.has(o.id)) return false;
		seen.add(o.id);
		return true;
	});
};

/**
 * Whether a login response asks the user to pick an organization: it lists two or more `organizations` and
 * gives no session token. The login is then repeated with the query parameter `organization=<id>`.
 */
export const loginNeedsOrgChoice = (data: unknown): OrgRef[] | null => {
	if (!data || typeof data !== 'object') return null;
	const d = data as { token?: unknown; organizations?: unknown };
	const orgs = parseOrgList(d.organizations);
	if (orgs.length < 2) return null;
	if (typeof d.token === 'string' && d.token) return null;
	return orgs;
};

/** The switcher is shown only to users of more than one organization. */
export const showOrgSwitcher = (orgs: OrgRef[] | null | undefined): boolean => (orgs?.length ?? 0) > 1;

/** The current organization of the list: the one marked current, else the one with `currentId`. */
export const currentOrg = (orgs: OrgRef[], currentId?: string | null): OrgRef | null =>
	orgs.find(o => o.current) ?? (currentId ? orgs.find(o => o.id === currentId) ?? null : null);

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);
const listOf = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data : []);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? v as Record<string, unknown> : null);

/** A pending invitation of the signed-in login into an organization (GET /me/invitations). */
export interface MyInvitation {
	/** Organization ID */
	id: string;
	name: string;
	invitedBy: string;
	createdAt: string;
}

export const parseMyInvitations = (raw: unknown): MyInvitation[] => {
	const seen = new Set<string>();
	return listOf(raw).flatMap((r) => {
		const o = obj(r);
		const id = str(o?.id);
		if (!o || !id || seen.has(id)) return [];
		seen.add(id);
		return [{ id, name: str(o.name) || id, invitedBy: str(o.invited_by), createdAt: str(o.created_at) }];
	});
};

/** An organization's pending invitation of an existing account (GET /organization/invitations). */
export interface PendingInvitation {
	username: string;
	groups: string[];
	invitedBy: string;
	createdAt: string;
}

export const parsePendingInvitations = (raw: unknown): PendingInvitation[] => listOf(raw).flatMap((r) => {
	const o = obj(r);
	const username = str(o?.username);
	return o && username ? [{ username, groups: strList(o.groups), invitedBy: str(o.invited_by), createdAt: str(o.created_at) }] : [];
});

/** A member of an organization as operators see it (GET /operator/organizations/{id}/members). */
export interface OrgMember {
	username: string;
	groups: string[];
	/** How many organizations the login belongs to, this one included. */
	organizations: number;
	/** How the member signs in there (`both`, `password`, `oidc`), when the server says (Postgres with [oidc]). */
	sign_in?: string;
}

export const parseMembers = (raw: unknown): OrgMember[] => listOf(raw).flatMap((r) => {
	const o = obj(r);
	const username = str(o?.username);
	if (!o || !username) return [];
	const n = typeof o.organizations === 'number' && Number.isFinite(o.organizations) && o.organizations >= 1 ? Math.floor(o.organizations) : 1;
	const signIn = str(o.sign_in);
	return [{ username, groups: strList(o.groups), organizations: n, ...(signIn ? { sign_in: signIn } : {}) }];
}).sort((a, b) => a.username.localeCompare(b.username));

/** What inviting a login did (POST /organization/members → OrganizationInvited). */
export type InviteOutcome =
	/** A new account, a member at once, with a generated password shown only this once. */
	| { kind: 'new-account'; username: string; organization: string; password: string }
	/** An existing account: a member once its owner accepts. */
	| { kind: 'pending'; username: string; organization: string };

export const inviteOutcome = (raw: unknown, fallbackUsername = ''): InviteOutcome => {
	const o = obj(obj(raw)?.data) ?? obj(raw) ?? {};
	const username = str(o.username) || fallbackUsername;
	const organization = str(o.organization);
	const password = str(o.password);
	if (o.new_account === true && password) return { kind: 'new-account', username, organization, password };
	return { kind: 'pending', username, organization };
};

/** A login to invite: normally an email address; no spaces, at most 200 characters. Null when acceptable. */
export const inviteLoginError = (login: string): string | null => {
	const v = login.trim();
	if (!v) return 'Enter the email address or login to invite.';
	if (/\s/.test(v)) return 'A login has no spaces.';
	if (v.length > 200) return 'At most 200 characters.';
	return null;
};

/**
 * Whether an error is the server refusing an administrator's change of a member's account (password, 2FA
 * address, TOTP secret or login name) because the login belongs to other organizations too (403).
 */
export const isSharedAccountRefusal = (status: number | undefined, message: string): boolean =>
	status === 403 && /other organizations/i.test(message);

/** The most a session may live (the server's `token-lifetime` maximum, 90 days). */
export const MAX_TOKEN_LIFETIME = 7776000;

/**
 * The `token-lifetime` (seconds) to ask for when switching organizations: the one chosen at sign-in, so a
 * switch doesn't shorten a "remember me" session to the server's 10-minute default. Null when unknown/invalid.
 */
export const switchLifetime = (stored: string | null | undefined): number | null => {
	if (!stored || !/^\d+$/.test(stored)) return null;
	const n = Number(stored);
	return n > 0 && n <= MAX_TOKEN_LIFETIME ? n : null;
};
