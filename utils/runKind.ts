/**
 * The rport server runs code in one of two ways:
 *  - a *command*: one line handed to the shell. Clients only accept commands
 *    that pass their [remote-commands] allow/deny filters;
 *  - a *script*: uploaded to the device as a file and then executed
 *    (governed only by the client's [remote-scripts] on/off setting).
 * The UI treats them as one thing and picks the kind automatically.
 */
export type RunKind = 'command' | 'script';

/** Interpreters that only make sense for scripts. */
const SCRIPT_ONLY_INTERPRETERS = new Set(['tacoscript']);

/**
 * rport clients' default command filter only allows a full path
 * (e.g. /usr/bin/…, C:\Windows\System32\…) and denies pipes, redirects and
 * chaining. Anything that wouldn't pass that is sent as a script instead,
 * so ordinary one-liners like `uname -a` or `df -h | grep /` just work.
 */
const ABSOLUTE_PATH = /^(\/|[A-Za-z]:\\)/;
const SHELL_OPERATORS = /[|<>;&,\n]/;

export const detectRunKind = (code: string, interpreter = ''): RunKind => {
	const text = code.trim();
	if (SCRIPT_ONLY_INTERPRETERS.has(interpreter)) return 'script';
	if (text.startsWith('#!') || text.includes('\n')) return 'script';
	if (!ABSOLUTE_PATH.test(text) || SHELL_OPERATORS.test(text)) return 'script';
	return 'command';
};

/** The device refused a command because of its [remote-commands] filters. */
export const isCommandNotAllowed = (message?: string | null) => /command is not allowed/i.test(message ?? '');

export const runKindLabel = (kind: RunKind) => (kind === 'script' ? 'Script' : 'Command');

/** An entry offered in the "insert from library" picker. */
export interface LibraryPickItem {
	id: string;
	name: string;
	kind?: RunKind;
}
