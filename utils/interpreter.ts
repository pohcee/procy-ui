/**
 * Script interpreter as rportd expects it: '' means the default (/bin/sh or the shebang).
 * The previous UI stored defaults as "shOrShebang" or "systemDefaultShell" (our selects use "default");
 * sent as-is, rportd tries to run a program of that name ("sudo: shOrShebang: command not found").
 */
export const normalizeInterpreter = (value?: string | null): string => {
	const v = (value ?? '').trim();
	return ['', 'default', 'shorshebang', 'systemdefaultshell'].includes(v.toLowerCase()) ? '' : v;
};

export interface InterpreterOption {
	value: string;
	label: string;
}

/** Interpreters offered when running or scheduling code. 'default' is sent as ''. */
export const INTERPRETER_OPTIONS: InterpreterOption[] = [
	{ value: 'default', label: 'Default (sh or shebang · cmd.exe on Windows)' },
	{ value: '/bin/bash', label: 'Bash' },
	{ value: 'powershell', label: 'PowerShell (Windows)' },
	{ value: 'cmd', label: 'cmd.exe (Windows)' },
	{ value: 'tacoscript', label: 'Tacoscript' },
];

/** The options plus `current` if it is a custom value (an alias or a path), so editing keeps it visible. */
export const interpreterOptionsWith = (current?: string | null): InterpreterOption[] => {
	const value = normalizeInterpreter(current);
	if (!value || INTERPRETER_OPTIONS.some(o => o.value === value)) return INTERPRETER_OPTIONS;
	return [...INTERPRETER_OPTIONS, { value, label: value }];
};
