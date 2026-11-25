/** A readable message from an API error (rportd answers { errors: [{ title, detail }] }). */
export const apiErrorMessage = (err: unknown): string => {
	const e = err as { data?: { errors?: { title?: string; detail?: string }[] }; message?: string } | null;
	const first = e?.data?.errors?.[0];
	return first?.title || first?.detail || e?.message || 'unknown error';
};

/** The server's own message of an API error (title, else detail), or '' when it sent none. */
export const apiErrorTitle = (err: unknown): string => {
	const first = (err as { data?: { errors?: { title?: string; detail?: string }[] } } | null)?.data?.errors?.[0];
	return first?.title || first?.detail || '';
};
