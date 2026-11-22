<template>
	<div class="flex flex-col gap-4">
		<!-- Loading -->
		<AppCard v-if="state === 'loading'">
			<p class="py-8 text-center text-sm text-app-text-3">
				Checking the vault…
			</p>
		</AppCard>

		<!-- Status could not be read (e.g. no permission) -->
		<AppCard v-else-if="state === 'error'">
			<div class="flex flex-col items-center gap-3 px-4 py-10 text-center">
				<p class="text-sm font-medium text-app-text">
					Couldn’t read the vault status.
				</p>
				<p class="max-w-md text-[13px] text-app-text-3">
					{{ errorText }}
				</p>
				<AppButton
					variant="secondary"
					@click="load"
				>
					Try again
				</AppButton>
			</div>
		</AppCard>

		<!-- Vault not set up yet -->
		<AppCard v-else-if="state === 'uninitialized'">
			<div class="flex flex-col items-center px-4 py-10 text-center">
				<span class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-app-muted text-app-text-2">
					<KeyRound
						class="h-6 w-6"
						aria-hidden="true"
					/>
				</span>
				<h3 class="mt-4 text-lg font-semibold text-app-text">
					The vault isn’t set up yet
				</h3>
				<p class="mt-1.5 max-w-md text-sm text-app-text-3">
					Set a passphrase in Settings → Vault to start storing metadata and secrets for your devices.
				</p>
				<AppButton
					class="mt-5"
					to="/vault"
				>
					Set up the vault
				</AppButton>
			</div>
		</AppCard>

		<!-- Locked: unlock inline -->
		<AppCard v-else-if="state === 'locked'">
			<form
				class="mx-auto flex max-w-sm flex-col items-center px-4 py-8 text-center"
				@submit.prevent="unlock"
			>
				<span class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-app-muted text-app-text-2">
					<Lock
						class="h-6 w-6"
						aria-hidden="true"
					/>
				</span>
				<h3 class="mt-4 text-lg font-semibold text-app-text">
					The vault is locked
				</h3>
				<p class="mt-1.5 text-sm text-app-text-3">
					Unlock it to see the metadata stored for {{ clientName }}.
				</p>
				<label
					for="meta-unlock-pass"
					class="sr-only"
				>Vault passphrase</label>
				<input
					id="meta-unlock-pass"
					v-model="passphrase"
					type="password"
					autocomplete="current-password"
					placeholder="Vault passphrase"
					class="mt-5 h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-sm text-app-text"
				>
				<AppButton
					type="submit"
					class="mt-3 w-full"
					:disabled="!passphrase || unlocking"
				>
					{{ unlocking ? 'Unlocking…' : 'Unlock vault' }}
				</AppButton>
			</form>
		</AppCard>

		<!-- Unlocked: this device's entries -->
		<AppCard
			v-else
			flush
			title="Vault metadata"
			:description="`Secrets and notes stored for ${clientName}.`"
		>
			<template #actions>
				<AppButton
					size="sm"
					variant="secondary"
					to="/vault"
				>
					All entries
				</AppButton>
				<AppButton
					size="sm"
					@click="itemModal?.openForCreate(clientId)"
				>
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Add entry
				</AppButton>
			</template>

			<p
				v-if="itemsLoading"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading entries…
			</p>
			<div
				v-else-if="items.length === 0"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<p class="text-sm font-medium text-app-text">
					No metadata for this device yet
				</p>
				<p class="text-[13px] text-app-text-3">
					Add credentials, licence keys or notes that belong to {{ clientName }}.
				</p>
			</div>
			<ul
				v-else
				class="divide-y divide-app-border-subtle"
			>
				<li
					v-for="item in items"
					:key="item.id"
					class="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3"
				>
					<div class="min-w-0 flex-1 basis-56">
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-mono text-[13px] font-medium text-app-text">{{ item.key }}</span>
							<span
								v-if="item.type"
								class="rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
							>{{ item.type }}</span>
						</div>
						<p class="mt-1 text-xs text-app-text-3">
							{{ item.created_by || '—' }} · {{ formatDate(item.updated_at ?? item.created_at) }}
						</p>
					</div>
					<div class="flex min-w-0 flex-[2] basis-64 items-center gap-2">
						<code
							v-if="revealed[item.id] !== undefined"
							class="min-w-0 flex-1 whitespace-pre-wrap break-all rounded-lg bg-app-muted px-2.5 py-1.5 font-mono text-[13px] text-app-text"
						>{{ revealed[item.id] || '(empty)' }}</code>
						<span
							v-else
							class="flex-1 font-mono text-[13px] tracking-widest text-app-text-4"
							aria-label="Hidden value"
						>••••••••</span>
						<button
							type="button"
							class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
							:aria-label="revealed[item.id] !== undefined ? `Hide ${item.key}` : `Show ${item.key}`"
							@click="toggleReveal(item)"
						>
							<EyeOff
								v-if="revealed[item.id] !== undefined"
								class="h-4 w-4"
								aria-hidden="true"
							/>
							<Eye
								v-else
								class="h-4 w-4"
								aria-hidden="true"
							/>
						</button>
						<button
							type="button"
							class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
							:aria-label="`Copy ${item.key}`"
							@click="copyValue(item)"
						>
							<Copy
								class="h-4 w-4"
								aria-hidden="true"
							/>
						</button>
						<SettingsRowActions
							:items="rowActions(item)"
							:label="`Actions for ${item.key}`"
						/>
					</div>
				</li>
			</ul>
		</AppCard>

		<VaultItemModal
			ref="itemModal"
			@saved="loadItems"
		/>
		<Modal
			v-model="deleteOpen"
			title="Delete vault entry?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<p class="text-sm text-app-text-2">
				Delete <span class="font-mono font-semibold text-app-text">{{ pendingDelete?.key }}</span> from {{ clientName }}?
				This can’t be undone.
			</p>
		</Modal>
	</div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { Copy, Eye, EyeOff, KeyRound, Lock, Pencil, Plus, Trash2 } from 'lucide-vue-next';
