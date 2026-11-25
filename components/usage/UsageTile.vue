<template>
	<!-- One headline number (same look as the Devices page summary tiles). -->
	<div class="min-w-0 rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
		<div class="flex items-center gap-2 text-[13px] font-medium text-app-text-3">
			<component
				:is="icon"
				v-if="icon"
				class="h-4 w-4 shrink-0"
				aria-hidden="true"
			/>
			{{ label }}
		</div>
		<div class="mt-1.5 truncate text-[26px] font-bold tracking-tight text-app-text sm:text-[28px]">
			{{ loading ? '–' : value }}
		</div>
		<div
			v-if="detail && !loading"
			class="mt-0.5 text-xs text-app-text-3"
		>
			{{ detail }}
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
	label: string;
	value: string;
	detail?: string;
	icon?: Component;
	loading?: boolean;
}>();
</script>
