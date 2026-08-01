<template>
	<div>
		<p
			v-if="disks.length === 0"
			class="text-sm text-gray-500 dark:text-gray-500"
		>
			No disk data available.
		</p>
		<table
			v-else
			class="w-full"
		>
			<tbody>
				<tr
					v-for="disk in disks"
					:key="disk.mount"
					class="flex flex-col md:table-row"
				>
					<td class="w-full whitespace-nowrap p-1 font-medium tracking-tight text-primary md:w-fit md:min-w-min">
						{{ disk.mount }} ({{ disk.usedPercent.toFixed(1) }}%):
					</td>
					<td class="w-full p-1">
						<div class="h-3 w-full bg-gray-200">
							<div
								class="bg-primary h-full"
								:style="{ width: `${disk.usedPercent}%` }"
							/>
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-500">
							{{ bytesToSize(disk.total - disk.free) }} of {{ bytesToSize(disk.total) }} used
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup lang="ts">
import { bytesToSize } from '~/lib/utils';
import type { DiskUsage } from '~/types';

defineProps<{
	disks: DiskUsage[];
}>();
</script>
