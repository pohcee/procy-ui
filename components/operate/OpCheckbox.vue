<template>
	<!-- Checkbox with its label; 32px+ tall row. -->
	<label class="flex min-h-[32px] cursor-pointer select-none items-center gap-2.5 text-sm text-app-text">
		<input
			v-model="model"
			type="checkbox"
			class="h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-app-accent"
			:disabled="disabled"
		>
		<span class="min-w-0">
			<slot />
		</span>
	</label>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
const model = defineModel<boolean>();
</script>
