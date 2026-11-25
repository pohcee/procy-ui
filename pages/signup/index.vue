<template>
	<div class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8">
		<!-- Loading the settings -->
		<div
			v-if="config === undefined"
			class="flex items-center justify-center gap-2 py-10 text-sm text-app-text-3"
		>
			<LoaderCircle
				class="h-4 w-4 animate-spin"
				aria-hidden="true"
			/>
			Loading…
		</div>

		<!-- This server has no signup -->
		<template v-else-if="config === null">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-app-text">
					Signup isn’t open
				</h1>
				<p class="mt-1.5 text-sm text-app-text-3">
					{{ loadError || 'This server doesn’t offer self-service signup. Ask your administrator for an account.' }}
				</p>
			</div>
			<AppButton
				to="/auth"
				variant="secondary"
			>
				Back to sign in
			</AppButton>
		</template>

		<!-- Sent: check the email -->
		<template v-else-if="sentTo">
			<div>
				<span
					class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-app-blue-bg text-app-blue"
					aria-hidden="true"
				>
					<MailCheck class="h-6 w-6" />
				</span>
				<h1 class="text-2xl font-bold tracking-tight text-app-text">
					Check your email
				</h1>
				<p class="mt-1.5 text-sm text-app-text-3">
					If <span class="font-medium text-app-text">{{ sentTo }}</span> can sign up, we sent it a link to confirm the
					address and create <span class="font-medium text-app-text">{{ form.organization.trim() }}</span>. The link
					works once and expires in a day.
				</p>
			</div>
			<ul class="flex flex-col gap-2 text-[13px] text-app-text-3">
				<li>Nothing arrived after a few minutes? Look in your spam folder.</li>
				<li>Already have an account with this address? The email tells you to sign in instead.</li>
			</ul>
			<div class="flex flex-col gap-3">
				<AppButton to="/auth">
					Go to sign in
				</AppButton>
				<AppButton
					variant="ghost"
					@click="startOver"
				>
					Use another address
				</AppButton>
			</div>
		</template>

		<!-- The form -->
		<form
			v-else
			class="flex flex-col gap-6"
			novalidate
			@submit.prevent="submit"
		>
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-app-text">
					Create your organization
				</h1>
				<p class="mt-1.5 text-sm text-app-text-3">
					You become its first administrator.<template v-if="config.trialDays">
						Free for {{ config.trialDays }} days, no payment method needed to start.
					</template>
				</p>
			</div>

			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<label
						for="signup-email"
						class="text-[13px] font-medium text-app-text-2"
					>Work email</label>
					<input
						id="signup-email"
						v-model="form.email"
						type="email"
						autocomplete="email"
						autocapitalize="none"
						spellcheck="false"
						:class="[inputClass, shown.email ? '!border-app-danger' : '']"
						:aria-invalid="!!shown.email || undefined"
						aria-describedby="signup-email-help"
						@blur="touch('email')"
					>
					<span
						v-if="shown.email"
						class="text-[13px] text-app-danger"
					>{{ shown.email }}</span>
					<span
						v-else
						id="signup-email-help"
						class="text-[13px] text-app-text-3"
					>It becomes your login.</span>
				</div>
				<div class="flex flex-col gap-1.5">
					<label
						for="signup-org"
						class="text-[13px] font-medium text-app-text-2"
					>Organization name</label>
					<input
						id="signup-org"
						v-model="form.organization"
						type="text"
						autocomplete="organization"
						maxlength="200"
						:class="[inputClass, shown.organization ? '!border-app-danger' : '']"
						:aria-invalid="!!shown.organization || undefined"
						@blur="touch('organization')"
					>
					<span
						v-if="shown.organization"
						class="text-[13px] text-app-danger"
					>{{ shown.organization }}</span>
				</div>
				<div class="flex flex-col gap-1.5">
					<label
						for="signup-password"
						class="text-[13px] font-medium text-app-text-2"
					>Password</label>
					<input
						id="signup-password"
						v-model="form.password"
						type="password"
						autocomplete="new-password"
						:class="[inputClass, shown.password ? '!border-app-danger' : '']"
						:aria-invalid="!!shown.password || undefined"
						@blur="touch('password')"
					>
					<span
						:class="['text-[13px]', shown.password ? 'text-app-danger' : 'text-app-text-3']"
					>{{ shown.password || `At least ${config.passwordMinLength} characters.` }}</span>
				</div>
				<div class="flex flex-col gap-1.5">
					<label
						for="signup-confirm"
						class="text-[13px] font-medium text-app-text-2"
					>Confirm password</label>
					<input
						id="signup-confirm"
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
				<SignupCaptcha
					v-if="config.captcha"
					ref="captchaRef"
					:provider="config.captcha"
					:site-key="config.captchaSiteKey"
					@token="captchaToken = $event"
				/>
			</div>

			<div
				v-if="error"
				class="flex items-start gap-2.5 rounded-[10px] border border-app-border bg-app-danger-bg p-3 text-sm text-app-danger"
				role="alert"
			>
				<CircleAlert
					class="mt-px h-[18px] w-[18px] shrink-0"
					aria-hidden="true"
				/>
				<span class="block first-letter:uppercase">{{ error }}</span>
			</div>

			<div class="flex flex-col gap-3">
				<button
					type="submit"
					:disabled="sending || (!!config.captcha && !captchaToken)"
					class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
				>
					<LoaderCircle
						v-if="sending"
						class="h-4 w-4 animate-spin"
						aria-hidden="true"
					/>
					Create organization
				</button>
				<p
					v-if="config.requireApproval"
					class="text-center text-[13px] text-app-text-3"
				>
					New organizations are reviewed before they open.
				</p>
				<p class="text-center text-sm text-app-text-3">
					Have an account?
					<NuxtLink
						to="/auth"
						class="font-medium text-app-accent underline-offset-2 hover:underline"
					>Sign in</NuxtLink>
				</p>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { CircleAlert, LoaderCircle, MailCheck } from 'lucide-vue-next';
