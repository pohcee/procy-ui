<template>
	<SettingsLayout
		heading="Users"
		:description="organizations
			? 'Members of this organization, and the groups that grant their permissions here.'
			: 'People who can sign in to this server, and the groups that grant their permissions.'"
	>
		<template #actions>
			<AppButton
				v-if="organizations"
				@click="inviteOpen = true"
			>
				<UserPlus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Invite member
			</AppButton>
			<AppButton
				v-else
				@click="openAddUserModal"
			>
				<Plus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add user
			</AppButton>
		</template>

		<!-- Accounts can belong to several organizations: say what can and can't be changed here. -->
		<div
			v-if="organizations"
			class="flex items-start gap-2.5 rounded-xl border border-app-border bg-app-surface px-4 py-3 text-[13px] text-app-text-2"
		>
			<Info
				class="mt-px h-4 w-4 shrink-0 text-app-text-3"
				aria-hidden="true"
			/>
			<span>
				An account can be a member of several organizations. For a member who also belongs to another one, only its
				owner changes the password, two-factor settings and login name; here you change its groups or remove it from
				this organization.
			</span>
		</div>

		<AppCard flush>
			<div
				v-if="pending && !users"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading users…
			</div>
			<div
				v-else-if="error && !users"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
				role="status"
			>
				<CircleAlert
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					User management isn’t available
				</p>
				<p class="max-w-md text-[13px] text-app-text-3">
					{{ apiErrorText(error) }}
				</p>
			</div>
			<div
				v-else-if="!users?.length"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<UsersIcon
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					No users yet
				</p>
				<p class="text-[13px] text-app-text-3">
					Add a user to let someone sign in.
				</p>
			</div>
			<template v-else>
				<!-- Desktop / tablet: table -->
				<table class="st-table hidden md:table">
					<thead>
						<tr>
							<th scope="col">
								User
							</th>
							<th scope="col">
								Groups
							</th>
							<th
								v-if="signInSupported"
								scope="col"
							>
								Sign-in
							</th>
							<th
								scope="col"
								class="w-14"
							>
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="user in users"
							:key="user.username"
						>
							<td>
								<div class="flex items-center gap-3">
									<span
										aria-hidden="true"
										class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-chip text-xs font-semibold uppercase text-app-text-2"
									>{{ user.username.slice(0, 2) }}</span>
									<span class="font-medium">{{ user.username }}</span>
									<span
										v-if="sharedLogins.has(user.username)"
										class="st-chip"
										title="Also a member of other organizations: only its owner changes its password, 2FA and login name."
									>Also in other organizations</span>
								</div>
							</td>
							<td>
								<div class="flex flex-wrap gap-1.5">
									<span
										v-for="group in user.groups"
										:key="group"
										class="st-chip"
									>{{ group }}</span>
									<span
										v-if="!user.groups?.length"
										class="text-app-text-4"
									>—</span>
								</div>
							</td>
							<td v-if="signInSupported">
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="text-[13px] text-app-text-2">{{ userSignInLabel(user) }}</span>
									<span
										v-if="user.oidc_linked"
										class="st-chip"
										title="A Google account is linked to this login."
									>Google linked</span>
								</div>
							</td>
							<td class="text-right">
								<SettingsRowActions
									:items="rowActions(user)"
									:label="`Actions for ${user.username}`"
								/>
							</td>
						</tr>
					</tbody>
				</table>

				<!-- Phone: cards -->
				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="user in users"
						:key="user.username"
						class="flex items-start gap-3 px-4 py-3"
					>
						<span
							aria-hidden="true"
							class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-chip text-xs font-semibold uppercase text-app-text-2"
						>{{ user.username.slice(0, 2) }}</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-[15px] font-medium text-app-text">
								{{ user.username }}
							</p>
							<p
								v-if="sharedLogins.has(user.username)"
								class="text-[13px] text-app-text-3"
							>
								Also in other organizations
							</p>
							<p
								v-if="signInSupported"
								class="flex flex-wrap items-center gap-1.5 text-[13px] text-app-text-3"
							>
								{{ userSignInLabel(user) }}
								<span
									v-if="user.oidc_linked"
									class="st-chip"
								>Google linked</span>
							</p>
							<div class="mt-1.5 flex flex-wrap gap-1.5">
								<span
									v-for="group in user.groups"
									:key="group"
									class="st-chip"
								>{{ group }}</span>
								<span
									v-if="!user.groups?.length"
									class="text-[13px] text-app-text-4"
								>No groups</span>
							</div>
						</div>
						<SettingsRowActions
							:items="rowActions(user)"
							:label="`Actions for ${user.username}`"
						/>
					</li>
				</ul>

				<SettingsPagination
					:page="0"
					:current-page-item-count="users.length"
					:total-items="users.length"
				/>
			</template>
		</AppCard>

		<PendingInvitations
			v-if="organizations"
			ref="pendingRef"
		/>

		<AddUser
			ref="addUserModal"
			:groups="userGroups ?? []"
			:sign-in-supported="signInSupported"
			:system-org="systemOrg"
			:org-requires-oidc="orgSignIn?.requireOidc ?? false"
			:oidc-enabled="oidcEnabled"
			:account-note="organizations ? 'For a member who also belongs to other organizations, only its owner can change the password or login name: change its groups here.' : undefined"
			@save="handleUserSave"
		/>
		<InviteMemberDialog
			v-if="organizations"
			v-model="inviteOpen"
			:groups="userGroups ?? []"
			@invited="onInvited"
		/>
		<Modal
			v-model="delConfirm"
			:title="organizations ? 'Remove from the organization?' : 'Delete user?'"
			:ok-text="organizations ? 'Remove' : 'Delete'"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="activeUser && deleteUser(activeUser.username)"
		>
			<p
				v-if="organizations"
				class="text-sm text-app-text-2"
			>
				Remove <span class="font-semibold text-app-text">{{ activeUser?.username }}</span> from this organization?
				They can no longer sign in to it. If the account belongs to other organizations, it stays a member there.
			</p>
			<p
				v-else
				class="text-sm text-app-text-2"
			>
				Do you want to delete the user <span class="font-semibold text-app-text">{{ activeUser?.username }}</span>?
				They will no longer be able to sign in.
			</p>
		</Modal>
		<ManageSessionModal
			ref="manageSessionModal"
			:username="activeUser?.username"
			:user-sessions="userSessions"
			@sessions-changed="refreshSessions"
		/>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { CircleAlert, Info, Pencil, Copy, Laptop, Link2Off, Plus, Trash2, UserMinus, UserPlus, Users as UsersIcon } from 'lucide-vue-next';
