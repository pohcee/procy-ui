import { readAuthToken } from '~/utils/authToken';
import { isPublicPath } from '~/utils/signup';
import { isConsolePath, legacyOperatorRedirect } from '~/utils/operatorConsole';

export default defineNuxtRouteMiddleware(async (to) => {
	// const isLoggedIn = false;
	// if (isLoggedIn) {
	//     return navigateTo(to.fullPath);
	// }
	// return navigateTo("/auth")
	const { authenticated } = storeToRefs(useTokenStore());
	// Read the cookie directly: a useCookie ref can still hold the pre-sign-in value.
	const token = { value: readAuthToken() };

	if (token.value) {
		authenticated.value = true;
	}

	if (token.value && to?.name === 'auth') {
		return navigateTo('/dashboard');
	}
	// The sign-in page and the signup pages (and the links of their emails) need no session.
	if (!token.value && to?.name !== 'auth' && !isPublicPath(to.path)) {
		abortNavigation();
		return navigateTo('/auth');
	}
	// The operator pages moved into the console (/organizations?id=X → /operator/organizations/X, …).
	const moved = token.value ? legacyOperatorRedirect(to.path, to.query) : null;
	if (moved) return navigateTo(moved, { replace: true });
	// Platform operators have no devices: their home is the operator console, which is theirs only. The status is
	// loaded before the first page renders, so the layout shows the right shell (console or organization) at once.
	if (token.value && !isPublicPath(to.path)) {
		const toDashboard = to.path.replace(/\/+$/, '').toLowerCase() === '/dashboard';
		const statusStore = useStatusStore();
		await statusStore.ensureStatus();
		const operator = statusStore.isEnabled('operator');
		if (operator && toDashboard) return navigateTo('/operator', { replace: true });
		if (!operator && isConsolePath(to.path) && statusStore.status?.version) return navigateTo('/dashboard', { replace: true });
	}
});
