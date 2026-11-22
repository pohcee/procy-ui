import type { Command, Script } from '~/types';
import { detectRunKind, type RunKind } from '~/utils/runKind';

/** A saved command or script, in one shape. */
export interface LibraryEntry {
	id: string;
	kind: RunKind;
	name: string;
	tags: string[];
	code: string;
	timeoutSec: number;
	/** Script-only fields (commands are stored without them). */
	cwd: string;
	isSudo: boolean;
	interpreter: string;
	createdBy?: string;
	updatedBy?: string;
	updatedAt?: Date | string;
}

export interface LibraryDraft {
	name: string;
	tags: string[];
	code: string;
	timeoutSec: number;
	cwd: string;
	isSudo: boolean;
	interpreter: string;
}

const fromCommand = (c: Command): LibraryEntry => ({
	id: c.id,
	kind: 'command',
	name: c.name,
	tags: c.tags ?? [],
	code: c.cmd ?? '',
	timeoutSec: c.timeout_sec,
	cwd: '',
	isSudo: false,
	interpreter: '',
	createdBy: c.created_by,
	updatedBy: c.updated_by,
	updatedAt: c.updated_at ?? c.created_at,
});

const fromScript = (s: Script): LibraryEntry => ({
	id: s.id,
	kind: 'script',
	name: s.name,
	tags: s.tags ?? [],
	code: s.script ?? '',
	timeoutSec: s.timeout_sec,
	cwd: s.cwd ?? '',
	isSudo: !!s.is_sudo,
	interpreter: s.interpreter ?? '',
	createdBy: s.created_by,
	updatedBy: s.updated_by,
	updatedAt: s.updated_at ?? s.created_at,
});

/**
 * Where a new library entry is stored. The command library can't hold a
 * working directory, sudo or interpreter, so anything using those is a script.
 */
export const libraryKindFor = (draft: LibraryDraft): RunKind => {
	if (draft.cwd || draft.isSudo || draft.interpreter) return 'script';
	return detectRunKind(draft.code, draft.interpreter);
};

/** The server keeps saved commands and saved scripts apart; this presents them as one library. */
export const useRunLibrary = () => {
	const { $api } = useNuxtApp();

	/** Everything, sorted by name. Use `load` for the full, current entry before running or editing. */
	const listAll = async (): Promise<LibraryEntry[]> => {
		const [commands, scripts] = await Promise.all([
			$api.library.listCommand(),
			$api.library.listScript(),
		]);
		return [
			...(commands.data ?? []).map(fromCommand),
			...(scripts.data ?? []).map(fromScript),
		].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	};

	const load = async (id: string, kind: RunKind): Promise<LibraryEntry> => {
		if (kind === 'script') return fromScript((await $api.library.showScript(id)).data);
		return fromCommand((await $api.library.showCommand(id)).data);
	};

	/**
	 * Create (no `existing`) or update. Existing entries stay in their own
	 * store; new ones go wherever `libraryKindFor` says.
	 */
	const save = async (draft: LibraryDraft, existing?: { id: string; kind: RunKind } | null): Promise<{ id: string; kind: RunKind }> => {
		const kind = existing?.kind ?? libraryKindFor(draft);
		const common = { name: draft.name, tags: draft.tags, timeout_sec: Number(draft.timeoutSec) };
		if (kind === 'script') {
			const payload = { ...common, script: draft.code, cwd: draft.cwd, is_sudo: draft.isSudo, interpreter: draft.interpreter };
			if (existing) {
				await $api.library.updateScript(existing.id, payload);
				return existing;
			}
			const { data } = await $api.library.createScript(payload);
			return { id: data.id, kind };
		}
		const payload = { ...common, cmd: draft.code };
		if (existing) {
			await $api.library.updateCommand(existing.id, payload);
			return existing;
		}
		const { data } = await $api.library.createCommand(payload);
		return { id: data.id, kind };
	};

	const remove = async (id: string, kind: RunKind) => {
		if (kind === 'script') await $api.library.deleteScript(id);
		else await $api.library.deleteCommand(id);
	};

	return { listAll, load, save, remove };
};
