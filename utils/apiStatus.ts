/** The HTTP status of an ofetch error, if any. */
export const httpStatusOf = (e: unknown): number | undefined =>
	(e as { response?: { status?: number } })?.response?.status ?? (e as { status?: number })?.status;
