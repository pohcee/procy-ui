<template>
	<div class="flex flex-col gap-4">
		<!-- Legacy static placeholder (not used by any page); see DeviceTunnelsTab for the live tab. -->
		<AppCard
			title="Tunnels"
			flush
		>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[640px] border-collapse text-sm">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="col in columns"
								:key="col"
								scope="col"
								class="border-b border-app-border whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								{{ col }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td
								:colspan="columns.length"
								class="py-12 text-center text-app-text-3"
							>
								No tunnels.
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</AppCard>
	</div>
</template>

<script setup lang="ts">
defineProps({
	device: {
		type: Object,
	},
});

const columns = ['Client', 'Allowed clients', 'Exposed port', 'HTTP proxy', 'Protocol', 'Destination', 'Port', 'Name', 'Created at'];
</script>
