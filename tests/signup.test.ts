import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	CAPTCHA_SCRIPTS, checkoutPlanFromQuery, DEFAULT_PASSWORD_MIN_LENGTH, isPublicPath, linkErrorMessage, parseSignupConfig,
	signInAfterSignup, signupErrorMessage, validateSignup, verifyOutcome,
} from '../utils/signup.ts';

describe('parseSignupConfig', () => {
	it('reads the public settings', () => {
		assert.deepEqual(parseSignupConfig({ data: { enabled: true, captcha: 'turnstile', captcha_site_key: '0xKEY', require_approval: true, password_min_length: 12, trial_days: 14 } }), {
			enabled: true, captcha: 'turnstile', captchaSiteKey: '0xKEY', requireApproval: true, passwordMinLength: 12, trialDays: 14,
		});
	});
	it('has no captcha without a known provider and a site key', () => {
		assert.equal(parseSignupConfig({ enabled: true, captcha: 'hcaptcha' })?.captcha, null);
		assert.equal(parseSignupConfig({ enabled: true, captcha: 'recaptcha', captcha_site_key: 'k' })?.captcha, null);
		assert.equal(parseSignupConfig({ enabled: true, captcha: '' })?.captchaSiteKey, '');
	});
	it('falls back to the default password length', () => {
		assert.equal(parseSignupConfig({ enabled: true })?.passwordMinLength, DEFAULT_PASSWORD_MIN_LENGTH);
		assert.equal(parseSignupConfig({ enabled: true, password_min_length: -3 })?.passwordMinLength, DEFAULT_PASSWORD_MIN_LENGTH);
	});
	it('is null when signup is off', () => {
		assert.equal(parseSignupConfig({ data: { enabled: false } }), null);
		assert.equal(parseSignupConfig(undefined), null);
		assert.equal(parseSignupConfig('x'), null);
	});
	it('only knows the providers\' official script URLs', () => {
		assert.match(CAPTCHA_SCRIPTS.turnstile, /^https:\/\/challenges\.cloudflare\.com\//);
		assert.match(CAPTCHA_SCRIPTS.hcaptcha, /^https:\/\/js\.hcaptcha\.com\//);
	});
});

describe('validateSignup', () => {
	const ok = { email: 'me@example.com', organization: 'Acme', password: 'longenough', confirm: 'longenough' };
	it('accepts a complete form', () => {
		assert.deepEqual(validateSignup(ok, 8), {});
	});
	it('reports each field', () => {
		assert.deepEqual(Object.keys(validateSignup({ email: '', organization: ' ', password: '', confirm: '' })).sort(), ['email', 'organization', 'password']);
		assert.match(validateSignup({ ...ok, email: 'nope' }).email ?? '', /valid/);
		assert.match(validateSignup({ ...ok, email: 'a@b' }).email ?? '', /valid/);
		assert.match(validateSignup({ ...ok, organization: 'x'.repeat(201) }).organization ?? '', /200/);
		assert.match(validateSignup({ ...ok, password: 'short', confirm: 'short' }, 12).password ?? '', /12/);
		assert.match(validateSignup({ ...ok, confirm: 'other' }).confirm ?? '', /match/);
	});
});

describe('verifyOutcome', () => {
	it('reads a created organization', () => {
		assert.deepEqual(verifyOutcome({ data: { status: 'completed', organization: 'acme-x7k2m9', organization_name: 'Acme', username: 'me@example.com', plan: { plan: 'team', billing_status: 'trial', trial_ends_at: '2026-12-08T00:00:00Z', checkout_required: false }, checkout_required: false } }, 201), {
			kind: 'completed', organization: 'acme-x7k2m9', organizationName: 'Acme', username: 'me@example.com', checkoutRequired: false, plan: 'team', trialEndsAt: '2026-12-08T00:00:00Z',
		});
	});
	it('needs a checkout when either flag says so', () => {
		const top = verifyOutcome({ status: 'completed', checkout_required: true });
		assert.equal(top.kind === 'completed' && top.checkoutRequired, true);
		const o = verifyOutcome({ status: 'completed', plan: { plan: 'starter', checkout_required: true } });
		assert.equal(o.kind === 'completed' && o.checkoutRequired, true);
	});
	it('reads a signup waiting for approval', () => {
		assert.deepEqual(verifyOutcome({ data: { status: 'awaiting_approval', organization_name: 'Acme', username: 'me@example.com' } }, 202), { kind: 'awaiting_approval', organizationName: 'Acme', username: 'me@example.com' });
		assert.equal(verifyOutcome({}, 202).kind, 'awaiting_approval');
	});
});

describe('after signup', () => {
	it('signs in with the login filled in, and the plan to check out when needed', () => {
		const base = { kind: 'completed', organization: 'a', organizationName: 'A', username: 'me@example.com', trialEndsAt: '' } as const;
		assert.equal(signInAfterSignup({ ...base, checkoutRequired: false, plan: 'team' }), '/auth?username=me%40example.com');
		assert.equal(signInAfterSignup({ ...base, checkoutRequired: true, plan: 'starter' }), '/auth?username=me%40example.com&checkout=starter');
		assert.equal(signInAfterSignup({ ...base, username: '', checkoutRequired: true, plan: '' }), '/auth');
	});
	it('only takes a plain plan name from the query', () => {
		assert.equal(checkoutPlanFromQuery('starter'), 'starter');
		assert.equal(checkoutPlanFromQuery(['team', 'x']), 'team');
		for (const v of [undefined, '', 'https://evil.test', 'a b', 'x'.repeat(65), 3]) assert.equal(checkoutPlanFromQuery(v), null, String(v));
	});
});

describe('messages', () => {
	it('explains refused links and signups', () => {
		assert.match(linkErrorMessage(400, '', 'verify'), /expired/);
		assert.match(linkErrorMessage(400, '', 'cancel'), /no longer pending/);
		assert.match(linkErrorMessage(409, '', 'verify'), /Sign in/);
		assert.match(linkErrorMessage(500, 'boom', 'verify'), /boom/);
		assert.match(signupErrorMessage(429, ''), /tomorrow/);
		assert.match(signupErrorMessage(503, ''), /email/);
		assert.equal(signupErrorMessage(400, 'captcha not solved'), 'captcha not solved');
	});
});

describe('isPublicPath', () => {
	it('lets the sign-in and signup pages through', () => {
		for (const p of ['/auth', '/auth/', '/signup', '/Signup/', '/signup/verify?token=x', '/auth/signup/verify', '/auth/signup/cancel-deletion#x']) assert.equal(isPublicPath(p), true, p);
	});
	it('keeps everything else behind sign-in', () => {
		for (const p of ['/', '/dashboard', '/users', '/signup/other', '/authx']) assert.equal(isPublicPath(p), false, p);
	});
});
