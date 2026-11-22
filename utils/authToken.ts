/**
 * The current API token, read straight from the browser's cookies.
 * (useCookie refs can lag behind a sign-in or sign-out by a tick.)
 */
export const readAuthToken = (): string | null => {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
	const value = match ? decodeURIComponent(match[1]) : '';
	return value && value !== 'null' && value !== 'undefined' ? value : null;
};
