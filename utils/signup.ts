/**
 * Self-service signup (Postgres servers with `[signup] enabled`): the public settings of the signup page, form
 * checks, the captcha providers and what a verification answer means. Shapes follow the server's OpenAPI
 * (api-doc/openapi/paths/signup*.yaml). Pure functions, tested in tests/signup.test.ts.
 */

export type CaptchaProvider = 'turnstile' | 'hcaptcha';

/** GET /api/v1/signup (public). */
export interface SignupConfig {
	enabled: boolean;
	captcha: CaptchaProvider | null;
	captchaSiteKey: string;
	requireApproval: boolean;
	passwordMinLength: number;
	trialDays: number;
	/** "Continue with Google" ([oidc] on the server): a full-page navigation to googleSignupUrl?organization=. */
	googleSignup: boolean;
	/** A path on the API server. */
	googleSignupUrl: string;
	googleButtonLabel: string;
	/** The email form ("Work email", a mailed link, a password). Off with `[signup] oidc_only`: Google only. */
	emailSignup: boolean;
}

export const DEFAULT_GOOGLE_SIGNUP_URL = '/api/v1/oidc/signup';
export const DEFAULT_GOOGLE_BUTTON_LABEL = 'Continue with Google';

/** Used when the server doesn't say (the server checks the password anyway). */
export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);

/** The signup settings, or null when signup is off (missing data or `enabled` not true). */
export const parseSignupConfig = (raw: unknown): SignupConfig | null => {
	const d = (raw as { data?: unknown })?.data ?? raw;
	if (!d || typeof d !== 'object') return null;
	const o = d as Record<string, unknown>;
	if (o.enabled !== true) return null;
	const provider = o.captcha === 'turnstile' || o.captcha === 'hcaptcha' ? o.captcha : null;
	const siteKey = typeof o.captcha_site_key === 'string' ? o.captcha_site_key : '';
	return {
		enabled: true,
		// A provider without a site key can't render a widget: treat it as none and let the server answer.
		captcha: provider && siteKey ? provider : null,
		captchaSiteKey: provider && siteKey ? siteKey : '',
		requireApproval: o.require_approval === true,
		passwordMinLength: num(o.password_min_length, 0) || DEFAULT_PASSWORD_MIN_LENGTH,
		trialDays: num(o.trial_days, 0),
		googleSignup: o.google_signup === true,
		googleSignupUrl: apiPath(o.google_signup_url, DEFAULT_GOOGLE_SIGNUP_URL),
		googleButtonLabel: (typeof o.google_button_label === 'string' && o.google_button_label.trim()) || DEFAULT_GOOGLE_BUTTON_LABEL,
		// Older servers don't say: they offer it.
		emailSignup: o.email_signup !== false,
	};
};

/** Only a path of the API server: never navigate to another host named by a response. */
const apiPath = (v: unknown, fallback: string): string => {
	const u = typeof v === 'string' ? v.trim() : '';
	return u.startsWith('/') && !u.startsWith('//') && !u.includes('\\') ? u : fallback;
};

/** The providers' official script URLs (explicit rendering; nothing else is ever loaded). */
export const CAPTCHA_SCRIPTS: Record<CaptchaProvider, string> = {
	turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
	hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off',
};

/** The signup form: no password, it is chosen on the verification link (POST /signup/verify). */
export interface SignupForm {
	email: string;
	organization: string;
}

export type SignupErrors = Partial<Record<keyof SignupForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

/** Field errors of the signup form; empty when it can be sent. */
export const validateSignup = (f: SignupForm): SignupErrors => {
	const e: SignupErrors = {};
	const email = f.email.trim();
	if (!email) e.email = 'Enter your email address.';
	else if (!EMAIL.test(email) || email.length > 254) e.email = 'Enter a valid email address, like you@example.com.';
	const org = f.organization.trim();
	if (!org) e.organization = 'Enter the name of your organization.';
	else if (org.length > 200) e.organization = 'At most 200 characters.';
	return e;
};

export interface PasswordForm {
	password: string;
	confirm: string;
}

/** Errors of the password chosen on the verification link (the server also rejects guessable ones). */
export const validatePassword = (f: PasswordForm, minLength = DEFAULT_PASSWORD_MIN_LENGTH): Partial<Record<keyof PasswordForm, string>> => {
	const e: Partial<Record<keyof PasswordForm, string>> = {};
	if (!f.password) e.password = 'Choose a password.';
	else if ([...f.password].length < minLength) e.password = `At least ${minLength} characters.`;
	if (f.password && f.confirm !== f.password) e.confirm = 'Passwords do not match.';
	return e;
};