import { useClipboard } from '@vueuse/core';
import AddUser from '@/components/users/AddUser.vue';
import InviteMemberDialog from '~/components/users/InviteMemberDialog.vue';
import PendingInvitations from '~/components/users/PendingInvitations.vue';
import { isSharedAccountRefusal, type InviteOutcome } from '~/utils/membership';
import { isSystemOrg, parseSignIn, signInLabel } from '~/utils/oidc';
import type { User, UserPayload, UserSession } from '~/types';
import Modal from '~/components/Modal.vue';
import ManageSessionModal from '~/components/users/ManageSessionModal.vue';

const { copy } = useClipboard();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
// Postgres servers: accounts may belong to several organizations (members, invitations).
const { organizations, operator } = useCapabilities();
const statusStore = useStatusStore();
const { current } = useMembership();
const inviteOpen = ref(false);
const pendingRef = ref<InstanceType<typeof PendingInvitations> | null>(null);
// Members the server said belong to other organizations too (learned from a refused change).
const sharedLogins = ref(new Set<string>());

const onInvited = async (outcome: InviteOutcome) => {
	if (outcome.kind === 'new-account') await refresh();
	else await pendingRef.value?.reload();
};

const { data: users, refresh, pending, error } = useLazyAsyncData('users', () => $api.users.getAll());
const { data: userGroups } = useLazyAsyncData(('user-groups'), () => $api.userGroups.all());

// Sign-in methods (Postgres servers): each user's `sign_in` and linked Google account; standalone servers omit them.
const signInSupported = computed(() => !!users.value?.some(u => parseSignIn(u.sign_in) !== null));
const userSignInLabel = (user: User) => signInLabel(user.sign_in) || '—';
// The operators' organization signs in with Google only: no passwords there.
const systemOrg = computed(() => isSystemOrg(current.value?.id, operator.value));
// Whether the organization requires Google sign-in (null: no such setting on this server).
const { data: orgSignIn } = useLazyAsyncData('organization-sign-in', () => $api.account.orgSignIn().catch(() => null));
const oidcEnabled = computed(() => orgSignIn.value?.oidcEnabled ?? statusStore.status?.oidc_enabled !== false);

const delConfirm = ref(false);
const activeUser = ref<User | null>(null);
const userSessions = ref<UserSession[]>([]);

const addUserModal = ref<InstanceType<typeof AddUser> | null>(null);
const manageSessionModal = ref<InstanceType<typeof ManageSessionModal> | null>(null);

