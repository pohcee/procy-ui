<template>
	<new-page-wrapper>
		<div class="mx-auto h-screen max-h-screen max-w-7xl overflow-y-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
			<div class="relative z-20 flex h-16 items-center justify-between">
				<div class="">
					<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
						Schedules
					</h3>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Run commands and scripts automatically on a cron schedule.
					</p>
				</div>
				<div class="flex-1" />
				<div class="ml-2 flex-shrink-0">
					<button
						class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm"
						type="button"
						@click="formModal?.openForCreate()"
					>
						New schedule
					</button>
				</div>
			</div>
			<div class="mt-4 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
				<div
					v-if="pending"
					class="p-6 text-center text-sm text-gray-500"
				>
					Loading schedules...
				</div>
				<div
					v-else-if="schedules.length === 0"
					class="p-6 text-center text-sm text-gray-500"
				>
					No schedules configured yet.
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
							<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
								Targets
							</th>
							<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
								Last run
							</th>
							<th class="px-4 py-3" />
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						<tr
							v-for="schedule in schedules"
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
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								{{ targetSummary(schedule) }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								<span
									v-if="schedule.last_execution?.started_at"
									class="rounded px-2 py-0.5 text-xs font-medium"
									:class="schedule.last_execution.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
								>{{ useDateFormat(schedule.last_execution.started_at, 'YYYY-MM-DD HH:mm').value }}</span>
								<span
									v-else
									class="text-gray-400"
								>never</span>
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-right text-sm">
								<button
									class="text-primary-600 hover:underline"
									type="button"
									@click="formModal?.openForEdit(schedule)"
								>
									Edit
								</button>
								<button
									class="ml-3 text-red-600 hover:underline"
									type="button"
									@click="triggerDelete(schedule)"
								>
									Delete
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<ScheduleFormModal
			ref="formModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			title="Please confirm!"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<div class="absolute inset-0 flex h-full min-h-[200px] flex-col items-center justify-center p-8 text-center">
				<div>Do you want to delete "{{ activeSchedule?.name }}"?</div>
			</div>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import ScheduleFormModal from '~/components/schedules/ScheduleFormModal.vue';
import type { Schedule } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const formModal = ref<InstanceType<typeof ScheduleFormModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeSchedule = ref<Schedule | null>(null);

const { data: response, pending, refresh } = useLazyAsyncData('schedules', () => $api.schedules.list());
const schedules = computed(() => response.value?.data ?? []);

const targetSummary = (schedule: Schedule) => {
	const parts = [];
	if (schedule.client_ids?.length) parts.push(`${schedule.client_ids.length} client(s)`);
	if (schedule.group_ids?.length) parts.push(`${schedule.group_ids.length} group(s)`);
	if (schedule.tags?.tags?.length) parts.push(`tags: ${schedule.tags.tags.join(', ')}`);
	return parts.join(', ') || '—';
};

const triggerDelete = (schedule: Schedule) => {
	activeSchedule.value = schedule;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeSchedule.value) return;
	await $api.schedules.delete(activeSchedule.value.id);
	snackbar.add({ type: 'success', text: 'Schedule deleted' });
	deleteConfirmOpen.value = false;
	await refresh();
};
</script>
