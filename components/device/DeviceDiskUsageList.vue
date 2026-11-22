<template>
	<div>
		<p
			v-if="disks.length === 0"
			class="text-[13px] text-app-text-3"
		>
			No disk data available.
		</p>
		<ul
			v-else
			class="flex flex-col gap-3"
		>
			<li
				v-for="disk in disks"
				:key="disk.mount"
			>
				<div class="flex items-baseline justify-between gap-3 text-[13px]">
					<span class="min-w-0 truncate font-mono text-app-text">{{ disk.mount }}</span>
					<span class="flex-none font-semibold text-app-text">{{ disk.usedPercent.toFixed(1) }}%</span>
				</div>
				<UsageMeter
					:label="`${disk.mount} used`"
					:value="disk.usedPercent"
					class="mt-1.5"
				/>
				<div class="mt-1 text-xs text-app-text-3">
					{{ bytesToSize(disk.total - disk.free) }} of {{ bytesToSize(disk.total) }} used
				</div>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import UsageMeter from '~/components/device/UsageMeter.vue';
import { bytesToSize } from '~/lib/utils';
import type { DiskUsage } from '~/types';

defineProps<{
	disks: DiskUsage[];
}>();
</script>
