/**
 * The UI keeps its API token in its own cookie. The original rport UI on the
 * same domain used a cookie called `token`, sometimes scoped to sub-paths such
 * as /dashboard; browsers list those before a site-wide cookie with the same
 * name, so sharing the name made a stale session win after a page refresh.
 */
export const AUTH_COOKIE = 'orp2_token';

const LEGACY_COOKIES = ['token', 'is_authenticated'];
const LEGACY_PATHS = ['/', '/dashboard', '/dashboard/', '/auth', '/auth/'];

/** The current API token, read straight from the browser's cookies. */
export const readAuthToken = (): string | null => {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]*)`));
	const value = match?.[1] ? decodeURIComponent(match[1]) : '';
	return value && value !== 'null' && value !== 'undefined' ? value : null;
};

/** Set (or clear, with null) the auth cookie immediately. */
export const writeAuthToken = (value: string | null) => {
	if (typeof document === 'undefined') return;
	document.cookie = value
		? `${AUTH_COOKIE}=${encodeURIComponent(value)}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
		: `${AUTH_COOKIE}=; Max-Age=0; path=/`;
};

/** Remove auth cookies left by the original rport UI or earlier builds. */
export const clearLegacyAuthCookies = () => {
	if (typeof document === 'undefined') return;
	// Also the current page's own path prefixes, in case one was scoped there.
	const prefixes = location.pathname.split('/').filter(Boolean)
		.reduce<string[]>((acc, part) => [...acc, `${acc[acc.length - 1] ?? ''}/${part}`], []);
	const paths = new Set([...LEGACY_PATHS, ...prefixes, ...prefixes.map(p => `${p}/`)]);
	for (const name of LEGACY_COOKIES) {
		for (const path of paths) document.cookie = `${name}=; Max-Age=0; path=${path}`;
	}
};

/** Where the sign-in's session lifetime is kept, so switching organizations keeps it (see switchLifetime). */
const LIFETIME_KEY = 'orp2_token_lifetime';

/** Remember (or forget, with null) the `token-lifetime` chosen at sign-in. */
export const writeSessionLifetime = (seconds: string | null) => {
	try {
		if (seconds) localStorage.setItem(LIFETIME_KEY, seconds);
		else localStorage.removeItem(LIFETIME_KEY);
	}
	catch {
		// No storage (private mode): a switch then gets the server's default lifetime.
	}
};

export const readSessionLifetime = (): string | null => {
	try {
		return localStorage.getItem(LIFETIME_KEY);
	}
	catch {
		return null;
	}
};

/** Whether a failed sign-in means the password must be changed first (401 "password has expired"). */
export const isPasswordExpiredError = (status: number | undefined, message: string): boolean =>
	status === 401 && /password has expired/i.test(message);
