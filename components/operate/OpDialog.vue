<template>
	<!--
		Dialog shell for the Operate pages' own forms (same look as the shared Modal,
		but with a free-form footer so forms can disable their submit button).
		Bottom sheet on phones, centred panel from `sm` up.
	-->
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
			aria-hidden="true"
		/>
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6"
			@keydown.esc="close"
		>
			<component
				:is="asForm ? 'form' : 'div'"
				ref="panel"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				tabindex="-1"
				:class="[
					'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-app-border bg-app-surface text-left text-app-text shadow-2xl outline-none sm:max-h-[88dvh] sm:rounded-2xl',
					{ sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' }[size],
				]"
				@submit.prevent="$emit('submit')"
			>
				<div class="flex items-start justify-between gap-3 border-b border-app-border px-5 py-3.5">
					<div class="min-w-0 pt-1.5">
						<h3
							:id="titleId"
							class="text-lg font-semibold leading-tight text-app-text"
						>
							{{ title }}
						</h3>
						<p
							v-if="description"
							class="mt-1 text-[13px] text-app-text-3"
						>
							{{ description }}
						</p>
					</div>
					<button
						type="button"
						aria-label="Close"
						class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
						@click="close"
					>
						<X
							class="h-5 w-5"
							aria-hidden="true"
						/>
					</button>
				</div>
				<div class="relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
					<slot />
				</div>
				<div
					v-if="$slots.footer"
					class="flex flex-wrap items-center gap-2.5 border-t border-app-border bg-app-surface-2 px-5 py-3.5"
				>
					<slot name="footer" />
				</div>
			</component>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
	modelValue: boolean;
	title: string;
	description?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	asForm?: boolean;
}>(), {
	description: undefined,
	size: 'lg',
	asForm: false,
});

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'submit' | 'close'): void;
}>();

const titleId = useId();
const panel = ref<HTMLElement | { $el: HTMLElement } | null>(null);

// Move focus into the dialog when it opens so Escape and Tab work from the keyboard.
watch(() => props.modelValue, async (open) => {
	if (!open) return;
	await nextTick();
	const el = panel.value && '$el' in panel.value ? panel.value.$el : panel.value;
	el?.focus();
});

const close = () => {
	emit('update:modelValue', false);
	emit('close');
};
</script>
