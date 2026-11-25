import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { currentOrg, loginNeedsOrgChoice, parseOrgList, showOrgSwitcher } from '../utils/membership.ts';

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
