<template>
	<SettingsLayout
		heading="Vault"
		description="Encrypted, server-side storage for passwords and other secrets."
	>
		<template #actions>
			<span
				v-if="!statusLoading && vaultStatus && statusLabel"
				:class="[
					'inline-flex h-9 items-center gap-2 rounded-full border border-app-border px-3 text-[13px] font-medium',
					isUnlocked ? 'bg-app-ok-bg text-app-ok' : 'bg-app-warn-bg text-app-warn',
				]"
				role="status"
			>
				<span
					aria-hidden="true"
					:class="['h-2 w-2 rounded-full', isUnlocked ? 'bg-[#22C55E]' : 'bg-current']"
				/>
				{{ statusLabel }}
			</span>
		</template>

		<!-- Loading status -->
		<AppCard v-if="statusLoading">
			<p class="text-sm text-app-text-3">
				Loading vault status…
			</p>
		</AppCard>

		<!-- Locked or uninitialized on a server that doesn't unlock the vault by passphrase -->
		<AppCard
			v-else-if="(isUninitialized || isLocked) && !has('vault_passphrase')"
			title="Vault not available"
		>
			<p class="text-sm text-app-text-3">
				{{ isLocked
					? 'The vault is locked. This server does not unlock it with a passphrase.'
					: 'The vault is not set up. This server does not set it up with a passphrase.' }}
			</p>
		</AppCard>

		<!-- Uninitialized: init form -->
		<AppCard
			v-else-if="isUninitialized"
			title="Initialize the vault"
			description="Set the passphrase that encrypts every vault entry."
		>
			<form
				class="flex max-w-xl flex-col gap-4"
				autocomplete="off"
				novalidate
				@submit.prevent="initVault"
			>
				<div class="st-grid2">
					<div class="st-field">
						<label
							class="st-label"
							for="vaultInitPassword"
						>Passphrase</label>
						<input
							id="vaultInitPassword"
							v-model="initPassword"
							:class="['st-ctl', { 'st-invalid': initPasswordError }]"
							type="password"
							autocomplete="new-password"
							:aria-invalid="!!initPasswordError || undefined"
						>
						<span
							v-if="initPasswordError"
							class="st-error"
						>{{ initPasswordError }}</span>
						<span
							v-else
							class="st-help"
						>{{ MIN_PASS_LENGTH }}–{{ MAX_PASS_LENGTH }} characters.</span>
					</div>
					<div class="st-field">
						<label
							class="st-label"
							for="vaultInitPasswordRepeat"
						>Repeat passphrase</label>
						<input
							id="vaultInitPasswordRepeat"
							v-model="initPasswordRepeat"
							:class="['st-ctl', { 'st-invalid': initRepeatError }]"
							type="password"
							autocomplete="new-password"
							:aria-invalid="!!initRepeatError || undefined"
						>
						<span
							v-if="initRepeatError"
							class="st-error"
						>{{ initRepeatError }}</span>
					</div>
				</div>
				<div
					class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-warn-row p-3.5 text-[13px] text-app-text-2"
					role="alert"
				>
					<TriangleAlert
						class="mt-px h-[18px] w-[18px] shrink-0 text-app-warn"
						aria-hidden="true"
					/>
					<div>
						<strong class="font-semibold text-app-text">A lost passphrase can’t be recovered.</strong>
						Store your passphrase safely and consider making clear-text backups of your vault.
					</div>
				</div>
				<div>
					<AppButton
						type="submit"
						:disabled="initLoading || !isInitFormValid"
					>
						<LoadingSpinner v-if="initLoading" />
						Initialize vault
					</AppButton>
				</div>
			</form>
		</AppCard>

		<!-- Initialized but locked: unlock form -->
		<AppCard
			v-else-if="isLocked"
			title="Unlock the vault"
			description="The vault is locked. Enter the existing passphrase to unlock it."
		>
			<form
				class="flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end"
				autocomplete="off"
				novalidate
				@submit.prevent="unlockVault"
			>
				<div class="st-field flex-1">
					<label
						class="st-label"
						for="vaultUnlockPassword"
					>Passphrase</label>
					<input
						id="vaultUnlockPassword"
						v-model="unlockPassword"
						class="st-ctl"
						type="password"
						autocomplete="current-password"
					>
				</div>
				<AppButton
					type="submit"
					:disabled="unlockLoading || !unlockPassword"
				>
					<LoadingSpinner v-if="unlockLoading" />
					<LockOpen
						v-else
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Unlock vault
				</AppButton>
			</form>
		</AppCard>

		<!-- Initialized and unlocked -->
		<AppCard
			v-else-if="isUnlocked"
			flush
			title="Entries"
			description="The vault is unlocked."
		>
			<template #actions>
				<!-- Without passphrase unlocking, a locked vault could not be reopened from here. -->
				<AppButton
					v-if="has('vault_passphrase')"
					variant="secondary"
					size="sm"
					:disabled="lockLoading"
					@click="lockVault"
				>
					<LoadingSpinner v-if="lockLoading" />
					<Lock
						v-else
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Lock vault
				</AppButton>
				<AppButton
					size="sm"
					@click="itemModal?.openForCreate()"
				>
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Add entry
				</AppButton>
			</template>
			<div
				v-if="itemsPending"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading vault entries…
			</div>
			<div
				v-else-if="vaultItems.length === 0"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<Vault
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					No entries yet
				</p>
				<p class="text-[13px] text-app-text-3">
					Add a secret to share it safely with your team.
				</p>
			</div>
			<template v-else>
				<!-- Entries grouped by the host they belong to; entries without a host come last. -->
				<table class="st-table hidden md:table">
					<thead>
						<tr>
							<th scope="col">
								Key
							</th>
							<th scope="col">
								Created by
							</th>
							<th scope="col">
								Last change
							</th>
							<th
								scope="col"
								class="w-14"
							>
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody
						v-for="group in groupedItems"
						:key="group.clientId || '__global__'"
					>
						<tr class="vault-group">
							<th
								scope="rowgroup"
								colspan="4"
							>
								<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
									<Monitor
										v-if="group.clientId"
										class="h-4 w-4 text-app-text-3"
										aria-hidden="true"
									/>
									<Globe
										v-else
										class="h-4 w-4 text-app-text-3"
										aria-hidden="true"
									/>
									<NuxtLink
										v-if="group.clientId"
										:to="`/dashboard/${encodeURIComponent(group.clientId)}?tab=meta-data`"
										class="font-mono text-[13px] font-semibold normal-case tracking-normal text-app-text hover:text-app-link hover:underline"
									>{{ group.label }}</NuxtLink>
									<span
										v-else
										class="text-[13px] font-semibold normal-case tracking-normal text-app-text"
									>{{ group.label }}</span>
									<span
										v-if="group.clientId && group.label !== group.clientId"
										class="font-mono text-xs font-normal normal-case tracking-normal text-app-text-4"
									>{{ group.clientId }}</span>
									<span class="text-xs font-normal normal-case tracking-normal text-app-text-3">
										{{ group.items.length }} {{ group.items.length === 1 ? 'entry' : 'entries' }}
									</span>
									<button
										type="button"
										class="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium normal-case tracking-normal text-app-text-2 hover:bg-app-hover hover:text-app-text"
										:aria-label="`Add an entry for ${group.label}`"
										@click="itemModal?.openForCreate(group.clientId)"
									>
										<Plus
											class="h-3.5 w-3.5"
											aria-hidden="true"
										/>
										Add
									</button>
								</div>
							</th>
						</tr>
						<tr
							v-for="item in group.items"
							:key="item.id"
						>
							<td>
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-mono text-[13px] font-medium">{{ item.key }}</span>
									<span
										v-if="item.type"
										class="st-chip"
									>{{ item.type }}</span>
								</div>
							</td>
							<td class="text-app-text-2">
								{{ item.created_by || '—' }}
							</td>
							<td class="whitespace-nowrap text-app-text-2">
								{{ formatDate(item.updated_at ?? item.created_at) }}
							</td>
							<td class="text-right">
								<SettingsRowActions
									:items="rowActions(item)"
									:label="`Actions for ${item.key}`"
								/>
							</td>
						</tr>
					</tbody>
				</table>

				<div class="md:hidden">
					<section
						v-for="group in groupedItems"
						:key="group.clientId || '__global__'"
						:aria-label="group.label"
					>
						<div class="flex items-center gap-2 border-b border-app-border-subtle bg-app-surface-2 px-4 py-2.5">
							<NuxtLink
								v-if="group.clientId"
								:to="`/dashboard/${encodeURIComponent(group.clientId)}?tab=meta-data`"
								class="min-w-0 truncate font-mono text-[13px] font-semibold text-app-text"
							>{{ group.label }}</NuxtLink>
							<span
								v-else
								class="text-[13px] font-semibold text-app-text"
							>{{ group.label }}</span>
							<span class="shrink-0 text-xs text-app-text-3">· {{ group.items.length }}</span>
							<button
								type="button"
								class="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover"
								:aria-label="`Add an entry for ${group.label}`"
								@click="itemModal?.openForCreate(group.clientId)"
							>
								<Plus
									class="h-4 w-4"
									aria-hidden="true"
								/>
							</button>
						</div>
						<ul class="divide-y divide-app-border-subtle">
							<li
								v-for="item in group.items"
								:key="item.id"
								class="flex items-start gap-3 px-4 py-3"
							>
								<div class="min-w-0 flex-1">
									<p class="truncate font-mono text-sm font-medium text-app-text">
										{{ item.key }}
									</p>
									<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-app-text-3">
										<span
											v-if="item.type"
											class="st-chip"
										>{{ item.type }}</span>
										<span>{{ item.created_by || '—' }}</span>
										<span aria-hidden="true">·</span>
										<span>{{ formatDate(item.updated_at ?? item.created_at) }}</span>
									</div>
								</div>
								<SettingsRowActions
									:items="rowActions(item)"
									:label="`Actions for ${item.key}`"
								/>
							</li>
						</ul>
					</section>
				</div>
			</template>
		</AppCard>

		<VaultItemModal
			ref="itemModal"
			@saved="refreshItems"
		/>
		<Modal
			v-model="deleteItemConfirmOpen"
			title="Delete vault entry?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteItem"
		>
			<p class="text-sm text-app-text-2">
				Do you want to delete <span class="font-mono font-semibold text-app-text">{{ activeItem?.key }}</span>?
				This can’t be undone.
			</p>
		</Modal>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { formatDate as vueuseFormatDate } from '@vueuse/core';
