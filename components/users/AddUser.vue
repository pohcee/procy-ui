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
			<div
				v-if="signInSupported && !systemOrg"
				class="st-field"
			>
				<label
					class="st-label"
					:for="`${uid}-sign-in`"
				>Sign-in</label>
				<select
					:id="`${uid}-sign-in`"
					v-model="user.signIn"
					class="st-ctl"
				>
					<option
						v-for="option in signInOptions"
						:key="option.value"
						:value="option.value"
						:disabled="option.disabled"
					>
						{{ option.label }}
					</option>
				</select>
				<span class="st-help">{{ signInHelp }}</span>
			</div>
			<p
				v-if="systemOrg"
				class="rounded-[10px] bg-app-muted p-3 text-[13px] text-app-text-2"
				role="note"
			>
				Platform operators sign in with Google only: they have no password.
			</p>
			<p
				v-if="shared"
				class="rounded-[10px] bg-app-muted p-3 text-[13px] text-app-text-2"
				role="note"
			>
				{{ user.username }} also belongs to other organizations: only they can change their password and login name.
				You can change their groups in this organization.
			</p>
			<div
				v-if="showPassword"
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
				v-if="showPassword"
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
import { parseSignIn, passwordAllowed, signInLabel, SIGN_IN_METHODS, type SignInMethod } from '~/utils/oidc';

const uid = useId();
const isOpen = ref(false);
const action = ref<'create' | 'edit'>('create');
const originalUsername = ref('');

const props = defineProps({
	/** The server keeps a sign-in method per user (Postgres servers): offer it. */
	signInSupported: {
		type: Boolean,
		default: false,
	},
	/** The operators' organization: Google only, never a password. */
	systemOrg: {
		type: Boolean,
		default: false,
	},
	/** The organization requires Google sign-in: new users get no password. */
	orgRequiresOidc: {
		type: Boolean,
		default: false,
	},
	/** Google sign-in is enabled on the server (else "Google only" would lock the user out). */
	oidcEnabled: {
		type: Boolean,
		default: true,
	},
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
	signIn: 'both' as SignInMethod,
});

const signInOptions = computed(() => SIGN_IN_METHODS.map(value => ({
	value,
	label: signInLabel(value),
	disabled: (value === 'oidc' && !props.oidcEnabled) || (value === 'password' && props.orgRequiresOidc),
})));
const signInHelp = computed(() => {
	if (props.orgRequiresOidc) return 'This organization requires Google sign-in.';
	if (user.value.signIn === 'oidc') return 'Signs in with the Google account of this email address; no password.';
	return 'Google sign-in uses the Google account of the username’s email address.';
});
/** Password fields: not for shared accounts, Google-only users, operators, or new users where Google is required. */
const showPassword = computed(() => !shared.value && passwordAllowed({
	signIn: props.signInSupported ? user.value.signIn : null,
	systemOrg: props.systemOrg,
	orgRequiresOidc: action.value === 'create' && props.orgRequiresOidc,
}));

const emit = defineEmits(['close', 'save']);

const open = () => {
	action.value = 'create';
	shared.value = false;
	originalUsername.value = '';
	user.value = { username: '', groups: [], password: '', confirmPassword: '', signIn: props.orgRequiresOidc ? 'oidc' : 'both' };
	generatePassword();
	isOpen.value = true;
};

const openForEdit = (existing: User, sharedAccount = false) => {
	action.value = 'edit';
	shared.value = sharedAccount;
	originalUsername.value = existing.username;
	user.value = {
		username: existing.username,
		groups: [...(existing.groups ?? [])],
		password: '',
		confirmPassword: '',
		signIn: parseSignIn(existing.sign_in) ?? 'both',
	};
	isOpen.value = true;
};

const generatePassword = async () => {
	const password = randomPassword(16);
	user.value.password = password;
	user.value.confirmPassword = password;
};

const save = () => {
	if (showPassword.value && user.value.password !== user.value.confirmPassword) return;
	emit('save', {
		username: user.value.username,
		...(showPassword.value ? { password: user.value.password } : {}),
		...(props.signInSupported && !props.systemOrg ? { sign_in: user.value.signIn } : {}),
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
