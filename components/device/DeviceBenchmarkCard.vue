<template>
	<AppCard title="CPU, memory & disks">
		<template #actions>
			<AppButton
				variant="secondary"
				size="sm"
				:disabled="isLoading"
				@click="reload"
			>
				<RefreshCw
					:class="['h-3.5 w-3.5', isLoading ? 'animate-spin' : '']"
					aria-hidden="true"
				/>
				Reload
			</AppButton>
		</template>
		<DeviceKv
			:items="[
				...(device?.cpu_family ? [{ label: 'CPU family', value: device.cpu_family }] : []),
				{ label: 'CPU model', value: device?.cpu_model },
				{ label: 'CPU model name', value: device?.cpu_model_name },
				{ label: 'Number of CPUs', value: device?.num_cpus },
				{ label: 'Total memory', value: device?.mem_total ? bytesToSize(device.mem_total) : '' },
			]"
		/>
		<div
			v-if="metrics.length > 0"
			class="mt-4 flex flex-col gap-3 border-t border-app-border-subtle pt-4"
		>
			<div
				v-for="bar in bars"
				:key="bar.label"
			>
				<div class="flex justify-between text-[13px]">
					<span class="font-medium text-app-text-3">{{ bar.label }}</span>
					<span class="font-semibold text-app-text">{{ bar.value }}%</span>
				</div>
				<UsageMeter
					:label="bar.label"
					:value="Number(bar.value)"
					class="mt-1.5"
				/>
			</div>
		</div>
		<div
			v-if="disks.length > 0"
			class="mt-4 border-t border-app-border-subtle pt-4"
		>
			<h3 class="mb-2.5 text-[13px] font-semibold text-app-text-3">
				Disks
			</h3>
			<DeviceDiskUsageList :disks="disks" />
		</div>
	</AppCard>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import DeviceKv from '~/components/device/DeviceKv.vue';
import UsageMeter from '~/components/device/UsageMeter.vue';
import { bytesToSize } from '~/lib/utils';
import type { Client, ClientMetric, DiskUsage } from '~/types';

const props = withDefaults(defineProps<{
	device: Client;
	metrics?: ClientMetric[];
	disks?: DiskUsage[];
}>(), {
	metrics: () => [],
	disks: () => [],
});

const clientStore = useClientStore();
const isLoading = ref(false);

// Metrics come newest-first from the API.
const latest = computed(() => props.metrics[0]);
const pct = (n: number | undefined) => parseFloat(String(n ?? 0)).toFixed(2);
const bars = computed(() => [
	{ label: 'CPU usage', value: pct(latest.value?.cpu_usage_percent) },
	{ label: 'Memory usage', value: pct(latest.value?.memory_usage_percent) },
	{ label: 'IO usage', value: pct(latest.value?.io_usage_percent) },
]);

async function reload() {
	if (!props.device?.id) return;
	isLoading.value = true;
	try {
		await Promise.all([
			clientStore.loadMetrics(props.device.id),
			clientStore.loadMountpoints(props.device.id),
		]);
	}
	finally {
		isLoading.value = false;
	}
}
</script>
