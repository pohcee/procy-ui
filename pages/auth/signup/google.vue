<template>
	<!--
		The end of a Google signup: the server's callback sends the browser here with #status=awaiting_approval|completed
		(and the organization's name and the email) or #error=…&error_description=….
	-->
	<div class="flex w-full flex-col gap-4">
		<PreviewNotice
			v-if="outcome.kind === 'awaiting_approval'"
			compact
		/>
		<SignupLinkResult
			:state="state"
			:title="title"
			working-text="Finishing your signup…"
		>
			<template v-if="outcome.kind === 'awaiting_approval'">
				Thanks! We’ll review
				<span class="font-medium text-app-text">{{ outcome.organizationName || 'your organization' }}</span> and email
				<span class="font-medium text-app-text">{{ outcome.email || 'you' }}</span> when it’s ready. Google already
				confirmed the address, so there is no link to open.
			</template>
			<template v-else-if="outcome.kind === 'completed'">
				<span class="font-medium text-app-text">{{ outcome.organizationName || 'Your organization' }}</span> is ready.
				Sign in with the same Google account<template v-if="outcome.email">
					(<span class="font-medium text-app-text">{{ outcome.email }}</span>)
				</template>
				to start adding devices.
			</template>
			<template v-else-if="outcome.kind === 'error'">
				{{ googleSignupErrorMessage(outcome.reason, outcome.description) }}
			</template>
			<template v-else>
				This page finishes a signup with Google, but no result came with it. Start the signup again.
			</template>

			<template #actions>
				<template v-if="outcome.kind === 'completed'">
					<a
						:href="loginHref"
						class="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-app-border-strong bg-app-surface px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
					>
						<GoogleLogo />Sign in with Google
					</a>
					<AppButton
						to="/auth"
						variant="ghost"
					>
						Go to sign in
					</AppButton>
				</template>
				<template v-else-if="outcome.kind === 'awaiting_approval'">
					<AppButton
						to="/"
						variant="secondary"
					>
						Back to home
					</AppButton>
				</template>
				<template v-else-if="outcome.kind === 'error' && outcome.reason === 'account_exists'">
					<AppButton to="/auth">
						Go to sign in
					</AppButton>
					<AppButton
						to="/signup"
						variant="ghost"
					>
						Back to signup
					</AppButton>
				</template>
				<AppButton
					v-else-if="outcome.kind !== 'pending'"
					to="/signup"
				>
					Back to signup
				</AppButton>
			</template>
		</SignupLinkResult>
	</div>
</template>

<script setup lang="ts">
import GoogleLogo from '~/components/GoogleLogo.vue';
import PreviewNotice from '~/components/PreviewNotice.vue';
import SignupLinkResult from '~/components/signup/SignupLinkResult.vue';
import { apiBaseUrl } from '~/utils/apiBase';
import { DEFAULT_OIDC_LOGIN_URL, googleSignupErrorMessage, oidcLoginHref, parseGoogleSignupFragment, type GoogleSignupFragment } from '~/utils/oidc';

definePageMeta({ layout: 'auth' });
// The fragment names the email address: no referrer for the pages linked from here.
useHead({ title: 'Sign up with Google', meta: [{ name: 'referrer', content: 'no-referrer' }] });

const runtimeConfig = useRuntimeConfig();

/** pending: before the fragment is read (the page is prerendered, the fragment exists only in the browser). */
const outcome = ref<GoogleSignupFragment | { kind: 'pending' }>({ kind: 'pending' });

onMounted(() => {
	outcome.value = parseGoogleSignupFragment(window.location.hash);
	// Keep the email address out of the address bar and the history.
	history.replaceState(history.state, '', `${location.pathname}${location.search}`);
});

const state = computed(() => {
	switch (outcome.value.kind) {
		case 'pending': return 'working';
		case 'awaiting_approval': return 'waiting';
		case 'completed': return 'done';
		default: return 'error';
	}
});

const title = computed(() => {
	switch (outcome.value.kind) {
		case 'awaiting_approval': return 'Thanks for signing up';
		case 'completed': return 'Your organization is ready';
		case 'error': return outcome.value.reason === 'account_exists' ? 'You already have an account' : 'Google signup didn’t work';
		default: return 'Google signup didn’t finish';
	}
});

// The normal Google sign-in (the server's default login URL), landing on the dashboard.
const loginHref = computed(() => oidcLoginHref(apiBaseUrl(runtimeConfig.public.apiUrl), DEFAULT_OIDC_LOGIN_URL, '/dashboard'));
</script>
