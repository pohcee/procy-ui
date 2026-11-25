import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	authMethodLabel, DEFAULT_OIDC_BUTTON_LABEL, DEFAULT_OIDC_LOGIN_URL, isOidcRequiredError, isSystemOrg, lifetimeParam,
	oidcErrorMessage, oidcLoginHref, oidcTokenErrorMessage, oidcTokenOutcome, parseOidcFragment, parseOidcProvider,
	parseOrgSignIn, parseSignIn, passwordAllowed, safeReturnTo, signInLabel,
	googleSignupHref, parseGoogleSignupFragment, googleSignupErrorMessage,
} from '../utils/oidc.ts';

describe('parseOidcProvider', () => {
	it('reads the oidc part of GET /auth/provider', () => {
		assert.deepEqual(parseOidcProvider({ data: { auth_provider: 'built-in', oidc: { enabled: true, button_label: 'Sign in with Acme', login_url: '/api/v1/oidc/login' } } }), {
			buttonLabel: 'Sign in with Acme', loginUrl: '/api/v1/oidc/login',
		});
	});
	it('is null when Google sign-in is off or absent', () => {
		assert.equal(parseOidcProvider({ data: { auth_provider: 'built-in' } }), null);
		assert.equal(parseOidcProvider({ data: { oidc: { enabled: false } } }), null);
		assert.equal(parseOidcProvider(null), null);
	});
	it('falls back to the default label and login URL', () => {
		assert.deepEqual(parseOidcProvider({ oidc: { enabled: true } }), { buttonLabel: DEFAULT_OIDC_BUTTON_LABEL, loginUrl: DEFAULT_OIDC_LOGIN_URL });
	});
	it('never takes another host as the login URL', () => {
		assert.equal(parseOidcProvider({ oidc: { enabled: true, login_url: 'https://evil.example/x' } })?.loginUrl, DEFAULT_OIDC_LOGIN_URL);
		assert.equal(parseOidcProvider({ oidc: { enabled: true, login_url: '//evil.example/x' } })?.loginUrl, DEFAULT_OIDC_LOGIN_URL);
	});
});

describe('safeReturnTo', () => {
	it('keeps a path of this site', () => {
		assert.equal(safeReturnTo('/tunnels?x=1'), '/tunnels?x=1');
		assert.equal(safeReturnTo('/dashboard'), '/dashboard');
	});
	it('refuses anything else', () => {
		for (const v of ['https://evil.example/', '//evil.example', '/\\evil', 'dashboard', '', null, 42, '/auth', '/auth/oidc', '/auth/oidc#code=1']) {
			assert.equal(safeReturnTo(v), '/dashboard', String(v));
		}
	});
});

describe('oidcLoginHref', () => {
	it('joins the API base, the login URL and the return path', () => {
		assert.equal(oidcLoginHref('https://ui.example.com/', '/api/v1/oidc/login', '/tunnels'), 'https://ui.example.com/api/v1/oidc/login?return_to=%2Ftunnels');
	});
	it('keeps a base path, like the API client', () => {
		assert.equal(oidcLoginHref(new URL('https://api.example.net/rport/'), '/api/v1/oidc/login', undefined), 'https://api.example.net/rport/api/v1/oidc/login?return_to=%2Fdashboard');
	});
	it('never forwards an unsafe return path', () => {
		assert.match(oidcLoginHref('https://ui.example.com', '/api/v1/oidc/login', '//evil.example'), /return_to=%2Fdashboard$/);
	});
});

describe('parseOidcFragment', () => {
	it('reads a sign-in code and the return path', () => {
		assert.deepEqual(parseOidcFragment('#code=abc123&return_to=%2Ftunnels'), { kind: 'code', code: 'abc123', returnTo: '/tunnels' });
		assert.deepEqual(parseOidcFragment('code=abc'), { kind: 'code', code: 'abc', returnTo: '/dashboard' });
	});
	it('sanitizes the return path', () => {
		assert.equal((parseOidcFragment('#code=a&return_to=https%3A%2F%2Fevil.example') as { returnTo: string }).returnTo, '/dashboard');
	});
	it('reads an error first', () => {
		assert.deepEqual(parseOidcFragment('#error=unknown_account&error_description=No+account+for+x%40y.z'), {
			kind: 'error', reason: 'unknown_account', description: 'No account for x@y.z',
		});
		assert.equal(parseOidcFragment('#error=access_denied&code=abc').kind, 'error');
	});
	it('is none without either', () => {
		assert.deepEqual(parseOidcFragment(''), { kind: 'none' });
		assert.deepEqual(parseOidcFragment('#foo=bar'), { kind: 'none' });
	});
});

