<template>
	<!-- Empty / loading state for a table card. -->
	<div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
		<div
			v-if="loading"
			class="h-6 w-6 animate-spin rounded-full border-2 border-app-border-strong border-t-app-accent"
			aria-hidden="true"
		/>
		<div
			v-else-if="icon"
			class="flex h-11 w-11 items-center justify-center rounded-xl bg-app-muted text-app-text-3"
		>
			<component
				:is="icon"
				class="h-5 w-5"
				aria-hidden="true"
			/>
		</div>
		<div>
			<p class="text-[15px] font-semibold text-app-text">
				{{ title }}
			</p>
			<p
				v-if="description"
				class="mx-auto mt-1 max-w-md text-[13px] text-app-text-3"
			>
				{{ description }}
			</p>
		</div>
		<div
			v-if="$slots.default"
			class="mt-1 flex flex-wrap justify-center gap-2"
		>
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
	title: string;
	description?: string;
	icon?: Component;
	loading?: boolean;
}>();
</script>
