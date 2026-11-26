<template>
	<SettingsDialog
		v-model="isOpen"
		:title="isEditing ? 'Edit client group' : 'New client group'"
		:submit-text="isEditing ? 'Update' : 'Create'"
		:submit-disabled="!id || isSaving"
		@submit="save"
	>
		<div class="st-field">
			<label
				class="st-label"
				for="groupId"
			>Group ID</label>
			<input
				id="groupId"
				v-model="id"
				class="st-ctl font-mono"
				type="text"
				:disabled="isEditing"
				autocomplete="off"
				required
			>
		</div>
		<div class="st-field">
			<label
				class="st-label"
				for="groupDescription"
			>Description</label>
			<input
				id="groupDescription"
				v-model="description"
				class="st-ctl"
				type="text"
				autocomplete="off"
			>
		</div>
		<div class="st-field">
			<label
				class="st-label"
				for="groupUserGroups"
			>Allowed user groups</label>
			<input
				id="groupUserGroups"
				v-model="allowedUserGroupsText"
				class="st-ctl"
				type="text"
				autocomplete="off"
				placeholder="e.g. admins, operators"
				aria-describedby="groupUserGroupsHelp"
			>
			<span
				id="groupUserGroupsHelp"
				class="st-help"
			>Comma separated. Leave empty to allow all users.</span>
		</div>
	</SettingsDialog>
</template>

<script setup lang="ts">
import type { ClientGroup } from '~/types';
import { clientGroupSavePayload } from '~/utils/clientGroup';

const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);

const id = ref('');
const description = ref('');
const allowedUserGroupsText = ref('');

const reset = () => {
	id.value = '';
	description.value = '';
	allowedUserGroupsText.value = '';
};

const openForCreate = () => {
	reset();
	isEditing.value = false;
	isOpen.value = true;
};

const openForEdit = (group: ClientGroup) => {
	reset();
	isEditing.value = true;
	id.value = group.id;
	description.value = group.description ?? '';
	allowedUserGroupsText.value = (group.allowed_user_groups ?? []).join(', ');
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!id.value) return;
	isSaving.value = true;
	try {
		const payload = clientGroupSavePayload({
			id: id.value,
			description: description.value,
			allowedUserGroupsText: allowedUserGroupsText.value,
		}, isEditing.value);
		if (isEditing.value) {
			await $api.groups.update(id.value, payload);
		}
		else {
			await $api.groups.create(payload);
		}
		snackbar.add({ type: 'success', text: `Client group ${isEditing.value ? 'updated' : 'created'}` });
		emit('saved');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save client group' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
