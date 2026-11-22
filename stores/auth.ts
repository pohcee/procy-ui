import { defineStore } from 'pinia';
import { FetchError } from 'ofetch';
import type { ApiErrorResponse, ILoginInput, TwoFa } from '~/types';

export const useTokenStore = defineStore('token', {
	state: () => ({
		authenticated: false,
		showTwoFa: false,
		loading: false,
		errors: [] as Array<string>,
		two_fa: {} as TwoFa,
		twoFaToken: null as string | null,
	}),
	actions: {
		async getLoginToken(credentials: ILoginInput) {
			const { $api } = useNuxtApp();
			this.loading = true;
			const token = useCookie<string>('token');
			const is_authenticated = useCookie<boolean>('is_authenticated');
			try {
				const response = await $api.auth.login(credentials);
				if (response?.data.token) {
					if (response?.data?.two_fa !== null) {
						this.twoFaToken = response.data.token;
						this.two_fa = response.data.two_fa;
						this.showTwoFa = true;
					}
					else {
						token.value = response.data.token;
						is_authenticated.value = true;
						this.authenticated = true;
					}
				}
				this.loading = false;
			}
			catch (error: unknown) {
				const apiErrors = error instanceof FetchError ? (error.data as ApiErrorResponse | undefined)?.errors : undefined;
				if (apiErrors) {
					if (apiErrors.length > 0) {
						const errorMessage = apiErrors[0].detail || apiErrors[0].title;
						this.errors = [errorMessage];
					}
				}
				else {
					this.$state.errors = ['An error occurred. Please try again later.'];
				}
				this.loading = false;
			}
		},
		async verifyTwoFa(credentials: ILoginInput, code: string) {
			const { $api } = useNuxtApp();
			this.loading = true;
			const token = useCookie<string>('token');
			const is_authenticated = useCookie<boolean>('is_authenticated');
			try {
				const response = await $api.auth.verify2fa(credentials, this.twoFaToken ?? '', code);
				if (response?.data.token) {
					token.value = response.data.token;
					is_authenticated.value = true;
					this.authenticated = true;
				}
				this.loading = false;
			}
			catch (error: unknown) {
				this.$state.errors = ['An error occurred. Please try again later.'];
				console.log(error);
			}
			this.loading = false;
		},

		async getProvider() {

		},
		cancelTwoFa() {
			this.showTwoFa = false;
			this.two_fa = {} as TwoFa;
			this.twoFaToken = null;
			this.errors = [];
		},
		async logOut() {
			const { $api } = useNuxtApp();
			const token = useCookie('token');
			const is_authenticated = useCookie<boolean>('is_authenticated');
			if (token.value) {
				try {
					// Invalidate the token server-side; clear local state regardless.
					await $api.auth.logout(token.value);
				}
				catch (error) {
					console.log(error);
				}
			}
			this.authenticated = false;
			token.value = null;
			is_authenticated.value = false;
			// useCookie writes cookies asynchronously. Make sure they're gone before the
			// caller navigates, or the auth middleware still sees the old token and
			// sends the user straight back to the dashboard.
			await nextTick();
			if (import.meta.client) {
				document.cookie = 'token=; Max-Age=0; path=/';
				document.cookie = 'is_authenticated=; Max-Age=0; path=/';
			}
		},
	},
});
