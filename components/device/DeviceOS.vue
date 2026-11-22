<template>
	<AppCard title="Operating system">
		<DeviceKv
			:items="[
				{ label: 'OS full name', value: device?.os_full_name },
				{ label: 'OS family', value: device?.os_family },
				{ label: 'OS version', value: device?.os_version, mono: true },
				{ label: 'Virtualization system', value: device?.os_virtualization_system },
				{ label: 'Virtualization role', value: device?.os_virtualization_role },
				{ label: 'Timezone', value: device?.timezone },
			]"
		/>
	</AppCard>
</template>

<script setup lang="ts">
import DeviceKv from '~/components/device/DeviceKv.vue';
import type { Client } from '~/types';

defineProps<{
	device: Client;
}>();
</script>
