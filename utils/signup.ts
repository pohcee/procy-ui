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
}

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
	};
};

/** The providers' official script URLs (explicit rendering; nothing else is ever loaded). */
export const CAPTCHA_SCRIPTS: Record<CaptchaProvider, string> = {
	turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
	hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off',
};

export interface SignupForm {
	email: string;
	organization: string;
	password: string;
	confirm: string;
}

export type SignupErrors = Partial<Record<keyof SignupForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

/** Field errors of the signup form; empty when it can be sent. */
export const validateSignup = (f: SignupForm, minLength = DEFAULT_PASSWORD_MIN_LENGTH): SignupErrors => {
	const e: SignupErrors = {};
	const email = f.email.trim();
	if (!email) e.email = 'Enter your email address.';
	else if (!EMAIL.test(email) || email.length > 254) e.email = 'Enter a valid email address, like you@example.com.';
	const org = f.organization.trim();
	if (!org) e.organization = 'Enter the name of your organization.';
	else if (org.length > 200) e.organization = 'At most 200 characters.';
	if (!f.password) e.password = 'Choose a password.';
	else if (f.password.length < minLength) e.password = `At least ${minLength} characters.`;
	if (f.password && f.confirm !== f.password) e.confirm = 'Passwords do not match.';
	return e;
};

export type VerifyOutcome =
	| {
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

/** Routes reachable without signing in. */
const PUBLIC_PATHS = ['/auth', '/signup', '/signup/verify', '/auth/signup/verify', '/auth/signup/cancel-deletion'];

export const isPublicPath = (path: string): boolean => {
	const p = (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '').toLowerCase() || '/';
	return PUBLIC_PATHS.includes(p);
};
