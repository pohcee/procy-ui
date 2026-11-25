<template>
	<!--
		Confirm the signed-in account's email address (servers with signup): with signup on, only confirmed accounts
		can be invited into further organizations or accept their invitations. The server tells whether it is
		confirmed only when asked to send a link.
	-->
	<AppCard
		:title="compact ? undefined : 'Email address'"
		:class="compact ? 'border-app-blue/30 bg-app-blue-bg/40' : ''"
	>
		<div class="flex flex-col gap-3 text-sm">
			<p
				v-if="result?.verified"
				class="flex items-start gap-2 text-app-ok"
				role="status"
			>
				<CircleCheck
					class="mt-px h-4 w-4 shrink-0"
					aria-hidden="true"
				/>
				<span><span class="font-medium">{{ result.login }}</span> is confirmed.</span>
			</p>
			<p
				v-else-if="result?.sent"
				class="flex items-start gap-2 text-app-text-2"
				role="status"
			>
				<MailCheck
					class="mt-px h-4 w-4 shrink-0 text-app-blue"
					aria-hidden="true"
				/>
				<span>We sent a link to <span class="font-medium text-app-text">{{ result.login }}</span>. Open it while signed in as this account; it works once.</span>
			</p>
			<p
				v-else
				class="text-app-text-2"
			>
				{{ compact
					? 'Joining another organization needs a confirmed email address. Accounts an administrator created start unconfirmed.'
					: 'Invitations into other organizations, and accepting them, need a confirmed email address. Accounts an administrator created start unconfirmed; one you signed up with is confirmed.' }}
			</p>
			<p
				v-if="error"
				role="alert"
				class="rounded-[10px] bg-app-danger-bg p-3 text-app-danger"
			>
				{{ error }}
			</p>
			<div v-if="!result?.verified">
				<AppButton
					:variant="compact ? 'primary' : 'secondary'"
					size="sm"
					:disabled="sending"
					@click="send"
				>
					{{ sending ? 'Sending…' : result?.sent ? 'Send another link' : 'Confirm my email address' }}
				</AppButton>
			</div>
		</div>
	</AppCard>
</template>

<script setup lang="ts">
import { CircleCheck, MailCheck } from 'lucide-vue-next';
import { emailConfirmErrorMessage, type EmailStatus } from '~/utils/signup';

defineProps<{ compact?: boolean }>();

const { $api } = useNuxtApp();
const result = ref<EmailStatus | null>(null);
const error = ref('');
const sending = ref(false);

const send = async () => {
	if (sending.value) return;
	sending.value = true;
	error.value = '';
	try {
		result.value = await $api.account.requestEmailConfirmation();
	}
	catch (e) {
		error.value = emailConfirmErrorMessage(httpStatusOf(e), apiErrorTitle(e), 'send');
	}
	finally {
		sending.value = false;
	}
};
</script>