/**
 * Why POST /signup/verify was refused: the password (400 "invalid input: …"; the link stays usable, so the form is
 * shown again), or the link itself (unknown, used, expired), or anything else.
 */
export const verifyErrorKind = (status: number | undefined, serverMessage: string): 'password' | 'link' | 'other' => {
	if (status === 400) return /^invalid input/i.test(serverMessage) || /password/i.test(serverMessage) ? 'password' : 'link';
	return 'other';
};

/** The server's reason a password was refused, without its "invalid input:" prefix. */
export const passwordRefusal = (serverMessage: string): string => {
	const m = serverMessage.replace(/^invalid input:\s*/i, '').trim();
	return m ? m.charAt(0).toUpperCase() + m.slice(1) + (/[.!]$/.test(m) ? '' : '.') : 'This password was not accepted.';
};

export type VerifyOutcome
	= | {
		kind: 'completed';
		organization: string;
		organizationName: string;
		username: string;
		checkoutRequired: boolean;
		plan: string;
		trialEndsAt: string;
	}
	| { kind: 'awaiting_approval'; organizationName: string; username: string };

/** What a verification answered (201 completed, 202 awaiting the approval of an operator). */
export const verifyOutcome = (raw: unknown, httpStatus?: number): VerifyOutcome => {
	const d = ((raw as { data?: unknown })?.data ?? raw ?? {}) as Record<string, unknown>;
	const s = (v: unknown) => (typeof v === 'string' ? v : '');
	const plan = (d.plan && typeof d.plan === 'object' ? d.plan : {}) as Record<string, unknown>;
	if (d.status === 'awaiting_approval' || (httpStatus === 202 && d.status !== 'completed')) {
		return { kind: 'awaiting_approval', organizationName: s(d.organization_name), username: s(d.username) };
	}
	return {
		kind: 'completed',
		organization: s(d.organization),
		organizationName: s(d.organization_name) || s(d.organization),
		username: s(d.username),
		checkoutRequired: d.checkout_required === true || plan.checkout_required === true,
		plan: s(plan.plan),
		trialEndsAt: s(plan.trial_ends_at),
	};
};

/** A message for a failed verification (or deletion-cancel link). */
export const linkErrorMessage = (status: number | undefined, serverMessage: string, what: 'verify' | 'cancel'): string => {
	if (status === 404) return 'Signup is not available on this server.';
	if (status === 409) return 'This email address has an account already. Sign in instead.';
	if (status === 400) {
		return what === 'verify'
			? 'This link is invalid, was already used or has expired. Sign up again to get a new one.'
			: 'This link is invalid, was already used, or the deletion is no longer pending.';
	}
	return serverMessage ? `Something went wrong: ${serverMessage}` : 'Something went wrong. Try again later.';
};

/** A message for a refused signup request. */
export const signupErrorMessage = (status: number | undefined, serverMessage: string): string => {
	if (status === 429) return 'Too many signups from here today. Try again tomorrow.';
	if (status === 503) return 'The email could not be sent. Try again in a few minutes.';
	if (status === 404) return 'Signup is not available on this server.';
	return serverMessage || 'Something went wrong. Try again later.';
};

/**
 * Where a sign-in goes after verifying a signup that needs a checkout: the sign-in page with the login filled in
 * and the plan to check out (picked up after sign-in, see checkoutPlanFromQuery).
 */
export const signInAfterSignup = (o: VerifyOutcome): string => {
	const q = new URLSearchParams();
	if (o.username) q.set('username', o.username);
	if (o.kind === 'completed' && o.checkoutRequired && o.plan) q.set('checkout', o.plan);
	const s = q.toString();
	return s ? `/auth?${s}` : '/auth';
};

/** The plan to check out after sign-in (`?checkout=<plan>`), or null. */
export const checkoutPlanFromQuery = (value: unknown): string | null => {
	const v = Array.isArray(value) ? value[0] : value;
	if (typeof v !== 'string' || !v || v.length > 64 || !/^[\w.-]+$/.test(v)) return null;
	return v;
};

/**
 * Routes reachable without signing in: the home page (exactly "/"), sign-in and signup (/auth/confirm-email asks to
 * sign in itself, then comes back; /auth/oidc finishes a Google sign-in, /auth/signup/google a Google signup).
 */
const PUBLIC_PATHS = ['/', '/auth', '/auth/oidc', '/auth/signup/google', '/signup', '/signup/verify', '/auth/signup/verify', '/auth/signup/cancel-deletion', '/auth/confirm-email'];

/**
 * Where to go after signing in (`?next=`): only a path of this site (no scheme, no host, no `//`, no backslash),
 * else null.
 */
