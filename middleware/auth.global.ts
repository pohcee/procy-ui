import { readAuthToken } from '~/utils/authToken';

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
	if (!token.value && to?.name !== 'auth') {
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
