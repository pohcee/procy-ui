<template>
	<SettingsDialog
		v-model="isOpen"
		:title="createdToken ? 'Token created' : (isEditing ? 'Edit API token' : 'New API token')"
		:submit-text="isEditing ? 'Update' : 'Create'"
		:submit-disabled="!name || isSaving"
		@submit="save"
		@close="close"
	>
		<template v-if="createdToken">
			<div class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-warn-row p-3.5 text-[13px] text-app-text-2">
				<TriangleAlert
					class="mt-px h-[18px] w-[18px] shrink-0 text-app-warn"
					aria-hidden="true"
				/>
				<div>
					<strong class="font-semibold text-app-text">Copy this token now.</strong>
					You won’t be able to see it again.
				</div>
			</div>
			<div class="st-field">
				<span class="st-label">API token</span>
				<div class="flex items-stretch gap-2">
					<code class="min-w-0 flex-1 break-all rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-app-text">{{ createdToken }}</code>
					<AppButton
						variant="secondary"
						class="shrink-0 self-start"
						@click="copy(createdToken)"
					>
						<Check
							v-if="copied"
							class="h-4 w-4 text-app-ok"
							aria-hidden="true"
						/>
						<Copy
							v-else
							class="h-4 w-4"
							aria-hidden="true"
						/>
						{{ copied ? 'Copied' : 'Copy' }}
					</AppButton>
				</div>
			</div>
		</template>
		<template v-else>
			<div class="st-field">
				<label
					class="st-label"
					for="apiTokenName"
				>Name</label>
				<input
					id="apiTokenName"
					v-model="name"
					class="st-ctl"
					type="text"
					autocomplete="off"
					required
				>
			</div>
			<div
				v-if="!isEditing"
				class="st-field"
			>
				<label
					class="st-label"
					for="apiTokenScope"
				>Scope</label>
				<select
					id="apiTokenScope"
					v-model="scope"
					class="st-ctl"
				>
					<option value="read">
						Read
					</option>
					<option value="read+write">
						Read + write
					</option>
					<option value="clients-auth">
						Clients auth (admin)
					</option>
				</select>
			</div>
			<div class="st-field">
				<label
					class="st-label"
					for="apiTokenExpires"
				>Expires at <span class="font-normal text-app-text-3">(optional)</span></label>
				<input
					id="apiTokenExpires"
					v-model="expiresAt"
					class="st-ctl"
					type="date"
					autocomplete="off"
				>
			</div>
		</template>
		<template
			v-if="createdToken"
			#footer
		>
			<div class="flex-1" />
			<AppButton @click="close">
				Done
			</AppButton>
		</template>
	</SettingsDialog>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { Check, Copy, TriangleAlert } from 'lucide-vue-next';
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
