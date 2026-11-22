import { defineStore } from 'pinia';
import { FetchError } from 'ofetch';
import { readAuthToken, writeAuthToken } from '~/utils/authToken';
import type { ApiErrorResponse, ILoginInput, TwoFa } from '~/types';

/** Set or clear the signed-in session (the auth cookie is written immediately). */
export const setAuthCookies = (value: string | null) => {
	writeAuthToken(value);
};

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
			this.errors = [];
			// A new sign-in never reuses a previous session's token.
			setAuthCookies(null);
			this.authenticated = false;
			try {
				const response = await $api.auth.login(credentials);
				if (response?.data.token) {
					// With 2FA the server returns a short-lived token that's only good for verify-2fa.
					if (response.data.two_fa) {
						this.twoFaToken = response.data.token;
						this.two_fa = response.data.two_fa;
						this.showTwoFa = true;
					}
					else {
						setAuthCookies(response.data.token);
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
			this.errors = [];
			try {
				const response = await $api.auth.verify2fa(credentials, this.twoFaToken ?? '', code);
				if (response?.data.token) {
					setAuthCookies(response.data.token);
					this.authenticated = true;
					this.showTwoFa = false;
					this.twoFaToken = null;
				}
				this.loading = false;
			}
			catch (error: unknown) {
				const apiErrors = error instanceof FetchError ? (error.data as ApiErrorResponse | undefined)?.errors : undefined;
				const first = apiErrors?.[0];
				this.$state.errors = [first?.detail || first?.title || 'An error occurred. Please try again later.'];
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
			const token = readAuthToken();
			if (token) {
				try {
					// Invalidate the token server-side; clear local state regardless.
					await $api.auth.logout(token);
				}
				catch (error) {
					console.log(error);
				}
			}
			this.authenticated = false;
			setAuthCookies(null);
		},
	},
});
