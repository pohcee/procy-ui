<template>
	<!-- Month stepper (UTC months, as the server meters). The current month is the last one. -->
	<div
		role="group"
		aria-label="Month"
		class="inline-flex h-10 items-center rounded-[10px] border border-app-border-strong bg-app-surface"
	>
		<button
			type="button"
			aria-label="Previous month"
			class="inline-flex h-full w-10 items-center justify-center rounded-l-[10px] text-app-text-2 hover:bg-app-hover hover:text-app-text"
			@click="model = shiftMonth(model, -1)"
		>
			<ChevronLeft
				class="h-4 w-4"
				aria-hidden="true"
			/>
		</button>
		<span
			class="min-w-[136px] px-2 text-center text-[13px] font-semibold text-app-text"
			aria-live="polite"
		>{{ monthLabel(model) }}</span>
		<button
			type="button"
			aria-label="Next month"
			:disabled="model >= latest"
			class="inline-flex h-full w-10 items-center justify-center rounded-r-[10px] text-app-text-2 hover:bg-app-hover hover:text-app-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
			@click="model = shiftMonth(model, 1)"
		>
			<ChevronRight
				class="h-4 w-4"
				aria-hidden="true"
			/>
		</button>
	</div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { currentMonth, monthLabel, shiftMonth } from '~/utils/usage';

const model = defineModel<string>({ required: true });
const latest = currentMonth();
</script>
