<template>
	<Modal
		v-model="isOpen"
		:title="action === 'edit' ? 'Edit user' : 'New user'"
		ok-text="Save"
		cancel-text="Cancel"
		:show-cancel="true"
		@ok="save"
		@close="close"
	>
		<div class="flex flex-col gap-4">
			<div class="st-field">
				<label
					class="st-label"
					:for="`${uid}-username`"
				>Username</label>
				<input
					:id="`${uid}-username`"
					v-model="user.username"
					class="st-ctl"
					type="text"
					autocomplete="off"
					:readonly="shared"
				>
			</div>
			<div class="st-field">
				<label
					class="st-label"
					:for="`${uid}-groups`"
				>Groups</label>
				<div class="st-multiselect">
					<Multiselect
						:id="`${uid}-groups`"
						v-model="user.groups"
						mode="tags"
						placeholder="Select or type in …"
						:hide-selected="false"
						:close-on-select="false"
						:create-option="true"
						:searchable="true"
						:options="groups?.map(item => item.name)"
					/>
				</div>
			</div>
			<p
				v-if="shared"
				class="rounded-[10px] bg-app-muted p-3 text-[13px] text-app-text-2"
				role="note"
			>
				{{ user.username }} also belongs to other organizations: only they can change their password and login name.
				You can change their groups in this organization.
			</p>
			<div
				v-if="!shared"
				class="st-field"
			>
				<label
					class="st-label"
					:for="`${uid}-password`"
				>Password<span
					v-if="action === 'edit'"
					class="font-normal text-app-text-3"
				> (leave blank to keep unchanged)</span></label>
				<div class="flex items-center gap-2">
					<input
						:id="`${uid}-password`"
						v-model="user.password"
						class="st-ctl font-mono"
						type="text"
						autocomplete="off"
					>
					<AppButton
						variant="secondary"
						class="!w-11 shrink-0 !px-0"
						aria-label="Generate a random password"
						title="Generate a random password"
						@click="generatePassword"
					>
						<KeyRound
							class="h-[18px] w-[18px]"
							aria-hidden="true"
						/>
					</AppButton>
				</div>
			</div>
			<div
				v-if="!shared"
				class="st-field"
			>
				<label
					class="st-label"
					:for="`${uid}-confirm`"
				>Confirm password</label>
				<input
					:id="`${uid}-confirm`"
					v-model="user.confirmPassword"
					:class="['st-ctl font-mono', { 'st-invalid': user.password !== user.confirmPassword }]"
					type="text"
					autocomplete="off"
				>
				<span
					v-if="user.password !== user.confirmPassword"
					class="st-error"
					role="alert"
				>Passwords do not match</span>
			</div>
			<p
				v-if="accountNote && action === 'edit' && !shared"
				class="text-[13px] text-app-text-3"
			>
				{{ accountNote }}
			</p>
		</div>
	</Modal>
</template>

<script setup lang="ts">
import Multiselect from '@vueform/multiselect';
import { KeyRound } from 'lucide-vue-next';
import type { PropType } from 'vue';
import Modal from '~/components/Modal.vue';
import { randomPassword } from '@/lib/utils';
import type { User, UserGroup } from '~/types';

const uid = useId();
const isOpen = ref(false);
const action = ref<'create' | 'edit'>('create');
const originalUsername = ref('');

defineProps({
	groups: {
		type: Array as PropType<UserGroup[]>,
		default: () => [],
	},
	/** Shown under the password when editing (organizations: who can change an account's password). */
	accountNote: {
		type: String,
		default: undefined,
	},
});
/** The member belongs to other organizations too: its password and login name aren't editable here. */
const shared = ref(false);
const user = ref({
	username: '',
	groups: [] as string[],
	password: '',
	confirmPassword: '',
});

const emit = defineEmits(['close', 'save']);

const open = () => {
	action.value = 'create';
	shared.value = false;
	originalUsername.value = '';
	user.value = { username: '', groups: [], password: '', confirmPassword: '' };
	generatePassword();
	isOpen.value = true;
};

const openForEdit = (existing: User, sharedAccount = false) => {
	action.value = 'edit';
	shared.value = sharedAccount;
	originalUsername.value = existing.username;
	user.value = { username: existing.username, groups: [...(existing.groups ?? [])], password: '', confirmPassword: '' };
	isOpen.value = true;
};

const generatePassword = async () => {
	const password = randomPassword(16);
	user.value.password = password;
	user.value.confirmPassword = password;
};

const save = () => {
	if (user.value.password !== user.value.confirmPassword) return;
	emit('save', {
		username: user.value.username,
		password: user.value.password,
		groups: user.value.groups,
		originalUsername: originalUsername.value,
		action: action.value,
	});
	close();
};
const close = () => {
	isOpen.value = false;
};
defineExpose({ open, openForEdit });
</script>

<style src="@vueform/multiselect/themes/default.css"></style>

<style>
/* @vueform/multiselect themed with the Procy tokens (dropdown is not teleported). */
.st-multiselect .multiselect {
	--ms-bg: rgb(var(--app-surface-2));
	--ms-border-color: rgb(var(--app-border-strong));
	--ms-border-color-active: rgb(var(--app-accent));
	--ms-radius: 10px;
	--ms-ring-color: rgb(var(--app-accent) / 0.25);
	--ms-ring-width: 2px;
	--ms-font-size: 14px;
	--ms-py: 0.55rem;
	--ms-placeholder-color: rgb(var(--app-text-4));
	--ms-caret-color: rgb(var(--app-text-3));
	--ms-clear-color: rgb(var(--app-text-3));
	--ms-clear-color-hover: rgb(var(--app-text));
	--ms-tag-bg: rgb(var(--app-chip));
	--ms-tag-color: rgb(var(--app-text-2));
	--ms-tag-radius: 6px;
	--ms-tag-font-weight: 500;
	--ms-dropdown-bg: rgb(var(--app-surface));
	--ms-dropdown-border-color: rgb(var(--app-border));
	--ms-dropdown-radius: 10px;
	--ms-option-bg-pointed: rgb(var(--app-hover));
	--ms-option-color-pointed: rgb(var(--app-text));
	--ms-option-bg-selected: rgb(var(--app-accent));
	--ms-option-color-selected: #fff;
	--ms-option-bg-selected-pointed: rgb(var(--app-accent-hover));
	--ms-option-color-selected-pointed: #fff;
	--ms-empty-color: rgb(var(--app-text-3));
	min-height: 44px;
	color: rgb(var(--app-text));
}
.st-multiselect .multiselect-search,
.st-multiselect .multiselect-tags-search {
	background: transparent;
	color: rgb(var(--app-text));
}
</style>
