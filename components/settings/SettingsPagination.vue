<template>
	<!-- Footer row for paginated settings tables: "Showing x–y of z" + prev/next. -->
	<div class="flex items-center justify-between gap-3 border-t border-app-border bg-app-surface-2 px-4 py-2.5">
		<p class="text-[13px] text-app-text-3">
			<template v-if="totalItems > 0">
				Showing <span class="font-medium text-app-text-2">{{ from }}</span>–<span class="font-medium text-app-text-2">{{ to }}</span>
				of <span class="font-medium text-app-text-2">{{ totalItems }}</span>
			</template>
			<template v-else>
				No results
			</template>
		</p>
		<div class="flex items-center gap-1">
			<button
				type="button"
				aria-label="Previous page"
				:disabled="page === 0"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface text-app-text-2 transition-colors hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-40"
				@click="emit('previous')"
			>
				<ChevronLeft
					class="h-4 w-4"
					aria-hidden="true"
				/>
			</button>
			<button
				type="button"
				aria-label="Next page"
				:disabled="disabledNext"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface text-app-text-2 transition-colors hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-40"
				@click="emit('next')"
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

const props = withDefaults(defineProps<{
	page: number;
	totalItems: number;
	currentPageItemCount: number;
	itemsPerPage?: number;
}>(), {
	itemsPerPage: 20,
});

const emit = defineEmits<{ (e: 'previous' | 'next'): void }>();

const from = computed(() => props.page * props.itemsPerPage + (props.currentPageItemCount ? 1 : 0));
const to = computed(() => props.page * props.itemsPerPage + props.currentPageItemCount);
const disabledNext = computed(() => (props.page + 1) * props.itemsPerPage >= props.totalItems);
</script>
