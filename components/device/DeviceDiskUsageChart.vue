<template>
	<div class="relative h-[260px] w-full">
		<p
			v-if="mounts.length === 0"
			class="flex h-full min-h-[260px] w-full items-center justify-center text-[13px] text-app-text-3"
		>
			No monitoring data available for this period.
		</p>
		<Line
			v-else
			:key="String(isDark)"
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
import type { TooltipItem } from 'chart.js';
import { Line } from 'vue-chartjs';
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import { parseMountpoints } from '~/lib/utils';
import type { ClientMountpoint } from '~/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const props = defineProps<{
	history: ClientMountpoint[];
}>();

const { isDark, colors } = useDeviceChartTheme();

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

const chartData = computed(() => ({
	labels: parsedHistory.value.map(row => row.timestamp).map(chartTickFormatter(parsedHistory.value.map(row => row.timestamp))),
	datasets: mounts.value.map((mount, index) => {
		const color = colors.value.series[index % colors.value.series.length];
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
			grid: { color: colors.value.grid },
			border: { color: colors.value.grid },
			ticks: { color: colors.value.text, maxTicksLimit: 8 },
		},
		y: {
			min: 0,
			max: 100,
			grid: { color: colors.value.grid },
			border: { color: colors.value.grid },
			ticks: { color: colors.value.text, callback: (value: number | string) => `${value}%` },
		},
	},
	plugins: {
		legend: {
			display: mounts.value.length > 1,
			labels: { color: colors.value.text },
		},
		tooltip: {
			backgroundColor: colors.value.tooltipBg,
			titleColor: colors.value.tooltipText,
			bodyColor: colors.value.tooltipText,
			borderColor: colors.value.tooltipBorder,
			borderWidth: 1,
			callbacks: {
				label: (context: TooltipItem<'line'>) => `${context.dataset.label}: ${context.parsed.y === null ? '-' : `${context.parsed.y.toFixed(1)}%`}`,
			},
		},
	},
}));
</script>
