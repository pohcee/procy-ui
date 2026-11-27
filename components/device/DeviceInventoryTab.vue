<template>
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-4">
			<DeviceRportClientCard :device="device" />
			<DeviceGroupsCard :groups="device?.groups" />
			<DeviceTagsLabelsCard :client="device" />
			<DeviceOS :device="device" />
		</div>
		<div class="flex min-w-0 flex-col gap-4">
			<DeviceBenchmarkCard
				:device="device"
				:metrics="metrics"
				:disks="disks"
			/>
			<DeviceIPAddresses
				:ipv4="device?.ipv4"
				:ipv6="device?.ipv6"
			/>
			<DeviceUpdateStatus :device="device" />
			<DeviceAllowedUserGroups />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Client, ClientMetric, DiskUsage } from '~/types';

withDefaults(defineProps<{
	device: Client;
	metrics?: ClientMetric[];
	disks?: DiskUsage[];
}>(), {
	metrics: () => [],
	disks: () => [],
});
</script>
