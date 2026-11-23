import type { EntryContent, EntryImplementation, EntryImplementations, LibraryEntryRecord, LibraryOS } from '~/types';
import { detectRunKind, type RunKind } from '~/utils/runKind';

/** Order in which an entry's primary implementation is picked. */
export const LIBRARY_OS_ORDER: LibraryOS[] = ['linux', 'windows', 'darwin'];

export const LIBRARY_OS_LABELS: Record<LibraryOS, string> = {
	linux: 'Linux',
	windows: 'Windows',
	darwin: 'macOS',
};

export const isLibraryOS = (value: unknown): value is LibraryOS => LIBRARY_OS_ORDER.includes(value as LibraryOS);

/** A library entry: one name, with an implementation per OS (only `load` returns them). */
export interface LibraryEntry {
	id: string;
	name: string;
	description: string;
	tags: string[];
	activeVersion: number;
	builtinKey?: string | null;
	/** The OSes that have an implementation. */
	os: LibraryOS[];
	implementations: Partial<Record<LibraryOS, EntryImplementation>>;
	createdBy?: string;
	updatedBy?: string;
	updatedAt?: Date | string;
}

/** What the editor holds for one OS's implementation of an entry. */
export interface LibraryDraft {
	name: string;
	description?: string;
	tags: string[];
	os: LibraryOS;
	kind: 'auto' | RunKind;
	code: string;
	timeoutSec: number;
	cwd: string;
	isSudo: boolean;
	interpreter: string;
	message?: string;
}

const fromRecord = (r: LibraryEntryRecord): LibraryEntry => ({
	id: r.id,
	name: r.name,
	description: r.description ?? '',
	tags: r.tags ?? [],
	activeVersion: r.active_version,
	builtinKey: r.builtin_key ?? null,
	os: r.os ?? LIBRARY_OS_ORDER.filter(os => r.implementations?.[os]),
	implementations: r.implementations ?? {},
	createdBy: r.created_by,
	updatedBy: r.updated_by,
	updatedAt: r.updated_at ?? r.created_at,
});

/** The first of linux, windows, darwin that the entry has. */
export const primaryOs = (entry: Pick<LibraryEntry, 'os' | 'implementations'>): LibraryOS | undefined =>
	LIBRARY_OS_ORDER.find(os => entry.implementations[os]) ?? LIBRARY_OS_ORDER.find(os => entry.os.includes(os));

/** The implementation for `os`, or the primary one when `os` is missing or the entry has none for it. */
export const implementationFor = (
	entry: Pick<LibraryEntry, 'os' | 'implementations'>,
	os?: LibraryOS | null,
): { os: LibraryOS; implementation: EntryImplementation } | null => {
	const wanted = os && entry.implementations[os] ? os : primaryOs(entry);
	const implementation = wanted && entry.implementations[wanted];
	return wanted && implementation ? { os: wanted, implementation } : null;
};

/** `auto` resolves like the Execute page does. */
export const resolveKind = (impl: Pick<EntryImplementation, 'kind' | 'code' | 'interpreter'>): RunKind =>
	impl.kind === 'auto' ? detectRunKind(impl.code, normalizeInterpreter(impl.interpreter)) : impl.kind;

/** The `os_kernel` of a device as a library OS, if it is one. */
export const toLibraryOs = (osKernel?: string | null): LibraryOS | undefined => {
	const os = (osKernel ?? '').toLowerCase();
	return isLibraryOS(os) ? os : undefined;
};

/** A save that lost the race: the entry changed since it was loaded. */
export const isConflict = (e: unknown): boolean => {
	const err = e as { status?: number; statusCode?: number; response?: { status?: number } } | null;
	return (err?.statusCode ?? err?.status ?? err?.response?.status) === 409;
};

export const useRunLibrary = () => {
	const { $api } = useNuxtApp();

	/** Everything, sorted by name, without implementations. Use `load` for the full entry before running or editing. */
	const listAll = async (deleted = false): Promise<LibraryEntry[]> => {
		const { data } = await $api.library.listEntries({ 'page[limit]': 500, ...(deleted ? { 'filter[deleted]': true } : {}) });
		return (data ?? []).map(fromRecord);
	};

	const load = async (id: string): Promise<LibraryEntry> => fromRecord((await $api.library.getEntry(id)).data);

	/**
	 * Create (no `existing`) or save an entry from one OS's draft. Saving an
	 * existing entry (a full one, from `load`) replaces that OS's implementation,
	 * keeps the others and sends `base_version`; a stale one rejects with a 409
	 * (see `isConflict`).
	 */
	const save = async (draft: LibraryDraft, existing?: LibraryEntry | null): Promise<LibraryEntry> => {
		const implementation: EntryImplementation = {
			kind: draft.kind,
			code: draft.code,
			interpreter: normalizeInterpreter(draft.interpreter),
			is_sudo: draft.isSudo,
			cwd: draft.cwd,
			timeout_sec: Number(draft.timeoutSec),
		};
		const implementations: EntryImplementations = { ...(existing?.implementations ?? {}), [draft.os]: implementation };
		const body = {
			name: draft.name,
			description: draft.description ?? existing?.description ?? '',
			tags: draft.tags,
			implementations,
			message: draft.message ?? '',
		};
		const { data } = existing
			? await $api.library.saveEntry(existing.id, { ...body, base_version: existing.activeVersion })
			: await $api.library.createEntry(body);
		return fromRecord(data);
	};

	/**
	 * Create (no `existing`) or save an entry with all its implementations at once
	 * (the editor's tabs). Saving sends `existing.activeVersion` as `base_version`.
	 */
	const saveContent = async (content: EntryContent, existing: LibraryEntry | null, message = ''): Promise<LibraryEntry> => {
		const body = { ...content, message };
		const { data } = existing
			? await $api.library.saveEntry(existing.id, { ...body, base_version: existing.activeVersion })
			: await $api.library.createEntry(body);
		return fromRecord(data);
	};

	/** A new version with `version`'s content; `baseVersion` is the entry's current `activeVersion` (a stale one rejects with a 409). */
	const restore = async (id: string, version: number, baseVersion: number): Promise<LibraryEntry> =>
		fromRecord((await $api.library.restoreVersion(id, version, baseVersion)).data);

	const remove = async (id: string) => {
		await $api.library.deleteEntry(id);
	};

	const undelete = async (id: string) => {
		await $api.library.undeleteEntry(id);
	};

	/**
	 * The OS of the targeted devices when exactly one OS is targeted, else undefined
	 * (groups and tags can't be resolved here, so they count as unknown).
	 */
	const targetOs = async (target: { clientIds: string[]; groupIds?: string[]; tags?: unknown }): Promise<LibraryOS | undefined> => {
		if (target.groupIds?.length || target.tags || target.clientIds.length === 0 || target.clientIds.length > 20) return undefined;
		try {
			const kernels = await Promise.all(target.clientIds.map(async id => toLibraryOs((await $api.clients.show(id)).data.os_kernel)));
			return kernels.every(k => k && k === kernels[0]) ? kernels[0] : undefined;
		}
		catch {
			return undefined;
		}
	};

	return { listAll, load, save, saveContent, restore, remove, undelete, targetOs };
};
