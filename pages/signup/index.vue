<template>
	<div class="flex w-full flex-col gap-4">
		<PreviewNotice compact />
		<div class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-xs sm:p-8">
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
						address. Open it to choose your password and create
						<span class="font-medium text-app-text">{{ form.organization.trim() }}</span>. The link works once and expires
						in a day.
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
				@submit.prevent="config.emailSignup ? submit() : continueWithGoogle()"
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
							for="signup-org"
							class="text-[13px] font-medium text-app-text-2"
						>Organization name</label>
						<input
							id="signup-org"
							ref="orgInput"
							v-model="form.organization"
							type="text"
							autocomplete="organization"
							maxlength="200"
							:class="[inputClass, shown.organization ? '!border-app-danger' : '']"
							:aria-invalid="!!shown.organization || undefined"
							:aria-describedby="shown.organization ? 'signup-org-error' : undefined"
							@blur="touch('organization')"
						>
						<span
							v-if="shown.organization"
							id="signup-org-error"
							class="text-[13px] text-app-danger"
						>{{ shown.organization }}</span>
					</div>

					<!-- "Continue with Google" ([oidc] on): a full-page navigation to the server, which sends the browser to Google. -->
					<template v-if="config.googleSignup">
						<div class="flex flex-col gap-1.5">
							<button
								type="button"
								class="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-app-border-strong bg-app-surface px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
								:disabled="leaving"
								aria-describedby="signup-google-help"
								@click="continueWithGoogle"
							>
								<LoaderCircle
									v-if="leaving"
									class="h-4 w-4 animate-spin"
									aria-hidden="true"
								/>
								<GoogleLogo v-else />
								{{ config.googleButtonLabel }}
							</button>
							<span
								id="signup-google-help"
								class="text-[13px] text-app-text-3"
							>Google confirms your email address, so no link is mailed.</span>
						</div>
						<div
							v-if="config.emailSignup"
							class="flex items-center gap-3 text-xs font-medium text-app-text-4"
							aria-hidden="true"
						>
							<span class="h-px flex-1 bg-app-border" />
							or use your email address
							<span class="h-px flex-1 bg-app-border" />
						</div>
					</template>

					<div
						v-if="config.emailSignup"
						class="flex flex-col gap-1.5"
					>
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
							id="signup-email-help"
							class="text-[13px] text-app-danger"
						>{{ shown.email }}</span>
						<span
							v-else
							id="signup-email-help"
							class="text-[13px] text-app-text-3"
						>It becomes your login. We email it a link to confirm the address and choose a password.</span>
					</div>
					<SignupCaptcha
						v-if="config.captcha && config.emailSignup"
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
						v-if="config.emailSignup"
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
						New organizations are reviewed by a person before they open. We email you when yours is ready.
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
		<p class="text-center text-sm">
			<NuxtLink
				to="/"
				class="inline-flex items-center gap-1.5 rounded text-app-text-3 underline-offset-2 hover:text-app-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
			>
				<ArrowLeft
					class="h-4 w-4"
					aria-hidden="true"
				/>Back to home
			</NuxtLink>
		</p>
	</div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { ArrowLeft, CircleAlert, LoaderCircle, MailCheck } from 'lucide-vue-next';
import GoogleLogo from '~/components/GoogleLogo.vue';
import PreviewNotice from '~/components/PreviewNotice.vue';
import SignupCaptcha from '~/components/signup/SignupCaptcha.vue';
import { apiBaseUrl } from '~/utils/apiBase';
import { googleSignupHref } from '~/utils/oidc';
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

const form = reactive<SignupForm>({ email: '', organization: '' });
const touched = ref(new Set<keyof SignupForm>());
const submitted = ref(false);
const errors = computed(() => validateSignup(form));
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
			...(captchaToken.value ? { captcha: captchaToken.value } : {}),
		});
		sentTo.value = form.email.trim();
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

// "Continue with Google" needs only the organization name; Google proves the email address.
const runtimeConfig = useRuntimeConfig();
const orgInput = ref<HTMLInputElement | null>(null);
const leaving = ref(false);
const continueWithGoogle = () => {
	touch('organization');
	error.value = '';
	if (errors.value.organization || !config.value?.googleSignup) {
		orgInput.value?.focus();
		return;
	}
	leaving.value = true;
	window.location.assign(googleSignupHref(apiBaseUrl(runtimeConfig.public.apiUrl), config.value.googleSignupUrl, form.organization));
};

// Back from Google with the browser's back button (page cache): the button works again.
useEventListener('pageshow', () => {
	leaving.value = false;
});

const inputClass = 'h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-[15px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/25 sm:text-sm';
</script>