import { Globe, Lock, LockOpen, Monitor, Pencil, Plus, Trash2, TriangleAlert, Vault } from 'lucide-vue-next';
import VaultItemModal from '~/components/vault/VaultItemModal.vue';
import type { VaultItem, VaultStatus } from '~/types';
import LoadingSpinner from '~/components/custom/loading-spinner/LoadingSpinner.vue';

const MIN_PASS_LENGTH = 4;
const MAX_PASS_LENGTH = 32;

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { has } = useCapabilities();

const statusLoading = ref(true);
const vaultStatus = ref<VaultStatus | null>(null);

const isUninitialized = computed(() => vaultStatus.value?.init === 'uninitialized');
const isLocked = computed(() => vaultStatus.value?.init === 'setup-completed' && vaultStatus.value?.status === 'locked');
const isUnlocked = computed(() => vaultStatus.value?.init === 'setup-completed' && vaultStatus.value?.status === 'unlocked');

const statusLabel = computed(() => {
	if (isUninitialized.value) return 'Needs initialization';
	if (isLocked.value) return 'Locked';
	if (isUnlocked.value) return 'Unlocked';
	return '';
});

const initPassword = ref('');
const initPasswordRepeat = ref('');
const initLoading = ref(false);

const unlockPassword = ref('');
const unlockLoading = ref(false);

