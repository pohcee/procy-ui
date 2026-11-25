<template>
	<!-- Daily transfer of a month, stacked: tunnel bytes to users, to devices, and uploads read by devices. -->
	<div class="flex flex-col gap-3">
		<div
			class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-app-text-2"
			aria-hidden="true"
		>
			<span
				v-for="s in legend"
				:key="s.label"
				class="inline-flex items-center gap-2"
			>
				<span
					class="h-2.5 w-2.5 rounded-sm"
					:style="{ background: s.color }"
				/>
				{{ s.label }}
				<span class="font-medium text-app-text">{{ s.total }}</span>
			</span>
		</div>
		<div class="relative h-[240px] w-full sm:h-[280px]">
			<p
				v-if="!series.max"
				class="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-app-border text-[13px] text-app-text-3"
			>
				No transfer in {{ monthLabel(month) }}{{ series.days.length ? '' : ' yet' }}.
			</p>
			<Bar
				v-else
				:key="String(isDark)"
				:data="chartData"
				:options="chartOptions"
				role="img"
				:aria-label="`Daily transfer in ${monthLabel(month)}, stacked by direction. The table below lists the values.`"
			/>
		</div>
		<details
			v-if="series.max"
			class="group text-[13px]"
		>
			<summary class="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md text-app-text-3 hover:text-app-text">
				<ChevronRight
					class="h-3.5 w-3.5 transition-transform group-open:rotate-90"
					aria-hidden="true"
				/>
				Show as table
			</summary>
			<div class="mt-2 max-h-72 overflow-auto rounded-lg border border-app-border">
				<table class="w-full border-collapse text-left">
					<thead class="sticky top-0 bg-app-surface-2">
						<tr>
							<th
								v-for="h in ['Day (UTC)', 'To users', 'To devices', 'Uploads', 'Total']"
								:key="h"
								scope="col"
								class="border-b border-app-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								{{ h }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(day, i) in series.days"
							:key="day"
						>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-1.5 font-mono text-app-text-2">
								{{ day }}
							</td>
							<td class="border-b border-app-border-subtle px-3 py-1.5 text-app-text">
								{{ formatBytes(series.toUser[i]) }}
							</td>
							<td class="border-b border-app-border-subtle px-3 py-1.5 text-app-text">
								{{ formatBytes(series.toDevice[i]) }}
							</td>
							<td class="border-b border-app-border-subtle px-3 py-1.5 text-app-text">
								{{ formatBytes(series.uploads[i]) }}
							</td>
							<td class="border-b border-app-border-subtle px-3 py-1.5 font-medium text-app-text">
								{{ formatBytes(series.toUser[i] + series.toDevice[i] + series.uploads[i]) }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</details>
	</div>
</template>

<script setup lang="ts">
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'vue-chartjs';
import { ChevronRight } from 'lucide-vue-next';
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import { byteAxis, formatBytes, monthLabel, type DailyTransferSeries } from '~/utils/usage';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const props = defineProps<{
	series: DailyTransferSeries;
	month: string;
}>();

const { isDark, colors } = useDeviceChartTheme();

// Blue / orange / aqua: the first three categorical slots, validated for colour-blind separation in both themes.
const SERIES = {
	light: ['#2a78d6', '#eb6834', '#1baf7a'],
	dark: ['#3987e5', '#d95926', '#199e70'],
};
const palette = computed(() => (isDark.value ? SERIES.dark : SERIES.light));

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const legend = computed(() => [
	{ label: 'To users', color: palette.value[0], total: formatBytes(sum(props.series.toUser)) },
	{ label: 'To devices', color: palette.value[1], total: formatBytes(sum(props.series.toDevice)) },
	{ label: 'Uploads to devices', color: palette.value[2], total: formatBytes(sum(props.series.uploads)) },
]);

const surface = () => {
	if (typeof window === 'undefined') return '#fff';
	const raw = getComputedStyle(document.documentElement).getPropertyValue('--app-surface').trim();
	return raw ? `rgb(${raw.split(/\s+/).join(', ')})` : '#fff';
};

const dayLabel = (day: string) => String(Number(day.slice(8, 10)));

const chartData = computed(() => {
	const gap = surface();
	const dataset = (label: string, data: number[], color: string, top = false) => ({
		label,
		data,
		backgroundColor: color,
		hoverBackgroundColor: color,
		// A 2px surface-coloured gap between stacked segments.
		borderColor: gap,
		borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
		borderSkipped: false as const,
		borderRadius: top ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } : 0,
		maxBarThickness: 22,
		categoryPercentage: 0.8,
		barPercentage: 0.9,
	});
	return {
		labels: props.series.days.map(dayLabel),
		datasets: [
			dataset('To users', props.series.toUser, palette.value[0]),
			dataset('To devices', props.series.toDevice, palette.value[1]),
			dataset('Uploads to devices', props.series.uploads, palette.value[2], true),
		],
	};
});

const chartOptions = computed(() => {
	const axis = byteAxis(props.series.max);
	return {
		responsive: true,
		maintainAspectRatio: false,
		animation: false as const,
		interaction: { mode: 'index' as const, intersect: false },
		scales: {
			x: {
				stacked: true,
				grid: { display: false },
				border: { color: colors.value.grid },
				ticks: { color: colors.value.text, autoSkip: true, maxRotation: 0, autoSkipPadding: 8 },
			},
			y: {
				stacked: true,
				min: 0,
				max: axis.max,
				grid: { color: colors.value.grid },
				border: { display: false },
				ticks: {
					color: colors.value.text,
					stepSize: axis.ticks[1] || undefined,
					callback: (value: number | string) => formatBytes(Number(value)),
				},
			},
		},
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: colors.value.tooltipBg,
				titleColor: colors.value.tooltipText,
				bodyColor: colors.value.tooltipText,
				footerColor: colors.value.tooltipText,
				borderColor: colors.value.tooltipBorder,
				borderWidth: 1,
				padding: 10,
				callbacks: {
					title: (items: TooltipItem<'bar'>[]) => (items[0] ? `${monthLabel(props.month).split(' ')[0]} ${items[0].label} (UTC)` : ''),
					label: (ctx: TooltipItem<'bar'>) => ` ${ctx.dataset.label}: ${formatBytes(Number(ctx.parsed.y))}`,
					footer: (items: TooltipItem<'bar'>[]) => `Total ${formatBytes(items.reduce((a, i) => a + Number(i.parsed.y), 0))}`,
				},
			},
		},
	};
});
</script>
