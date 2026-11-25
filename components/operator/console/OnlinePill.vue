<template>
	<!-- Online / offline: icon + label, never colour alone. -->
	<span
		:class="[
			'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-semibold',
			online ? 'bg-app-ok-bg text-app-ok' : 'bg-app-chip text-app-text-3',
		]"
	>
		<component
			:is="online ? Wifi : WifiOff"
			class="h-3.5 w-3.5 shrink-0"
			:stroke-width="2.4"
			aria-hidden="true"
		/>
		{{ online ? 'Online' : 'Offline' }}
	</span>
</template>

<script setup lang="ts">
import { Wifi, WifiOff } from 'lucide-vue-next';

defineProps<{ online: boolean }>();
</script>
