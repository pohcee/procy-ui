<template>
	<!--
		A daily chart of the operator console: one to three series over zero-filled days, a legend with totals
		(two or more series), a "Show as table" fallback and an empty state. Lines for transfer in vs out, bars for
		counts (stacked when the series are parts of one total, e.g. jobs by type).
	-->
	<div class="flex flex-col gap-3">
		<div
			v-if="series.length > 1 && hasData"
			class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-app-text-2"
		>
			<span
				v-for="(s, i) in series"
				:key="s.label"
				class="inline-flex items-center gap-2"
			>
				<span
					v-if="kind === 'line'"
					class="h-0.5 w-3.5 rounded-full"
					:style="{ background: palette[i] }"
					aria-hidden="true"
				/>
				<span
					v-else
					class="h-2.5 w-2.5 rounded-sm"
					:style="{ background: palette[i] }"
					aria-hidden="true"
				/>
				{{ s.label }}
				<span class="font-medium text-app-text">{{ fmt(totalOf(s)) }}</span>
			</span>
		</div>
		<div :class="['relative w-full', compact ? 'h-[200px]' : 'h-[220px] sm:h-[260px]']">
			<div
				v-if="!hasData"
				class="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-app-border px-4 text-center"
			>
				<p class="text-[13px] font-medium text-app-text-2">
					{{ emptyTitle }}
				</p>
				<p
					v-if="emptyDescription"
					class="max-w-sm text-xs text-app-text-3"
				>
					{{ emptyDescription }}
				</p>
			</div>
			<component
				:is="kind === 'line' ? Line : Bar"
				v-else
				:key="String(isDark)"
				:data="chartData"
				:options="chartOptions"
				role="img"
				:aria-label="`${label}, ${days.length} days (UTC). Show as table lists the values.`"
			/>
		</div>
		<details
			v-if="hasData"
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
					<caption class="sr-only">
						{{ label }}
					</caption>
					<thead class="sticky top-0 bg-app-surface-2">
						<tr>
							<th
								v-for="h in headers"
								:key="h"
								scope="col"
								class="whitespace-nowrap border-b border-app-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								{{ h }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(day, i) in days"
							:key="day"
						>
							<th
								scope="row"
								class="whitespace-nowrap border-b border-app-border-subtle px-3 py-1.5 font-mono font-normal text-app-text-2"
							>
								{{ day }}
							</th>
							<td
								v-for="s in series"
								:key="s.label"
								class="whitespace-nowrap border-b border-app-border-subtle px-3 py-1.5 tabular-nums text-app-text"
							>
								{{ fmt(s.values[i] ?? 0) }}
							</td>
							<td
								v-if="stacked && series.length > 1"
								class="whitespace-nowrap border-b border-app-border-subtle px-3 py-1.5 font-medium tabular-nums text-app-text"
							>
								{{ fmt(series.reduce((a, s) => a + (s.values[i] ?? 0), 0)) }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</details>
	</div>
</template>

<script setup lang="ts">
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar, Line } from 'vue-chartjs';
import { ChevronRight } from 'lucide-vue-next';
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import { countAxis, dayLong, dayTick, maxOf, sum } from '~/utils/operatorConsole';
import { byteAxis, formatBytes, formatCount } from '~/utils/usage';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip);

interface ChartSeries {
	label: string;
	values: number[];
}

const props = withDefaults(defineProps<{
	/** What the chart shows, for screen readers and the table caption. */
	label: string;
	days: string[];
	series: ChartSeries[];
	kind?: 'line' | 'bar';
	format?: 'bytes' | 'count';
	/** Bars stack (the series are parts of one total). */
	stacked?: boolean;
	/** For a series (devices) the legend total is the highest day, not the sum. */
	peakTotal?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	compact?: boolean;
}>(), {
	kind: 'bar',
	format: 'count',
	stacked: false,
	peakTotal: false,
	emptyTitle: 'No usage recorded yet',
	emptyDescription: undefined,
	compact: false,
});

const { isDark, colors } = useDeviceChartTheme();