const openAddUserModal = () => {
	addUserModal.value?.open();
};

const fetchSessionsForActiveUser = async () => {
	if (!activeUser.value?.username) return;
	const sessions = await $api.users.getSessions(activeUser.value.username);
	userSessions.value = sessions.data as UserSession[];
};

const openManageSessionModal = async (active: User) => {
	activeUser.value = active;
	try {
		await fetchSessionsForActiveUser();
		manageSessionModal.value?.open();
	}
	catch {
		snackbar.add({
			type: 'error',
			text: 'Failed to fetch user sessions',
		});
	}
};

const refreshSessions = async () => {
	try {
		await fetchSessionsForActiveUser();
	}
	catch {
		snackbar.add({
			type: 'error',
			text: 'Failed to refresh user sessions',
		});
	}
};
const handleUserSave = async (data: UserPayload & { originalUsername?: string; action?: 'create' | 'edit' }) => {
	const { originalUsername, action, ...payload } = data;
	try {
		if (action === 'edit' && originalUsername) {
			const updatePayload: Partial<UserPayload> = { username: payload.username, groups: payload.groups };
			if (payload.sign_in) updatePayload.sign_in = payload.sign_in;
			if (payload.password) {
				updatePayload.password = payload.password;
			}
			await $api.users.update(updatePayload, originalUsername);
			snackbar.add({ type: 'success', text: 'User updated successfully' });
		}
		else {
			await $api.users.create(payload);
			snackbar.add({ type: 'success', text: 'User created successfully' });
		}
		await refresh();
	}
	catch (e) {
		const message = apiErrorTitle(e);
		if (action === 'edit' && originalUsername && isSharedAccountRefusal(httpStatusOf(e), message)) {
			sharedLogins.value = new Set([...sharedLogins.value, originalUsername]);
			snackbar.add({
				type: 'error',
				text: `${originalUsername} also belongs to other organizations: only they can change their password or login name. Change only the groups here.`,
			});
			return;
		}
		snackbar.add({
			type: 'error',
			text: `${action === 'edit' ? 'Failed to update user' : 'Failed to create user'}${message ? `: ${message}` : ''}`,
		});
	}
};

const triggerDelete = (user: User) => {
	activeUser.value = user;
	delConfirm.value = true;
};
const deleteUser = async (activeUsername: string) => {
	try {
		delConfirm.value = false;
		await $api.users.delete(activeUsername);
		await refresh();
		snackbar.add({
			type: 'success',
			text: organizations.value ? `Removed ${activeUsername} from the organization` : 'User deleted successfully',
		});
	}
	catch (e) {
		const message = apiErrorTitle(e);
		snackbar.add({
			type: 'error',
			text: organizations.value ? `Couldn't remove ${activeUsername}${message ? `: ${message}` : ''}` : 'Something went wrong user not deleted',
		});
	}
};

const unlinkGoogle = async (user: User) => {
	try {
		await $api.users.unlinkOidc(user.username);
		snackbar.add({ type: 'success', text: `Unlinked the Google account of ${user.username}. Their next Google sign-in links one again.` });
		await refresh();
	}
	catch (e) {
		const message = apiErrorTitle(e);
		snackbar.add({ type: 'error', text: `Couldn't unlink the Google account${message ? `: ${message}` : ''}` });
	}
};

const rowActions = (user: User) => [
	{ label: 'Edit', icon: Pencil, action: () => addUserModal.value?.openForEdit(user, sharedLogins.value.has(user.username)) },
	{ label: 'Copy username', icon: Copy, action: () => copy(user.username) },
	{ label: 'Manage sessions', icon: Laptop, action: () => openManageSessionModal(user) },
	...(user.oidc_linked ? [{ label: 'Unlink Google account', icon: Link2Off, action: () => unlinkGoogle(user) }] : []),
	organizations.value
		? { label: 'Remove from organization', icon: UserMinus, danger: true, action: () => triggerDelete(user) }
		: { label: 'Delete', icon: Trash2, danger: true, action: () => triggerDelete(user) },
];

interface ApiErrorLike {
	data?: { errors?: { title?: string; detail?: string }[] };
	response?: { data?: { errors?: { title?: string; detail?: string }[] } };
	cause?: ApiErrorLike;
}
const apiErrorText = (err: unknown): string => {
	const e = err as ApiErrorLike | null;
	const first = (e?.data?.errors ?? e?.response?.data?.errors ?? e?.cause?.data?.errors ?? e?.cause?.response?.data?.errors)?.[0];
	return first?.title || first?.detail || 'The server returned an error.';
};
</script>
