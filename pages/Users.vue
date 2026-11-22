<template>
	<SettingsLayout
		heading="Users"
		description="People who can sign in to this server, and the groups that grant their permissions."
	>
		<template #actions>
			<AppButton @click="openAddUserModal">
				<Plus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add user
			</AppButton>
		</template>

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

		<AddUser
			ref="addUserModal"
			:groups="userGroups ?? []"
			@save="handleUserSave"
		/>
		<Modal
			v-model="delConfirm"
			title="Delete user?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="activeUser && deleteUser(activeUser.username)"
		>
			<p class="text-sm text-app-text-2">
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
import { CircleAlert, Pencil, Copy, Laptop, Plus, Trash2, Users as UsersIcon } from 'lucide-vue-next';
import { useClipboard } from '@vueuse/core';
import AddUser from '@/components/users/AddUser.vue';
import type { User, UserPayload, UserSession } from '~/types';
import Modal from '~/components/Modal.vue';
import ManageSessionModal from '~/components/users/ManageSessionModal.vue';

const { copy } = useClipboard();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const { data: users, refresh, pending, error } = useLazyAsyncData('users', () => $api.users.getAll());
const { data: userGroups } = useLazyAsyncData(('user-groups'), () => $api.userGroups.all());

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
	catch {
		snackbar.add({
			type: 'error',
			text: action === 'edit' ? 'Failed to update user' : 'Failed to create user',
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
			text: 'User deleted successfully',
		});
	}
	catch {
		snackbar.add({
			type: 'error',
			text: 'Something went wrong user not deleted',
		});
	}
};

const rowActions = (user: User) => [
	{ label: 'Edit', icon: Pencil, action: () => addUserModal.value?.openForEdit(user) },
	{ label: 'Copy username', icon: Copy, action: () => copy(user.username) },
	{ label: 'Manage sessions', icon: Laptop, action: () => openManageSessionModal(user) },
	{ label: 'Delete', icon: Trash2, danger: true, action: () => triggerDelete(user) },
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
