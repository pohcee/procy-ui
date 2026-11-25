<template>
	<OpDialog
		:model-value="!!org"
		:title="`Device limit of ${org?.name ?? ''}`"
		:description="org ? `It has ${org.device_count} device${org.device_count === 1 ? '' : 's'} now. A lower limit doesn't remove devices; new ones are refused.` : undefined"
		size="sm"
		as-form
		@update:model-value="!$event && emit('close')"
		@submit="submit"
	>
		<div class="flex flex-col gap-4">
			<OpField
				label="Most devices"
				for-id="org-limit"
				help="Leave empty for no limit."
				:error="limit.error"
			>
				<OpInput
					id="org-limit"
					v-model="limitText"
					inputmode="numeric"
					:invalid="!!limit.error"
					placeholder="No limit"
				/>
			</OpField>
			<p
				v-if="org && limit.value !== null && !limit.error && limit.value < org.device_count"
				class="rounded-[10px] bg-app-warn-bg p-3 text-[13px] text-app-warn"
			>
				Below its current {{ org.device_count }} devices: no new device can join until some are removed.
			</p>
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
				@click="emit('close')"
			>
				Cancel
			</AppButton>
			<div class="flex-1" />
			<AppButton
				type="submit"
				:disabled="saving"
			>
				{{ saving ? 'Saving…' : 'Save limit' }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import type { Organization } from '~/repository/modules/operator';
import { parseDeviceLimit } from '~/utils/usage';

const props = defineProps<{ org: Organization | null }>();
const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'saved', org: Organization): void;
}>();

const { $api } = useNuxtApp();
const limitText = ref('');
const saving = ref(false);
const error = ref<string | null>(null);
const limit = computed(() => parseDeviceLimit(limitText.value));

watch(() => props.org, (org) => {
	if (!org) return;
	limitText.value = org.device_limit === null || org.device_limit === undefined ? '' : String(org.device_limit);
	error.value = null;
}, { immediate: true });

const submit = async () => {
	if (!props.org || limit.value.error || saving.value) return;
	saving.value = true;
	error.value = null;
	try {
		emit('saved', await $api.operator.setDeviceLimit(props.org.id, limit.value.value));
	}
	catch (e) {
		error.value = `Couldn't set the limit: ${apiErrorMessage(e)}`;
	}
	finally {
		saving.value = false;
	}
};
</script>
