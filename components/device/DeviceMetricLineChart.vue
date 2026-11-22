<template>
	<div class="relative h-[260px] w-full">
		<p
			v-if="metrics.length === 0"
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
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'vue-chartjs';
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import type { ClientMetric } from '~/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const props = defineProps<{
	metrics: ClientMetric[];
	field: 'cpu_usage_percent' | 'memory_usage_percent';
	seriesColor?: string;
}>();

const { isDark, colors } = useDeviceChartTheme();

const sortedMetrics = computed(() => [...props.metrics].sort(
	(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
));

function formatTick(timestamp: string): string {
	const date = new Date(timestamp);
	return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

const lineColor = computed(() => props.seriesColor ?? colors.value.series[0]);

const chartData = computed(() => ({
	labels: sortedMetrics.value.map(m => formatTick(m.timestamp)),
	datasets: [
		{
			data: sortedMetrics.value.map(m => m[props.field]),
			borderColor: lineColor.value,
			backgroundColor: lineColor.value,
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
		legend: { display: false },
		tooltip: {
			backgroundColor: colors.value.tooltipBg,
			titleColor: colors.value.tooltipText,
			bodyColor: colors.value.tooltipText,
			borderColor: colors.value.tooltipBorder,
			borderWidth: 1,
			callbacks: {
				label: (context: TooltipItem<'line'>) => (context.parsed.y === null ? '-' : `${context.parsed.y.toFixed(1)}%`),
			},
		},
	},
}));
</script>
