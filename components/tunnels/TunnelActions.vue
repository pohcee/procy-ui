<template>
	<!-- Row actions for an active tunnel: Connect / Open / Download .rdp, and Close. -->
	<AppButton
		v-if="tunnel.isWeb"
		variant="secondary"
		size="sm"
		:aria-label="`Open ${tunnel.client_name} port ${tunnel.lport} in a new tab`"
		@click="$emit('open')"
	>
		<ExternalLink
			class="h-3.5 w-3.5"
			aria-hidden="true"
		/>
		Open
	</AppButton>
	<AppButton
		v-else-if="tunnel.isRdp"
		variant="secondary"
		size="sm"
		@click="$emit('rdp')"
	>
		<Download
			class="h-3.5 w-3.5"
			aria-hidden="true"
		/>
		Download .rdp
	</AppButton>
	<AppButton
		v-else
		variant="secondary"
		size="sm"
		:aria-label="`How to connect to ${tunnel.client_name} port ${tunnel.lport}`"
		@click="$emit('connect')"
	>
		Connect
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
import { Download, ExternalLink, X } from 'lucide-vue-next';

defineProps<{ tunnel: TunnelRow; compact?: boolean }>();
defineEmits<{ (e: 'connect' | 'open' | 'rdp' | 'close'): void }>();
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