// Blue / orange / aqua: the first three categorical slots, in fixed order; validated (dataviz validate_palette.js)
// for colour-blind separation against the light and the dark surface. In = slot 1, out = slot 2.
const SERIES = {
	light: ['#2a78d6', '#eb6834', '#1baf7a'],
	dark: ['#3987e5', '#d95926', '#199e70'],
};
const palette = computed(() => (isDark.value ? SERIES.dark : SERIES.light));

const fmt = (v: number) => (props.format === 'bytes' ? formatBytes(v) : formatCount(v));
const totalOf = (s: ChartSeries) => (props.peakTotal ? maxOf(s.values) : sum(s.values));
const hasData = computed(() => props.series.some(s => s.values.some(v => v > 0)));
const headers = computed(() => ['Day (UTC)', ...props.series.map(s => s.label), ...(props.stacked && props.series.length > 1 ? ['Total'] : [])]);

const yMax = computed(() => {
	if (props.stacked) return maxOf(props.days.map((_, i) => props.series.reduce((a, s) => a + (s.values[i] ?? 0), 0)));
	return maxOf(props.series.map(s => maxOf(s.values)));
});

const surface = () => {
	if (typeof window === 'undefined') return '#fff';
	const raw = getComputedStyle(document.documentElement).getPropertyValue('--app-surface').trim();
	return raw ? `rgb(${raw.split(/\s+/).join(', ')})` : '#fff';
};

const chartData = computed(() => {
	const gap = surface();
	const dense = props.days.length > 14;
	const last = props.series.length - 1;
	return {
		labels: props.days.map(dayTick),
		datasets: props.series.map((s, i) => props.kind === 'line'
			? {
					label: s.label,
					data: s.values,
					borderColor: palette.value[i],
					backgroundColor: palette.value[i],
					borderWidth: 2,
					borderJoinStyle: 'round' as const,
					borderCapStyle: 'round' as const,
					tension: 0,
					pointRadius: dense ? 0 : 3,
					pointHoverRadius: 5,
					pointBorderColor: gap,
					pointBorderWidth: 2,
					pointHitRadius: 12,
				}
			: {
					label: s.label,
					data: s.values,
					backgroundColor: palette.value[i],
					hoverBackgroundColor: palette.value[i],
					// A 2px surface-coloured gap between stacked segments; the rounded end on the top segment only.
					borderColor: gap,
					borderWidth: props.stacked && i > 0 ? { top: 0, right: 0, bottom: 2, left: 0 } : 0,
					borderSkipped: false as const,
					borderRadius: !props.stacked || i === last ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } : 0,
					maxBarThickness: 22,
					categoryPercentage: 0.8,
					barPercentage: 0.9,
				}),
	};
});

const chartOptions = computed(() => {
	const bytes = props.format === 'bytes';
	const axis = bytes ? byteAxis(yMax.value) : null;
	const counts = bytes ? null : countAxis(yMax.value);
	return {
		responsive: true,
		maintainAspectRatio: false,
		animation: false as const,
		interaction: { mode: 'index' as const, intersect: false },
		scales: {
			x: {
				stacked: props.stacked,
				grid: { display: false },
				border: { color: colors.value.grid },
				ticks: { color: colors.value.text, autoSkip: true, maxRotation: 0, autoSkipPadding: 10 },
			},
			y: {
				stacked: props.stacked,
				min: 0,
				max: axis ? axis.max : counts?.max,
				grid: { color: colors.value.grid },
				border: { display: false },
				ticks: {
					color: colors.value.text,
					stepSize: axis ? axis.ticks[1] || undefined : counts?.step,
					precision: 0,
					callback: (value: number | string) => fmt(Number(value)),
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
					title: (items: TooltipItem<'bar' | 'line'>[]) => (items[0] ? `${dayLong(props.days[items[0].dataIndex] ?? '')} (UTC)` : ''),
					label: (ctx: TooltipItem<'bar' | 'line'>) => ` ${ctx.dataset.label}: ${fmt(Number(ctx.parsed.y))}`,
					footer: (items: TooltipItem<'bar' | 'line'>[]) => (props.stacked && items.length > 1
						? `Total ${fmt(items.reduce((a, i) => a + Number(i.parsed.y), 0))}`
						: ''),
				},
			},
		},
	};
});
</script>
