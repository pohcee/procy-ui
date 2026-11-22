<template>
	<!-- Table footer: "Showing a–b of n" + previous/next buttons. `page` is 0-based. -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-t border-app-border bg-app-surface px-4 py-3">
		<p
			class="text-[13px] text-app-text-3"
			aria-live="polite"
		>
			<template v-if="count > 0 && shown > 0">
				Showing <span class="font-medium text-app-text-2">{{ from }}</span>–<span class="font-medium text-app-text-2">{{ to }}</span>
				of <span class="font-medium text-app-text-2">{{ count }}</span>
			</template>
			<template v-else>
				No results
			</template>
		</p>
		<div class="flex items-center gap-2">
			<span class="hidden text-[13px] text-app-text-3 sm:inline">Page {{ page + 1 }} of {{ pages }}</span>
			<button
				type="button"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-40"
				aria-label="Previous page"
				:disabled="page === 0"
				@click="$emit('previous')"
			>
				<ChevronLeft
					class="h-4 w-4"
					aria-hidden="true"
				/>
			</button>
			<button
				type="button"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-40"
				aria-label="Next page"
				:disabled="page + 1 >= pages"
				@click="$emit('next')"
			>
				<ChevronRight
					class="h-4 w-4"
					aria-hidden="true"
				/>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
	page: number;
	perPage: number;
	count: number;
	shown: number;
}>();

defineEmits<{
	(e: 'previous' | 'next'): void;
}>();

const from = computed(() => props.page * props.perPage + 1);
const to = computed(() => props.page * props.perPage + props.shown);
const pages = computed(() => Math.max(1, Math.ceil(props.count / props.perPage)));
</script>
