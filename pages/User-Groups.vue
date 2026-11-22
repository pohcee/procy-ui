<template>
	<SettingsLayout
		heading="User groups"
		description="Groups bundle permissions; a user gets every permission granted by any of their groups."
	>
		<template #actions>
			<AppButton @click="groupModal?.openForCreate()">
				<Plus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add group
			</AppButton>
		</template>

		<AppCard flush>
			<div
				v-if="pending && !userGroups"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading user groups…
			</div>
			<div
				v-else-if="error && !userGroups"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
				role="status"
			>
				<CircleAlert
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					User groups aren’t available
				</p>
				<p class="max-w-md text-[13px] text-app-text-3">
					{{ apiErrorText(error) }}
				</p>
			</div>
			<div
				v-else-if="!userGroups?.length"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<UsersRound
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					No user groups yet
				</p>
				<p class="text-[13px] text-app-text-3">
					Create a group to grant permissions to several users at once.
				</p>
			</div>
			<template v-else>
				<table class="st-table hidden md:table">
					<thead>
						<tr>
							<th
								scope="col"
								class="w-56"
							>
								Name
							</th>
							<th scope="col">
								Permissions
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
							v-for="group in userGroups"
							:key="group.name"
						>
							<td class="font-medium">
								{{ group.name }}
							</td>
							<td>
								<div class="flex flex-wrap gap-1.5">
									<span
										v-for="permission in grantedPermissions(group)"
										:key="permission"
										class="st-chip"
									>{{ permission }}</span>
									<span
										v-if="!grantedPermissions(group).length"
										class="text-app-text-4"
									>No permissions</span>
								</div>
							</td>
							<td class="text-right">
								<SettingsRowActions
									:items="rowActions(group)"
									:label="`Actions for ${group.name}`"
								/>
							</td>
						</tr>
					</tbody>
				</table>

				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="group in userGroups"
						:key="group.name"
						class="flex items-start gap-3 px-4 py-3"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-[15px] font-medium text-app-text">
								{{ group.name }}
							</p>
							<div class="mt-1.5 flex flex-wrap gap-1.5">
								<span
									v-for="permission in grantedPermissions(group)"
									:key="permission"
									class="st-chip"
								>{{ permission }}</span>
								<span
									v-if="!grantedPermissions(group).length"
									class="text-[13px] text-app-text-4"
								>No permissions</span>
							</div>
						</div>
						<SettingsRowActions
							:items="rowActions(group)"
							:label="`Actions for ${group.name}`"
						/>
					</li>
				</ul>

				<SettingsPagination
					:page="0"
					:current-page-item-count="userGroups.length"
					:total-items="userGroups.length"
				/>
			</template>
		</AppCard>
		<p class="flex items-center gap-2 px-1 text-[13px] text-app-text-3">
			<Info
				class="h-4 w-4 shrink-0"
				aria-hidden="true"
			/>
			On conflicting permissions, authorization wins over the denial.
		</p>

		<UserGroupModal
			ref="groupModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			title="Delete user group?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<p class="text-sm text-app-text-2">
				Do you want to delete the group <span class="font-semibold text-app-text">{{ activeGroup?.name }}</span>?
				Its members lose the permissions it grants.
			</p>
		</Modal>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { CircleAlert, Info, Pencil, Plus, Trash2, UsersRound } from 'lucide-vue-next';
import UserGroupModal from '~/components/custom/UserGroupModal.vue';
import type { UserGroup } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const groupModal = ref<InstanceType<typeof UserGroupModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeGroup = ref<UserGroup | null>(null);

const { data: userGroups, refresh, pending, error } = useAsyncData('user-groups', () => $api.userGroups.all());

const triggerDelete = (group: UserGroup) => {
	activeGroup.value = group;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeGroup.value) return;
	await $api.userGroups.delete(activeGroup.value.name);
	snackbar.add({ type: 'success', text: 'User group deleted' });
	deleteConfirmOpen.value = false;
	await refresh();
};

const grantedPermissions = (group: UserGroup) => Object.entries(group.permissions ?? {})
	.filter(([, granted]) => granted)
	.map(([permission]) => permission);

const rowActions = (group: UserGroup) => [
	{ label: 'Edit', icon: Pencil, action: () => groupModal.value?.openForEdit(group) },
	{ label: 'Delete', icon: Trash2, danger: true, action: () => triggerDelete(group) },
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
