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
		<div
			v-if="created"
			class="flex flex-col gap-4"
		>
			<div
				role="alert"
				class="flex items-start gap-2.5 rounded-[10px] border border-app-warn/30 bg-app-warn-bg p-3 text-[13px] text-app-warn"
			>
				<TriangleAlert
					class="mt-px h-[18px] w-[18px] shrink-0"
					aria-hidden="true"
				/>
				<span>
					<span class="font-semibold">Copy the password now: it is shown only this once.</span>
					It can't be shown again; if it's lost, create another administrator. Send it over a trusted channel.
				</span>
			</div>
			<dl class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-sm">
				<dt class="text-app-text-3">
					Organization
				</dt>
				<dd class="font-mono text-app-text">
					{{ created.organization }}
				</dd>
				<dt class="text-app-text-3">
					Username
				</dt>
				<dd class="font-mono text-app-text">
					{{ created.username }}
				</dd>
				<dt class="text-app-text-3">
					Password
				</dt>
				<dd class="flex min-w-0 items-center gap-1.5">
					<code
						class="min-w-0 flex-1 select-all break-all rounded-lg border border-app-border-strong bg-app-surface-2 px-3 py-2 font-mono text-[13px] text-app-text"
						data-testid="one-time-password"
					>{{ created.password }}</code>
					<button
						type="button"
						:aria-label="copied ? 'Password copied' : 'Copy password'"
						:title="copied ? 'It’s in your clipboard' : 'Copy to clipboard'"
						class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-app-border-strong text-app-text-2 hover:bg-app-hover hover:text-app-text"
						@click="copyPassword"
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
					</button>
				</dd>
			</dl>
			<p class="text-[13px] text-app-text-3">
				They must set a new password when they first sign in.
			</p>
		</div>

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
import { useClipboard } from '@vueuse/core';
import { Check, Copy, TriangleAlert } from 'lucide-vue-next';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import type { Organization, OrganizationAdmin } from '~/repository/modules/operator';

const props = defineProps<{ org: Organization | null }>();
const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'created', admin: OrganizationAdmin): void;
}>();

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { copy, isSupported } = useClipboard({ legacy: true });

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

const copyPassword = async () => {
	if (!created.value) return;
	if (!isSupported.value) {
		snackbar.add({ type: 'error', text: 'Clipboard is not available; select the password and copy it.' });
		return;
	}
	await copy(created.value.password);
	copied.value = true;
};

const close = () => {
	created.value = null;
	copied.value = false;
	emit('close');
};
</script>
