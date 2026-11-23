import { HttpFactory } from '~/repository/factory';
import type { EntryUsedBy, EntryVersion, LibraryEntriesResponse, LibraryEntryPayload, LibraryEntryRecord } from '~/types';

class LibraryModule extends HttpFactory {
	private RESOURCE = '/api/v1/library/entries';

	private entryUrl(id: string) {
		return `${this.RESOURCE}/${encodeURIComponent(id)}`;
	}

	/** Entries without their implementations. `params` are query parameters such as `page[limit]` or `filter[deleted]`. */
	async listEntries(params: Record<string, string | number | boolean> = {}): Promise<LibraryEntriesResponse> {
		return await this.call<LibraryEntriesResponse>('GET', this.RESOURCE, undefined, { query: params });
	}

	async getEntry(id: string, includeDeleted = false): Promise<{ data: LibraryEntryRecord }> {
		return await this.call<{ data: LibraryEntryRecord }>(
			'GET',
			this.entryUrl(id),
			undefined,
			includeDeleted ? { query: { include_deleted: true } } : undefined,
		);
	}

	async createEntry(body: LibraryEntryPayload): Promise<{ data: LibraryEntryRecord }> {
		return await this.call<{ data: LibraryEntryRecord }>('POST', this.RESOURCE, body);
	}

	/** `body.base_version` must be the entry's current `active_version`; a stale one gives 409. */
	async saveEntry(id: string, body: LibraryEntryPayload): Promise<{ data: LibraryEntryRecord }> {
		return await this.call<{ data: LibraryEntryRecord }>('PUT', this.entryUrl(id), body);
	}

	async deleteEntry(id: string): Promise<void> {
		return await this.call('DELETE', this.entryUrl(id), undefined);
	}

	/** The schedules that run this entry. */
	async usedBy(id: string): Promise<{ data: EntryUsedBy[] }> {
		return await this.call<{ data: EntryUsedBy[] }>('GET', `${this.entryUrl(id)}/used-by`, undefined);
	}

	async undeleteEntry(id: string): Promise<{ data: LibraryEntryRecord }> {
		return await this.call<{ data: LibraryEntryRecord }>('POST', `${this.entryUrl(id)}/undelete`, undefined);
	}

	async listVersions(id: string): Promise<{ data: EntryVersion[] }> {
		return await this.call<{ data: EntryVersion[] }>('GET', `${this.entryUrl(id)}/versions`, undefined);
	}

	async getVersion(id: string, version: number): Promise<{ data: EntryVersion }> {
		return await this.call<{ data: EntryVersion }>('GET', `${this.entryUrl(id)}/versions/${version}`, undefined);
	}

	async restoreVersion(id: string, version: number, baseVersion: number): Promise<{ data: LibraryEntryRecord }> {
		return await this.call<{ data: LibraryEntryRecord }>(
			'POST',
			`${this.entryUrl(id)}/versions/${version}/restore`,
			{ base_version: baseVersion },
		);
	}
}
export default LibraryModule;
