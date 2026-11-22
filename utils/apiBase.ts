/**
 * The API's base URL. Builds that are served by rportd itself (its `doc_root`)
 * have no NUXT_API_URL, so the API is on the same origin as the page.
 */
export const apiBaseUrl = (configured?: unknown): URL => {
	const value = typeof configured === 'string' ? configured.trim() : '';
	return new URL(value || window.location.origin);
};
