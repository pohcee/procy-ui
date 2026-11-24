import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { credentialIdsOf, deletionSummary, splitForDeletion } from '../utils/deviceDelete.ts';

const dev = (id: string, online: boolean, auth?: string) => ({
	id,
	name: id,
	connection_state: online ? 'connected' : 'disconnected',
	disconnected_at: online ? null : '2026-01-01T00:00:00Z',
	client_auth_id: auth,
});

describe('splitForDeletion', () => {
	it('only offline devices can be deleted', () => {
		const { deletable, online } = splitForDeletion([dev('a', false), dev('b', true), dev('c', false)]);
		assert.deepEqual(deletable.map(d => d.id), ['a', 'c']);
		assert.deepEqual(online.map(d => d.id), ['b']);
	});
});

describe('credentialIdsOf', () => {
	it('lists each credential once, skipping devices without one', () => {
		assert.deepEqual(credentialIdsOf([dev('a', false, 'k1'), dev('b', false, 'k1'), dev('c', false), dev('d', false, 'k2')]), ['k1', 'k2']);
	});
});

describe('deletionSummary', () => {
	it('reports a clean single delete', () => {
		assert.deepEqual(deletionSummary({ deleted: ['a'], failed: [], revoked: [], credentialsKept: [] }), { type: 'success', text: 'Deleted 1 device' });
	});
	it('reports deletes and revoked credentials', () => {
		assert.deepEqual(
			deletionSummary({ deleted: ['a', 'b'], failed: [], revoked: ['k1'], credentialsKept: [] }),
			{ type: 'success', text: 'Deleted 2 devices and revoked 1 credential' },
		);
	});
	it('warns about credentials kept and failures', () => {
		assert.deepEqual(
			deletionSummary({ deleted: ['a'], failed: ['b'], revoked: [], credentialsKept: ['k1'] }),
			{ type: 'warning', text: 'Deleted 1 device. 1 could not be deleted. 1 credential kept (still used by other devices or not allowed)' },
		);
	});
	it('is an error when nothing was deleted', () => {
		assert.equal(deletionSummary({ deleted: [], failed: ['a'], revoked: [], credentialsKept: [] }).type, 'error');
	});
});
