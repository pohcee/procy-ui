import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	CAPTCHA_SCRIPTS, checkoutPlanFromQuery, DEFAULT_PASSWORD_MIN_LENGTH, deletionStateInfo, emailConfirmErrorMessage, exportFileName,
	isPublicPath, isUnconfirmedEmailError, linkErrorMessage, parseDeletion, parseDeletions, parseEmailStatus, parseSignupConfig,
	parseSignups, passwordRefusal, safeNext, signInAfterSignup, signupErrorMessage, signupStatusInfo, validatePassword, validateSignup,
	verifyErrorKind, verifyOutcome, signupFacts, formatWaiting, DEFAULT_GOOGLE_SIGNUP_URL, DEFAULT_GOOGLE_BUTTON_LABEL,
} from '../utils/signup.ts';

describe('parseSignupConfig', () => {
	it('reads the public settings', () => {
		assert.deepEqual(parseSignupConfig({ data: { enabled: true, captcha: 'turnstile', captcha_site_key: '0xKEY', require_approval: true, password_min_length: 12, trial_days: 14 } }), {
			enabled: true, captcha: 'turnstile', captchaSiteKey: '0xKEY', requireApproval: true, passwordMinLength: 12, trialDays: 14,
			googleSignup: false, googleSignupUrl: DEFAULT_GOOGLE_SIGNUP_URL, googleButtonLabel: DEFAULT_GOOGLE_BUTTON_LABEL, emailSignup: true,
		});
	});
	it('reads whether the email form is offered (older servers: yes)', () => {
		assert.equal(parseSignupConfig({ enabled: true, google_signup: true, email_signup: false })?.emailSignup, false);
		assert.equal(parseSignupConfig({ enabled: true, email_signup: true })?.emailSignup, true);
		assert.equal(parseSignupConfig({ enabled: true })?.emailSignup, true);
	});
	it('reads the Google signup settings', () => {
		const c = parseSignupConfig({ data: { enabled: true, google_signup: true, google_signup_url: '/api/v1/oidc/signup', google_button_label: 'Sign up with Google' } });
		assert.equal(c?.googleSignup, true);
		assert.equal(c?.googleSignupUrl, '/api/v1/oidc/signup');
		assert.equal(c?.googleButtonLabel, 'Sign up with Google');
	});
	it('defaults the Google signup settings (older servers: no Google)', () => {
		const c = parseSignupConfig({ enabled: true, google_signup: true });
		assert.equal(c?.googleSignupUrl, '/api/v1/oidc/signup');
		assert.equal(c?.googleButtonLabel, 'Continue with Google');
		assert.equal(parseSignupConfig({ enabled: true })?.googleSignup, false);
		assert.equal(parseSignupConfig({ enabled: true, google_signup: 'yes' })?.googleSignup, false);
	});
	it('only takes a path of the API server as the Google signup URL', () => {
		for (const u of ['https://evil.test/x', '//evil.test', '/\\evil', 'relative', 7]) {
			assert.equal(parseSignupConfig({ enabled: true, google_signup: true, google_signup_url: u })?.googleSignupUrl, DEFAULT_GOOGLE_SIGNUP_URL, String(u));
		}
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
	const ok = { email: 'me@example.com', organization: 'Acme' };
	it('accepts a complete form: no password, it is chosen on the link', () => {
		assert.deepEqual(validateSignup(ok), {});
		assert.equal('password' in validateSignup({ email: '', organization: '' }), false);
	});
	it('reports each field', () => {
		assert.deepEqual(Object.keys(validateSignup({ email: '', organization: ' ' })).sort(), ['email', 'organization']);
		assert.match(validateSignup({ ...ok, email: 'nope' }).email ?? '', /valid/);
		assert.match(validateSignup({ ...ok, email: 'a@b' }).email ?? '', /valid/);
		assert.match(validateSignup({ ...ok, organization: 'x'.repeat(201) }).organization ?? '', /200/);
	});
});

describe('validatePassword', () => {
	it('checks the length (the server\'s) and the confirmation', () => {
		assert.deepEqual(validatePassword({ password: 'longenough', confirm: 'longenough' }, 8), {});
		assert.match(validatePassword({ password: '', confirm: '' }).password ?? '', /Choose/);
		assert.match(validatePassword({ password: 'short', confirm: 'short' }, 12).password ?? '', /12/);
		assert.match(validatePassword({ password: 'longenough', confirm: 'other' }).confirm ?? '', /match/);
		assert.deepEqual(validatePassword({ password: 'ééééééééé', confirm: 'ééééééééé' }, 9), {});
	});
	it('tells a refused password from a bad link', () => {
		assert.equal(verifyErrorKind(400, 'invalid input: the password is too guessable'), 'password');
		assert.equal(verifyErrorKind(400, 'the link is not valid: it was used already or it expired'), 'link');
		assert.equal(verifyErrorKind(409, 'exists'), 'other');
		assert.equal(passwordRefusal('invalid input: the password is too guessable'), 'The password is too guessable.');
		assert.equal(passwordRefusal(''), 'This password was not accepted.');
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
		for (const p of ['/auth', '/auth/', '/signup', '/Signup/', '/signup/verify?token=x', '/auth/signup/verify', '/auth/signup/cancel-deletion#x', '/auth/confirm-email?token=x']) assert.equal(isPublicPath(p), true, p);
	});
	it('keeps everything else behind sign-in', () => {
		for (const p of ['/dashboard', '/users', '/signup/other', '/authx', '/x/']) assert.equal(isPublicPath(p), false, p);
	});
	it('lets the home page and the end of a Google signup through', () => {
		for (const p of ['/', '', '/?x=1', '/#a', '/auth/signup/google', '/auth/signup/google#status=completed']) assert.equal(isPublicPath(p), true, p);
	});
});

describe('safeNext', () => {
	it('only follows paths of this site', () => {
		assert.equal(safeNext('/auth/confirm-email?token=abc'), '/auth/confirm-email?token=abc');
		assert.equal(safeNext(['/billing']), '/billing');
		for (const v of [undefined, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'billing', '/a b', '/auth', '/auth?x=1', 7]) assert.equal(safeNext(v), null, String(v));
	});
});

describe('email confirmation', () => {
	it('reads the status', () => {
		assert.deepEqual(parseEmailStatus({ data: { login: 'me@example.com', verified: false, sent: true } }), { login: 'me@example.com', verified: false, sent: true });
		assert.deepEqual(parseEmailStatus(null), { login: '', verified: false, sent: false });
	});
	it('recognises the membership refusal of an unconfirmed account', () => {
		assert.equal(isUnconfirmedEmailError('invalid input: the account has not confirmed its email address yet (POST /me/email-confirmation)'), true);
		assert.equal(isUnconfirmedEmailError('no pending invitation'), false);
	});
	it('explains refusals', () => {
		assert.match(emailConfirmErrorMessage(400, '', 'send'), /not an email address/);
		assert.match(emailConfirmErrorMessage(400, '', 'confirm'), /another account/);
		assert.match(emailConfirmErrorMessage(429, '', 'send'), /tomorrow/);
		assert.match(emailConfirmErrorMessage(404, '', 'confirm'), /not available/);
	});
});

describe('export and deletion', () => {
	it('names the export file safely', () => {
		assert.equal(exportFileName('acme-x7k2m9', new Date('2026-11-24T10:00:00Z')), 'procy-acme-x7k2m9-export-2026-11-24.json');
		assert.equal(exportFileName('../a b', new Date('2026-11-24T10:00:00Z')), 'procy-..-a-b-export-2026-11-24.json');
		assert.match(exportFileName(''), /^procy-organization-export-/);
	});
	const raw = { id: 3, organization_id: 'acme-x7k2m9', organization_name: 'Acme', state: 'pending', requested_at: '2026-11-24T10:00:00Z', requested_by: 'me@example.com', reason: 'moving', delete_after: '2026-12-24T10:00:00Z', previous_status: 'active', finished_at: null, finished_by: '', cancel_links_sent: 2 };
	it('reads deletions', () => {
		const d = parseDeletion({ data: raw });
		assert.equal(d?.organizationId, 'acme-x7k2m9');
		assert.equal(d?.cancelLinksSent, 2);
		assert.equal(d?.finishedAt, '');
		assert.equal(parseDeletions({ data: [raw, { id: 4 }, null] }).length, 1);
		assert.equal(parseDeletion(null), null);
		assert.equal(deletionStateInfo('pending').tone, 'warn');
		assert.equal(deletionStateInfo('done').label, 'Deleted');
	});
	it('reads signups and what an operator can do with them', () => {
		const list = parseSignups({ data: [{ id: 's1', email: 'a@b.test', organization_name: 'A', status: 'awaiting_approval', organization_id: null }, { email: 'no-id' }] });
		assert.equal(list.length, 1);
		assert.equal(list[0]!.organizationId, '');
		assert.deepEqual(signupStatusInfo('awaiting_approval'), { label: 'Awaiting approval', tone: 'warn', approve: true, deny: true });
		assert.equal(signupStatusInfo('pending').approve, false);
		assert.equal(signupStatusInfo('pending').deny, true);
		assert.equal(signupStatusInfo('completed').deny, false);
	});
});

describe('signup queue facts', () => {
	const now = new Date('2026-11-25T12:00:00Z');
	it('defaults the new fields for older servers', () => {
		const [r] = parseSignups({ data: [{ id: 's1', email: 'a@b.test', status: 'awaiting_approval' }] });
		assert.ok(r);
		assert.equal(r.method, 'email');
		assert.equal(r.mxFound, null);
		assert.equal(r.freeMail, false);
		assert.equal(r.domainCustomers, 0);
		assert.equal(r.emailDeniedBefore, 0);
		assert.equal(r.domainDeniedBefore, 0);
	});
	it('reads the new fields', () => {
		const [r] = parseSignups([{ id: 's1', email: 'a@gmail.com', method: 'google', mx_found: false, free_mail: true, domain_customers: 2, email_denied_before: 1, domain_denied_before: 3 }]);
		assert.ok(r);
		assert.deepEqual([r.method, r.mxFound, r.freeMail, r.domainCustomers, r.emailDeniedBefore, r.domainDeniedBefore], ['google', false, true, 2, 1, 3]);
		assert.equal(parseSignups([{ id: 'x', method: 'carrier-pigeon', mx_found: 'yes', domain_customers: -1 }])[0]!.method, 'email');
		assert.equal(parseSignups([{ id: 'x', mx_found: 'yes' }])[0]!.mxFound, null);
		assert.equal(parseSignups([{ id: 'x', domain_customers: -1 }])[0]!.domainCustomers, 0);
	});
	it('formats how long a confirmed signup has waited', () => {
		assert.equal(formatWaiting('2026-11-25T11:59:40Z', now), 'waiting under a minute');
		assert.equal(formatWaiting('2026-11-25T11:48:00Z', now), 'waiting 12 min');
		assert.equal(formatWaiting('2026-11-25T09:00:00Z', now), 'waiting 3 h');
		assert.equal(formatWaiting('2026-11-23T10:00:00Z', now), 'waiting 2 d');
		assert.equal(formatWaiting('', now), '');
		assert.equal(formatWaiting('nonsense', now), '');
		assert.equal(formatWaiting('2026-11-26T00:00:00Z', now), 'waiting under a minute');
	});
	it('lists the facts an operator decides on', () => {
		const [r] = parseSignups([{ id: 's1', email: 'ann@acme.test', domain: 'acme.test', status: 'awaiting_approval', verified_at: '2026-11-25T09:00:00Z', method: 'google', mx_found: true, domain_customers: 2, email_denied_before: 1, domain_denied_before: 0 }]);
		assert.ok(r);
		assert.deepEqual(signupFacts(r, now), [
			{ text: 'acme.test', tone: 'neutral' },
			{ text: 'MX ✓', tone: 'ok', title: 'The domain has mail servers' },
			{ text: 'via Google', tone: 'info' },
			{ text: 'waiting 3 h', tone: 'warn' },
			{ text: 'domain already a customer (2)', tone: 'warn' },
			{ text: 'this email was rejected before (1)', tone: 'danger' },
		]);
	});
	it('marks free mail and unknown or missing MX, and waits only while awaiting approval', () => {
		const [r] = parseSignups([{ id: 's1', email: 'bob@gmail.com', status: 'completed', verified_at: '2026-11-25T09:00:00Z', free_mail: true, mx_found: null, domain_denied_before: 4 }]);
		assert.ok(r);
		assert.deepEqual(signupFacts(r, now), [
			{ text: 'gmail.com', tone: 'neutral' },
			{ text: 'free mail', tone: 'info' },
			{ text: 'MX ?', tone: 'neutral', title: 'Mail servers not looked up' },
			{ text: 'domain rejected before (4)', tone: 'danger' },
		]);
		const [n] = parseSignups([{ id: 's2', email: 'c@nomx.test', mx_found: false }]);
		assert.ok(n);
		assert.deepEqual(signupFacts(n, now)[1], { text: 'MX ✗', tone: 'danger', title: 'The domain has no mail servers' });
	});
});
