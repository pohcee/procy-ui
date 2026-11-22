/** A readable message from an API error (rportd answers { errors: [{ title, detail }] }). */
export const apiErrorMessage = (err: unknown): string => {
	const e = err as { data?: { errors?: { title?: string; detail?: string }[] }; message?: string } | null;
	const first = e?.data?.errors?.[0];
	return first?.title || first?.detail || e?.message || 'unknown error';
};
