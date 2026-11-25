<template>
	<new-page-wrapper>
		<AppPage
			title="Invitations"
			description="Pending invitations of existing accounts into organizations, newest first. Invitations have no email: the invitee sees them in the app after signing in. Resend renews one (it moves to the top of their list)."
		>
			<template #actions>
				<AppButton
					variant="secondary"
					:disabled="pending"
					aria-label="Reload invitations"
					@click="load"
				>
					<RefreshCw
						:class="['h-4 w-4', pending ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
			</template>
			<AppCard
				flush
				:title="invitations ? `${invitations.length} pending` : 'Pending'"
			>
				<InvitationList
					:invitations="invitations"
					:error="error"
					empty-description="Invitations show here until the invitee accepts or declines them, or an operator revokes them."
					@changed="load"
				/>
			</AppCard>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import InvitationList from '~/components/operator/console/InvitationList.vue';
import type { ConsoleInvitation } from '~/utils/operatorConsole';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Invitations' });

const { $api } = useNuxtApp();
const invitations = ref<ConsoleInvitation[] | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);

const load = async () => {
	pending.value = true;
	error.value = null;
	try {
		invitations.value = await $api.operator.invitations();
	}
	catch (e) {
		error.value = apiErrorMessage(e);
	}
	finally {
		pending.value = false;
	}
};
onMounted(load);
</script>
