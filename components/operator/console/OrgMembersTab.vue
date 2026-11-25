<template>
	<!-- Members of one organization (how they sign in, 2FA, last sign-in) and its pending invitations. -->
	<div class="flex flex-col gap-5">
		<AppCard
			flush
			title="Members"
			:description="members?.length ? `${formatCount(members.length)} ${members.length === 1 ? 'login' : 'logins'}. An account in several organizations has the same password and 2FA in each.` : undefined"
		>
			<template
				v-if="org.status !== 'suspended'"
				#actions
			>
				<AppButton
					variant="secondary"
					size="sm"
					@click="emit('admin')"
				>
					<UserPlus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Add administrator
				</AppButton>
			</template>
			<OpEmpty
				v-if="members === null || error || !members.length"
				:icon="UsersIcon"
				:loading="members === null && !error"
				:title="error ? 'Couldn’t load the members' : members === null ? 'Loading members…' : 'No members yet'"
				:description="error || (members?.length === 0 ? 'Add an administrator to let someone sign in.' : undefined)"
			/>
			<template v-else>
				<div class="hidden overflow-x-auto md:block">
					<table class="w-full min-w-[820px] border-collapse text-left">
						<thead>
							<tr class="bg-app-surface-2">
								<th
									v-for="h in ['Login', 'Groups', 'Sign-in', '2FA', 'Google linked', 'Last sign-in', 'Organizations']"
									:key="h"
									scope="col"
									class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
								>
									{{ h }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="m in members"
								:key="m.username"
								class="hover:bg-app-hover [&:last-child>td]:border-b-0"
							>
								<td class="max-w-[240px] truncate border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px] font-medium text-app-text">
									{{ m.username }}
								</td>
								<td class="border-b border-app-border-subtle px-3 py-3">
									<div class="flex flex-wrap gap-1.5">
										<span
											v-for="g in m.groups"
											:key="g"
											class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
										>{{ g }}</span>
										<span
											v-if="!m.groups.length"
											class="text-app-text-4"
										>—</span>
									</div>
								</td>
								<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
									{{ signInMethodLabel(m, org.require_oidc === true) || '—' }}
								</td>
								<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px]">
									<YesNo :value="m.twoFa" />
								</td>
								<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px]">
									<YesNo :value="m.oidcLinked" />
								</td>
								<td
									class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2"
									:title="m.lastLoginAt ? dateTime(m.lastLoginAt) : 'Not recorded: sign-ins are recorded from this release on'"
								>
									{{ m.lastLoginAt ? timeAgo(m.lastLoginAt) : 'Not recorded' }}
								</td>
								<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3">
									<span
										v-if="m.organizations > 1"
										class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
									>{{ m.organizations }} organizations</span>
									<span
										v-else
										class="text-[13px] text-app-text-3"
									>Only this one</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="m in members"
						:key="m.username"
						class="px-4 py-3"
					>
						<p class="truncate text-[15px] font-medium text-app-text">
							{{ m.username }}
						</p>
						<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
							<span
								v-for="g in m.groups"
								:key="g"
								class="inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
							>{{ g }}</span>
						</div>
						<p class="mt-1.5 text-xs text-app-text-3">
							{{ [signInMethodLabel(m, org.require_oidc === true), m.twoFa === true ? '2FA on' : m.twoFa === false ? 'no 2FA' : '', m.oidcLinked ? 'Google linked' : ''].filter(Boolean).join(' · ') }}
						</p>
						<p class="mt-0.5 text-xs text-app-text-3">
							Last sign-in: {{ m.lastLoginAt ? timeAgo(m.lastLoginAt) : 'not recorded' }}{{ m.organizations > 1 ? ` · ${m.organizations} organizations` : '' }}
						</p>
					</li>
				</ul>
				<p class="border-t border-app-border-subtle px-4 py-2.5 text-xs text-app-text-3">
					Sign-ins are recorded from this release on; “Not recorded” means none since.
				</p>
			</template>
		</AppCard>

		<AppCard
			flush
			title="Pending invitations"
			description="Invitations have no email: the invitee sees them in the app after signing in. Resend renews an invitation (it moves to the top of their list); no email is sent."
		>
			<InvitationList
				:invitations="invitations"
				:error="invitationsError"
				:show-organization="false"
				empty-description="Invitations of existing accounts to this organization show here until they are accepted."
				@changed="loadInvitations"
			/>
		</AppCard>
	</div>
</template>

<script setup lang="ts">
import { UserPlus, Users as UsersIcon } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import InvitationList from '~/components/operator/console/InvitationList.vue';
import YesNo from '~/components/operator/console/YesNo.vue';
import type { Organization } from '~/repository/modules/operator';
import { dateTime, signInMethodLabel, timeAgo, type ConsoleInvitation, type ConsoleMember } from '~/utils/operatorConsole';
import { formatCount } from '~/utils/usage';

const props = defineProps<{ org: Organization; refreshKey?: number }>();
const emit = defineEmits<{ (e: 'admin'): void }>();
const { $api } = useNuxtApp();

/** null: loading. */
const members = ref<ConsoleMember[] | null>(null);
const error = ref<string | null>(null);
const invitations = ref<ConsoleInvitation[] | null>(null);
const invitationsError = ref<string | null>(null);

let seq = 0;
const loadMembers = async () => {
	const mine = ++seq;
	error.value = null;
	try {
		const list = await $api.operator.consoleMembers(props.org.id);
		if (mine === seq) members.value = list;
	}
	catch (e) {
		if (mine === seq) error.value = httpStatusOf(e) === 404 ? 'This server lists no members (no membership API).' : apiErrorMessage(e);
	}
};

let invSeq = 0;
const loadInvitations = async () => {
	const mine = ++invSeq;
	invitationsError.value = null;
	try {
		const list = await $api.operator.invitations(props.org.id);
		if (mine === invSeq) invitations.value = list.filter(i => i.organization === props.org.id);
	}
	catch (e) {
		if (mine === invSeq) invitationsError.value = apiErrorMessage(e);
	}
};

watch(() => props.org.id, () => {
	members.value = null;
	invitations.value = null;
	loadMembers();
	loadInvitations();
}, { immediate: true });
// A new administrator was added on the page.
watch(() => props.refreshKey, loadMembers);
</script>
