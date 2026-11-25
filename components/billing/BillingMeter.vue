<template>
	<!-- Use against a limit: value, percent and a bar (amber from the soft cap, red at the hard cap). -->
	<div class="flex min-w-0 flex-col gap-2">
		<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
			<span class="text-[13px] font-medium text-app-text-3">{{ label }}</span>
			<span
				v-if="meter.percentLabel"
				:class="['text-[13px] font-semibold', toneText[meter.tone]]"
			>{{ meter.percentLabel }}</span>
		</div>
		<div class="text-[22px] font-bold tracking-tight text-app-text">
			{{ value }}
			<span
				v-if="of"
				class="text-[15px] font-medium text-app-text-3"
			>of {{ of }}</span>
		</div>
		<div
			v-if="meter.ratio !== null"
			class="relative h-2.5 w-full overflow-visible rounded-full bg-app-muted"
			role="meter"
			:aria-label="label"
			:aria-valuenow="Number.isFinite(meter.ratio) ? Math.round((meter.ratio ?? 0) * 100) : 100"
			aria-valuemin="0"
			aria-valuemax="100"
			:aria-valuetext="of ? `${value} of ${of}` : value"
		>
			<span
				:class="['block h-full rounded-full transition-[width]', toneBar[meter.tone]]"
				:style="{ width: `${Math.max(meter.fill, meter.fill > 0 ? 1.5 : 0)}%` }"
			/>
			<span
				v-if="meter.softMark !== null"
				class="absolute -top-0.5 h-3.5 w-0.5 rounded-full bg-app-warn/70"
				:style="{ left: `${meter.softMark}%` }"
				aria-hidden="true"
			/>
			<span
				v-if="meter.limitMark !== null"
				class="absolute -top-0.5 h-3.5 w-0.5 rounded-full bg-app-text-2"
				:style="{ left: `${meter.limitMark}%` }"
				aria-hidden="true"
			/>
		</div>
		<p
			v-if="detail"
			class="text-xs text-app-text-3"
		>
			{{ detail }}
		</p>
	</div>
</template>

<script setup lang="ts">
import type { Meter } from '~/utils/billing';

defineProps<{
	label: string;
	meter: Meter;
	value: string;
	of?: string;
	detail?: string;
}>();

const toneBar = { ok: 'bg-app-accent', warn: 'bg-app-warn', danger: 'bg-app-danger' };
const toneText = { ok: 'text-app-text-2', warn: 'text-app-warn', danger: 'text-app-danger' };
</script>
