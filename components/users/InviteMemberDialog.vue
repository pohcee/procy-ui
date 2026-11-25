<template>
	<OpDialog
		:model-value="modelValue"
		:title="title"
		:description="outcome ? undefined : 'An existing account gets an invitation to accept; a new address gets an account with a one-time password.'"
		size="md"
		:as-form="!outcome"
		@update:model-value="!$event && close()"
		@submit="submit"
	>
		<!-- New account: its one-time password -->
		<OneTimePassword
			v-if="outcome?.kind === 'new-account'"
			v-model:copied="copied"
			:username="outcome.username"
			:password="outcome.password"
			lost-hint="It can't be shown again; if it's lost, remove the member and invite them again."
		/>

		<!-- Existing account: waiting for its owner -->
		<div
			v-else-if="outcome?.kind === 'pending'"
			class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-blue-bg p-3.5 text-sm text-app-text"
			role="status"
		>
			<MailCheck
				class="mt-px h-[18px] w-[18px] shrink-0 text-app-blue"
				aria-hidden="true"
			/>
			<span>
				<span class="font-semibold">{{ outcome.username }}</span> already has an account. They become a member when
				they accept the invitation, which they see after signing in. Until then it is listed under pending invitations,
				where you can withdraw it.
			</span>
		</div>

		<!-- The form -->
		<div
			v-else
			class="flex flex-col gap-4"
		>
			<OpField
				label="Email or login"
				for-id="invite-username"
				:error="touched ? loginError : null"
			>
				<OpInput
					id="invite-username"
					v-model="username"
					type="email"
					autocapitalize="none"
					spellcheck="false"
					:invalid="touched && !!loginError"
					@blur="touched = true"
				/>
			</OpField>
			<div class="st-field">
				<label
					class="st-label"
					for="invite-groups"
				>Groups</label>
				<div class="st-multiselect">
					<Multiselect
						id="invite-groups"
						v-model="picked"
						mode="tags"
						placeholder="Select or type in …"
						:hide-selected="false"
						:close-on-select="false"
						:create-option="true"
						:searchable="true"
						:options="groupOptions"
					/>
				</div>
				<span class="text-[13px] text-app-text-3">Their permissions in this organization only.</span>
			</div>
			<OpField
				label="2FA delivery"
				for-id="invite-2fa"
				hint="(new accounts, when the server sends 2FA codes)"
				help="Email address or phone number the codes go to. An existing account keeps its own."
			>
				<OpInput
					id="invite-2fa"
					v-model="twoFaSendTo"
					autocapitalize="none"
					spellcheck="false"
				/>
			</OpField>
			<p
				v-if="error"
				role="alert"
				class="rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
			>
				{{ error }}
			</p>
		</div>

		<template #footer>
			<template v-if="outcome">
				<div class="flex-1" />
				<AppButton @click="close">
					{{ outcome.kind === 'new-account' && !copied ? 'I have saved the password' : 'Done' }}
				</AppButton>
			</template>
			<template v-else>
				<AppButton
					variant="secondary"
					@click="close"
				>
					Cancel
				</AppButton>
				<div class="flex-1" />
				<AppButton
					type="submit"
					:disabled="saving"
				>
					{{ saving ? 'Inviting…' : 'Invite' }}
				</AppButton>
			</template>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import Multiselect from '@vueform/multiselect';
import { MailCheck } from 'lucide-vue-next';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OneTimePassword from '~/components/users/OneTimePassword.vue';
import type { UserGroup } from '~/types';
import { inviteLoginError, type InviteOutcome } from '~/utils/membership';

const props = defineProps<{ modelValue: boolean; groups: UserGroup[] }>();
const emit = defineEmits<{
	(e: 'update:modelValue', open: boolean): void;
	(e: 'invited', outcome: InviteOutcome): void;
}>();

const { $api } = useNuxtApp();

const username = ref('');
const picked = ref<string[]>([]);
const twoFaSendTo = ref('');
const touched = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
// Held only while this dialog is open; cleared on close so the password isn't kept in memory.
const outcome = ref<InviteOutcome | null>(null);
const copied = ref(false);

const groupOptions = computed(() => props.groups.map(g => g.name));
const loginError = computed(() => inviteLoginError(username.value));
const title = computed(() => {
	if (outcome.value?.kind === 'new-account') return 'Account created';
	if (outcome.value?.kind === 'pending') return 'Invitation sent';
	return 'Invite a member';
});

watch(() => props.modelValue, (open) => {
	if (!open) return;
	username.value = '';
	picked.value = [];
	twoFaSendTo.value = '';
	touched.value = false;
	error.value = null;
	outcome.value = null;
	copied.value = false;
});

const submit = async () => {
	touched.value = true;
	if (loginError.value || saving.value || outcome.value) return;
	saving.value = true;
	error.value = null;
	try {
		const login = username.value.trim();
		const res = await $api.membership.invite({
			username: login,
			groups: picked.value,
			...(twoFaSendTo.value.trim() ? { two_fa_send_to: twoFaSendTo.value.trim() } : {}),
		});
		outcome.value = res;
		emit('invited', res.kind === 'new-account' ? { ...res, password: '' } : res);
	}
	catch (e) {
		const status = httpStatusOf(e);
		error.value = status === 409
			? `${username.value.trim()} is a member of this organization already.`
			: `Couldn't invite: ${apiErrorMessage(e)}`;
	}
	finally {
		saving.value = false;
	}
};

const close = () => {
	outcome.value = null;
	copied.value = false;
	emit('update:modelValue', false);
};
</script>