const lockLoading = ref(false);

const initPasswordError = computed(() => {
	if (!initPassword.value) return '';
	if (initPassword.value.length < MIN_PASS_LENGTH || initPassword.value.length > MAX_PASS_LENGTH) {
		return `Passphrase must be between ${MIN_PASS_LENGTH} and ${MAX_PASS_LENGTH} characters`;
	}
	return '';
});
const initRepeatError = computed(() => {
	if (!initPasswordRepeat.value) return '';
	if (initPasswordRepeat.value !== initPassword.value) {
		return 'Passphrases do not match';
	}
	return '';
});
const isInitFormValid = computed(() => {
	return initPassword.value.length >= MIN_PASS_LENGTH
		&& initPassword.value.length <= MAX_PASS_LENGTH
		&& initPassword.value === initPasswordRepeat.value;
});

interface ApiErrorBody {
	errors?: { title?: string; detail?: string }[];
}
interface FetchErrorLike {
	data?: ApiErrorBody;
	response?: { _data?: ApiErrorBody };
}
const extractErrorMessage = (error: unknown, fallback: string): string => {
	// ofetch exposes the parsed error body as `error.data` / `error.response._data`
	const err = error as FetchErrorLike | null | undefined;
	const apiErrors = err?.data?.errors ?? err?.response?._data?.errors;
	const first = apiErrors?.[0];
	if (first) return first.detail || first.title || fallback;
	return fallback;
};

const fetchStatus = async () => {
	statusLoading.value = true;
	try {
		vaultStatus.value = await $api.vault.status();
	}
	catch (error: unknown) {
		snackbar.add({
			type: 'error',
			text: extractErrorMessage(error, 'Failed to fetch vault status'),
		});
	}
	finally {
		statusLoading.value = false;
	}
};

