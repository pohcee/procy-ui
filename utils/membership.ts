/**
 * Organization membership (a user who belongs to several organizations): reading the org list from a login
 * response and from GET /me/organizations. Kept in one place because the membership API is not final; the
 * shapes assumed here are listed in the comments. Pure functions, tested in tests/membership.test.ts.
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
 * gives no session token. (Assumed: the server then expects the login to be repeated with `organization=<id>`.)
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
