<template>
	<!-- A server's status from its heartbeat: live / stale / gone. Icon + label, never colour alone. -->
	<span
		:class="[
			'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-semibold',
			status === 'live' ? 'bg-app-ok-bg text-app-ok' : status === 'stale' ? 'bg-app-warn-bg text-app-warn' : 'bg-app-chip text-app-text-3',
		]"
		:title="hint"
	>
		<component
			:is="status === 'live' ? Activity : status === 'stale' ? Clock : CircleOff"
			class="h-3.5 w-3.5 shrink-0"
			:stroke-width="2.4"
			aria-hidden="true"
		/>
		<span class="sr-only">Status:</span>
		{{ STATUS_LABELS[status] }}
	</span>
</template>

<script setup lang="ts">
import { Activity, CircleOff, Clock } from 'lucide-vue-next';
import { STATUS_LABELS, type ServerStatus } from '~/utils/servers';

const props = defineProps<{ status: ServerStatus }>();

const hint = computed(() => ({
	live: 'Heartbeat is current',
	stale: 'No recent heartbeat (less than a day)',
	gone: 'No heartbeat for more than a day',
})[props.status]);
</script>
