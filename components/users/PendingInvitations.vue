<template>
	<!-- The organization's invitations of existing accounts that haven't been accepted yet. -->
	<AppCard
		v-if="list === null || list.length || loadError"
		flush
		title="Pending invitations"
		description="Accounts invited from here that haven't accepted yet. They become members when they accept."
	>
		<p
			v-if="loadError"
			class="px-4 py-6 text-sm text-app-danger"
			role="alert"
		>
			{{ loadError }}
		</p>
		<p
			v-else-if="list === null"
			class="px-4 py-6 text-center text-sm text-app-text-3"
		>
			Loading invitations…
		</p>
		<ul
			v-else
			class="divide-y divide-app-border-subtle"
		>
			<li
				v-for="inv in list"
				:key="inv.username"
				class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
			>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-app-text">
						{{ inv.username }}
					</p>
					<p class="mt-0.5 text-[13px] text-app-text-3">
						{{ invitedLine(inv) }}
					</p>
				</div>
				<div class="flex flex-wrap gap-1.5">
					<span
						v-for="group in inv.groups"
						:key="group"
						class="st-chip"
					>{{ group }}</span>
				</div>
				<AppButton
					variant="secondary"
					size="sm"
					@click="withdrawing = inv"
				>
					Withdraw
				</AppButton>
			</li>
		</ul>
		<Modal
			:model-value="!!withdrawing"
			title="Withdraw the invitation?"
			ok-text="Withdraw"
			cancel-text="Cancel"
			:show-cancel="true"
			@update:model-value="!$event && (withdrawing = null)"
			@ok="withdraw"
		>
			<p class="text-sm text-app-text-2">
				<span class="font-semibold text-app-text">{{ withdrawing?.username }}</span> will no longer see the invitation.
				You can invite them again later.
			</p>
		</Modal>
	</AppCard>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue';
import type { PendingInvitation } from '~/utils/membership';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

/** null: loading. */
const list = ref<PendingInvitation[] | null>(null);
const loadError = ref<string | null>(null);
const withdrawing = ref<PendingInvitation | null>(null);

const load = async () => {
	loadError.value = null;
	try {
		list.value = (await $api.membership.pendingInvitations()) ?? [];
	}
	catch (e) {
		list.value = [];
		loadError.value = `Couldn't load the pending invitations: ${apiErrorMessage(e)}`;
	}
};
onMounted(load);

const withdraw = async () => {
	const inv = withdrawing.value;
	withdrawing.value = null;
	if (!inv) return;
	try {
		await $api.membership.withdraw(inv.username);
		list.value = list.value?.filter(i => i.username !== inv.username) ?? [];
		snackbar.add({ type: 'success', text: `Withdrew the invitation of ${inv.username}` });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't withdraw the invitation: ${apiErrorMessage(e)}` });
		await load();
	}
};

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const formatDate = (value: string) => {
	if (!value) return '';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
};
/** "Invited by x on <date>", with whichever parts are known. */
const invitedLine = (inv: { invitedBy: string; createdAt: string }) => {
	const date = formatDate(inv.createdAt);
	if (inv.invitedBy) return `Invited by ${inv.invitedBy}${date ? ` on ${date}` : ''}`;
	return date ? `Invited ${date}` : '';
};

defineExpose({ reload: load });
</script>
