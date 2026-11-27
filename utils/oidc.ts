/**
 * Sign in with Google (OpenID Connect, see the server's docs/…/oidc.md): the provider info of GET /auth/provider,
 * the browser navigation to the server's login URL, the fragment the server's callback sends to /auth/oidc, the
 * exchange of its one-time sign-in code (POST /oidc/token, answered like POST /login) and the per-user and
 * per-organization sign-in policy. Pure functions, tested in tests/oidc.test.ts.
 */
import { loginNeedsOrgChoice, type OrgRef } from './membership.ts';
import { safeNext } from './signup.ts';

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? v as Record<string, unknown> : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

// ---- Provider and login link ----

export const DEFAULT_OIDC_LOGIN_URL = '/api/v1/oidc/login';
export const DEFAULT_OIDC_BUTTON_LABEL = 'Sign in with Google';

export interface OidcProvider {
	buttonLabel: string;
	/** A path on the API server (`/api/v1/oidc/login`). */
	loginUrl: string;
}

/** The `oidc` part of GET /auth/provider ({ data: { oidc } }), or null when Google sign-in is off. */
export const parseOidcProvider = (raw: unknown): OidcProvider | null => {
	const root = obj(raw);
	const o = obj(obj(root?.data)?.oidc) ?? obj(root?.oidc);
	if (!o || o.enabled !== true) return null;
	const label = str(o.button_label).trim();
	const url = str(o.login_url).trim();
	// Only a path of the API server: never navigate to another host named by the response.
	const loginUrl = url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') ? url : DEFAULT_OIDC_LOGIN_URL;
	return { buttonLabel: label || DEFAULT_OIDC_BUTTON_LABEL, loginUrl };
};

/** Where the app goes after signing in when nothing else is asked for. */
export const DEFAULT_RETURN_TO = '/dashboard';

/**
 * A `return_to` path that is safe to navigate to: relative, starting with a single "/" (no scheme, host, `//`
 * or backslash), not the sign-in pages themselves; else the default.
 */
