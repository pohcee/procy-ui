<template>
	<div class="h-full w-full flex-1">
		<div class="flex items-center justify-between pb-4">
			<h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
				Schedules for this client
			</h4>
			<button
				class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm"
				type="button"
				@click="formModal?.openForCreate()"
			>
				New schedule
			</button>
		</div>
		<div class="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
			<div
				v-if="pending"
				class="p-6 text-center text-sm text-gray-500"
			>
				Loading schedules...
			</div>
			<div
				v-else-if="clientSchedules.length === 0"
				class="p-6 text-center text-sm text-gray-500"
			>
				No schedules target this client.
			</div>
			<table
				v-else
				class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
			>
				<thead class="bg-gray-50 dark:bg-gray-950">
					<tr>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Name
						</th>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Type
						</th>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Cron
						</th>
						<th class="px-4 py-3" />
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
					<tr
						v-for="schedule in clientSchedules"
						:key="schedule.id"
					>
						<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-white">
							{{ schedule.name }}
						</td>
						<td class="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">
							{{ schedule.type }}
						</td>
						<td class="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300">
							{{ schedule.schedule }}
						</td>
						<td class="whitespace-nowrap px-4 py-3 text-right text-sm">
							<button
								class="text-primary-600 hover:underline"
								type="button"
								@click="formModal?.openForEdit(schedule)"
							>
								Edit
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<ScheduleFormModal
			ref="formModal"
			@saved="refresh"
		/>
	</div>
</template>

<script setup lang="ts">
import ScheduleFormModal from '~/components/schedules/ScheduleFormModal.vue';

const props = defineProps({
	device: {
		type: Object,
	},
	id: {
		type: String,
		default: '',
	},
});

const { $api } = useNuxtApp();

const { data: response, pending, refresh } = useLazyAsyncData('device-schedules', () => $api.schedules.list());
const clientSchedules = computed(() => {
	const clientId = props.id || props.device?.id;
	return (response.value?.data ?? []).filter(schedule => schedule.client_ids?.includes(clientId));
});
</script>
