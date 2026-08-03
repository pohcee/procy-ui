<template>
	<new-page-wrapper is-extra="true">
		<div class="flex flex-1 xl:overflow-hidden">
			<new-settings-sidebar />
			<div class="scrollbar-hide max-h-screen flex-1 xl:overflow-y-auto">
				<div class="mx-auto h-screen max-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
					<div>
						<div class="relative z-20 flex h-16 items-center justify-between">
							<div>
								<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
									Vault
								</h3>
								<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
									&nbsp;
								</p>
							</div>
							<div class="flex-1" />
							<div class="ml-2 flex-shrink-0">
								<div
									v-if="!statusLoading && vaultStatus"
									class="rounded-md p-4 uppercase"
									:class="{
										'bg-orange-50 dark:bg-orange-500/10': isUninitialized,
										'bg-yellow-50 dark:bg-yellow-500/10': isLocked,
										'bg-green-50 dark:bg-green-500/10': isUnlocked,
									}"
								>
									<div class="flex items-end justify-center gap-x-3">
										<span
											:class="{
												'text-orange-700 dark:text-orange-400': isUninitialized,
												'text-yellow-700 dark:text-yellow-400': isLocked,
												'text-green-700 dark:text-green-400': isUnlocked,
											}"
										>{{ statusLabel }}</span>
									</div>
								</div>
							</div>
						</div>
						<div
							class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900"
						>
							<!-- Loading status -->
							<div
								v-if="statusLoading"
								class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6"
							>
								Loading vault status...
							</div>

							<!-- Uninitialized: init form -->
							<template v-else-if="isUninitialized">
								<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
									<div class="flex max-h-16 flex-1 content-center items-center">
										<p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-500">
											Initialize the vault by setting a passphrase
										</p>
									</div>
								</div>
								<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
									<form
										class="h-full w-full"
										autocomplete="off"
										novalidate
										@submit.prevent="initVault"
									>
										<div class="mb-4 w-full">
											<div class="relative mt-1 flex w-full flex-col">
												<input
													id="vaultInitPassword"
													v-model="initPassword"
													class="h-14 primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													type="password"
													autocomplete="new-password"
												>
												<label
													class="absolute left-1.5 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform px-1 text-theme-label duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-1 text-theme-label peer-focus:text-primary bg-theme text-sm font-normal"
													for="vaultInitPassword"
												>passphrase</label>
											</div>
											<p
												v-if="initPasswordError"
												class="mt-1 text-sm text-red-600 dark:text-red-400"
											>
												{{ initPasswordError }}
											</p>
										</div>
										<div class="mb-4 w-full">
											<div class="relative mt-1 flex w-full flex-col">
												<input
													id="vaultInitPasswordRepeat"
													v-model="initPasswordRepeat"
													class="h-14 primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													type="password"
													autocomplete="new-password"
												>
												<label
													class="absolute left-1.5 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform px-1 text-theme-label duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-1 text-theme-label peer-focus:text-primary bg-theme text-sm font-normal"
													for="vaultInitPasswordRepeat"
												>Repeat passphrase</label>
											</div>
											<p
												v-if="initRepeatError"
												class="mt-1 text-sm text-red-600 dark:text-red-400"
											>
												{{ initRepeatError }}
											</p>
										</div>
										<div
											class="mb-4 w-full rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800"
											role="alert"
										>
											Please, be aware that it's not possible to recover a lost
											passphrase. Store your passphrase safely and consider making clear text
											backups of your vault.
										</div>
										<div class="mb-4 flex w-full items-center justify-end">
											<button
												class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-3.5 py-2.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-primary"
												type="submit"
												:disabled="initLoading || !isInitFormValid"
											>
												<LoadingSpinner v-if="initLoading" />
												<span class="flex items-center justify-center gap-x-2">Initialize vault</span>
											</button>
										</div>
									</form>
								</div>
							</template>

							<!-- Initialized but locked: unlock form -->
							<template v-else-if="isLocked">
								<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
									<div class="flex max-h-16 flex-1 content-center items-center">
										<p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-500">
											The vault is locked. Enter the existing passphrase to unlock it.
										</p>
									</div>
								</div>
								<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
									<form
										class="h-full w-full"
										autocomplete="off"
										novalidate
										@submit.prevent="unlockVault"
									>
										<div class="mb-4 w-full">
											<div class="relative mt-1 flex w-full flex-col">
												<input
													id="vaultUnlockPassword"
													v-model="unlockPassword"
													class="h-14 primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													type="password"
													autocomplete="current-password"
												>
												<label
													class="absolute left-1.5 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform px-1 text-theme-label duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-1 text-theme-label peer-focus:text-primary bg-theme text-sm font-normal"
													for="vaultUnlockPassword"
												>passphrase</label>
											</div>
										</div>
										<div class="mb-4 flex w-full items-center justify-end">
											<button
												class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-3.5 py-2.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-primary"
												type="submit"
												:disabled="unlockLoading || !unlockPassword"
											>
												<LoadingSpinner v-if="unlockLoading" />
												<span class="flex items-center justify-center gap-x-2">Unlock vault</span>
											</button>
										</div>
									</form>
								</div>
							</template>

							<!-- Initialized and unlocked -->
							<template v-else-if="isUnlocked">
								<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
									<div class="flex max-h-16 flex-1 content-center items-center">
										<p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-500">
											The vault is unlocked.
										</p>
									</div>
									<div class="flex-shrink-0 flex gap-2">
										<button
											class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 text-white cursor-pointer rounded-md px-3.5 py-2.5 text-sm relative font-semibold shadow-sm transition-all duration-300"
											type="button"
											@click="itemModal?.openForCreate()"
										>
											<span class="flex items-center justify-center gap-x-2">Add entry</span>
										</button>
										<button
											class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-3.5 py-2.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-primary"
											type="button"
											:disabled="lockLoading"
											@click="lockVault"
										>
											<LoadingSpinner v-if="lockLoading" />
											<span class="flex items-center justify-center gap-x-2">Lock vault</span>
										</button>
									</div>
								</div>
								<div class="overflow-hidden">
									<div
										v-if="itemsPending"
										class="p-6 text-center text-sm text-gray-500"
									>
										Loading vault entries...
									</div>
									<div
										v-else-if="vaultItems.length === 0"
										class="p-6 text-center text-sm text-gray-500"
									>
										No entries yet.
									</div>
									<table
										v-else
										class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
									>
										<thead class="bg-gray-50 dark:bg-gray-950">
											<tr>
												<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
													Key
												</th>
												<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
													Type
												</th>
												<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
													Client
												</th>
												<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
													Updated
												</th>
												<th class="px-4 py-3" />
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
											<tr
												v-for="item in vaultItems"
												:key="item.id"
											>
												<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-white">
													{{ item.key }}
												</td>
												<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
													{{ item.type }}
												</td>
												<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
													{{ item.client_id || 'global' }}
												</td>
												<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
													{{ useDateFormat(item.updated_at, 'YYYY-MM-DD HH:mm').value }}
												</td>
												<td class="whitespace-nowrap px-4 py-3 text-right text-sm">
													<button
														class="text-primary-600 hover:underline"
														type="button"
														@click="itemModal?.openForEdit(item)"
													>
														Edit
													</button>
													<button
														class="ml-3 text-red-600 hover:underline"
														type="button"
														@click="triggerDeleteItem(item)"
													>
														Delete
													</button>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</template>
						</div>
					</div>
				</div>
			</div>
		</div>
		<VaultItemModal
			ref="itemModal"
			@saved="refreshItems"
		/>
		<Modal
			v-model="deleteItemConfirmOpen"
			title="Please confirm!"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteItem"
		>
			<div class="absolute inset-0 flex h-full min-h-[200px] flex-col items-center justify-center p-8 text-center">
				<div>Do you want to delete "{{ activeItem?.key }}"?</div>
			</div>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDateFormat } from '@vueuse/core';
import VaultItemModal from '~/components/vault/VaultItemModal.vue';
import type { VaultItem, VaultStatus } from '~/types';
import LoadingSpinner from '~/components/custom/loading-spinner/LoadingSpinner.vue';

const MIN_PASS_LENGTH = 4;
const MAX_PASS_LENGTH = 32;

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

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

const extractErrorMessage = (error: any, fallback: string): string => {
	const apiErrors = error?.response?.data?.errors;
	if (apiErrors && apiErrors.length > 0) {
		return apiErrors[0].detail || apiErrors[0].title || fallback;
	}
	return fallback;
};

const fetchStatus = async () => {
	statusLoading.value = true;
	try {
		vaultStatus.value = await $api.vault.status();
	}
	catch (error: any) {
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
	catch (error: any) {
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
	catch (error: any) {
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
	catch (error: any) {
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

const refreshItems = async () => {
	itemsPending.value = true;
	try {
		const response = await $api.vault.listItems();
		vaultItems.value = response.data;
	}
	catch (error: any) {
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
</script>
