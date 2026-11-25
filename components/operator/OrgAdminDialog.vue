<template>
	<OpDialog
		:model-value="!!org"
		:title="created ? 'Administrator created' : `Add an administrator to ${org?.name ?? ''}`"
		:description="created ? undefined : 'A user in the organization\'s Administrators group, with a generated password they change at their first sign-in.'"
		size="md"
		:as-form="!created"
		@update:model-value="!$event && close()"
		@submit="submit"
	>
		<!-- Step 2: the one-time password -->
		<OneTimePassword
			v-if="created"
			v-model:copied="copied"
			:organization="created.organization"
			:username="created.username"
			:password="created.password"
			lost-hint="It can't be shown again; if it's lost, create another administrator."
		/>

		<!-- Step 1: the form -->
		<div
			v-else
			class="flex flex-col gap-4"
		>
			<OpField
				label="Username"
				for-id="org-admin-username"
				help="Unique across all organizations."
				:error="touched && !username.trim() ? 'Enter a username.' : null"
			>
				<OpInput
					id="org-admin-username"
					v-model="username"
					autocapitalize="none"
					spellcheck="false"
					:invalid="touched && !username.trim()"
					@blur="touched = true"
				/>
			</OpField>
			<OpField
				label="2FA delivery"
				for-id="org-admin-2fa"
				hint="(when the server sends 2FA codes)"
				help="Email address or phone number the codes go to."
			>
				<OpInput
					id="org-admin-2fa"
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
			<template v-if="created">
				<div class="flex-1" />
				<AppButton @click="close">
					{{ copied ? 'Done' : 'I have saved the password' }}
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
					{{ saving ? 'Creating…' : 'Create administrator' }}
				</AppButton>
			</template>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OneTimePassword from '~/components/users/OneTimePassword.vue';
import type { Organization, OrganizationAdmin } from '~/repository/modules/operator';

const props = defineProps<{ org: Organization | null }>();
const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'created', admin: OrganizationAdmin): void;
}>();

const { $api } = useNuxtApp();

const username = ref('');
const twoFaSendTo = ref('');
const touched = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
// Held only while this dialog is open; cleared on close so the password isn't kept in memory.
const created = ref<OrganizationAdmin | null>(null);
const copied = ref(false);

watch(() => props.org, (org) => {
	if (!org) return;
	username.value = '';
	twoFaSendTo.value = '';
	touched.value = false;
	error.value = null;
	created.value = null;
	copied.value = false;
});

const submit = async () => {
	touched.value = true;
	if (!props.org || !username.value.trim() || saving.value || created.value) return;
	saving.value = true;
	error.value = null;
	try {
		const admin = await $api.operator.addAdmin(props.org.id, {
			username: username.value.trim(),
			...(twoFaSendTo.value.trim() ? { two_fa_send_to: twoFaSendTo.value.trim() } : {}),
		});
		created.value = admin;
		emit('created', { ...admin, password: '' });
	}
	catch (e) {
		error.value = httpStatusOf(e) === 409
			? 'The organization is suspended; reactivate it first.'
			: `Couldn't create the administrator: ${apiErrorMessage(e)}`;
	}
	finally {
		saving.value = false;
	}
};

const close = () => {
	created.value = null;
	copied.value = false;
	emit('close');
};
</script>
