import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clientGroupSavePayload, parseUserGroups } from '../utils/clientGroup.ts';

describe('clientGroupSavePayload', () => {
	it('an edit never sends params, so the server keeps the stored rules', () => {
		const payload = clientGroupSavePayload({ id: 'g1', description: 'new', allowedUserGroupsText: 'ops, qa' }, true);
		assert.deepEqual(payload, { id: 'g1', description: 'new', allowed_user_groups: ['ops', 'qa'] });
		assert.equal('params' in payload, false);
	});

	it('a new group starts without rules', () => {
		const payload = clientGroupSavePayload({ id: 'g2', description: 'd', allowedUserGroupsText: '' }, false);
		assert.deepEqual(payload, { id: 'g2', description: 'd', allowed_user_groups: [], params: {} });
	});
});

describe('parseUserGroups', () => {
	it('splits, trims and drops empty entries', () => {
		assert.deepEqual(parseUserGroups(' a, ,b ,'), ['a', 'b']);
		assert.deepEqual(parseUserGroups(''), []);
	});
});
