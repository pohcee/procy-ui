<template>
	<!-- A stat tile with the two transfer directions: to devices (in) and from devices (out). -->
	<div class="min-w-0 rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
		<div class="text-[13px] font-medium text-app-text-3">
			{{ label }}
		</div>
		<div
			v-if="loading"
			class="mt-1.5 text-[26px] font-bold tracking-tight text-app-text"
		>
			–
		</div>
		<p
			v-else-if="!value"
			class="mt-2 text-[13px] text-app-text-3"
		>
			{{ unavailable }}
		</p>
		<dl
			v-else
			class="mt-2 flex flex-col gap-1"
		>
			<div
				v-for="(row, i) in rows"
				:key="row.label"
				class="flex items-baseline justify-between gap-3"
			>
				<dt class="inline-flex items-center gap-2 text-[13px] text-app-text-2">
					<span
						class="h-2.5 w-2.5 shrink-0 rounded-sm"
						:style="{ background: palette[i] }"
						aria-hidden="true"
					/>
					{{ row.label }}
				</dt>
				<dd class="truncate text-lg font-bold tracking-tight text-app-text">
					{{ formatBytes(row.value) }}
				</dd>
			</div>
		</dl>
	</div>
</template>

<script setup lang="ts">
import { useDeviceChartTheme } from '~/components/device/useDeviceChartTheme';
import type { InOut } from '~/utils/operatorConsole';
import { formatBytes } from '~/utils/usage';

const props = withDefaults(defineProps<{
	label: string;
	value: InOut | null;
	loading?: boolean;
	unavailable?: string;
}>(), { loading: false, unavailable: 'Usage metering is off' });

const { isDark } = useDeviceChartTheme();
// The chart colours of the two directions (ConsoleChart.vue: in = slot 1, out = slot 2).
const palette = computed(() => (isDark.value ? ['#3987e5', '#d95926'] : ['#2a78d6', '#eb6834']));
const rows = computed(() => [
	{ label: 'To devices', value: props.value?.in ?? 0 },
	{ label: 'From devices', value: props.value?.out ?? 0 },
]);
</script>
