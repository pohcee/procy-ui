<template>
	<!-- Organization status: icon + label, never colour alone. -->
	<span
		:class="[
			'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-semibold',
			status === 'active' ? 'bg-app-ok-bg text-app-ok' : status === 'suspended' ? 'bg-app-danger-bg text-app-danger' : 'bg-app-chip text-app-text-3',
		]"
	>
		<component
			:is="status === 'active' ? CircleCheck : status === 'suspended' ? CirclePause : CircleHelp"
			class="h-3.5 w-3.5 shrink-0"
			:stroke-width="2.4"
			aria-hidden="true"
		/>
		{{ status === 'active' ? 'Active' : status === 'suspended' ? 'Suspended' : status || 'Unknown' }}
	</span>
</template>

<script setup lang="ts">
import { CircleCheck, CircleHelp, CirclePause } from 'lucide-vue-next';

defineProps<{ status?: string }>();
</script>
