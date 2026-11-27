<!--
	The end of a Google sign-in: the server's callback sends the browser here with a one-time sign-in code
	(#code=…&return_to=…) or the reason it failed (#error=…&error_description=…).
-->
<template>
	<LoginOrgPicker
		v-if="orgChoices"
		:organizations="orgChoices"
		:loading="loading"
		:errors="errors"
		@pick="pickOrg"
		@cancel="backToSignIn"
	/>
	<SignupLinkResult
		v-else
		:state="failure ? 'error' : 'working'"
		title="Google sign-in didn’t work"
		working-text="Signing you in…"
	>
		{{ failure }}
		<template #actions>
			<AppButton to="/auth">
				Back to sign in
			</AppButton>
		</template>
	</SignupLinkResult>
</template>

<script setup lang="ts">
import LoginOrgPicker from '~/components/LoginOrgPicker.vue';
import SignupLinkResult from '~/components/signup/SignupLinkResult.vue';
import { lifetimeParam, OIDC_LIFETIME_KEY, oidcErrorMessage, parseOidcFragment } from '~/utils/oidc';

definePageMeta({ layout: 'auth' });
// The sign-in code is in the fragment (never sent to a server); still, no referrer for the pages linked from here.
useHead({ title: 'Signing in', meta: [{ name: 'referrer', content: 'no-referrer' }] });

const store = useTokenStore();
const { orgChoices, loading, errors } = storeToRefs(store);
const router = useRouter();

const failure = ref('');
let code = '';
let returnTo = '/dashboard';
let lifetime: string | null = null;

// The "remember me" choice of the sign-in page, kept in this tab across the round trip to Google.
const takeLifetime = (): string | null => {
	try {
		const value = sessionStorage.getItem(OIDC_LIFETIME_KEY);
		sessionStorage.removeItem(OIDC_LIFETIME_KEY);
		return lifetimeParam(value);
	}
	catch {
		return null;
	}
};

const exchange = async (organization?: string) => {
	const ok = await store.exchangeOidcCode(code, organization, lifetime);
	if (ok) {
		await router.replace(returnTo);
		return;
	}
	// Several organizations: the picker shows (and shows a refused pick's error itself).
	if (!store.orgChoices) failure.value = errors.value[0] || 'The Google sign-in failed. Please try again.';
};

const pickOrg = (organization: string) => exchange(organization);

const backToSignIn = async () => {
	store.cancelOrgChoice();
	await router.replace('/auth');
};

onMounted(async () => {
	const fragment = parseOidcFragment(window.location.hash);
	// The one-time code must not stay in the address bar or the history.
	history.replaceState(history.state, '', `${location.pathname}${location.search}`);
	store.cancelOrgChoice();
	if (fragment.kind === 'error') {
		failure.value = oidcErrorMessage(fragment.reason, fragment.description);
		return;
	}
	if (fragment.kind === 'none') {
		failure.value = 'This page finishes a Google sign-in, but no sign-in code came with it. Please sign in again.';
		return;
	}
	code = fragment.code;
	returnTo = fragment.returnTo;
	lifetime = takeLifetime();
	await exchange();
});
</script>
