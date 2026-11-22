/**
 * Script interpreter as rportd expects it: '' means the default (/bin/sh or the shebang).
 * The previous UI stored defaults as "shOrShebang" or "systemDefaultShell" (our selects use "default");
 * sent as-is, rportd tries to run a program of that name ("sudo: shOrShebang: command not found").
 */
export const normalizeInterpreter = (value?: string | null): string => {
	const v = (value ?? '').trim();
	return ['', 'default', 'shorshebang', 'systemdefaultshell'].includes(v.toLowerCase()) ? '' : v;
};
