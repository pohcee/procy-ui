import { readAuthToken } from '~/utils/authToken';
import { isPublicPath } from '~/utils/signup';

// Whether this server offers signup (GET /api/v1/signup), asked once per page load.
let offered: Promise<boolean> | null = null;
const signupOffered = (): Promise<boolean> => {
	if (!offered) {
		const { $api } = useNuxtApp();
		offered = $api.signup.config().then(c => c !== null, () => false);
	}
	return offered;
};

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

	// Signed in: the sign-in page and the public home page lead to the app.
	if (token.value && (to?.name === 'auth' || to.path === '/')) {
		return navigateTo('/dashboard', { replace: true });
	}
	// The public home page is for servers that offer signup (hosted Procy); elsewhere (standalone, self-hosted
	// without [signup]) a signed-out visitor goes straight to the sign-in page, as before.
	if (!token.value && to.path === '/') {
		if (!(await signupOffered())) return navigateTo('/auth', { replace: true });
		return;
	}
	// The sign-in page and the signup pages (and the links of their emails) need no session.
	if (!token.value && to?.name !== 'auth' && !isPublicPath(to.path)) {
		abortNavigation();
		return navigateTo('/auth');
	}
	// Platform operators have no devices: their home is the organization list.
	if (token.value && to.path.replace(/\/+$/, '').toLowerCase() === '/dashboard') {
		const statusStore = useStatusStore();
		await statusStore.ensureStatus();
		if (statusStore.isEnabled('operator')) return navigateTo('/organizations', { replace: true });
	}
});
