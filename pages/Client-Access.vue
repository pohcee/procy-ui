<template>
	<SettingsLayout
		heading="Client access"
		description="Credentials that rport clients use to connect to this server."
	>
		<template #actions>
			<AppButton @click="openAddClientModal">
				<Plus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add access
			</AppButton>
		</template>

		<div class="relative w-full max-w-md">
			<label
				for="client-access-search"
				class="sr-only"
			>Search for a client ID</label>
			<Search
				class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-3"
				aria-hidden="true"
			/>
			<input
				id="client-access-search"
				v-model="filter"
				class="st-ctl !pl-9 !pr-11"
				type="text"
				placeholder="Search for a client ID"
				autocomplete="off"
				@keyup.enter="handleFilterList"
			>
			<button
				v-if="filter.length > 0"
				type="button"
				aria-label="Clear search"
				class="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
				@click="filter = ''"
			>
				<X
					class="h-4 w-4"
					aria-hidden="true"
				/>
			</button>
		</div>

		<AppCard flush>
			<div
				v-if="pending && !response"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading client credentials…
			</div>
			<div
				v-else-if="!response?.data?.length"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<KeyRound
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					{{ filter ? 'No matching client IDs' : 'No client credentials yet' }}
				</p>
				<p class="text-[13px] text-app-text-3">
					{{ filter ? 'Try a different search.' : 'Add access to let a new client connect.' }}
				</p>
			</div>
			<template v-else>
				<table class="st-table hidden md:table">
					<thead>
						<tr>
							<th scope="col">
								Client ID
							</th>
							<th scope="col">
								Password
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
							v-for="client in response.data"
							:key="client.id"
						>
							<td>
								<div class="flex items-center gap-1.5">
									<span class="font-mono text-[13px]">{{ client.id }}</span>
									<button
										type="button"
										:aria-label="`Copy client ID ${client.id}`"
										:title="copiedKey === `id:${client.id}` ? 'Copied to clipboard' : 'Copy to clipboard'"
										class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
										@click="copyValue(`id:${client.id}`, client.id)"
									>
										<Check
											v-if="copiedKey === `id:${client.id}`"
											class="h-4 w-4 text-app-ok"
											aria-hidden="true"
										/>
										<Copy
											v-else
											class="h-4 w-4"
											aria-hidden="true"
										/>
									</button>
								</div>
							</td>
							<td>
								<div class="flex items-center gap-1.5">
									<span class="font-mono text-[13px] text-app-text-2">{{ client.password }}</span>
									<button
										type="button"
										:aria-label="`Copy password for ${client.id}`"
										:title="copiedKey === `pw:${client.id}` ? 'Copied to clipboard' : 'Copy to clipboard'"
										class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
										@click="copyValue(`pw:${client.id}`, client.password)"
									>
										<Check
											v-if="copiedKey === `pw:${client.id}`"
											class="h-4 w-4 text-app-ok"
											aria-hidden="true"
										/>
										<Copy
											v-else
											class="h-4 w-4"
											aria-hidden="true"
										/>
									</button>
								</div>
							</td>
							<td class="text-right">
								<SettingsRowActions
									:items="rowActions(client)"
									:label="`Actions for ${client.id}`"
								/>
							</td>
						</tr>
					</tbody>
				</table>

				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="client in response.data"
						:key="client.id"
						class="flex items-start gap-2 px-4 py-3"
					>
						<dl class="grid min-w-0 flex-1 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
							<dt class="text-xs text-app-text-3">
								Client ID
							</dt>
							<dd class="truncate font-mono text-[13px] font-medium text-app-text">
								{{ client.id }}
							</dd>
							<dd>
								<button
									type="button"
									:aria-label="`Copy client ID ${client.id}`"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
									@click="copyValue(`id:${client.id}`, client.id)"
								>
									<Check
										v-if="copiedKey === `id:${client.id}`"
										class="h-4 w-4 text-app-ok"
										aria-hidden="true"
									/>
									<Copy
										v-else
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
							</dd>
							<dt class="text-xs text-app-text-3">
								Password
							</dt>
							<dd class="truncate font-mono text-[13px] text-app-text-2">
								{{ client.password }}
							</dd>
							<dd>
								<button
									type="button"
									:aria-label="`Copy password for ${client.id}`"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
									@click="copyValue(`pw:${client.id}`, client.password)"
								>
									<Check
										v-if="copiedKey === `pw:${client.id}`"
										class="h-4 w-4 text-app-ok"
										aria-hidden="true"
									/>
									<Copy
										v-else
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
							</dd>
						</dl>
						<SettingsRowActions
							:items="rowActions(client)"
							:label="`Actions for ${client.id}`"
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
				@previous="previous"
				@next="next"
			/>
		</AppCard>

		<Modal
			v-model="delConfirm"
			title="Delete client access?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="activeClient && deleteClientAccess(activeClient.id)"
		>
			<p class="text-sm text-app-text-2">
				Do you want to delete the credentials <span class="font-mono font-semibold text-app-text">{{ activeClient?.id }}</span>?
				Clients using them can no longer connect.
			</p>
		</Modal>
		<Modal
			v-model="forceDeleteConfirm"
			title="Credentials in use"
			ok-text="Delete anyway"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="activeClient && forceDelete(activeClient.id, true)"
		>
			<div class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-warn-row p-3.5 text-sm text-app-text-2">
				<TriangleAlert
					class="mt-0.5 h-[18px] w-[18px] shrink-0 text-app-warn"
					aria-hidden="true"
				/>
				<div class="flex flex-col gap-1">
					<p>These credentials are currently in use by a connected client.</p>
					<p>Deleting them will disconnect the client immediately. Do you want to proceed?</p>
				</div>
			</div>
		</Modal>
		<AddClientModal
			ref="addClientModal"
			@save="handleCreateClientAccess"
		/>
		<InstallClientModal
			ref="installClientModal"
			@save="closeInstallClientModal"
		/>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { Check, Copy, KeyRound, Plus, Search, Trash2, TriangleAlert, Wrench, X } from 'lucide-vue-next';
