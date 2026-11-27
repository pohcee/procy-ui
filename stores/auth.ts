import { defineStore } from 'pinia';
import { FetchError } from 'ofetch';
import { isPasswordExpiredError, readAuthToken, writeAuthToken, writeSessionLifetime } from '~/utils/authToken';
import { loginNeedsOrgChoice, type OrgRef } from '~/utils/membership';
import { isOidcRequiredError, OIDC_REQUIRED_MESSAGE, oidcTokenErrorMessage, oidcTokenOutcome } from '~/utils/oidc';
import { httpStatusOf } from '~/utils/apiStatus';
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
		/** Set when the server refused a password sign-in because the account signs in with Google. */
		oidcRequired: false,
	}),
	actions: {
		async getLoginToken(credentials: ILoginInput) {
			const { $api } = useNuxtApp();
			this.loading = true;
			this.errors = [];
			this.oidcRequired = false;
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
				if (isOidcRequiredError(httpStatusOf(error), first?.code)) {
					this.refuseForOidc();
				}
				else if (isPasswordExpiredError(error instanceof FetchError ? error.status : undefined, `${first?.title ?? ''} ${first?.detail ?? ''}`)) {
					// The sign-in page asks for a new password and signs in again with it (POST /login new_password).
					this.passwordExpired = true;
					this.orgChoices = null;
					this.errors = [];
				}
				else if (apiErrors) {
					const [first] = apiErrors;
					if (first) {
						const errorMessage = first.detail || first.title;
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
				if (isOidcRequiredError(httpStatusOf(error), first?.code)) {
					this.cancelTwoFa();
					this.refuseForOidc();
				}
				else {
					this.$state.errors = [first?.detail || first?.title || 'An error occurred. Please try again later.'];
				}
				console.log(error);
			}
			this.loading = false;
		},

		/** The password sign-in was refused: this account signs in with Google (the form highlights its button). */
		refuseForOidc() {
			this.oidcRequired = true;
			this.orgChoices = null;
			this.passwordExpired = false;
			this.errors = [OIDC_REQUIRED_MESSAGE];
		},

		/**
		 * Finishes a Google sign-in: exchanges the one-time code of the callback (POST /oidc/token). A user of
		 * several organizations gets `orgChoices` and calls this again with the one picked. Returns whether a session
		 * was started.
		 */
		async exchangeOidcCode(code: string, organization?: string, lifetime?: string | null): Promise<boolean> {
			const { $api } = useNuxtApp();
			this.loading = true;
			this.errors = [];
			setAuthCookies(null);
			this.authenticated = false;
			try {
				const outcome = oidcTokenOutcome(await $api.auth.oidcToken(code, organization, lifetime), !!organization);
				if (outcome.kind === 'choose-org') {
					this.orgChoices = outcome.organizations;
				}
				else if (outcome.kind === 'signed-in') {
					setAuthCookies(outcome.token);
					writeSessionLifetime(lifetime || null);
					this.signedIn();
				}
				else {
					this.errors = [outcome.message];
				}
			}
			catch (error: unknown) {
				const first = error instanceof FetchError ? (error.data as ApiErrorResponse | undefined)?.errors?.[0] : undefined;
				// A refused organization (403) keeps the picker: the same code still works for another one.
				if (!organization || httpStatusOf(error) !== 403) this.orgChoices = null;
				this.errors = [oidcTokenErrorMessage(httpStatusOf(error), first?.detail || first?.title || '')];
			}
			finally {
				this.loading = false;
			}
			return this.authenticated;
		},

		/** A new session: forget the previous session's server status (its capabilities depend on the user). */
		signedIn() {
			this.authenticated = true;
			this.orgChoices = null;
			this.passwordExpired = false;
			this.oidcRequired = false;
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