describe('oidcErrorMessage', () => {
	it('has a message for every reason the server sends', () => {
		for (const r of ['access_denied', 'invalid_state', 'email_unverified', 'domain_not_allowed', 'unknown_account', 'account_mismatch', 'oidc_not_allowed', 'server_error']) {
			const m = oidcErrorMessage(r, 'raw');
			assert.ok(m && m !== 'raw', r);
		}
	});
	it('falls back to the description, then a generic message', () => {
		assert.match(oidcErrorMessage('weird', 'Phishing text: call +1 555'), /failed/, 'never the crafted description');
		assert.match(oidcErrorMessage('weird'), /failed/);
	});
});

describe('oidcTokenOutcome', () => {
	it('signs in with a token', () => {
		assert.deepEqual(oidcTokenOutcome({ data: { token: 'T', two_fa: null } }), { kind: 'signed-in', token: 'T' });
		assert.deepEqual(oidcTokenOutcome({ token: 'T', organization: 'acme' }, true), { kind: 'signed-in', token: 'T' });
	});
	it('asks for an organization when several are listed and no token is given', () => {
		const out = oidcTokenOutcome({ data: { token: null, organizations: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] } });
		assert.equal(out.kind, 'choose-org');
		assert.deepEqual((out as { organizations: unknown[] }).organizations, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
	});
	it('does not ask again once an organization was sent', () => {
		assert.equal(oidcTokenOutcome({ data: { token: null, organizations: [{ id: 'a' }, { id: 'b' }] } }, true).kind, 'failed');
	});
	it('fails without a token', () => {
		assert.equal(oidcTokenOutcome({ data: {} }).kind, 'failed');
		assert.equal(oidcTokenOutcome(undefined).kind, 'failed');
	});
});

describe('oidcTokenErrorMessage', () => {
	it('explains an expired code and passes the 403 reason on', () => {
		assert.match(oidcTokenErrorMessage(401, 'invalid code'), /expired/);
		assert.equal(oidcTokenErrorMessage(403, 'Google sign-in is not allowed in acme'), 'Google sign-in is not allowed in acme');
		assert.ok(oidcTokenErrorMessage(403, ''));
		assert.equal(oidcTokenErrorMessage(500, 'boom'), 'boom');
	});
});

describe('isOidcRequiredError', () => {
	it('is only the 403 with code oidc_required', () => {
		assert.equal(isOidcRequiredError(403, 'oidc_required'), true);
		assert.equal(isOidcRequiredError(401, 'oidc_required'), false);
		assert.equal(isOidcRequiredError(403, 'forbidden'), false);
	});
});

describe('lifetimeParam', () => {
	it('accepts a positive number of seconds only', () => {
		assert.equal(lifetimeParam('3600'), '3600');
		for (const v of ['0', '-1', 'abc', '', null, 3600, '1e5']) assert.equal(lifetimeParam(v), null, String(v));
	});
});

