import { defineStore } from 'pinia';
import { FetchError } from 'ofetch';
import { isPasswordExpiredError, readAuthToken, writeAuthToken, writeSessionLifetime } from '~/utils/authToken';
import { loginNeedsOrgChoice, type OrgRef } from '~/utils/membership';
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
		/** Set when the login listed several organizations and the user must pick one. */
		orgChoices: null as OrgRef[] | null,
		/** Set when the server refused the sign-in because the password has expired: a new one is needed. */
		passwordExpired: false,
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
				// A user of several organizations picks one, then signs in again with it.
				const choices = credentials.organization ? null : loginNeedsOrgChoice(response?.data);
				this.passwordExpired = false;
				if (choices) {
					this.orgChoices = choices;
				}
				else if (response?.data.token) {
					// With 2FA the server returns a short-lived token that's only good for verify-2fa.
					if (response.data.two_fa) {
						this.twoFaToken = response.data.token;
						this.two_fa = response.data.two_fa;
						this.showTwoFa = true;
					}
					else {
						setAuthCookies(response.data.token);
						writeSessionLifetime(credentials.remember_me || null);
						this.signedIn();
					}
				}
				this.loading = false;
			}
			catch (error: unknown) {
				const apiErrors = error instanceof FetchError ? (error.data as ApiErrorResponse | undefined)?.errors : undefined;
				const first = apiErrors?.[0];
				if (isPasswordExpiredError(error instanceof FetchError ? error.status : undefined, `${first?.title ?? ''} ${first?.detail ?? ''}`)) {
					// The sign-in page asks for a new password and signs in again with it (POST /login new_password).
					this.passwordExpired = true;
					this.orgChoices = null;
					this.errors = [];
				}
				else if (apiErrors) {
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
					writeSessionLifetime(credentials.remember_me || null);
					this.signedIn();
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

		/** A new session: forget the previous session's server status (its capabilities depend on the user). */
		signedIn() {
			this.authenticated = true;
			this.orgChoices = null;
			this.passwordExpired = false;
			useStatusStore().$reset();
			useProfile().$reset();
		},
		cancelOrgChoice() {
			this.orgChoices = null;
			this.passwordExpired = false;
			this.errors = [];
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
			writeSessionLifetime(null);
			useStatusStore().$reset();
			useProfile().$reset();
		},
	},
});
