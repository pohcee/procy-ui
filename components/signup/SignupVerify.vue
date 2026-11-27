<template>
	<!--
		The link of the signup email: choose the password, then confirm the address and create the organization
		(POST /signup/verify { token, password }). A refused password keeps the link usable, so the form stays.
	-->
	<form
		v-if="step === 'password'"
		class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-xs sm:p-8"
		novalidate
		@submit.prevent="submit"
	>
		<div>
			<span
				class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-app-blue-bg text-app-blue"
				aria-hidden="true"
			>
				<KeyRound class="h-6 w-6" />
			</span>
			<h1 class="text-2xl font-bold tracking-tight text-app-text">
				Choose your password
			</h1>
			<p class="mt-1.5 text-sm text-app-text-3">
				Last step: with it you sign in as the first administrator of your new organization. Your email address is
				your login.
			</p>
		</div>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label
					for="verify-password"
					class="text-[13px] font-medium text-app-text-2"
				>Password</label>
				<input
					id="verify-password"
					v-model="form.password"
					type="password"
					autocomplete="new-password"
					:class="[inputClass, shown.password ? '!border-app-danger' : '']"
					:aria-invalid="!!shown.password || undefined"
					aria-describedby="verify-password-help"
					@blur="touch('password')"
				>
				<span
					id="verify-password-help"
					:class="['text-[13px]', shown.password ? 'text-app-danger' : 'text-app-text-3']"
				>{{ shown.password || `At least ${minLength} characters; avoid anything easy to guess.` }}</span>
			</div>
			<div class="flex flex-col gap-1.5">
				<label
					for="verify-confirm"
					class="text-[13px] font-medium text-app-text-2"
				>Confirm password</label>
				<input
					id="verify-confirm"
					v-model="form.confirm"
					type="password"
					autocomplete="new-password"
					:class="[inputClass, shown.confirm ? '!border-app-danger' : '']"
					:aria-invalid="!!shown.confirm || undefined"
					@blur="touch('confirm')"
				>
				<span
					v-if="shown.confirm"
					class="text-[13px] text-app-danger"
				>{{ shown.confirm }}</span>
			</div>
		</div>
		<div
			v-if="refusal"
			class="flex items-start gap-2.5 rounded-[10px] border border-app-border bg-app-danger-bg p-3 text-sm text-app-danger"
			role="alert"
		>
			<CircleAlert
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<span>{{ refusal }}</span>
		</div>
		<button
			type="submit"
			:disabled="sending"
			class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
		>
			<LoaderCircle
				v-if="sending"
				class="h-4 w-4 animate-spin"
				aria-hidden="true"
			/>
			{{ sending ? 'Creating your organization…' : 'Create organization' }}
		</button>
	</form>

	<SignupLinkResult
		v-else
		:state="state"
		:title="title"
		working-text="Loading…"
	>
		<template v-if="state === 'error'">
			{{ error }}
		</template>
		<template v-else-if="outcome?.kind === 'awaiting_approval'">
			Your email is confirmed and your password is set. <span class="font-medium text-app-text">{{ outcome.organizationName || 'Your organization' }}</span>
			is waiting for review; we’ll email {{ outcome.username || 'you' }} when it opens.
		</template>
		<template v-else-if="outcome?.kind === 'completed'">
			<span class="font-medium text-app-text">{{ outcome.organizationName }}</span> is ready and you are its administrator.
			Sign in as <span class="font-medium text-app-text">{{ outcome.username }}</span> with the password you just chose.
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
import { CircleAlert, KeyRound, LoaderCircle } from 'lucide-vue-next';
import SignupLinkResult from '~/components/signup/SignupLinkResult.vue';
import {
	DEFAULT_PASSWORD_MIN_LENGTH, linkErrorMessage, passwordRefusal, signInAfterSignup, validatePassword, verifyErrorKind,
	type PasswordForm, type VerifyOutcome,
} from '~/utils/signup';

const { $api } = useNuxtApp();
const route = useRoute();

// The link's token must not leak to other sites.
useHead({ title: 'Confirm signup', meta: [{ name: 'referrer', content: 'no-referrer' }] });

const token = ref('');
const minLength = ref(DEFAULT_PASSWORD_MIN_LENGTH);
const loading = ref(true);
const outcome = ref<VerifyOutcome | null>(null);
const error = ref('');

const step = computed(() => (!loading.value && !error.value && !outcome.value ? 'password' : 'result'));
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

onMounted(async () => {
	token.value = typeof route.query.token === 'string' ? route.query.token : '';
	if (!token.value) {
		error.value = 'This link has no token. Open the link from the email again, or copy all of it into the address bar.';
		loading.value = false;
		return;
	}
	// Keep the token in memory only: out of the address bar and the history.
	history.replaceState(history.state, '', location.pathname);
	try {
		const config = await $api.signup.config();
		if (!config) error.value = 'Signup is not available on this server.';
		else minLength.value = config.passwordMinLength;
	}
	catch {
		// The server checks the password anyway.
	}
	finally {
		loading.value = false;
	}
});

const form = reactive<PasswordForm>({ password: '', confirm: '' });
const touched = ref(new Set<keyof PasswordForm>());
const submitted = ref(false);
const errors = computed(() => validatePassword(form, minLength.value));
const shown = computed(() => Object.fromEntries(
	(Object.keys(errors.value) as (keyof PasswordForm)[]).filter(k => submitted.value || touched.value.has(k)).map(k => [k, errors.value[k]]),
) as Partial<Record<keyof PasswordForm, string>>);
const touch = (k: keyof PasswordForm) => {
	touched.value = new Set([...touched.value, k]);
};

const sending = ref(false);
const refusal = ref('');
const submit = async () => {
	submitted.value = true;
	refusal.value = '';
	if (Object.keys(errors.value).length || sending.value) return;
	sending.value = true;
	try {
		outcome.value = await $api.signup.verify(token.value, form.password);
		form.password = '';
		form.confirm = '';
	}
	catch (e) {
		const status = httpStatusOf(e);
		const message = apiErrorTitle(e);
		if (verifyErrorKind(status, message) === 'password') refusal.value = passwordRefusal(message);
		else error.value = linkErrorMessage(status, message, 'verify');
	}
	finally {
		sending.value = false;
	}
};

const inputClass = 'h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-[15px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/25 sm:text-sm';
</script>
