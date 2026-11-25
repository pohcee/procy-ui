<template>
	<LoginOrgPicker
		v-if="orgChoices && !showTwoFa"
		:organizations="orgChoices"
		:loading="loading"
		:errors="errors"
		@pick="handlePickOrg"
		@cancel="store.cancelOrgChoice()"
	/>
	<LoginForm
		v-else-if="!showTwoFa"
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
import LoginForm from '../components/LoginForm.vue';
import LoginOrgPicker from '../components/LoginOrgPicker.vue';
import type { ILoginInput } from '~/types';

const store = useTokenStore();
const { authenticated, showTwoFa, orgChoices, loading, errors } = storeToRefs(store);
const router = useRouter();
const credentialsRef = ref<ILoginInput>({
	username: '',
	password: '',
	remember_me: '',
});

definePageMeta({
	layout: 'auth',
});
useHead({
	title: 'Login',
});

// The middleware sends platform operators on to their organization list.
const goHome = () => router.push('/dashboard');

const handleLogin = async (credentials: ILoginInput) => {
	credentialsRef.value = credentials;
	await store.getLoginToken(credentials);
	// Only once fully signed in (not while a 2FA code or an organization is still needed).
	if (authenticated.value) {
		await goHome();
	}
};

// Users of several organizations: sign in again for the one picked.
const handlePickOrg = async (organization: string) => {
	await handleLogin({ ...credentialsRef.value, organization });
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