import SignupCaptcha from '~/components/signup/SignupCaptcha.vue';
import { signupErrorMessage, validateSignup, type SignupConfig, type SignupForm } from '~/utils/signup';

definePageMeta({ layout: 'auth' });
useHead({ title: 'Sign up' });

const { $api } = useNuxtApp();

/** undefined: loading; null: no signup on this server. */
const config = ref<SignupConfig | null | undefined>(undefined);
const loadError = ref('');
onMounted(async () => {
	try {
		config.value = await $api.signup.config();
	}
	catch (e) {
		loadError.value = `Couldn’t reach the server: ${apiErrorMessage(e)}`;
		config.value = null;
	}
});

const form = reactive<SignupForm>({ email: '', organization: '', password: '', confirm: '' });
const touched = ref(new Set<keyof SignupForm>());
const submitted = ref(false);
const errors = computed(() => validateSignup(form, config.value?.passwordMinLength));
// Errors show for fields left (or all, after a submit), not while typing the first time.
const shown = computed(() => Object.fromEntries(
	(Object.keys(errors.value) as (keyof SignupForm)[]).filter(k => submitted.value || touched.value.has(k)).map(k => [k, errors.value[k]]),
) as Partial<Record<keyof SignupForm, string>>);
const touch = (k: keyof SignupForm) => {
	touched.value = new Set([...touched.value, k]);
};

const captchaRef = ref<InstanceType<typeof SignupCaptcha> | null>(null);
const captchaToken = ref('');
const sending = ref(false);
const error = ref('');
const sentTo = ref('');

const submit = async () => {
	submitted.value = true;
	error.value = '';
	if (Object.keys(errors.value).length || sending.value || !config.value) return;
	if (config.value.captcha && !captchaToken.value) {
		error.value = 'Complete the verification first.';
		return;
	}
	sending.value = true;
	try {
		await $api.signup.request({
			email: form.email.trim(),
			organization: form.organization.trim(),
			password: form.password,
			...(captchaToken.value ? { captcha: captchaToken.value } : {}),
		});
		sentTo.value = form.email.trim();
		form.password = '';
		form.confirm = '';
	}
	catch (e) {
		error.value = signupErrorMessage(httpStatusOf(e), apiErrorTitle(e));
		// The captcha's token was used by this request.
		captchaRef.value?.reset();
	}
	finally {
		sending.value = false;
	}
};

const startOver = () => {
	sentTo.value = '';
	submitted.value = false;
	touched.value = new Set();
	form.email = '';
	captchaToken.value = '';
};

const inputClass = 'h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-[15px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25 sm:text-sm';
</script>
