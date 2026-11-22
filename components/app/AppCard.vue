<template>
	<!-- Surface card. Pass `flush` to drop the padding (e.g. for tables). -->
	<section
		:class="[
			'rounded-xl border border-app-border bg-app-surface',
			flush ? 'overflow-hidden' : 'p-5',
		]"
	>
		<div
			v-if="title || $slots.actions"
			:class="['flex flex-wrap items-center justify-between gap-3', flush ? 'border-b border-app-border px-4 py-3.5' : 'mb-4']"
		>
			<div class="min-w-0">
				<h2 class="text-[15px] font-semibold text-app-text">
					{{ title }}
				</h2>
				<p
					v-if="description"
					class="mt-1 text-[13px] text-app-text-3"
				>
					{{ description }}
				</p>
			</div>
			<div
				v-if="$slots.actions"
				class="flex flex-wrap items-center gap-2"
			>
				<slot name="actions" />
			</div>
		</div>
		<slot />
	</section>
</template>

<script setup lang="ts">
defineProps<{
	title?: string;
	description?: string;
	flush?: boolean;
}>();
</script>
