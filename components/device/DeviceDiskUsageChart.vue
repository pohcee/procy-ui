<template>
	<div class="h-full min-h-[260px] w-full">
		<p
			v-if="mounts.length === 0"
			class="flex h-full min-h-[260px] w-full items-center justify-center text-sm text-gray-500 dark:text-gray-500"
		>
			No monitoring data available for this period.
		</p>
		<Line
			v-else
			:key="colorMode"
			:data="chartData"
			:options="chartOptions"
		/>
	</div>
</template>

<script setup lang="ts">
import {
	CategoryScale,
	Chart as ChartJS,
	Filler,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
	Legend,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { parseMountpoints } from '~/lib/utils';
import type { ClientMountpoint } from '~/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const props = defineProps<{
	history: ClientMountpoint[];
}>();

const { colorMode } = useTheme();
const { chartColors, gridColor, textColor, tooltipBackgroundColor, tooltipTextColor } = useChartTheme();

const sortedHistory = computed(() => [...props.history].sort(
	(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
));

// Each row's mountpoints are parsed independently since the set of mounts
// reported can vary from one snapshot to the next (drives can appear/disappear).
const parsedHistory = computed(() => sortedHistory.value.map(row => ({
	timestamp: row.timestamp,
	disks: parseMountpoints(row.mountpoints),
})));

const mounts = computed(() => {
	const seen = new Set<string>();
	for (const row of parsedHistory.value) {
		for (const disk of row.disks) {
			seen.add(disk.mount);
		}
	}
	return [...seen].sort();
});

function formatTick(timestamp: string): string {
	const date = new Date(timestamp);
	return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

const chartData = computed(() => ({
	labels: parsedHistory.value.map(row => formatTick(row.timestamp)),
	datasets: mounts.value.map((mount, index) => {
		const color = chartColors.value[index % chartColors.value.length];
		return {
			label: mount,
			data: parsedHistory.value.map(row => row.disks.find(d => d.mount === mount)?.usedPercent ?? null),
			borderColor: color,
			backgroundColor: color,
			fill: false,
			tension: 0.3,
			pointRadius: 0,
			borderWidth: 2,
			spanGaps: true,
		};
	}),
}));

const chartOptions = computed(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: { mode: 'index' as const, intersect: false },
	scales: {
		x: {
			grid: { color: gridColor.value },
			ticks: { color: textColor.value, maxTicksLimit: 8 },
		},
		y: {
			min: 0,
			max: 100,
			grid: { color: gridColor.value },
			ticks: { color: textColor.value, callback: (value: number) => `${value}%` },
		},
	},
	plugins: {
		legend: {
			display: mounts.value.length > 1,
			labels: { color: textColor.value },
		},
		tooltip: {
			backgroundColor: tooltipBackgroundColor.value,
			titleColor: tooltipTextColor.value,
			bodyColor: tooltipTextColor.value,
			borderColor: gridColor.value,
			borderWidth: 1,
			callbacks: {
				label: (context: { dataset: { label?: string }; parsed: { y: number } }) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`,
			},
		},
	},
}));
</script>
