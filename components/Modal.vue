<template>
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
			aria-hidden="true"
		/>
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6"
			@keydown.esc="closeModal"
		>
			<div
				ref="panel"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				tabindex="-1"
				class="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-app-border bg-app-surface text-left text-app-text shadow-2xl outline-none sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-2xl"
				@click.stop
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
						@click="closeModal"
					>
						<X
							class="h-5 w-5"
							aria-hidden="true"
						/>
					</button>
				</div>
				<div class="relative min-h-[200px] flex-1 overflow-y-auto px-5 py-4">
					<slot />
				</div>
				<div class="flex items-center gap-2.5 border-t border-app-border bg-app-surface-2 px-5 py-3.5">
					<AppButton
						v-if="showCancel"
						variant="secondary"
						@click="onCancel"
					>
						{{ cancelText }}
					</AppButton>
					<div class="flex-1" />
					<AppButton @click="onOk">
						{{ okText }}
					</AppButton>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineOptions({ name: 'AppModal' });

const props = defineProps<{
	modelValue: boolean;
	title: string;
	okText?: string;
	cancelText?: string;
	showCancel?: boolean;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'ok' | 'cancel' | 'close'): void;
}>();

const titleId = useId();
const panel = ref<HTMLElement | null>(null);

// Move focus into the dialog when it opens so Escape and Tab work from the keyboard.
watch(() => props.modelValue, async (open) => {
	if (open) {
		await nextTick();
		panel.value?.focus();
	}
});

const closeModal = () => {
	emit('update:modelValue', false);
	emit('close');
};

const onOk = () => {
	emit('ok');
};

const onCancel = () => {
	emit('cancel');
	closeModal();
};
</script>
