<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div
				role="group"
				aria-label="Monitoring period"
				class="inline-flex rounded-[10px] bg-app-muted p-[3px]"
			>
				<button
					v-for="option in periodOptions"
					:key="option.value"
					type="button"
					:aria-pressed="selectedPeriod === option.value"
					:aria-label="`Last ${option.label}`"
					:class="[
						'h-[34px] rounded-lg px-3 text-[13px] font-medium transition-colors',
						selectedPeriod === option.value
							? 'bg-app-raised text-app-text shadow-[0_1px_2px_rgba(16,22,31,0.12)]'
							: 'text-app-text-3 hover:text-app-text',
					]"
					@click="selectedPeriod = option.value"
				>
					{{ option.label }}
				</button>
			</div>
			<AppButton
				variant="secondary"
				size="sm"
				:disabled="isLoading"
				@click="refreshAll"
			>
				<RefreshCw
					:class="['h-4 w-4', isLoading ? 'animate-spin' : '']"
					aria-hidden="true"
				/>
				Reload
			</AppButton>
		</div>
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<AppCard
				title="CPU usage"
				:description="`Percent of all cores · last ${selectedPeriod} h`"
			>
				<DeviceMetricLineChart
					:key="chartKey"
					:metrics="metrics"
					field="cpu_usage_percent"
					:series-color="colors.series[0]"
				/>
			</AppCard>
			<AppCard
				title="Memory usage"
				:description="`Percent of total memory · last ${selectedPeriod} h`"
			>
				<DeviceMetricLineChart
					:key="chartKey"
					:metrics="metrics"
					field="memory_usage_percent"
					:series-color="colors.series[1]"
				/>
			</AppCard>
			<AppCard
				title="Disk usage"
				:description="`Percent used per mount point · last ${selectedPeriod} h`"
				class="lg:col-span-2"
			>
				<DeviceDiskUsageChart
					:key="chartKey"
					:history="diskHistory"
				/>
			</AppCard>
		</div>
	</div>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import type { Client, ClientMetric, ClientMountpoint } from '~/types';

const props = defineProps<{
	device: Client;
	metrics: ClientMetric[];
	diskHistory: ClientMountpoint[];
}>();

const clientStore = useClientStore();
const { isDark, colors } = useDeviceChartTheme();
const isLoading = ref(false);

const periodOptions = [
	{ value: '2', label: '2h' },
	{ value: '6', label: '6h' },
	{ value: '12', label: '12h' },
	{ value: '24', label: '24h' },
	{ value: '48', label: '48h' },
];
const selectedPeriod = ref('12');

// Bumped only after a fetch actually resolves, forcing the chart components to
// fully remount with the fresh props rather than relying on vue-chartjs to pick
// up an in-place data update - guarantees the UI visibly reflects each refresh.
const fetchCount = ref(0);
const chartKey = computed(() => `${isDark.value}-${fetchCount.value}`);

function currentRange() {
	const until = new Date();
	const since = new Date(until.getTime() - Number(selectedPeriod.value) * 60 * 60 * 1000);
	return { since: since.toISOString(), until: until.toISOString() };
}

async function refreshAll() {
	if (!props.device?.id) return;
	const { since, until } = currentRange();
	isLoading.value = true;
	try {
		await Promise.all([
			clientStore.loadMetrics(props.device.id, since, until),
			clientStore.loadMountpoints(props.device.id, since, until),
		]);
	}
	finally {
		isLoading.value = false;
	}
	fetchCount.value++;
}

watch(selectedPeriod, refreshAll);
watch(() => props.device?.id, refreshAll);

onMounted(refreshAll);
</script>
