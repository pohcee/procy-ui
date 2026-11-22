<template>
	<!-- Row actions for an active tunnel: Connect / Open (per the user's preferences), and Close. -->
	<TunnelConnectButton
		v-if="tunnelKind(tunnel) !== 'other'"
		:tunnel="tunnel"
		:device-name="tunnel.client_name"
		@connected="$emit('connect')"
	/>
	<AppButton
		v-else
		variant="secondary"
		size="sm"
		:aria-label="`How to connect to ${tunnel.client_name} port ${tunnel.lport}`"
		@click="$emit('connect')"
	>
		Details
	</AppButton>
	<AppButton
		variant="danger"
		size="sm"
		:class="compact ? '!px-0 w-9' : ''"
		:title="compact ? 'Close tunnel' : undefined"
		:aria-label="`Close tunnel to ${tunnel.client_name} on port ${tunnel.lport}`"
		@click="$emit('close')"
	>
		<X
			v-if="compact"
			class="h-4 w-4"
			aria-hidden="true"
		/>
		<template v-else>
			Close
		</template>
	</AppButton>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import TunnelConnectButton from '~/components/tunnels/TunnelConnectButton.vue';
import { tunnelKind } from '~/composables/useTunnelConnect';

defineProps<{ tunnel: TunnelRow; compact?: boolean }>();
defineEmits<{ (e: 'connect' | 'close'): void }>();
</script>

<script lang="ts">
/** A tunnel row as shown on the Tunnels page (tunnel + derived display fields). */
export type TunnelRow = import('~/types').Tunnel & {
	client_name: string;
	badge: { label: string; class: string };
	destination: string;
	openToAll: boolean;
	closes: { label: string; never: boolean };
	createdAgo: string;
	isWeb: boolean;
	isRdp: boolean;
	isSsh: boolean;
};
</script>
