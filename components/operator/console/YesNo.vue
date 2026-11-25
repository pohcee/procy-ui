<template>
	<!-- Yes / No / unknown with an icon, never colour alone. -->
	<span
		v-if="value === null || value === undefined"
		class="text-app-text-4"
	>—</span>
	<span
		v-else
		:class="['inline-flex items-center gap-1', value ? 'text-app-ok' : 'text-app-text-3']"
	>
		<component
			:is="value ? Check : Minus"
			class="h-3.5 w-3.5"
			:stroke-width="2.4"
			aria-hidden="true"
		/>
		{{ value ? yes : no }}
	</span>
</template>

<script setup lang="ts">
import { Check, Minus } from 'lucide-vue-next';

withDefaults(defineProps<{ value: boolean | null | undefined; yes?: string; no?: string }>(), { yes: 'Yes', no: 'No' });
</script>