const initVault = async () => {
	if (!isInitFormValid.value) return;
	initLoading.value = true;
	try {
		await $api.vault.init(initPassword.value);
		initPassword.value = '';
		initPasswordRepeat.value = '';
		snackbar.add({
			type: 'success',
			text: 'Vault initialized successfully',
		});
		await fetchStatus();
	}
	catch (error: unknown) {
		snackbar.add({
			type: 'error',
			text: extractErrorMessage(error, 'Failed to initialize vault'),
		});
	}
	finally {
		initLoading.value = false;
	}
};

const unlockVault = async () => {
	if (!unlockPassword.value) return;
	unlockLoading.value = true;
	try {
		await $api.vault.unlock(unlockPassword.value);
		unlockPassword.value = '';
		snackbar.add({
			type: 'success',
			text: 'Vault unlocked successfully',
		});
		await fetchStatus();
	}
	catch (error: unknown) {
		snackbar.add({
			type: 'error',
			text: extractErrorMessage(error, 'Failed to unlock vault. Check your passphrase.'),
		});
	}
	finally {
		unlockLoading.value = false;
	}
};

const lockVault = async () => {
	lockLoading.value = true;
	try {
		await $api.vault.lock();
		snackbar.add({
			type: 'success',
			text: 'Vault locked successfully',
		});
		await fetchStatus();
	}
	catch (error: unknown) {
		snackbar.add({
			type: 'error',
			text: extractErrorMessage(error, 'Failed to lock vault'),
		});
	}
	finally {
		lockLoading.value = false;
	}
};

onMounted(() => {
	fetchStatus();
});

const itemModal = ref<InstanceType<typeof VaultItemModal> | null>(null);
const vaultItems = ref<VaultItem[]>([]);
const itemsPending = ref(false);
const deleteItemConfirmOpen = ref(false);
const activeItem = ref<VaultItem | null>(null);

// Host names for the client IDs entries are attached to (falls back to the ID).
const clientNames = ref<Record<string, string>>({});
const loadClientNames = async (items: VaultItem[]) => {
	const ids = [...new Set(items.map(i => i.client_id).filter(Boolean))].filter(id => !(id in clientNames.value));
	if (!ids.length) return;
	try {
		const response = await $api.clients.getClientsName(ids);
		const names = { ...clientNames.value };
		for (const client of response.data ?? []) {
			if (client.id) names[client.id] = client.name || client.id;
		}
		clientNames.value = names;
	}
	catch {
		// Names are a nicety; the client ID is shown instead.
	}
};

interface VaultGroup {
	clientId: string;
	label: string;
	items: VaultItem[];
}
const groupedItems = computed<VaultGroup[]>(() => {
	const byClient = new Map<string, VaultItem[]>();
	for (const item of vaultItems.value) {
		const id = item.client_id || '';
		if (!byClient.has(id)) byClient.set(id, []);
		byClient.get(id)!.push(item);
	}
	const groups = [...byClient.entries()].map(([clientId, items]) => ({
		clientId,
		label: clientId ? (clientNames.value[clientId] ?? clientId) : 'Not tied to a device',
		items: [...items].sort((a, b) => a.key.localeCompare(b.key)),
	}));
	// Hosts alphabetically, entries without a host last.
	return groups.sort((a, b) => {
		if (!a.clientId !== !b.clientId) return a.clientId ? -1 : 1;
		return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
	});
});

const refreshItems = async () => {
	itemsPending.value = true;
	try {
		const response = await $api.vault.listItems();
		vaultItems.value = response.data;
		await loadClientNames(response.data);
	}
	catch (error: unknown) {
		snackbar.add({
			type: 'error',
			text: extractErrorMessage(error, 'Failed to fetch vault entries'),
		});
	}
	finally {
		itemsPending.value = false;
	}
};

const triggerDeleteItem = (item: VaultItem) => {
	activeItem.value = item;
	deleteItemConfirmOpen.value = true;
};

const confirmDeleteItem = async () => {
	if (!activeItem.value) return;
	await $api.vault.deleteItem(activeItem.value.id);
	snackbar.add({ type: 'success', text: 'Vault entry deleted' });
	deleteItemConfirmOpen.value = false;
	await refreshItems();
};

watch(isUnlocked, (value) => {
	if (value) refreshItems();
}, { immediate: true });

const formatDate = (value: string | Date | null | undefined) => {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '—' : vueuseFormatDate(date, 'YYYY-MM-DD HH:mm');
};

const rowActions = (item: VaultItem) => [
	{ label: 'Edit', icon: Pencil, action: () => itemModal.value?.openForEdit(item) },
	{ label: 'Delete', icon: Trash2, danger: true, action: () => triggerDeleteItem(item) },
];
</script>
