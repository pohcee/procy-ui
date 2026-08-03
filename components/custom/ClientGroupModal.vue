<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 w-full max-w-md rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<h3 class="mb-4 text-lg font-semibold">
				{{ isEditing ? 'Edit' : 'New' }} client group
			</h3>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="save"
			>
				<div class="relative flex w-full flex-col">
					<input
						id="groupId"
						v-model="id"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						:class="{ error: !id }"
						placeholder=" "
						type="text"
						:disabled="isEditing"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="groupId"
					>Group ID</label>
				</div>
				<div class="relative flex w-full flex-col">
					<input
						id="groupDescription"
						v-model="description"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						placeholder=" "
						type="text"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="groupDescription"
					>Description</label>
				</div>
				<div class="relative flex w-full flex-col">
					<input
						id="groupUserGroups"
						v-model="allowedUserGroupsText"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						placeholder=" "
						type="text"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="groupUserGroups"
					>Allowed user groups (comma separated, empty = all)</label>
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
						:disabled="!id || isSaving"
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
import type { ClientGroup } from '~/types';

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
		const allowedUserGroups = allowedUserGroupsText.value
			.split(',')
			.map(group => group.trim())
			.filter(Boolean);
		const payload: Partial<ClientGroup> = {
			id: id.value,
			description: description.value,
			allowed_user_groups: allowedUserGroups,
		};
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
