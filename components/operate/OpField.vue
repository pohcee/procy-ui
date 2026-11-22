<template>
	<!-- Label + control + optional help/error text, stacked. Put the control in the default slot. -->
	<div class="flex min-w-0 flex-col gap-1.5">
		<label
			v-if="label"
			:for="forId"
			class="text-[13px] font-medium text-app-text-2"
		>
			{{ label }}
			<span
				v-if="hint"
				class="font-normal text-app-text-3"
			>{{ hint }}</span>
		</label>
		<slot />
		<p
			v-if="error"
			:id="forId ? `${forId}-error` : undefined"
			class="text-xs font-medium text-app-danger"
		>
			{{ error }}
		</p>
		<p
			v-else-if="help"
			:id="forId ? `${forId}-help` : undefined"
			class="text-xs text-app-text-3"
		>
			{{ help }}
		</p>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	label?: string;
	forId?: string;
	hint?: string;
	help?: string;
	error?: string | null | false;
}>();
</script>
