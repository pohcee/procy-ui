<template>
	<!-- The link mailed to administrators when their organization's deletion was requested. -->
	<SignupLinkResult
		:state="state"
		:title="state === 'error' ? 'This link didn’t work' : 'Deletion canceled'"
		working-text="Canceling the deletion…"
	>
		<template v-if="state === 'error'">
			{{ error }}
		</template>
		<template v-else>
			<span class="font-medium text-app-text">{{ organization || 'Your organization' }}</span> won’t be deleted and is back
			to how it was before the request. You can sign in again.
		</template>
		<template #actions>
			<AppButton to="/auth">
				Go to sign in
			</AppButton>
		</template>
	</SignupLinkResult>
</template>

<script setup lang="ts">
import SignupLinkResult from '~/components/signup/SignupLinkResult.vue';
import { linkErrorMessage } from '~/utils/signup';

definePageMeta({ layout: 'auth' });
// The link's token must not leak to other sites.
useHead({ title: 'Cancel deletion', meta: [{ name: 'referrer', content: 'no-referrer' }] });

const { $api } = useNuxtApp();
const route = useRoute();
const organization = ref('');
const error = ref('');
const done = ref(false);
const state = computed(() => (error.value ? 'error' : done.value ? 'done' : 'working'));

onMounted(async () => {
	const token = typeof route.query.token === 'string' ? route.query.token : '';
	if (!token) {
		error.value = 'This link has no token. Open the link from the email again.';
		return;
	}
	try {
		organization.value = (await $api.signup.cancelDeletion(token)).organization;
		done.value = true;
		history.replaceState(history.state, '', location.pathname);
	}
	catch (e) {
		error.value = linkErrorMessage(httpStatusOf(e), apiErrorTitle(e), 'cancel');
	}
});
</script>
