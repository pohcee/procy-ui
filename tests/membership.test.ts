import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	currentOrg, inviteLoginError, inviteOutcome, isSharedAccountRefusal, loginNeedsOrgChoice, MAX_TOKEN_LIFETIME,
	parseMembers, parseMyInvitations, parseOrgList, parsePendingInvitations, showOrgSwitcher, switchLifetime,
} from '../utils/membership.ts';

describe('parseOrgList', () => {
	it('reads a bare list or a { data } envelope', () => {
		assert.deepEqual(parseOrgList([{ id: 'a', name: 'A' }]), [{ id: 'a', name: 'A' }]);
		assert.deepEqual(parseOrgList({ data: [{ id: 'a', name: 'A', current: true }] }), [{ id: 'a', name: 'A', current: true }]);
	});
	it('names an organization after its id when the name is missing, and drops invalid and duplicate entries', () => {
		assert.deepEqual(parseOrgList([{ id: 'a' }, { name: 'no id' }, null, { id: 'a', name: 'again' }, 'x']), [{ id: 'a', name: 'a' }]);
	});
	it('is empty for anything else', () => {
		assert.deepEqual(parseOrgList(undefined), []);
		assert.deepEqual(parseOrgList({ data: 'nope' }), []);
	});
});

describe('loginNeedsOrgChoice', () => {
	const orgs = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
	it('asks for a choice when several organizations come without a token', () => {
		assert.deepEqual(loginNeedsOrgChoice({ organizations: orgs }), orgs);
		assert.deepEqual(loginNeedsOrgChoice({ token: '', organizations: orgs }), orgs);
	});
	it('does not ask when a token was issued or only one organization is listed', () => {
		assert.equal(loginNeedsOrgChoice({ token: 'jwt', organizations: orgs }), null);
		assert.equal(loginNeedsOrgChoice({ organizations: [orgs[0]] }), null);
		assert.equal(loginNeedsOrgChoice({ token: 'jwt' }), null);
		assert.equal(loginNeedsOrgChoice(undefined), null);
	});
});

describe('switcher helpers', () => {
	it('shows the switcher for more than one organization', () => {
		assert.equal(showOrgSwitcher([{ id: 'a', name: 'A' }]), false);
		assert.equal(showOrgSwitcher([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]), true);
		assert.equal(showOrgSwitcher(null), false);
	});
	it('finds the current organization', () => {
		const list = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', current: true }];
		assert.equal(currentOrg(list)?.id, 'b');
		assert.equal(currentOrg([{ id: 'a', name: 'A' }], 'a')?.id, 'a');
		assert.equal(currentOrg([{ id: 'a', name: 'A' }]), null);
	});
});

describe('invitations', () => {
	it('reads my invitations by organization, dropping invalid and duplicate entries', () => {
		const raw = { data: [
			{ id: 'acme', name: 'Acme', invited_by: 'boss@acme.test', created_at: '2026-11-20T10:00:00Z' },
			{ id: 'acme', name: 'again' },
			{ name: 'no id' },
			{ id: 'beta' },
		] };
		assert.deepEqual(parseMyInvitations(raw), [
			{ id: 'acme', name: 'Acme', invitedBy: 'boss@acme.test', createdAt: '2026-11-20T10:00:00Z' },
			{ id: 'beta', name: 'beta', invitedBy: '', createdAt: '' },
		]);
		assert.deepEqual(parseMyInvitations(null), []);
	});
	it('reads an organization\'s pending invitations', () => {
		assert.deepEqual(parsePendingInvitations({ data: [{ username: 'a@x.test', groups: ['Administrators', 3], invited_by: 'me', created_at: 't' }, { groups: [] }] }), [
			{ username: 'a@x.test', groups: ['Administrators'], invitedBy: 'me', createdAt: 't' },
		]);
	});
	it('reads members sorted by login, with at least one organization each', () => {
		assert.deepEqual(parseMembers({ data: [{ username: 'z', groups: [], organizations: 3 }, { username: 'a', organizations: 0 }, { username: '' }] }), [
			{ username: 'a', groups: [], organizations: 1 },
			{ username: 'z', groups: [], organizations: 3 },
		]);
	});
});

describe('inviteOutcome', () => {
	it('is a new account with its one-time password', () => {
		assert.deepEqual(
			inviteOutcome({ data: { organization: 'acme', username: 'n@x.test', new_account: true, password: 'pw', password_expired: true } }),
			{ kind: 'new-account', username: 'n@x.test', organization: 'acme', password: 'pw' },
		);
	});
	it('is pending for an existing account (and when no password came back)', () => {
		assert.deepEqual(inviteOutcome({ data: { organization: 'acme', username: 'e@x.test', new_account: false, pending: true } }), { kind: 'pending', username: 'e@x.test', organization: 'acme' });
		assert.equal(inviteOutcome({ new_account: true }, 'who').kind, 'pending');
		assert.equal(inviteOutcome(undefined, 'who').username, 'who');
	});
});

describe('invite form and refusals', () => {
	it('checks the login', () => {
		assert.equal(inviteLoginError('a@x.test'), null);
		assert.match(inviteLoginError('  ') ?? '', /Enter/);
		assert.match(inviteLoginError('a b') ?? '', /spaces/);
		assert.match(inviteLoginError('x'.repeat(201)) ?? '', /200/);
	});
	it('recognizes the shared-account refusal', () => {
		const msg = '"a@x.test" is a member of other organizations too: only its owner can change its password, two-factor settings or login name';
		assert.equal(isSharedAccountRefusal(403, msg), true);
		assert.equal(isSharedAccountRefusal(403, 'forbidden'), false);
		assert.equal(isSharedAccountRefusal(400, msg), false);
	});
});

describe('switchLifetime', () => {
	it('keeps the sign-in lifetime across a switch', () => {
		assert.equal(switchLifetime('3600'), 3600);
		assert.equal(switchLifetime(String(MAX_TOKEN_LIFETIME)), MAX_TOKEN_LIFETIME);
	});
	it('is null when unknown or out of range', () => {
		for (const v of [null, undefined, '', '0', '-5', '1.5', 'abc', String(MAX_TOKEN_LIFETIME + 1)]) assert.equal(switchLifetime(v), null, String(v));
	});
});
