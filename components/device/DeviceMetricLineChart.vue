<template>
	<div class="h-full min-h-[260px] w-full">
		<p
			v-if="metrics.length === 0"
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
} from 'chart.js';
import { Line } from 'vue-chartjs';
import type { ClientMetric } from '~/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const props = defineProps<{
	metrics: ClientMetric[];
	field: 'cpu_usage_percent' | 'memory_usage_percent';
	seriesColor: string;
}>();

const { colorMode } = useTheme();
const { gridColor, textColor, tooltipBackgroundColor, tooltipTextColor } = useChartTheme();

const sortedMetrics = computed(() => [...props.metrics].sort(
	(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
));

function formatTick(timestamp: string): string {
	const date = new Date(timestamp);
	return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

const chartData = computed(() => ({
	labels: sortedMetrics.value.map(m => formatTick(m.timestamp)),
	datasets: [
		{
			data: sortedMetrics.value.map(m => m[props.field]),
			borderColor: props.seriesColor,
			backgroundColor: props.seriesColor,
			fill: false,
			tension: 0.3,
			pointRadius: 0,
			borderWidth: 2,
		},
	],
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
		legend: { display: false },
		tooltip: {
			backgroundColor: tooltipBackgroundColor.value,
			titleColor: tooltipTextColor.value,
			bodyColor: tooltipTextColor.value,
			borderColor: gridColor.value,
			borderWidth: 1,
			callbacks: {
				label: (context: { parsed: { y: number } }) => `${context.parsed.y.toFixed(1)}%`,
			},
		},
	},
}));
</script>
