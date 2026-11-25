<template>
	<OpDialog
		:model-value="modelValue"
		title="Create organization"
		description="A new, active organization with the built-in library entries. Add its first administrator next."
		size="md"
		as-form
		@update:model-value="emit('update:modelValue', $event)"
		@submit="submit"
	>
		<div class="flex flex-col gap-4">
			<OpField
				label="ID"
				for-id="org-create-id"
				help="Lower-case letters, digits, “-” or “_”. Used in logs and the API; can't be changed."
				:error="touched ? idError : null"
			>
				<OpInput
					id="org-create-id"
					v-model="id"
					mono
					:invalid="touched && !!idError"
					placeholder="e.g. example-corp"
					autocapitalize="none"
					spellcheck="false"
					@blur="touched = true"
				/>
			</OpField>
			<OpField
				label="Name"
				for-id="org-create-name"
				hint="(optional)"
				help="Shown to operators; defaults to the ID."
			>
				<OpInput
					id="org-create-name"
					v-model="name"
					placeholder="e.g. Example Corp"
				/>
			</OpField>
			<OpField
				label="Device limit"
				for-id="org-create-limit"
				hint="(optional)"
				help="The most devices it may have. Leave empty for no limit."
				:error="limit.error"
			>
				<OpInput
					id="org-create-limit"
					v-model="limitText"
					inputmode="numeric"
					:invalid="!!limit.error"
					placeholder="No limit"
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
			<AppButton
				variant="secondary"
				@click="emit('update:modelValue', false)"
			>
				Cancel
			</AppButton>
			<div class="flex-1" />
			<AppButton
				type="submit"
				:disabled="saving"
			>
				{{ saving ? 'Creating…' : 'Create organization' }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import type { Organization } from '~/repository/modules/operator';
import { orgIdError, parseDeviceLimit } from '~/utils/usage';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'created', org: Organization): void;
}>();

const { $api } = useNuxtApp();
const id = ref('');
const name = ref('');
const limitText = ref('');
const touched = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const idError = computed(() => orgIdError(id.value));
const limit = computed(() => parseDeviceLimit(limitText.value));

watch(() => props.modelValue, (open) => {
	if (!open) return;
	id.value = '';
	name.value = '';
	limitText.value = '';
	touched.value = false;
	error.value = null;
});

const submit = async () => {
	touched.value = true;
	if (idError.value || limit.value.error || saving.value) return;
	saving.value = true;
	error.value = null;
	try {
		const org = await $api.operator.create({
			id: id.value.trim(),
			...(name.value.trim() ? { name: name.value.trim() } : {}),
			device_limit: limit.value.value,
		});
		emit('created', org);
		emit('update:modelValue', false);
	}
	catch (e) {
		error.value = httpStatusOf(e) === 409 ? `The ID “${id.value.trim()}” is taken.` : `Couldn't create the organization: ${apiErrorMessage(e)}`;
	}
	finally {
		saving.value = false;
	}
};
</script>
