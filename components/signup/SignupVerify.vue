<template>
	<!-- The link of the signup email: confirms the address and creates the organization. -->
	<SignupLinkResult
		:state="state"
		:title="title"
		working-text="Confirming your email and creating your organization…"
	>
		<template v-if="state === 'error'">
			{{ error }}
		</template>
		<template v-else-if="outcome?.kind === 'awaiting_approval'">
			Your email is confirmed. <span class="font-medium text-app-text">{{ outcome.organizationName || 'Your organization' }}</span>
			is waiting for review; we’ll email {{ outcome.username || 'you' }} when it opens.
		</template>
		<template v-else-if="outcome?.kind === 'completed'">
			<span class="font-medium text-app-text">{{ outcome.organizationName }}</span> is ready and you are its administrator.
			Sign in as <span class="font-medium text-app-text">{{ outcome.username }}</span> with the password you chose.
			<template v-if="outcome.checkoutRequired">
				After signing in you’ll add a payment method to start.
			</template>
			<template v-else-if="trialEnds">
				Your trial runs until {{ trialEnds }}.
			</template>
		</template>

		<template #actions>
			<AppButton
				v-if="outcome?.kind === 'completed'"
				:to="signInAfterSignup(outcome)"
			>
				{{ outcome.checkoutRequired ? 'Sign in and add a payment method' : 'Continue to sign in' }}
			</AppButton>
			<template v-else-if="state === 'error'">
				<AppButton to="/signup">
					Sign up again
				</AppButton>
				<AppButton
					to="/auth"
					variant="ghost"
				>
					Go to sign in
				</AppButton>
			</template>
			<AppButton
				v-else-if="state === 'waiting'"
				to="/auth"
				variant="secondary"
			>
				Go to sign in
			</AppButton>
		</template>
	</SignupLinkResult>
</template>

<script setup lang="ts">
import SignupLinkResult from '~/components/signup/SignupLinkResult.vue';
import { linkErrorMessage, signInAfterSignup, type VerifyOutcome } from '~/utils/signup';

const { $api } = useNuxtApp();
const route = useRoute();

const outcome = ref<VerifyOutcome | null>(null);
const error = ref('');
const state = computed(() => (error.value ? 'error' : !outcome.value ? 'working' : outcome.value.kind === 'awaiting_approval' ? 'waiting' : 'done'));
const title = computed(() => ({
	working: '',
	error: 'This link didn’t work',
	waiting: 'Email confirmed',
	done: 'Your organization is ready',
}[state.value]));
const trialEnds = computed(() => {
	if (outcome.value?.kind !== 'completed' || !outcome.value.trialEndsAt) return '';
	const d = new Date(outcome.value.trialEndsAt);
	return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(d);
});

useHead({ title: 'Confirm signup' });

// The token is single use: post it once, then drop it from the address bar.
let started = false;
onMounted(async () => {
	if (started) return;
	started = true;
	const token = typeof route.query.token === 'string' ? route.query.token : '';
	if (!token) {
		error.value = 'This link has no token. Open the link from the email again, or copy all of it into the address bar.';
		return;
	}
	try {
		outcome.value = await $api.signup.verify(token);
		history.replaceState(history.state, '', location.pathname);
	}
	catch (e) {
		error.value = linkErrorMessage(httpStatusOf(e), apiErrorTitle(e), 'verify');
	}
});
</script>
