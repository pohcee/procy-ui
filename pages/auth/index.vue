<template>
	<LoginOrgPicker
		v-if="orgChoices && !showTwoFa"
		:organizations="orgChoices"
		:loading="loading"
		:errors="errors"
		@pick="handlePickOrg"
		@cancel="store.cancelOrgChoice()"
	/>
	<LoginNewPassword
		v-else-if="passwordExpired && !showTwoFa"
		:username="credentialsRef.username"
		:loading="loading"
		:errors="errors"
		@submit="handleNewPassword"
		@cancel="store.cancelOrgChoice()"
	/>
	<LoginForm
		v-else-if="!showTwoFa"
		:initial-username="initialUsername"
		@login="handleLogin"
	/>
	<TwoFa
		v-else
		:send-to="store.two_fa?.send_to"
		@code="handleTwoFa"
		@resend="handleResend"
		@cancel="handleCancel"
	/>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LoginForm from '~/components/LoginForm.vue';
import LoginOrgPicker from '~/components/LoginOrgPicker.vue';
import LoginNewPassword from '~/components/LoginNewPassword.vue';
import type { ILoginInput } from '~/types';
import { checkoutPlanFromQuery } from '~/utils/signup';

const store = useTokenStore();
const { authenticated, showTwoFa, orgChoices, passwordExpired, loading, errors } = storeToRefs(store);
const router = useRouter();
const route = useRoute();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const credentialsRef = ref<ILoginInput>({
	username: '',
	password: '',
	remember_me: '',
});
// After a signup the verification page sends the new administrator here with the login filled in.
const initialUsername = typeof route.query.username === 'string' ? route.query.username : undefined;

definePageMeta({
	layout: 'auth',
});
useHead({
	title: 'Login',
});

// The middleware sends platform operators on to their organization list. A signup that needs a payment method
// first (`?checkout=<plan>`) goes to the provider's checkout.
const goHome = async () => {
	const plan = checkoutPlanFromQuery(route.query.checkout);
	if (plan) {
		try {
			const { url } = await $api.billing.checkout(plan);
			if (url && /^https:\/\//i.test(url)) {
				window.location.assign(url);
				return;
			}
		}
		catch (e) {
			snackbar.add({ type: 'error', text: `Couldn't open the checkout: ${apiErrorMessage(e)}` });
		}
	}
	await router.push('/dashboard');
};

const handleLogin = async (credentials: ILoginInput) => {
	credentialsRef.value = credentials;
	await store.getLoginToken(credentials);
	// Once the new password is set it is the password (for a 2FA resend, and an organization picked next).
	if (credentials.new_password && !passwordExpired.value && errors.value.length === 0) {
		const { new_password: newPassword, ...rest } = credentials;
		credentialsRef.value = { ...rest, password: newPassword };
	}
	// Only once fully signed in (not while a 2FA code or an organization is still needed).
	if (authenticated.value) {
		await goHome();
	}
};

// Users of several organizations: sign in again for the one picked.
const handlePickOrg = async (organization: string) => {
	await handleLogin({ ...credentialsRef.value, organization });
};

// An expired (or one-time) password: sign in again, setting the new one.
const handleNewPassword = async (newPassword: string) => {
	await handleLogin({ ...credentialsRef.value, new_password: newPassword });
};

const handleTwoFa = async (two_fa: string) => {
	await store.verifyTwoFa(credentialsRef.value, two_fa);
	if (authenticated.value) {
		await goHome();
	}
};

const handleResend = async () => {
	await store.getLoginToken(credentialsRef.value);
};

const handleCancel = () => {
	store.cancelTwoFa();
	store.cancelOrgChoice();
};
</script>
