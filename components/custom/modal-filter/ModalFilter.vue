<template>
	<OpDialog
		:model-value="internalIsOpen"
		title="Filters"
		size="sm"
		as-form
		@update:model-value="v => !v && close()"
		@submit="save"
	>
		<fieldset class="flex flex-col gap-2">
			<legend class="mb-2 text-[13px] font-medium text-app-text-2">
				Connection state
			</legend>
			<label
				v-for="option in options"
				:key="option.value"
				:class="[
					'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[10px] border px-3 text-sm text-app-text transition-colors',
					internalConnectionState === option.value
						? 'border-app-accent shadow-[inset_0_0_0_1px_rgb(var(--app-accent))]'
						: 'border-app-border-strong hover:bg-app-hover',
				]"
			>
				<input
					:id="`connection_state-${option.value || 'any'}`"
					v-model="internalConnectionState"
					type="radio"
					name="connection_state"
					class="h-4 w-4 accent-app-accent"
					:value="option.value"
				>
				<span
					v-if="option.dot"
					:class="['h-2 w-2 rounded-full', option.dot]"
					aria-hidden="true"
				/>
				{{ option.label }}
			</label>
		</fieldset>
		<template #footer>
			<AppButton
				variant="secondary"
				@click="close"
			>
				Cancel
			</AppButton>
			<AppButton
				type="submit"
				class="ml-auto"
			>
				Apply
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';

const props = defineProps({
	modelValue: Boolean,
	connectionState: {
		type: String,
		default: '',
	},
});
const emit = defineEmits(['update:modelValue', 'update:connectionState']);
const internalIsOpen = ref(props.modelValue);
const internalConnectionState = ref(props.connectionState);

const options = [
	{ value: '', label: 'Any', dot: '' },
	{ value: 'connected', label: 'Online (connected)', dot: 'bg-[#22C55E]' },
	{ value: 'disconnected', label: 'Offline (disconnected)', dot: 'bg-app-text-4' },
];

watch(() => props.modelValue, (newValue) => {
	internalIsOpen.value = newValue;
});
watch(() => props.connectionState, (newValue) => {
	internalConnectionState.value = newValue;
});

const save = () => {
	emit('update:connectionState', internalConnectionState.value);
	internalIsOpen.value = false;
	emit('update:modelValue', false);
};
const close = () => {
	internalConnectionState.value = props.connectionState;
	internalIsOpen.value = false;
	emit('update:modelValue', false);
};
</script>
