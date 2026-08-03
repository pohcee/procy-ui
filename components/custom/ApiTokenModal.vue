<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 w-full max-w-md rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<template v-if="createdToken">
				<h3 class="mb-4 text-lg font-semibold">
					Token created
				</h3>
				<p class="mb-2 text-sm text-gray-500">
					Copy this token now. You won't be able to see it again.
				</p>
				<div class="mb-4 flex items-center gap-2 rounded border border-gray-300 bg-gray-50 p-2 font-mono text-xs dark:bg-gray-900">
					<span class="break-all">{{ createdToken }}</span>
					<button
						type="button"
						class="shrink-0 text-primary-600"
						@click="copy(createdToken)"
					>
						{{ copied ? 'Copied!' : 'Copy' }}
					</button>
				</div>
				<div class="flex justify-end">
					<button
						class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="button"
						@click="close"
					>
						Done
					</button>
				</div>
			</template>
			<template v-else>
				<h3 class="mb-4 text-lg font-semibold">
					{{ isEditing ? 'Edit' : 'New' }} API token
				</h3>
				<form
					class="flex flex-col gap-4"
					@submit.prevent="save"
				>
					<div class="relative flex w-full flex-col">
						<input
							id="apiTokenName"
							v-model="name"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							:class="{ error: !name }"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="apiTokenName"
						>Name</label>
					</div>
					<CustomThemedSelect
						v-if="!isEditing"
						id="apiTokenScope"
						v-model="scope"
						label="Scope"
						:options="[{ value: 'read', label: 'Read' }, { value: 'read+write', label: 'Read + write' }, { value: 'clients-auth', label: 'Clients auth (admin)' }]"
					/>
					<div class="relative flex w-full flex-col">
						<input
							id="apiTokenExpires"
							v-model="expiresAt"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="date"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="apiTokenExpires"
						>Expires at</label>
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
			</template>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { BaseModal } from '~/components/ui/base-modal';
import type { APIToken, APITokenPayload } from '~/types';

const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { copy, copied } = useClipboard();

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);
const createdToken = ref<string | null>(null);

const name = ref('');
const scope = ref('read');
const expiresAt = ref('');
const editingPrefix = ref<string | null>(null);

const reset = () => {
	name.value = '';
	scope.value = 'read';
	expiresAt.value = '';
	editingPrefix.value = null;
	createdToken.value = null;
};

const openForCreate = () => {
	reset();
	isEditing.value = false;
	isOpen.value = true;
};

const openForEdit = (token: APIToken) => {
	reset();
	isEditing.value = true;
	editingPrefix.value = token.prefix;
	name.value = token.name;
	scope.value = token.scope;
	expiresAt.value = token.expires_at ? new Date(token.expires_at).toISOString().slice(0, 10) : '';
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
	if (createdToken.value) {
		emit('saved');
	}
};

const save = async () => {
	if (!name.value) return;
	isSaving.value = true;
	try {
		const payload: APITokenPayload = {
			name: name.value,
			scope: scope.value,
			expires_at: (expiresAt.value ? new Date(expiresAt.value) : undefined) as Date,
		};
		if (editingPrefix.value) {
			payload.prefix = editingPrefix.value;
			await $api.profile.update(payload);
			snackbar.add({ type: 'success', text: 'Token updated' });
			emit('saved');
			close();
		}
		else {
			const response = await $api.profile.create(payload);
			createdToken.value = response.data.token ?? null;
			if (!createdToken.value) {
				emit('saved');
				close();
			}
		}
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save token' });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
