<template>
	<!-- Pending invitations with Resend (renews it; no email exists) and Revoke (after a confirmation). -->
	<div>
		<OpEmpty
			v-if="invitations === null || error || !invitations.length"
			:icon="Mail"
			:loading="invitations === null && !error"
			:title="error ? 'Couldn’t load the invitations' : invitations === null ? 'Loading invitations…' : 'No pending invitations'"
			:description="error || (invitations?.length === 0 ? emptyDescription : undefined)"
		/>
		<template v-else>
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full min-w-[720px] border-collapse text-left">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="h in headers"
								:key="h"
								scope="col"
								class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
							>
								{{ h }}
							</th>
							<th
								scope="col"
								class="border-b border-app-border px-3 py-2.5 pr-4"
							>
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="inv in invitations"
							:key="`${inv.organization}/${inv.username}`"
							class="hover:bg-app-hover [&:last-child>td]:border-b-0"
						>
							<td
								v-if="showOrganization"
								class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]"
							>
								<NuxtLink
									:to="orgConsoleLink(inv.organization, 'members')"
									class="block max-w-[220px] truncate font-medium text-app-text hover:text-app-link hover:underline"
								>
									{{ inv.organizationName }}
								</NuxtLink>
								<span class="block truncate font-mono text-xs text-app-text-3">{{ inv.organization }}</span>
							</td>
							<td :class="['max-w-[240px] truncate border-b border-app-border-subtle px-3 py-3 text-[13px] font-medium text-app-text', showOrganization ? '' : 'pl-4']">
								{{ inv.username }}
							</td>
							<td class="border-b border-app-border-subtle px-3 py-3">
								<div class="flex flex-wrap gap-1.5">
									<span
										v-for="g in inv.groups"
										:key="g"
										class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
									>{{ g }}</span>
									<span
										v-if="!inv.groups.length"
										class="text-app-text-4"
									>—</span>
								</div>
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
								{{ invitedByLabel(inv.invitedBy) }}
							</td>
							<td
								class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2"
								:title="dateTime(inv.createdAt)"
							>
								{{ timeAgo(inv.createdAt) }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle py-2 pl-3 pr-4 text-right">
								<div class="inline-flex gap-2">
									<AppButton
										variant="secondary"
										size="sm"
										:disabled="busy === key(inv)"
										:aria-label="`Resend the invitation of ${inv.username} to ${inv.organizationName}`"
										@click="resend(inv)"
									>
										Resend
									</AppButton>
									<AppButton
										variant="danger"
										size="sm"
										:disabled="busy === key(inv)"
										:aria-label="`Revoke the invitation of ${inv.username} to ${inv.organizationName}`"
										@click="revoking = inv"
									>
										Revoke
									</AppButton>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<ul class="divide-y divide-app-border-subtle md:hidden">
				<li
					v-for="inv in invitations"
					:key="`${inv.organization}/${inv.username}`"
					class="px-4 py-3"
				>
					<p class="truncate text-[15px] font-medium text-app-text">
						{{ inv.username }}
					</p>
					<p
						v-if="showOrganization"
						class="mt-0.5 truncate text-[13px]"
					>
						<NuxtLink
							:to="orgConsoleLink(inv.organization, 'members')"
							class="text-app-link hover:underline"
						>
							{{ inv.organizationName }}
						</NuxtLink>
					</p>
					<p class="mt-1 text-xs text-app-text-3">
						{{ [inv.groups.join(', '), `by ${invitedByLabel(inv.invitedBy)}`, timeAgo(inv.createdAt)].filter(Boolean).join(' · ') }}
					</p>
					<div class="mt-2 flex gap-2">
						<AppButton
							variant="secondary"
							size="sm"
							:disabled="busy === key(inv)"
							@click="resend(inv)"
						>
							Resend
						</AppButton>
						<AppButton
							variant="danger"
							size="sm"
							:disabled="busy === key(inv)"
							@click="revoking = inv"
						>
							Revoke
						</AppButton>
					</div>
				</li>
			</ul>
		</template>

		<Modal
			:model-value="revoking !== null"
			title="Revoke the invitation?"
			ok-text="Revoke"
			cancel-text="Cancel"
			:show-cancel="true"
			@update:model-value="!$event && (revoking = null)"
			@ok="revoke"
		>
			<p class="text-sm text-app-text-2">
				{{ revoking?.username }} will no longer see the invitation to {{ revoking?.organizationName }}. You can invite them again later.
			</p>
		</Modal>
	</div>
</template>

<script setup lang="ts">
import { Mail } from 'lucide-vue-next';
import Modal from '~/components/Modal.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import { dateTime, invitedByLabel, orgConsoleLink, timeAgo, type ConsoleInvitation } from '~/utils/operatorConsole';

const props = withDefaults(defineProps<{
	/** null: loading. */
	invitations: ConsoleInvitation[] | null;
	error?: string | null;
	showOrganization?: boolean;
	emptyDescription?: string;
}>(), { error: null, showOrganization: true, emptyDescription: undefined });
const emit = defineEmits<{ (e: 'changed'): void }>();

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const headers = computed(() => [...(props.showOrganization ? ['Organization'] : []), 'Login', 'Groups', 'Invited by', 'Sent']);
const key = (inv: ConsoleInvitation) => `${inv.organization}/${inv.username}`;
const busy = ref<string | null>(null);
const revoking = ref<ConsoleInvitation | null>(null);

const resend = async (inv: ConsoleInvitation) => {
	busy.value = key(inv);
	try {
		await $api.operator.resendInvitation(inv.organization, inv.username);
		snackbar.add({ type: 'success', text: `Renewed the invitation of ${inv.username}; it's at the top of their list (no email is sent).` });
		emit('changed');
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't renew the invitation: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};

const revoke = async () => {
	const inv = revoking.value;
	revoking.value = null;
	if (!inv) return;
	busy.value = key(inv);
	try {
		await $api.operator.revokeInvitation(inv.organization, inv.username);
		snackbar.add({ type: 'success', text: `Revoked the invitation of ${inv.username}` });
		emit('changed');
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't revoke the invitation: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};
</script>
