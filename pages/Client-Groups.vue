<template>
	<SettingsLayout
		heading="Client groups"
		description="Named sets of clients, and which user groups may access them."
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
				v-if="pending && !response"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading client groups…
			</div>
			<div
				v-else-if="!response?.data?.length"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<Boxes
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					No client groups yet
				</p>
				<p class="text-[13px] text-app-text-3">
					Group clients to run commands on them together and to limit who can reach them.
				</p>
			</div>
			<template v-else>
				<table class="st-table hidden md:table">
					<thead>
						<tr>
							<th scope="col">
								ID
							</th>
							<th scope="col">
								Description
							</th>
							<th scope="col">
								Allowed user groups
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
							v-for="group in response.data"
							:key="group.id"
						>
							<td class="whitespace-nowrap font-mono text-[13px]">
								{{ group.id }}
							</td>
							<td class="max-w-[320px]">
								<span
									v-if="group.description"
									class="line-clamp-2 text-app-text-2"
								>{{ group.description }}</span>
								<span
									v-else
									class="text-app-text-4"
								>—</span>
							</td>
							<td>
								<div class="flex flex-wrap gap-1.5">
									<span
										v-for="userGroup in group.allowed_user_groups"
										:key="userGroup"
										class="st-chip"
									>{{ userGroup }}</span>
									<span
										v-if="!group.allowed_user_groups?.length"
										class="text-app-text-3"
									>All users</span>
								</div>
							</td>
							<td class="text-right">
								<SettingsRowActions
									:items="rowActions(group)"
									:label="`Actions for ${group.id}`"
								/>
							</td>
						</tr>
					</tbody>
				</table>

				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="group in response.data"
						:key="group.id"
						class="flex items-start gap-3 px-4 py-3"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate font-mono text-sm font-medium text-app-text">
								{{ group.id }}
							</p>
							<p
								v-if="group.description"
								class="mt-0.5 text-[13px] text-app-text-3"
							>
								{{ group.description }}
							</p>
							<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
								<span class="text-xs text-app-text-3">Access:</span>
								<span
									v-for="userGroup in group.allowed_user_groups"
									:key="userGroup"
									class="st-chip"
								>{{ userGroup }}</span>
								<span
									v-if="!group.allowed_user_groups?.length"
									class="text-xs text-app-text-2"
								>All users</span>
							</div>
						</div>
						<SettingsRowActions
							:items="rowActions(group)"
							:label="`Actions for ${group.id}`"
						/>
					</li>
				</ul>
			</template>
			<SettingsPagination
				v-if="response?.data?.length || page > 0"
				:page="page"
				:items-per-page="ITEMS_PER_PAGE"
				:current-page-item-count="response?.data?.length ?? 0"
				:total-items="response?.meta?.count ?? 0"
				@previous="handlePrevious"
				@next="handleNext"
			/>
		</AppCard>

		<ClientGroupModal
			ref="groupModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			title="Delete client group?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<p class="text-sm text-app-text-2">
				Do you want to delete the group <span class="font-mono font-semibold text-app-text">{{ activeGroup?.id }}</span>?
				The clients themselves are not affected.
			</p>
		</Modal>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-vue-next';
import ClientGroupModal from '~/components/custom/ClientGroupModal.vue';
import type { ClientGroup } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const ITEMS_PER_PAGE = 20;
const page = ref<number>(0);

const groupModal = ref<InstanceType<typeof ClientGroupModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeGroup = ref<ClientGroup | null>(null);

const { data: response, refresh, pending } = useLazyAsyncData(`clients-group`, () => $api.groups.paginate(page.value, ITEMS_PER_PAGE), {
	watch: [page],
});

const handlePrevious = async () => {
	if (page.value > 0) {
		page.value--;
		await refresh();
	}
};

const handleNext = async () => {
	page.value++;
	await refresh();
};

const triggerDelete = (group: ClientGroup) => {
	activeGroup.value = group;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeGroup.value) return;
	await $api.groups.delete(activeGroup.value.id);
	snackbar.add({ type: 'success', text: 'Client group deleted' });
	deleteConfirmOpen.value = false;
	await refresh();
};

const rowActions = (group: ClientGroup) => [
	{ label: 'Edit', icon: Pencil, action: () => groupModal.value?.openForEdit(group) },
	{ label: 'Delete', icon: Trash2, danger: true, action: () => triggerDelete(group) },
];
</script>
