import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientGroupParams } from '../types.ts';
import { clientGroupSavePayload, parseUserGroups } from '../utils/clientGroup.ts';

const params: ClientGroupParams = { client_id: ['web-*'], os: null, tag: ['QA', 'linux*'] };

describe('clientGroupSavePayload', () => {
	it('an edit sends the loaded params back unchanged', () => {
		const payload = clientGroupSavePayload(
			{ id: 'g1', description: 'new', allowedUserGroupsText: 'ops, qa', params },
			true,
		);
		assert.deepEqual(payload, {
			id: 'g1',
			description: 'new',
			allowed_user_groups: ['ops', 'qa'],
			params,
		});
		assert.equal(payload.params, params);
	});

	it('an edit of a group loaded without params leaves them out, so the server keeps them', () => {
		for (const loaded of [undefined, null]) {
			const payload = clientGroupSavePayload({ id: 'g1', description: '', allowedUserGroupsText: '', params: loaded }, true);
			assert.equal('params' in payload, false);
		}
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
