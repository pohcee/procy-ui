<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 w-full max-w-md rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<h3 class="mb-4 text-lg font-semibold">
				{{ isEditing ? 'Edit' : 'New' }} user group
			</h3>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="save"
			>
				<div class="relative flex w-full flex-col">
					<input
						id="userGroupName"
						v-model="name"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						:class="{ error: !name }"
						placeholder=" "
						type="text"
						:disabled="isEditing"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="userGroupName"
					>Group name</label>
				</div>
				<div>
					<p class="mb-2 text-sm font-medium text-theme-label">
						Permissions
					</p>
					<div class="grid grid-cols-2 gap-2">
						<label
							v-for="permission in permissionKeys"
							:key="permission"
							class="flex cursor-pointer select-none items-center gap-2 text-sm capitalize text-theme-label"
						>
							<input
								v-model="permissions[permission]"
								type="checkbox"
								class="h-[16px] w-[16px] rounded"
							>{{ permission }}
						</label>
					</div>
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
						:disabled="!name || isSaving"
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
import type { Permissions, UserGroup } from '~/types';

const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const permissionKeys: (keyof Permissions)[] = ['commands', 'monitoring', 'scheduler', 'scripts', 'tunnels', 'uploads', 'vault', 'auditlog'];

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);

const name = ref('');
const permissions = reactive<Permissions>({
	commands: false,
	monitoring: false,
	scheduler: false,
	scripts: false,
	tunnels: false,
	uploads: false,
	vault: false,
	auditlog: false,
});

const reset = () => {
	name.value = '';
	permissionKeys.forEach((key) => {
		permissions[key] = false;
	});
};

const openForCreate = () => {
	reset();
	isEditing.value = false;
	isOpen.value = true;
};

const openForEdit = (group: UserGroup) => {
	reset();
	isEditing.value = true;
	name.value = group.name;
	permissionKeys.forEach((key) => {
		permissions[key] = !!group.permissions?.[key];
	});
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!name.value) return;
	isSaving.value = true;
	try {
		await $api.userGroups.save(name.value, { permissions: { ...permissions } });
		snackbar.add({ type: 'success', text: `User group ${isEditing.value ? 'updated' : 'created'}` });
		emit('saved');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save user group' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
