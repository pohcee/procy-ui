export default defineNuxtRouteMiddleware((to) => {
	// const isLoggedIn = false;
	// if (isLoggedIn) {
	//     return navigateTo(to.fullPath);
	// }
	// return navigateTo("/auth")
	const { authenticated } = storeToRefs(useTokenStore());
	const token = useCookie<string>('token');

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
