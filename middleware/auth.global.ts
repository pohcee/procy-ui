import { readAuthToken } from '~/utils/authToken';

export default defineNuxtRouteMiddleware((to) => {
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
});