import { useClipboard, useDebounceFn } from '@vueuse/core';
import AddClientModal from '~/components/clients/AddClientModal.vue';
import InstallClientModal from '~/components/clients/InstallClientModal.vue';
import type { ClientAuth } from '~/types';

const { copy } = useClipboard();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const route = useRoute();
const statusStore = useStatusStore();
const { createClientAccess } = useClientAccess();

const ITEMS_PER_PAGE = 20;

const page = ref(0);
const filter = ref('');
const activeClient = ref<ClientAuth | null>(null);
const delConfirm = ref(false);
const forceDeleteConfirm = ref(false);

const addClientModal = ref<InstanceType<typeof AddClientModal> | null>(null);
const installClientModal = ref<InstanceType<typeof InstallClientModal> | null>(null);

filter.value = route.hash.slice(1);
const { data: response, refresh, pending } = useLazyAsyncData(`clients-auth`, () => $api.clientAuth.paginate(page.value, filter.value), {
	watch: [page, filter],
});
await statusStore.loadStatus();

const openAddClientModal = () => {
	addClientModal.value?.open();
};

const openInstallClientModal = async (client: ClientAuth) => {
	await installClientModal.value?.open(client, statusStore.status);
};

const closeAddClientModal = () => {
	addClientModal.value?.close();
};

const closeInstallClientModal = () => {
	installClientModal.value?.close();
};
const triggerDelete = (client: ClientAuth) => {
	activeClient.value = client;
	delConfirm.value = true;
};

const triggerInstall = (client: ClientAuth) => {
	activeClient.value = client;
	openInstallClientModal(client);
};
const disabledNext = computed(() => {
	return Math.ceil((response?.value?.meta?.count ?? 0) / ITEMS_PER_PAGE) === page.value + 1;
});
const disabledPrevious = computed(() => page.value === 0);
const next = async () => {
	if (!disabledNext.value) {
		page.value++;
		await refresh();
	}
};

const previous = async () => {
	if (!disabledPrevious.value) {
		page.value--;
		await refresh();
	}
};

const handleFilterList = useDebounceFn(() => {
	page.value = 0;
	refresh();
}, 300);

const handleCreateClientAccess = async (data: ClientAuth) => {
	await createClientAccess(data);
	closeAddClientModal();
	await refresh();
};

const deleteClientAccess = async (client_auth_id: string) => {
	let inUse = false;
	await $api.clientAuth.delete(client_auth_id, false).catch((error: unknown) => {
		if ((error as { status?: number } | null)?.status === 409) {
			// keep activeClient (the ClientAuth object) so the force-delete modal can use its id
			inUse = true;
			delConfirm.value = false;
			forceDeleteConfirm.value = true;
		}
	});
	delConfirm.value = false;
	if (inUse) return;
	snackbar.add({
		type: 'success',
		text: 'Client Auth ID deleted successfully',
	});
	await refresh();
};

const forceDelete = async (client_auth_id: string, force: boolean) => {
	await $api.clientAuth.delete(client_auth_id, force);
	forceDeleteConfirm.value = false;
	snackbar.add({
		type: 'success',
		text: 'Client Auth ID deleted successfully',
	});
	await refresh();
};

watch([page, filter], () => {
	refresh();
});

// Which value was copied last (e.g. `id:<client>` / `pw:<client>`), for the inline check mark.
const copiedKey = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
const copyValue = (key: string, value: string) => {
	copy(value);
	copiedKey.value = key;
	clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => {
		copiedKey.value = null;
	}, 1500);
};

const rowActions = (client: ClientAuth) => [
	{ label: 'Install client', icon: Wrench, action: () => triggerInstall(client) },
	{ label: 'Delete', icon: Trash2, danger: true, action: () => triggerDelete(client) },
];
</script>
