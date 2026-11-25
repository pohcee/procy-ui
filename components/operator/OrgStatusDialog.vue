<template>
	<!-- Confirmation step for suspending or reactivating an organization. -->
	<OpDialog
		:model-value="!!org"
		:title="suspending ? `Suspend ${org?.name ?? ''}?` : `Reactivate ${org?.name ?? ''}?`"
		size="sm"
		@update:model-value="!$event && emit('close')"
	>
		<div class="flex flex-col gap-3 text-sm text-app-text-2">
			<template v-if="suspending">
				<p>
					Its <span class="font-semibold text-app-text">{{ org?.user_count }} user{{ org?.user_count === 1 ? '' : 's' }}</span>
					can't sign in, and their sessions and API tokens stop working at once. New device connections are refused.
				</p>
				<p class="text-[13px] text-app-text-3">
					Nothing is deleted; reactivate it to restore access. The action is written to the operator audit log.
				</p>
				<OpField
					label="Type the organization ID to confirm"
					for-id="org-suspend-confirm"
				>
					<OpInput
						id="org-suspend-confirm"
						v-model="typed"
						mono
						:placeholder="org?.id"
						autocapitalize="none"
						spellcheck="false"
					/>
				</OpField>
			</template>
			<p v-else>
				Its users can sign in again and its devices can connect. The action is written to the operator audit log.
			</p>
			<p
				v-if="error"
				role="alert"
				class="rounded-[10px] bg-app-danger-bg p-3 text-app-danger"
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
				:class="suspending ? '!bg-app-danger hover:!bg-app-danger/90' : ''"
				:disabled="saving || (suspending && typed.trim() !== org?.id)"
				@click="confirm"
			>
				{{ saving ? (suspending ? 'Suspending…' : 'Reactivating…') : (suspending ? 'Suspend organization' : 'Reactivate') }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import type { Organization } from '~/repository/modules/operator';

const props = defineProps<{ org: Organization | null }>();
const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'saved', org: Organization): void;
}>();

const { $api } = useNuxtApp();
const typed = ref('');
const saving = ref(false);
const error = ref<string | null>(null);
const suspending = computed(() => props.org?.status !== 'suspended');

watch(() => props.org, () => {
	typed.value = '';
	error.value = null;
});

const confirm = async () => {
	const org = props.org;
	if (!org || saving.value) return;
	saving.value = true;
	error.value = null;
	try {
		emit('saved', suspending.value ? await $api.operator.suspend(org.id) : await $api.operator.activate(org.id));
	}
	catch (e) {
		error.value = `Couldn't ${suspending.value ? 'suspend' : 'reactivate'} it: ${apiErrorMessage(e)}`;
	}
	finally {
		saving.value = false;
	}
};
</script>
