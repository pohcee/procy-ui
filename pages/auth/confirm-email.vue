<template>
	<!--
		The link of an email-confirmation mail (<public_url>/auth/confirm-email?token=...): the link proves the mailbox,
		the session the account, so it needs a sign-in as the account that asked for it.
	-->
	<SignupLinkResult
		:state="state"
		:title="title"
		working-text="Confirming your email address…"
	>
		<template v-if="state === 'error'">
			{{ error }}
		</template>
		<template v-else-if="needsSignIn">
			Sign in as the account that asked for this link, and you’ll come back here to finish.
		</template>
		<template v-else>
			<span class="font-medium text-app-text">{{ login || 'Your email address' }}</span> is confirmed. You can now be
			invited into other organizations and accept their invitations.
		</template>
		<template #actions>
			<AppButton
				v-if="needsSignIn"
				:to="signInLink"
			>
				Sign in to confirm
			</AppButton>
			<AppButton
				v-else-if="state === 'error'"
				to="/profile"
				variant="secondary"
			>
				Send a new link from your profile
			</AppButton>
			<AppButton
				v-else
				to="/dashboard"
			>
				Continue
			</AppButton>
		</template>
	</SignupLinkResult>
</template>

<script setup lang="ts">
import SignupLinkResult from '~/components/signup/SignupLinkResult.vue';
import { readAuthToken } from '~/utils/authToken';
import { emailConfirmErrorMessage } from '~/utils/signup';

definePageMeta({ layout: 'auth' });
// The link's token must not leak to other sites.
useHead({ title: 'Confirm email', meta: [{ name: 'referrer', content: 'no-referrer' }] });

const { $api } = useNuxtApp();
const route = useRoute();

const token = typeof route.query.token === 'string' ? route.query.token : '';
const needsSignIn = ref(false);
const login = ref('');
const error = ref('');
const done = ref(false);
const state = computed(() => (error.value ? 'error' : done.value || needsSignIn.value ? (needsSignIn.value ? 'waiting' : 'done') : 'working'));
const title = computed(() => (error.value ? 'This link didn’t work' : needsSignIn.value ? 'Sign in to confirm your email' : 'Email address confirmed'));
// Back here after signing in (the sign-in page follows a local `next`).
const signInLink = computed(() => `/auth?${new URLSearchParams({ next: `/auth/confirm-email?token=${encodeURIComponent(token)}` }).toString()}`);

onMounted(async () => {
	if (!token) {
		error.value = 'This link has no token. Open the link from the email again, or copy all of it into the address bar.';
		return;
	}
	if (!readAuthToken()) {
		needsSignIn.value = true;
		return;
	}
	try {
		login.value = (await $api.account.confirmEmail(token)).login;
		done.value = true;
		history.replaceState(history.state, '', location.pathname);
	}
	catch (e) {
		error.value = emailConfirmErrorMessage(httpStatusOf(e), apiErrorTitle(e), 'confirm');
	}
});
</script>
