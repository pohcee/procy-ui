import { HttpFactory } from '~/repository/factory';
import { parseMembers, type OrgMember } from '~/utils/membership';
import { parseDeletion, parseDeletions, parseSignups, type OrgDeletion, type SignupRow } from '~/utils/signup';
import type { OrgUsageRow, UsageReport } from '~/utils/usage';
import {
	parseActivity, parseConsoleInvitation, parseConsoleInvitations, parseConsoleMembers, parseConsoleOrgs, parseOrgDevices,
	parseOverview, parseStatsReport,
	type ActivityKind, type ActivityPage, type ConsoleInvitation, type ConsoleMember, type ConsoleOrg, type OrgDevices,
	type OrgStatsReport, type Overview, type StatsRange,
} from '~/utils/operatorConsole';

/** An organization as platform operators see it (GET /operator/organizations). */
export interface Organization {
	id: string;
	name: string;
	status: 'active' | 'suspended' | string;
	created_at: string;
	device_count: number;
	/** null: unlimited */
	device_limit: number | null;
	user_count: number;
	/** Members must sign in with Google (Postgres servers with [oidc]). */
	require_oidc?: boolean;
}

/** A created administrator; the password is shown once. */
export interface OrganizationAdmin {
	organization: string;
	username: string;
	password: string;
	password_expired: boolean;
}

export interface OperatorUsage {
	from: string;
	to: string;
	sort?: string;
	organizations: OrgUsageRow[];
}

const org = (id: string) => `/api/v1/operator/organizations/${encodeURIComponent(id)}`;
const query = (params: Record<string, string | undefined>) => {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
	const s = q.toString();
	return s ? `?${s}` : '';
};

/** Platform operator API (capability `operator`). */
class OperatorModule extends HttpFactory {
	async list(): Promise<Organization[]> {
		const res = await this.call<{ data: Organization[] }>('GET', '/api/v1/operator/organizations');
		return res?.data ?? [];
	}

	async get(id: string): Promise<Organization> {
		return (await this.call<{ data: Organization }>('GET', org(id))).data;
	}

	async create(body: { id: string; name?: string; device_limit?: number | null }): Promise<Organization> {
		return (await this.call<{ data: Organization }>('POST', '/api/v1/operator/organizations', body)).data;
	}

	async suspend(id: string): Promise<Organization> {
		return (await this.call<{ data: Organization }>('POST', `${org(id)}/suspend`)).data;
	}

	async activate(id: string): Promise<Organization> {
		return (await this.call<{ data: Organization }>('POST', `${org(id)}/activate`)).data;
	}

	async setDeviceLimit(id: string, deviceLimit: number | null): Promise<Organization> {
		return (await this.call<{ data: Organization }>('PUT', `${org(id)}/device-limit`, { device_limit: deviceLimit })).data;
	}

	/** PUT …/sign-in { require_oidc } → the organization. */
	async setSignIn(id: string, requireOidc: boolean): Promise<Organization> {
		return (await this.call<{ data: Organization }>('PUT', `${org(id)}/sign-in`, { require_oidc: requireOidc })).data;
	}

	async addAdmin(id: string, body: { username: string; two_fa_send_to?: string }): Promise<OrganizationAdmin> {
		return (await this.call<{ data: OrganizationAdmin }>('POST', `${org(id)}/admins`, body)).data;
	}

	/** The organization's members, with their groups and how many organizations each belongs to. */
	async members(id: string): Promise<OrgMember[]> {
		return parseMembers(await this.call<unknown>('GET', `${org(id)}/members`));
	}

	async orgUsage(id: string, params: { from?: string; to?: string; granularity?: 'hour' | 'day' | 'month' }): Promise<UsageReport> {
		return (await this.call<{ data: UsageReport }>('GET', `${org(id)}/usage${query(params)}`)).data;
	}

	// ---- Operator console (read-only metadata, except the invitation resend/revoke) ----

	/** GET /operator/overview: tiles, the attention list and 30 days of platform series. */
	async overview(): Promise<Overview> {
		return parseOverview(await this.call<unknown>('GET', '/api/v1/operator/overview'));
	}

	/** GET /operator/organizations?stats=…: the list with each organization's stats (and billing with [billing]). */
	async listWithStats(range: StatsRange = '30d'): Promise<ConsoleOrg[]> {
		return parseConsoleOrgs(await this.call<unknown>('GET', `/api/v1/operator/organizations${query({ stats: range })}`));
	}

