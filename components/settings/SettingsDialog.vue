<template>
	<!--
		Form dialog in the restyled Modal look, for settings forms that need a
		submit button with its own disabled state. Body and footer sit inside a
		<form>; the default footer is Cancel + submit.
	-->
	<BaseModal
		:model-value="modelValue"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<form
			ref="panel"
			role="dialog"
			aria-modal="true"
			:aria-labelledby="titleId"
			tabindex="-1"
			novalidate
			:class="[
				'fixed inset-x-0 bottom-0 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-app-border bg-app-surface text-left text-app-text shadow-2xl outline-none',
				'sm:relative sm:inset-auto sm:max-h-[88dvh] sm:rounded-2xl',
				wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
			]"
			@submit.prevent="emit('submit')"
			@keydown.esc="close"
		>
			<div class="flex items-center justify-between gap-3 border-b border-app-border px-5 py-3.5">
				<h3
					:id="titleId"
					class="text-lg font-semibold text-app-text"
				>
					{{ title }}
				</h3>
				<button
					type="button"
					aria-label="Close"
					class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
					@click="close"
				>
					<X
						class="h-5 w-5"
						aria-hidden="true"
					/>
				</button>
			</div>
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
				<slot />
			</div>
			<div class="flex items-center gap-2.5 border-t border-app-border bg-app-surface-2 px-5 py-3.5">
				<slot name="footer">
					<AppButton
						variant="secondary"
						@click="close"
					>
						Cancel
					</AppButton>
					<div class="flex-1" />
					<AppButton
						type="submit"
						:disabled="submitDisabled"
					>
						{{ submitText }}
					</AppButton>
				</slot>
			</div>
		</form>
	</BaseModal>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { BaseModal } from '~/components/ui/base-modal';

const props = withDefaults(defineProps<{
	modelValue: boolean;
	title: string;
	submitText?: string;
	submitDisabled?: boolean;
	wide?: boolean;
}>(), {
	submitText: 'Save',
	submitDisabled: false,
	wide: false,
});

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'submit' | 'close'): void;
}>();

const titleId = useId();
const panel = ref<HTMLElement | null>(null);

watch(() => props.modelValue, async (open) => {
	if (open) {
		await nextTick();
		panel.value?.focus();
	}
});

const close = () => {
	emit('update:modelValue', false);
	emit('close');
};
</script>
