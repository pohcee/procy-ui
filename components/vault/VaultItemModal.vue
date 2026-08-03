<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 w-full max-w-lg rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<h3 class="mb-4 text-lg font-semibold">
				{{ isEditing ? 'Edit' : 'New' }} vault entry
			</h3>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="save"
			>
				<div class="grid grid-cols-2 gap-4">
					<div class="relative flex w-full flex-col">
						<input
							id="vaultItemKey"
							v-model="key"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							:class="{ error: !key }"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="vaultItemKey"
						>Key</label>
					</div>
					<CustomThemedSelect
						id="vaultItemType"
						v-model="type"
						label="Type"
						:options="[{ value: 'secret', label: 'Secret' }, { value: 'text', label: 'Text' }, { value: 'string', label: 'String' }, { value: 'markdown', label: 'Markdown' }]"
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="relative flex w-full flex-col">
						<input
							id="vaultItemClient"
							v-model="clientId"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="vaultItemClient"
						>Client ID (optional, global if empty)</label>
					</div>
					<div class="relative flex w-full flex-col">
						<input
							id="vaultItemGroup"
							v-model="requiredGroup"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="vaultItemGroup"
						>Required user group (optional)</label>
					</div>
				</div>
				<div class="flex flex-col">
					<label
						class="mb-1 text-sm font-normal text-theme-label"
						for="vaultItemValue"
					>Value</label>
					<textarea
						id="vaultItemValue"
						v-model="value"
						rows="4"
						class="primary input-text rounded bg-transparent p-2 text-sm text-theme-inverted shadow-sm focus:outline-0 focus:ring-0"
						:class="{ error: !value }"
					/>
				</div>
				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						class="bg-vtd-secondary-600 hover:bg-vtd-secondary-400 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="button"
						@click="close"
					>
						Cancel
					</button>
					<button
						class="bg-vtd-primary-500 hover:bg-vtd-primary-700 disabled:bg-gray-400 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="submit"
						:disabled="!key || !value || isSaving"
					>
						{{ isEditing ? 'Update' : 'Create' }}
					</button>
				</div>
			</form>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { BaseModal } from '~/components/ui/base-modal';
import type { VaultItem, VaultItemPayload } from '~/types';

const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);

const key = ref('');
const value = ref('');
const type = ref<'text' | 'secret' | 'markdown' | 'string'>('secret');
const clientId = ref('');
const requiredGroup = ref('');

const reset = () => {
	key.value = '';
	value.value = '';
	type.value = 'secret';
	clientId.value = '';
	requiredGroup.value = '';
	editingId.value = null;
};

const openForCreate = () => {
	reset();
	isEditing.value = false;
	isOpen.value = true;
};

const openForEdit = async (item: VaultItem) => {
	reset();
	isEditing.value = true;
	editingId.value = item.id;
	const { data: full } = await $api.vault.showItem(item.id);
	key.value = full.key;
	value.value = full.value ?? '';
	type.value = full.type;
	clientId.value = full.client_id ?? '';
	requiredGroup.value = full.required_group ?? '';
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!key.value || !value.value) return;
	isSaving.value = true;
	try {
		const payload: VaultItemPayload = {
			key: key.value,
			value: value.value,
			type: type.value,
			client_id: clientId.value,
			required_group: requiredGroup.value,
		};
		if (editingId.value) {
			await $api.vault.updateItem(editingId.value, payload);
		}
		else {
			await $api.vault.createItem(payload);
		}
		snackbar.add({ type: 'success', text: `Vault entry ${isEditing.value ? 'updated' : 'created'}` });
		emit('saved');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save vault entry' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
