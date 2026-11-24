/**
 * The API's base URL. Builds that are served by rportd itself (its `doc_root`)
 * have no NUXT_API_URL (or a path such as "/"), so the API is on the same origin
 * as the page; a relative value is resolved against that origin.
 */
export const apiBaseUrl = (configured?: unknown, origin: string = window.location.origin): URL => {
	const value = typeof configured === 'string' ? configured.trim() : '';
	return new URL(value || '/', origin);
};
