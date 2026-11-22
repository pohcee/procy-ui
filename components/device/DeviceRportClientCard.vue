<template>
	<AppCard title="RPort client">
		<DeviceKv :items="items" />
	</AppCard>
</template>

<script setup lang="ts">
import DeviceKv from '~/components/device/DeviceKv.vue';
import type { KvItem } from '~/components/device/DeviceKv.vue';
import type { Client } from '~/types';

const props = defineProps<{
	device: Client;
}>();

const formatedDate = (dateString: string | Date | null | undefined) => {
	if (!dateString) return '';
	const date = new Date(dateString);
	return `${date.getUTCDate().toString().padStart(2, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCFullYear().toString().substr(-2)} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} UTC`;
};

const items = computed<KvItem[]>(() => [
	{ label: 'ID', value: props.device?.id, mono: true },
	{ label: 'Hostname', value: props.device?.hostname, mono: true },
	{ label: 'Version', value: props.device?.version, mono: true },
	{ label: 'Auth ID', value: props.device?.client_auth_id, mono: true, to: `/client-access#${props.device?.client_auth_id}` },
	props.device?.last_heartbeat_at
		? { label: 'Last heartbeat', value: formatedDate(props.device.last_heartbeat_at) }
		: { label: 'Disconnected since', value: formatedDate(props.device?.disconnected_at) },
]);
</script>
