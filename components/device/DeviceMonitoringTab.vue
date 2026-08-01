<template>
	<div class="h-full w-full flex-1">
		<div class="px-1">
			<div class="flex w-full max-w-full flex-col items-end justify-between gap-3 lg:flex-row">
				<div class="w-full max-w-xs sm:-mt-1">
					<CustomThemedSelect
						id="monitoringPeriod"
						v-model="selectedPeriod"
						label="Period"
						placeholder="Select..."
						:options="periodOptions"
					/>
				</div>
				<button
					type="button"
					class="bg-primary-800 hover:bg-primary-800 focus-visible:outline-primary-600 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
					@click="refreshAll"
				>
					<span class="flex items-center justify-center gap-x-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14px"
							height="14px"
							viewBox="0 0 24 24"
							class="icon"
						>
							<path
								fill="currentColor"
								d="M2 12a9 9 0 0 0 9 9c2.39 0 4.68-.94 6.4-2.6l-1.5-1.5A6.706 6.706 0 0 1 11 19c-6.24 0-9.36-7.54-4.95-11.95C10.46 2.64 18 5.77 18 12h-3l4 4h.1l3.9-4h-3a9 9 0 0 0-18 0Z"
							/>
						</svg>
						Reload
					</span>
				</button>
			</div>
			<div class="mt-5 grid grid-cols-1 gap-5 transition-all lg:grid-cols-2">
				<div class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900 min-h-[300px]">
					<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
						<div class="flex max-h-16 flex-1 content-center items-center">
							<h3 class="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-50">
								CPU Usage %
							</h3>
						</div>
					</div>
					<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
						<DeviceMetricLineChart
							:key="chartKey"
							:metrics="metrics"
							field="cpu_usage_percent"
							:series-color="chart1"
						/>
					</div>
				</div>
				<div class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900 min-h-[300px]">
					<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
						<div class="flex max-h-16 flex-1 content-center items-center">
							<h3 class="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-50">
								Memory Usage %
							</h3>
						</div>
					</div>
					<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
						<DeviceMetricLineChart
							:key="chartKey"
							:metrics="metrics"
							field="memory_usage_percent"
							:series-color="chart2"
						/>
					</div>
				</div>
				<div class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900 min-h-[300px]">
					<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
						<div class="flex max-h-16 flex-1 content-center items-center">
							<h3 class="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-50">
								Disk Usage %
							</h3>
						</div>
					</div>
					<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
						<DeviceDiskUsageChart
							:key="chartKey"
							:history="diskHistory"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Client, ClientMetric, ClientMountpoint } from '~/types';

const props = defineProps<{
	device: Client;
	metrics: ClientMetric[];
	diskHistory: ClientMountpoint[];
}>();

const clientStore = useClientStore();
const { chart1, chart2 } = useChartTheme();
const { colorMode } = useTheme();

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
const chartKey = computed(() => `${colorMode.value}-${fetchCount.value}`);

function currentRange() {
	const until = new Date();
	const since = new Date(until.getTime() - Number(selectedPeriod.value) * 60 * 60 * 1000);
	return { since: since.toISOString(), until: until.toISOString() };
}

async function refreshAll() {
	if (!props.device?.id) return;
	const { since, until } = currentRange();
	await Promise.all([
		clientStore.loadMetrics(props.device.id, since, until),
		clientStore.loadMountpoints(props.device.id, since, until),
	]);
	fetchCount.value++;
}

watch(selectedPeriod, refreshAll);
watch(() => props.device?.id, refreshAll);

onMounted(refreshAll);
</script>