export const safeReturnTo = (value: unknown): string => {
	const v = safeNext(value);
	if (!v || /^\/auth\/oidc\/?(\?|#|$)/i.test(v)) return DEFAULT_RETURN_TO;
	return v;
};

/**
 * The full-page URL that starts a Google sign-in: the API base (`apiBaseUrl()`, joined like the API client's
 * baseURL, so a base with a path such as /rport/ keeps it) + the provider's login URL + `?return_to=`.
 */
export const oidcLoginHref = (apiBase: URL | string, loginUrl: string, returnTo: unknown): string => {
	const base = new URL(String(apiBase));
	const path = `${base.pathname.replace(/\/+$/, '')}${loginUrl.startsWith('/') ? '' : '/'}${loginUrl}`;
	const url = new URL(path, base.origin);
	url.searchParams.set('return_to', safeReturnTo(returnTo));
	return url.toString();
};

// ---- The callback's fragment (/auth/oidc#…) ----

export type OidcFragment
	= | { kind: 'code'; code: string; returnTo: string }
		| { kind: 'error'; reason: string; description: string }
		| { kind: 'none' };

/** Reads `#code=…&return_to=…` or `#error=…&error_description=…` (the leading "#" optional). */
export const parseOidcFragment = (hash: string): OidcFragment => {
	const params = new URLSearchParams((hash ?? '').replace(/^#/, ''));
	const error = params.get('error')?.trim();
	if (error) return { kind: 'error', reason: error, description: (params.get('error_description') ?? '').trim() };
	const code = params.get('code')?.trim();
	if (code) return { kind: 'code', code, returnTo: safeReturnTo(params.get('return_to')) };
	return { kind: 'none' };
};

const ERROR_MESSAGES: Record<string, string> = {
	access_denied: 'The Google sign-in was canceled.',
	invalid_state: 'This sign-in attempt expired or was started in another browser. Please try again.',
	email_unverified: 'Your Google account’s email address is not verified. Verify it with Google, then try again.',
	domain_not_allowed: 'Accounts of this email domain can’t sign in to this server with Google.',
	unknown_account: 'There is no account for this Google email address. Ask an administrator to add you, or sign in with your password.',
	account_mismatch: 'This account is linked to a different Google account. Sign in with that one, or ask an administrator to unlink it.',
	oidc_not_allowed: 'Google sign-in isn’t allowed for this account. Sign in with your password.',
	ambiguous_account: 'Several accounts match this Google email address. Ask an administrator.',
	unmanaged_email: 'Google doesn’t manage the email address of this Google account, so it can’t be linked. Use a Gmail or Google Workspace account, or sign in with your password.',
	server_error: 'The server couldn’t complete the Google sign-in. Please try again later.',
};

/**
 * A readable message for the `error` reason of the callback, else a generic one. The free-text description of the
 * fragment is never shown: anyone can craft a link to this page with any text in it.
 */
export const oidcErrorMessage = (reason: string, _description = ''): string =>
	ERROR_MESSAGES[reason] || 'The Google sign-in failed. Please try again.';

// ---- Signing up with Google (GET /oidc/signup?organization=, ending at /auth/signup/google#…) ----

/** The full-page URL that starts a Google signup: the API base + the signup URL + `?organization=`. */
export const googleSignupHref = (apiBase: URL | string, signupUrl: string, organization: string): string => {
	const base = new URL(String(apiBase));
	const path = `${base.pathname.replace(/\/+$/, '')}${signupUrl.startsWith('/') ? '' : '/'}${signupUrl}`;
	const url = new URL(path, base.origin);
	url.searchParams.set('organization', organization.trim());
	return url.toString();
};

export type GoogleSignupFragment
	= | { kind: 'awaiting_approval'; organizationName: string; email: string }
		| { kind: 'completed'; organization: string; organizationName: string; email: string }
		| { kind: 'error'; reason: string; description: string }
		| { kind: 'none' };

/**
 * Reads the fragment the server's callback sends a Google signup to: `status=awaiting_approval&organization_name=&email=`,
 * `status=completed&organization=&organization_name=&email=` or `error=…&error_description=…` (the "#" optional).
 */
export const parseGoogleSignupFragment = (hash: string): GoogleSignupFragment => {
	const params = new URLSearchParams((hash ?? '').replace(/^#/, ''));
	const get = (k: string) => (params.get(k) ?? '').trim();
	const error = get('error');
	if (error) return { kind: 'error', reason: error, description: get('error_description') };
	const status = get('status');
	if (status === 'awaiting_approval') return { kind: 'awaiting_approval', organizationName: get('organization_name'), email: get('email') };
	if (status === 'completed') {
		return { kind: 'completed', organization: get('organization'), organizationName: get('organization_name') || get('organization'), email: get('email') };
	}
	return { kind: 'none' };
};

const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
	access_denied: 'The Google sign-in was canceled, so nothing was created. You can try again or sign up with your email address.',
	invalid_state: 'This signup attempt expired or was started in another browser. Please start again.',
	email_unverified: 'Your Google account’s email address is not verified. Verify it with Google, or sign up with your email address.',
	domain_not_allowed: 'Accounts of this email domain can’t sign up here with Google. Sign up with your email address instead.',
	unmanaged_email: 'Google doesn’t manage the email address of this Google account. Use a Gmail or Google Workspace account, or sign up with your email address.',
	account_exists: 'This address has an account already. Sign in instead.',
	rate_limited: 'Too many signups from here today. Try again tomorrow.',
	invalid: 'The organization name wasn’t accepted. Choose another name and try again.',
	domain_refused: 'Signups from this email domain aren’t accepted. Use another address, or write to support.',
	server_error: 'The server couldn’t finish the signup. Please try again later.',
};

/** A readable message for the reason of a failed Google signup (the free-text description is never shown). */
export const googleSignupErrorMessage = (reason: string, _description = ''): string =>
	SIGNUP_ERROR_MESSAGES[reason] || 'The Google signup didn’t work. Please try again, or sign up with your email address.';

// ---- Exchanging the sign-in code (POST /oidc/token) ----

export type OidcTokenOutcome
	= | { kind: 'signed-in'; token: string }
		| { kind: 'choose-org'; organizations: OrgRef[] }
		| { kind: 'failed'; message: string };

/**
 * What a POST /oidc/token answer means; it answers like POST /login ({ data: { token, organizations? } }). An
 * account of several organizations that named none gets a list to pick from (then the same code is sent again
 * with `organization`). There is no 2FA step after a Google sign-in.
 */
export const oidcTokenOutcome = (raw: unknown, organizationSent = false): OidcTokenOutcome => {
	const data = obj(obj(raw)?.data) ?? obj(raw);
	const token = str(data?.token);
	if (!organizationSent && !token) {
		const orgs = loginNeedsOrgChoice(data);
		if (orgs) return { kind: 'choose-org', organizations: orgs };
	}
	if (token) return { kind: 'signed-in', token };
	return { kind: 'failed', message: 'The server didn’t start a session. Please try again.' };
};

/** The message for a refused POST /oidc/token: 401 is an expired or used code, 403 the server's reason. */
export const oidcTokenErrorMessage = (status: number | undefined, serverMessage: string): string => {
	if (status === 401) return 'The sign-in link expired. Please sign in with Google again.';
	if (status === 403) return serverMessage || 'Google sign-in isn’t allowed for this account here.';
	return serverMessage || 'An error occurred. Please try again later.';
};

/** POST /login (or /verify-2fa) refused a password sign-in: this account signs in with Google. */
export const isOidcRequiredError = (status: number | undefined, code: unknown): boolean =>
	status === 403 && code === 'oidc_required';

export const OIDC_REQUIRED_MESSAGE = 'This account signs in with Google.';

/** The "remember me" choice survives the round trip to Google in the tab's session storage. */
export const OIDC_LIFETIME_KEY = 'orp2_oidc_lifetime';

/** A session lifetime in seconds (a positive integer as text), else null. */
export const lifetimeParam = (value: unknown): string | null =>
	typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) ? value : null;

// ---- Sign-in policy ----

export type SignInMethod = 'both' | 'password' | 'oidc';
export const SIGN_IN_METHODS: SignInMethod[] = ['both', 'password', 'oidc'];

/** A `sign_in` value of the API, or null when absent or unknown (standalone servers omit it). */
export const parseSignIn = (v: unknown): SignInMethod | null =>
	(SIGN_IN_METHODS as unknown[]).includes(v) ? v as SignInMethod : null;

const SIGN_IN_LABELS: Record<SignInMethod, string> = {
	both: 'Password and Google',
	password: 'Password only',
	oidc: 'Google only',
};

export const signInLabel = (method: unknown): string => {
	const m = parseSignIn(method);
	return m ? SIGN_IN_LABELS[m] : '';
};

/** How the current session signed in (GET /me → auth_method). */
export const authMethodLabel = (method: unknown): string =>
	method === 'oidc' ? 'Google' : method === 'password' ? 'Password' : '';

/** The platform operators' organization: its members sign in with Google only. */
export const SYSTEM_ORG = '_system';

export const isSystemOrg = (orgId: string | null | undefined, operator = false): boolean => operator || orgId === SYSTEM_ORG;

/** Whether a password belongs to the account at all (the password fields are shown). */
export const passwordAllowed = (opts: { signIn?: SignInMethod | null; systemOrg?: boolean; orgRequiresOidc?: boolean }): boolean =>
	!opts.systemOrg && !opts.orgRequiresOidc && opts.signIn !== 'oidc';

/** GET /organization/sign-in → { require_oidc, oidc_enabled } ({ data: … } or bare), or null. */
export interface OrgSignIn {
	requireOidc: boolean;
	oidcEnabled: boolean;
}

export const parseOrgSignIn = (raw: unknown): OrgSignIn | null => {
	const o = obj(obj(raw)?.data) ?? obj(raw);
	if (!o || typeof o.require_oidc !== 'boolean') return null;
	return { requireOidc: o.require_oidc, oidcEnabled: o.oidc_enabled === true };
};
