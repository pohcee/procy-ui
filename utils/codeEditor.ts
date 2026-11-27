import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state';

/** Languages the code editor can highlight (CodeMirror legacy modes, loaded on demand). */
export type CodeLanguage = 'shell' | 'powershell' | 'python';

/** One indent step: two spaces, as the previous (Prism) editor inserted. */
export const INDENT_UNIT = '  ';

/**
 * The highlighting for a language or interpreter name ('bash', '/bin/sh', 'pwsh', 'python3', ...),
 * or null for plain text.
 */
export const resolveCodeLanguage = (name?: string | null): CodeLanguage | null => {
	const value = (name ?? '').trim().toLowerCase();
	if (!value) return null;
	const base = value.split(/[\\/]/).pop()!.replace(/\.exe$/, '');
	if (['sh', 'bash', 'shell', 'zsh', 'dash', 'ksh'].includes(base)) return 'shell';
	if (['powershell', 'pwsh', 'ps1', 'ps'].includes(base)) return 'powershell';
	if (/^python[0-9.]*$/.test(base) || base === 'py') return 'python';
	return null;
};

/**
 * What Tab does when nothing is selected: insert one indent step at every cursor (the previous editor's
 * behaviour), rather than CodeMirror's indentMore, which indents the whole line. Returns null when any
 * range has a selection, so the caller indents the selected lines instead.
 */
export const softTabSpec = (state: EditorState, unit = INDENT_UNIT): TransactionSpec | null => {
	if (state.selection.ranges.some(range => !range.empty)) return null;
	return state.changeByRange(range => ({
		changes: { from: range.from, insert: unit },
		range: EditorSelection.cursor(range.from + unit.length),
	}));
};
