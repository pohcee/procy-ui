<template>
	<LoginForm
		v-if="!showTwoFa"
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
import type { ILoginInput } from '~/types';

const store = useTokenStore();
const { authenticated, showTwoFa } = storeToRefs(store);
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

const handleLogin = async (credentials: ILoginInput) => {
	credentialsRef.value = credentials;
	await store.getLoginToken(credentials);
	// Only once fully signed in (not while a 2FA code is still needed).
	if (authenticated.value) {
		await router.push('/dashboard');
	}
};

const handleTwoFa = async (two_fa: string) => {
	await store.verifyTwoFa(credentialsRef.value, two_fa);
	if (authenticated.value) {
		await router.push('/dashboard');
	}
};

const handleResend = async () => {
	await store.getLoginToken(credentialsRef.value);
};

const handleCancel = () => {
	store.cancelTwoFa();
};
</script>