describe('sign-in methods', () => {
	it('labels the methods', () => {
		assert.equal(signInLabel('both'), 'Password and Google');
		assert.equal(signInLabel('password'), 'Password only');
		assert.equal(signInLabel('oidc'), 'Google only');
		assert.equal(signInLabel(undefined), '');
		assert.equal(authMethodLabel('oidc'), 'Google');
		assert.equal(authMethodLabel('password'), 'Password');
		assert.equal(authMethodLabel(undefined), '');
	});
	it('parses only known values', () => {
		assert.equal(parseSignIn('oidc'), 'oidc');
		assert.equal(parseSignIn('google'), null);
		assert.equal(parseSignIn(undefined), null);
	});
	it('knows the operators\' organization', () => {
		assert.equal(isSystemOrg('_system'), true);
		assert.equal(isSystemOrg('acme'), false);
		assert.equal(isSystemOrg(null, true), true);
	});
	it('has no password for Google-only accounts, operators and organizations that require Google', () => {
		assert.equal(passwordAllowed({ signIn: 'both' }), true);
		assert.equal(passwordAllowed({ signIn: null }), true);
		assert.equal(passwordAllowed({ signIn: 'oidc' }), false);
		assert.equal(passwordAllowed({ signIn: 'password', systemOrg: true }), false);
		assert.equal(passwordAllowed({ signIn: 'both', orgRequiresOidc: true }), false);
	});
});

describe('parseOrgSignIn', () => {
	it('reads the organization setting', () => {
		assert.deepEqual(parseOrgSignIn({ data: { require_oidc: true, oidc_enabled: true } }), { requireOidc: true, oidcEnabled: true });
		assert.deepEqual(parseOrgSignIn({ require_oidc: false }), { requireOidc: false, oidcEnabled: false });
		assert.equal(parseOrgSignIn({ data: {} }), null);
	});
});

describe('isPublicPath', () => {
	it('lets /auth/oidc through without a session', async () => {
		const { isPublicPath } = await import('../utils/signup.ts');
		assert.equal(isPublicPath('/auth/oidc'), true);
		assert.equal(isPublicPath('/auth/oidc/'), true);
	});
});

describe('googleSignupHref', () => {
	it('joins the API base, the signup URL and the organization name', () => {
		assert.equal(googleSignupHref('https://ui.example.com/', '/api/v1/oidc/signup', ' Acme & Co '), 'https://ui.example.com/api/v1/oidc/signup?organization=Acme+%26+Co');
	});
	it('keeps a base path, like the API client', () => {
		assert.equal(googleSignupHref(new URL('https://api.example.net/rport/'), '/api/v1/oidc/signup', 'A'), 'https://api.example.net/rport/api/v1/oidc/signup?organization=A');
	});
});

describe('parseGoogleSignupFragment', () => {
	it('reads a signup awaiting approval', () => {
		assert.deepEqual(parseGoogleSignupFragment('#status=awaiting_approval&organization_name=Acme%20Co&email=ann%40acme.test'), {
			kind: 'awaiting_approval', organizationName: 'Acme Co', email: 'ann@acme.test',
		});
	});
	it('reads a completed signup', () => {
		assert.deepEqual(parseGoogleSignupFragment('status=completed&organization=acme&organization_name=Acme&email=ann%40acme.test'), {
			kind: 'completed', organization: 'acme', organizationName: 'Acme', email: 'ann@acme.test',
		});
		assert.equal((parseGoogleSignupFragment('#status=completed&organization=acme') as { organizationName: string }).organizationName, 'acme');
	});
	it('reads an error, which wins over a status', () => {
		assert.deepEqual(parseGoogleSignupFragment('#error=account_exists&error_description=x&status=completed'), { kind: 'error', reason: 'account_exists', description: 'x' });
	});
	it('is none without a known status or an error', () => {
		assert.deepEqual(parseGoogleSignupFragment(''), { kind: 'none' });
		assert.deepEqual(parseGoogleSignupFragment('#status=sent'), { kind: 'none' });
	});
});

describe('googleSignupErrorMessage', () => {
	it('has a message for every reason of the contract', () => {
		const reasons = ['access_denied', 'invalid_state', 'email_unverified', 'domain_not_allowed', 'unmanaged_email', 'account_exists', 'rate_limited', 'invalid', 'domain_refused', 'server_error'];
		const generic = googleSignupErrorMessage('nope');
		for (const r of reasons) {
			const m = googleSignupErrorMessage(r);
			assert.ok(m && m !== generic, r);
		}
		assert.match(googleSignupErrorMessage('account_exists'), /sign in/i);
	});
	it('never shows the free-text description (anyone can craft the link)', () => {
		assert.equal(googleSignupErrorMessage('weird', 'Call 555-0100 for help'), googleSignupErrorMessage('other'));
	});
});
