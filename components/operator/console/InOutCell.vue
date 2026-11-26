<template>
	<!-- Transfer of a table cell: to devices over from devices, with the chart colours of the two directions. -->
	<span class="inline-flex flex-col items-end gap-0.5">
		<span class="inline-flex items-center gap-1.5 font-medium text-app-text">
			<span
				class="h-2 w-2 shrink-0 rounded-sm"
				:style="{ background: palette[0] }"
				aria-hidden="true"
			/>
			<span class="sr-only">To devices</span>
			{{ formatBytes(value.in) }}
		</span>
		<span class="inline-flex items-center gap-1.5 text-xs text-app-text-3">
			<span
				class="h-2 w-2 shrink-0 rounded-sm"
				:style="{ background: palette[1] }"
				aria-hidden="true"
			/>
			<span class="sr-only">From devices</span>
			{{ formatBytes(value.out) }}
		</span>
	</span>
</template>

<script setup lang="ts">
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import type { InOut } from '~/utils/operatorConsole';
import { formatBytes } from '~/utils/usage';

defineProps<{ value: InOut }>();

const { isDark } = useDeviceChartTheme();
// The chart colours of the two directions (ConsoleChart.vue: in = slot 1, out = slot 2).
const palette = computed(() => (isDark.value ? ['#3987e5', '#d95926'] : ['#2a78d6', '#eb6834']));
</script>