export const safeNext = (value: unknown): string | null => {
	const v = Array.isArray(value) ? value[0] : value;
	if (typeof v !== 'string' || !v.startsWith('/') || v.startsWith('//') || /[\\\s]/.test(v) || v.length > 2048) return null;
	if (/^\/auth\/?(\?|#|$)/i.test(v)) return null;
	return v;
};

// ---- Email confirmation (signed-in accounts) ----

/** POST /me/email-confirmation and …/confirm → { login, verified, sent }. */
export interface EmailStatus {
	login: string;
	verified: boolean;
	sent: boolean;
}

export const parseEmailStatus = (raw: unknown): EmailStatus => {
	const d = ((raw as { data?: unknown })?.data ?? raw ?? {}) as Record<string, unknown>;
	return { login: typeof d.login === 'string' ? d.login : '', verified: d.verified === true, sent: d.sent === true };
};

/** Whether a refusal is about an account that hasn't confirmed its email (membership with signup on). */
export const isUnconfirmedEmailError = (message: string): boolean => /not confirmed its email/i.test(message);

/** A message for a refused confirmation request or link. */
export const emailConfirmErrorMessage = (status: number | undefined, serverMessage: string, what: 'send' | 'confirm'): string => {
	if (status === 404) return 'Email confirmation is not available on this server.';
	if (status === 429) return 'Too many confirmation links today. Try again tomorrow.';
	if (status === 400) {
		return what === 'send'
			? 'Your login is not an email address, so it can’t be confirmed. Ask an administrator to rename it to your email address.'
			: 'This link is invalid, was already used, expired, or belongs to another account. Sign in as the account that asked for it, or send a new link from your profile.';
	}
	return serverMessage ? `Something went wrong: ${serverMessage}` : 'Something went wrong. Try again later.';
};

// ---- Organization export and deletion ----

/** The file name of an organization's export: procy-<org>-export-YYYY-MM-DD.json (safe characters only). */
export const exportFileName = (org: string, now: Date = new Date()): string =>
	`procy-${(org || 'organization').replace(/[^\w.-]+/g, '-').slice(0, 64)}-export-${now.toISOString().slice(0, 10)}.json`;

/** An organization deletion (POST /organization/deletion, GET /operator/deletions). */
export interface OrgDeletion {
	id: number;
	organizationId: string;
	organizationName: string;
	state: 'pending' | 'canceled' | 'done' | string;
	requestedAt: string;
	requestedBy: string;
	reason: string;
	deleteAfter: string;
	previousStatus: string;
	finishedAt: string;
	finishedBy: string;
	cancelLinksSent: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const listOf = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data : []);

const toDeletion = (r: unknown): OrgDeletion | null => {
	if (!r || typeof r !== 'object') return null;
	const o = r as Record<string, unknown>;
	const organizationId = str(o.organization_id);
	if (!organizationId) return null;
	return {
		id: typeof o.id === 'number' ? o.id : 0,
		organizationId,
		organizationName: str(o.organization_name) || organizationId,
		state: str(o.state),
		requestedAt: str(o.requested_at),
		requestedBy: str(o.requested_by),
		reason: str(o.reason),
		deleteAfter: str(o.delete_after),
		previousStatus: str(o.previous_status),
		finishedAt: str(o.finished_at),
		finishedBy: str(o.finished_by),
		cancelLinksSent: typeof o.cancel_links_sent === 'number' ? o.cancel_links_sent : 0,
	};
};

export const parseDeletion = (raw: unknown): OrgDeletion | null => toDeletion((raw as { data?: unknown })?.data ?? raw);
export const parseDeletions = (raw: unknown): OrgDeletion[] => listOf(raw).map(toDeletion).filter((d): d is OrgDeletion => !!d);

/** A signup as operators see it (GET /operator/signups). */
export interface SignupRow {
	id: string;
	email: string;
	domain: string;
	remoteIp: string;
	organizationName: string;
	status: string;
	createdAt: string;
	expiresAt: string;
	verifiedAt: string;
	decidedAt: string;
	decidedBy: string;
	reason: string;
	organizationId: string;
	method: 'email' | 'google';
	/** Whether the email domain has MX records; null: not looked up (or an older server). */
	mxFound: boolean | null;
	/** A large free-mail provider (domain checks are skipped for those). */
	freeMail: boolean;
	/** Completed signups of the same domain. */
	domainCustomers: number;
	emailDeniedBefore: number;
	domainDeniedBefore: number;
}

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export const parseSignups = (raw: unknown): SignupRow[] => listOf(raw).flatMap((r) => {
	if (!r || typeof r !== 'object') return [];
	const o = r as Record<string, unknown>;
	const id = str(o.id);
	if (!id) return [];
	return [{
		id, email: str(o.email), domain: str(o.domain), remoteIp: str(o.remote_ip), organizationName: str(o.organization_name),
		status: str(o.status), createdAt: str(o.created_at), expiresAt: str(o.expires_at), verifiedAt: str(o.verified_at),
		decidedAt: str(o.decided_at), decidedBy: str(o.decided_by), reason: str(o.reason), organizationId: str(o.organization_id),
		method: o.method === 'google' ? 'google' : 'email',
		mxFound: typeof o.mx_found === 'boolean' ? o.mx_found : null,
		freeMail: o.free_mail === true,
		domainCustomers: count(o.domain_customers),
		emailDeniedBefore: count(o.email_denied_before),
		domainDeniedBefore: count(o.domain_denied_before),
	}];
});

/** How long a confirmed signup has waited: "waiting 12 min", "waiting 3 h", "waiting 2 d"; "" without a time. */
export const formatWaiting = (verifiedAt: string, now: Date = new Date()): string => {
	const t = verifiedAt ? Date.parse(verifiedAt) : Number.NaN;
	if (!Number.isFinite(t)) return '';
	const min = Math.floor(Math.max(0, now.getTime() - t) / 60_000);
	if (min < 1) return 'waiting under a minute';
	if (min < 60) return `waiting ${min} min`;
	const h = Math.floor(min / 60);
	if (h < 48) return `waiting ${h} h`;
	return `waiting ${Math.floor(h / 24)} d`;
};

export interface SignupFact {
	text: string;
	tone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
	title?: string;
}

/** The facts an operator decides a signup on, in reading order (shown under its email in the queue). */
export const signupFacts = (r: SignupRow, now: Date = new Date()): SignupFact[] => {
	const out: SignupFact[] = [];
	const domain = r.domain || r.email.split('@')[1] || '';
	if (domain) out.push({ text: domain, tone: 'neutral' });
	if (r.freeMail) out.push({ text: 'free mail', tone: 'info' });
	if (r.mxFound === true) out.push({ text: 'MX ✓', tone: 'ok', title: 'The domain has mail servers' });
	else if (r.mxFound === false) out.push({ text: 'MX ✗', tone: 'danger', title: 'The domain has no mail servers' });
	else out.push({ text: 'MX ?', tone: 'neutral', title: 'Mail servers not looked up' });
	if (r.method === 'google') out.push({ text: 'via Google', tone: 'info' });
	if (r.status === 'awaiting_approval') {
		const w = formatWaiting(r.verifiedAt, now);
		if (w) out.push({ text: w, tone: 'warn' });
	}
	if (r.domainCustomers > 0) out.push({ text: `domain already a customer (${r.domainCustomers})`, tone: 'warn' });
	if (r.emailDeniedBefore > 0) out.push({ text: `this email was rejected before (${r.emailDeniedBefore})`, tone: 'danger' });
	if (r.domainDeniedBefore > 0) out.push({ text: `domain rejected before (${r.domainDeniedBefore})`, tone: 'danger' });
	return out;
};

/** A signup's status for operators: label, tone and whether it can be approved or denied. */
export const signupStatusInfo = (status: string): { label: string; tone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral'; approve: boolean; deny: boolean } => {
	switch (status) {
		case 'awaiting_approval': return { label: 'Awaiting approval', tone: 'warn', approve: true, deny: true };
		case 'pending': return { label: 'Email not confirmed', tone: 'info', approve: false, deny: true };
		case 'existing': return { label: 'Has an account', tone: 'neutral', approve: false, deny: false };
		case 'verify_email': return { label: 'Taking over an account', tone: 'info', approve: false, deny: false };
		case 'verified': case 'creating': return { label: 'Creating', tone: 'info', approve: false, deny: false };
		case 'completed': return { label: 'Completed', tone: 'ok', approve: false, deny: false };
		case 'denied': return { label: 'Denied', tone: 'danger', approve: false, deny: false };
		case 'expired': return { label: 'Expired', tone: 'neutral', approve: false, deny: false };
	}
	return { label: status || 'Unknown', tone: 'neutral', approve: false, deny: false };
};

/** A deletion's state for operators. */
export const deletionStateInfo = (state: string): { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' } => {
	switch (state) {
		case 'pending': return { label: 'Pending', tone: 'warn' };
		case 'canceled': return { label: 'Canceled', tone: 'neutral' };
		case 'done': return { label: 'Deleted', tone: 'danger' };
	}
	return { label: state || 'Unknown', tone: 'neutral' };
};

export const isPublicPath = (path: string): boolean => {
	// "/" stays "/" (only the home page itself, not everything below it).
	const p = (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '').toLowerCase() || '/';
	return PUBLIC_PATHS.includes(p);
};