import VaultItemModal from '~/components/vault/VaultItemModal.vue';
import type { VaultItem } from '~/types';

const props = defineProps<{
	clientId: string;
	clientName: string;
}>();

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { copy } = useClipboard();

type State = 'loading' | 'error' | 'uninitialized' | 'locked' | 'unlocked';
const state = ref<State>('loading');
const errorText = ref('');
const passphrase = ref('');
const unlocking = ref(false);

const items = ref<VaultItem[]>([]);
const itemsLoading = ref(false);
/** Revealed values by entry ID (undefined = hidden). */
const revealed = ref<Record<number, string>>({});

const itemModal = ref<InstanceType<typeof VaultItemModal> | null>(null);
const deleteOpen = ref(false);
const pendingDelete = ref<VaultItem | null>(null);

const apiError = (error: unknown, fallback: string): string => {
	const err = error as { data?: { errors?: { title?: string; detail?: string }[] } } | null;
	const first = err?.data?.errors?.[0];
	return first?.detail || first?.title || fallback;
};

const loadItems = async () => {
	itemsLoading.value = true;
	revealed.value = {};
	try {
		const response = await $api.vault.listItems();
		items.value = (response.data ?? [])
			.filter(item => item.client_id === props.clientId)
			.sort((a, b) => a.key.localeCompare(b.key));
	}
	catch (error) {
		snackbar.add({ type: 'error', text: apiError(error, 'Failed to load vault entries') });
	}
	finally {
		itemsLoading.value = false;
	}
};

const load = async () => {
	state.value = 'loading';
	try {
		const status = await $api.vault.status();
		if (status.init === 'uninitialized') {
			state.value = 'uninitialized';
		}
		else if (status.status === 'unlocked') {
			state.value = 'unlocked';
			await loadItems();
		}
		else {
			state.value = 'locked';
		}
	}
	catch (error) {
		errorText.value = apiError(error, 'The server didn’t return the vault status.');
		state.value = 'error';
	}
};

const unlock = async () => {
	if (!passphrase.value) return;
	unlocking.value = true;
	try {
		await $api.vault.unlock(passphrase.value);
		passphrase.value = '';
		snackbar.add({ type: 'success', text: 'Vault unlocked' });
		await load();
	}
	catch (error) {
		snackbar.add({ type: 'error', text: apiError(error, 'Failed to unlock the vault. Check the passphrase.') });
	}
	finally {
		unlocking.value = false;
	}
};

const fetchValue = async (item: VaultItem): Promise<string | null> => {
	try {
		const { data } = await $api.vault.showItem(item.id);
		return data.value ?? '';
	}
	catch (error) {
		snackbar.add({ type: 'error', text: apiError(error, `Failed to read ${item.key}`) });
		return null;
	}
};

const toggleReveal = async (item: VaultItem) => {
	if (revealed.value[item.id] !== undefined) {
		revealed.value = Object.fromEntries(
			Object.entries(revealed.value).filter(([id]) => Number(id) !== item.id),
		);
		return;
	}
	const value = await fetchValue(item);
	if (value !== null) revealed.value = { ...revealed.value, [item.id]: value };
};

const copyValue = async (item: VaultItem) => {
	const value = revealed.value[item.id] ?? await fetchValue(item);
	if (value === null) return;
	await copy(value);
	snackbar.add({ type: 'success', text: `${item.key} copied` });
};

const confirmDelete = async () => {
	if (!pendingDelete.value) return;
	try {
		await $api.vault.deleteItem(pendingDelete.value.id);
		snackbar.add({ type: 'success', text: 'Vault entry deleted' });
		deleteOpen.value = false;
		await loadItems();
	}
	catch (error) {
		snackbar.add({ type: 'error', text: apiError(error, 'Failed to delete the entry') });
	}
};

const rowActions = (item: VaultItem) => [
	{ label: 'Edit', icon: Pencil, action: () => itemModal.value?.openForEdit(item) },
	{
		label: 'Delete',
		icon: Trash2,
		danger: true,
		action: () => {
			pendingDelete.value = item;
			deleteOpen.value = true;
		},
	},
];

const formatDate = (value: string | Date | null | undefined) => {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

onMounted(load);
watch(() => props.clientId, load);
</script>
