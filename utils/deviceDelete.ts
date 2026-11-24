/**
 * Deleting devices: the server only deletes offline devices, and a deleted device comes
 * back when its client connects again unless its client credentials are revoked too.
 * Pure helpers (tested in tests/deviceDelete.test.ts).
 */
import { isOnline, type DeviceLike } from './deviceList.ts';

export function splitForDeletion<T extends DeviceLike>(devices: T[]): { deletable: T[]; online: T[] } {
	return {
		deletable: devices.filter(d => !isOnline(d)),
		online: devices.filter(d => isOnline(d)),
	};
}

/** The client credentials (client auth IDs) the devices use, each once. */
export function credentialIdsOf(devices: { client_auth_id?: string }[]): string[] {
	return [...new Set(devices.map(d => d.client_auth_id).filter((id): id is string => !!id))];
}

export interface DeletionResult {
	deleted: string[];
	failed: string[];
	revoked: string[];
	/** Credentials not revoked: still bound to other devices, or not allowed. */
	credentialsKept: string[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function deletionSummary(r: DeletionResult): { type: 'success' | 'warning' | 'error'; text: string } {
	if (!r.deleted.length) {
		return { type: 'error', text: `Could not delete ${r.failed.length === 1 ? 'the device' : 'the devices'}` };
	}
	let text = `Deleted ${plural(r.deleted.length, 'device')}`;
	if (r.revoked.length) text += ` and revoked ${plural(r.revoked.length, 'credential')}`;
	const problems: string[] = [];
	if (r.failed.length) problems.push(`${r.failed.length} could not be deleted`);
	if (r.credentialsKept.length) problems.push(`${plural(r.credentialsKept.length, 'credential')} kept (still used by other devices or not allowed)`);
	if (!problems.length) return { type: 'success', text };
	return { type: 'warning', text: `${text}. ${problems.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('. ')}` };
}
