<template>
	<BaseModal v-model="internalIsOpen">
		<div
			class="relative z-20 w-full max-w-screen-xl items-center rounded border border-slate-400 bg-gray-100 px-5 py-10 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<form @submit.prevent="save">
				<div
					class="mt-0.5 px-0 pt-2.5"
				>
					<div
						class="flex items-center gap-4 py-2 pr-4"
					>
						<div>
							Connection state
						</div>
						<div
							class="flex items-center gap-2"
						>
							<input
								id="connection_state-any"
								v-model="internalConnectionState"
								type="radio"
								name="connection_state"
								class="h-4 w-4 border-theme-border focus:ring-2 focus:ring-blue-300"
								value=""
							><label
								for="connection_state-any"
								class="block text-sm font-medium text-gray-900 dark:text-slate-200"
							>any</label>
						</div>
						<div
							class="flex items-center gap-2"
						>
							<input
								id="connection_state-connected"
								v-model="internalConnectionState"
								type="radio"
								name="connection_state"
								class="h-4 w-4 border-theme-border focus:ring-2 focus:ring-blue-300"
								value="connected"
							><label
								for="connection_state-connected"
								class="block text-sm font-medium text-gray-900 dark:text-slate-200"
							>connected</label>
						</div>
						<div
							class="flex items-center gap-2"
						>
							<input
								id="connection_state-disconnected"
								v-model="internalConnectionState"
								type="radio"
								name="connection_state"
								class="h-4 w-4 border-theme-border focus:ring-2 focus:ring-blue-300"
								value="disconnected"
							><label
								for="connection_state-disconnected"
								class="block text-sm font-medium text-gray-900 dark:text-slate-200"
							>disconnected</label>
						</div>
					</div>
					<div
						class="flex items-center justify-end gap-2 pt-3"
					>
						<button
							class="bg-vtd-secondary-600 hover:bg-vtd-secondary-400 focus-visible:outline-vtd-secondary-600 disabled:bg-vtd-secondary-600/40 disabled:hover:bg-vtd-secondary-600/40 disabled:focus-visible:outline-vtd-secondary-600/40 text-white disabled:text-gray-600 cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
							type="button"
							@click="close"
						>
							<span class="flex items-center justify-center gap-x-2"> Cancel </span>
						</button>
						<button
							class="bg-vtd-primary-500 hover:bg-vtd-primary-700 focus-visible:outline-vtd-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
							type="submit"
						>
							<span class="flex items-center justify-center gap-x-2"> Apply </span>
						</button>
					</div>
				</div>
			</form>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { BaseModal } from '~/components/ui/base-modal';

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

<style scoped>
.info {
  max-width: calc(100% - 30px)
}

.toolbar-search>div {
  margin-top: 0
}

.toolbar-search .input-text {
  --tw-border-opacity: 1;
  border-color: #94a3b8;
  border-color: rgb(148 163 184/var(--tw-border-opacity));
  border-radius: .25rem
}
</style>
