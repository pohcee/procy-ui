import type { EntryImplementation, EntryImplementationKind, LibraryOS } from '~/types';
import { normalizeInterpreter } from '~/utils/interpreter';

/** What the editor holds for one OS tab. Empty code = this OS is not implemented. */
export interface OsDraft {
	kind: EntryImplementationKind;
	code: string;
	interpreter: string;
	isSudo: boolean;
	cwd: string;
	timeoutSec: number;
}

export const blankDraft = (): OsDraft => ({
	kind: 'auto',
	code: '',
	interpreter: 'default',
	isSudo: false,
	cwd: '',
	timeoutSec: 300,
});

export const draftFrom = (impl?: EntryImplementation): OsDraft => impl
	? {
			kind: impl.kind,
			code: impl.code,
			interpreter: normalizeInterpreter(impl.interpreter) || 'default',
			isSudo: impl.is_sudo,
			cwd: impl.cwd,
			timeoutSec: impl.timeout_sec || 300,
		}
	: blankDraft();

export const implementationFromDraft = (d: OsDraft): EntryImplementation => ({
	kind: d.kind,
	code: d.code,
	interpreter: normalizeInterpreter(d.interpreter),
	is_sudo: d.isSudo,
	cwd: d.cwd,
	timeout_sec: Number(d.timeoutSec) || 300,
});

export type OsDrafts = Record<LibraryOS, OsDraft>;

export const blankDrafts = (): OsDrafts => ({ linux: blankDraft(), windows: blankDraft(), darwin: blankDraft() });
