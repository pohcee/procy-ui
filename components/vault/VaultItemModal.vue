<template>
	<SettingsDialog
		v-model="isOpen"
		:title="isEditing ? 'Edit vault entry' : 'New vault entry'"
		:submit-text="isEditing ? 'Update' : 'Create'"
		:submit-disabled="!key || !value || isSaving"
		wide
		@submit="save"
	>
		<div class="st-grid2">
			<div class="st-field">
				<label
					class="st-label"
					for="vaultItemKey"
				>Key</label>
				<input
					id="vaultItemKey"
					v-model="key"
					class="st-ctl font-mono"
					type="text"
					autocomplete="off"
					required
				>
			</div>
			<div class="st-field">
				<label
					class="st-label"
					for="vaultItemType"
				>Type</label>
				<select
					id="vaultItemType"
					v-model="type"
					class="st-ctl"
				>
					<option value="secret">
						Secret
					</option>
					<option value="text">
						Text
					</option>
					<option value="string">
						String
					</option>
					<option value="markdown">
						Markdown
					</option>
				</select>
			</div>
			<div class="st-field">
				<label
					class="st-label"
					for="vaultItemClient"
				>Client ID <span class="font-normal text-app-text-3">(optional)</span></label>
				<input
					id="vaultItemClient"
					v-model="clientId"
					class="st-ctl font-mono"
					type="text"
					autocomplete="off"
					aria-describedby="vaultItemClientHelp"
				>
				<span
					id="vaultItemClientHelp"
					class="st-help"
				>Leave empty for a global entry.</span>
			</div>
			<div class="st-field">
				<label
					class="st-label"
					for="vaultItemGroup"
				>Required user group <span class="font-normal text-app-text-3">(optional)</span></label>
				<input
					id="vaultItemGroup"
					v-model="requiredGroup"
					class="st-ctl"
					type="text"
					autocomplete="off"
				>
			</div>
		</div>
		<div class="st-field">
			<label
				class="st-label"
				for="vaultItemValue"
			>Value</label>
			<textarea
				id="vaultItemValue"
				v-model="value"
				rows="5"
				class="st-ctl"
				required
			/>
		</div>
	</SettingsDialog>
</template>

<script setup lang="ts">
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

/** Open an empty form; pass a client ID to attach the new entry to that host. */
const openForCreate = (forClientId = '') => {
	reset();
	clientId.value = forClientId;
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