	/** GET …/stats?from&to&granularity: zero-filled periods with in/out/devices. */
	async orgStats(id: string, params: { from: string; to: string; granularity: 'hour' | 'day' }): Promise<OrgStatsReport> {
		return parseStatsReport(await this.call<unknown>('GET', `${org(id)}/stats${query(params)}`));
	}

	/** GET …/devices: the devices counted for the limit (metadata only). */
	async orgDevices(id: string): Promise<OrgDevices> {
		return parseOrgDevices(await this.call<unknown>('GET', `${org(id)}/devices`));
	}

	/** GET …/members with sign-in details (has_password, oidc_linked, two_fa, last_login_at). */
	async consoleMembers(id: string): Promise<ConsoleMember[]> {
		return parseConsoleMembers(await this.call<unknown>('GET', `${org(id)}/members`));
	}

	/** GET /operator/invitations[?organization]: pending invitations, newest first. */
	async invitations(organization?: string): Promise<ConsoleInvitation[]> {
		return parseConsoleInvitations(await this.call<unknown>('GET', `/api/v1/operator/invitations${query({ organization })}`));
	}

	/** Renews a pending invitation (no email is sent); returns it, or null when the response has none. */
	async resendInvitation(id: string, username: string): Promise<ConsoleInvitation | null> {
		return parseConsoleInvitation(await this.call<unknown>('POST', `${org(id)}/invitations/${encodeURIComponent(username)}/resend`));
	}

	async revokeInvitation(id: string, username: string): Promise<void> {
		await this.call<unknown>('DELETE', `${org(id)}/invitations/${encodeURIComponent(username)}`);
	}

	/** GET …/activity?kind&limit&before: audit metadata, newest first, with a cursor for more. */
	async activity(id: string, params: { kind?: ActivityKind; limit?: number; before?: string | null } = {}): Promise<ActivityPage> {
		return parseActivity(await this.call<unknown>('GET', `${org(id)}/activity${query({
			kind: params.kind ?? 'all',
			limit: params.limit ? String(params.limit) : undefined,
			before: params.before ?? undefined,
		})}`));
	}

	// ---- Signups and deletions (servers with [signup] enabled) ----

	/** GET /operator/signups?status&limit, newest first. */
	async signups(params: { status?: string; limit?: number } = {}): Promise<SignupRow[]> {
		return parseSignups(await this.call<unknown>('GET', `/api/v1/operator/signups${query({ status: params.status, limit: params.limit ? String(params.limit) : undefined })}`));
	}

	async approveSignup(id: string): Promise<void> {
		await this.call<unknown>('POST', `/api/v1/operator/signups/${encodeURIComponent(id)}/approve`);
	}

	async denySignup(id: string, reason?: string): Promise<void> {
		await this.call<unknown>('POST', `/api/v1/operator/signups/${encodeURIComponent(id)}/deny`, reason ? { reason } : {});
	}

	/** GET /operator/deletions?state&limit, newest first. */
	async deletions(params: { state?: string; limit?: number } = {}): Promise<OrgDeletion[]> {
		return parseDeletions(await this.call<unknown>('GET', `/api/v1/operator/deletions${query({ state: params.state, limit: params.limit ? String(params.limit) : undefined })}`));
	}

	/** DELETE …/deletion: cancels a pending deletion (the organization gets its previous status back). */
	async cancelDeletion(id: string): Promise<OrgDeletion | null> {
		return parseDeletion(await this.call<unknown>('DELETE', `${org(id)}/deletion`));
	}

	/** Ends the hold and deletes the organization at once. Irreversible. */
	async expediteDeletion(id: string): Promise<void> {
		await this.call<unknown>('POST', `${org(id)}/deletion/expedite`);
	}

	/** GET …/export: the organization's configuration without secrets. */
	async exportOrg(id: string): Promise<unknown> {
		return (await this.call<{ data?: unknown }>('GET', `${org(id)}/export`))?.data ?? null;
	}

	/** Every organization's totals for a month (YYYY-MM), heaviest first. */
	async usage(month?: string): Promise<OperatorUsage> {
		return (await this.call<{ data: OperatorUsage }>('GET', `/api/v1/operator/usage${query({ month })}`)).data;
	}
}

export default OperatorModule;
