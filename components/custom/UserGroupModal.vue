<template>
	<SettingsDialog
		v-model="isOpen"
		:title="isEditing ? `Edit user group` : 'New user group'"
		:submit-text="isEditing ? 'Update' : 'Create'"
		:submit-disabled="!name || isSaving"
		@submit="save"
	>
		<div class="st-field">
			<label
				class="st-label"
				for="userGroupName"
			>Group name</label>
			<input
				id="userGroupName"
				v-model="name"
				class="st-ctl"
				type="text"
				:disabled="isEditing"
				autocomplete="off"
				required
			>
		</div>
		<fieldset class="flex flex-col gap-2">
			<legend class="st-label mb-2">
				Permissions
			</legend>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				<label
					v-for="permission in permissionKeys"
					:key="permission"
					:class="[
						'flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 rounded-[10px] border px-3 text-sm first-letter:uppercase transition-colors',
						permissions[permission]
							? 'border-app-accent bg-app-blue-bg/60 text-app-text'
							: 'border-app-border-strong bg-app-surface-2 text-app-text-2 hover:bg-app-hover',
					]"
				>
					<input
						v-model="permissions[permission]"
						type="checkbox"
						class="st-check"
					>
					{{ permissionLabels[permission] ?? permission }}
				</label>
			</div>
			<p class="st-help">
				On conflicting permissions, authorization wins over the denial.
			</p>
		</fieldset>
	</SettingsDialog>
</template>

<script setup lang="ts">
import type { Permissions, UserGroup } from '~/types';

const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const permissionKeys: (keyof Permissions)[] = ['commands', 'monitoring', 'scheduler', 'tunnels', 'uploads', 'vault', 'auditlog'];

const permissionLabels: Partial<Record<keyof Permissions, string>> = {
	commands: 'Run commands and scripts',
};

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);

const name = ref('');
const permissions = reactive<Permissions>({
	commands: false,
	monitoring: false,
	scheduler: false,
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
