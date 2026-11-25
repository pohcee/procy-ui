<template>
	<!-- Approve / deny a signup; denying asks for an optional reason in place (an awaiting signup is told by email). -->
	<form
		v-if="denying === row.id"
		class="flex flex-wrap items-center justify-end gap-2"
		@submit.prevent="emit('confirm-deny', row, reason.trim())"
	>
		<label
			:for="`deny-reason-${row.id}`"
			class="sr-only"
		>Reason (optional)</label>
		<OpInput
			:id="`deny-reason-${row.id}`"
			v-model="reason"
			class="!h-9 !w-48"
			placeholder="Reason (optional)"
			maxlength="500"
		/>
		<AppButton
			type="submit"
			size="sm"
			variant="danger"
			class="border border-app-border-strong"
			:disabled="busy === row.id"
		>
			{{ busy === row.id ? 'Denying…' : 'Deny' }}
		</AppButton>
		<AppButton
			size="sm"
			variant="ghost"
			@click="emit('cancel-deny')"
		>
			Cancel
		</AppButton>
	</form>
	<div
		v-else-if="info.approve || info.deny"
		class="flex flex-wrap justify-end gap-2"
	>
		<AppButton
			v-if="info.approve"
			size="sm"
			:disabled="busy === row.id"
			@click="emit('approve', row)"
		>
			{{ busy === row.id ? 'Approving…' : 'Approve' }}
		</AppButton>
		<AppButton
			v-if="info.deny"
			size="sm"
			variant="secondary"
			:disabled="busy === row.id"
			@click="emit('deny', row)"
		>
			Deny
		</AppButton>
	</div>
</template>

<script setup lang="ts">
import OpInput from '~/components/operate/OpInput.vue';
import { signupStatusInfo, type SignupRow } from '~/utils/signup';

const props = defineProps<{ row: SignupRow; busy: string | null; denying: string | null }>();
const emit = defineEmits<{
	(e: 'approve' | 'deny', row: SignupRow): void;
	(e: 'confirm-deny', row: SignupRow, reason: string): void;
	(e: 'cancel-deny'): void;
}>();

const info = computed(() => signupStatusInfo(props.row.status));
const reason = ref('');
watch(() => props.denying, () => {
	reason.value = '';
});
</script>
