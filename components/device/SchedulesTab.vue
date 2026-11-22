<template>
	<div class="flex flex-col gap-4">
		<AppCard
			title="Schedules"
			description="Scheduled commands and scripts that target this client."
			flush
		>
			<template #actions>
				<AppButton
					size="sm"
					@click="formModal?.openForCreate()"
				>
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					New schedule
				</AppButton>
			</template>
			<div
				v-if="pending"
				class="py-12 text-center text-sm text-app-text-3"
			>
				Loading schedules…
			</div>
			<div
				v-else-if="clientSchedules.length === 0"
				class="py-12 text-center text-sm text-app-text-3"
			>
				No schedules target this client.
			</div>
			<div
				v-else
				class="overflow-x-auto"
			>
				<table class="w-full min-w-[560px] border-collapse text-sm">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="col in ['Name', 'Type', 'Cron']"
								:key="col"
								scope="col"
								class="border-b border-app-border whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								{{ col }}
							</th>
							<th
								scope="col"
								class="border-b border-app-border px-3 py-2.5"
							>
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="schedule in clientSchedules"
							:key="schedule.id"
							class="hover:bg-app-hover"
						>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 font-medium text-app-text">
								{{ schedule.name }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3">
								<span class="rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium capitalize text-app-text-2">{{ schedule.type }}</span>
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 font-mono text-[13px] text-app-text-2">
								{{ schedule.schedule }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2 text-right">
								<AppButton
									variant="ghost"
									size="sm"
									@click="formModal?.openForEdit(schedule)"
								>
									<Pencil
										class="h-4 w-4"
										aria-hidden="true"
									/>
									Edit
								</AppButton>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</AppCard>
		<ScheduleFormModal
			ref="formModal"
			@saved="refresh"
		/>
	</div>
</template>

<script setup lang="ts">
import { Pencil, Plus } from 'lucide-vue-next';
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

const formModal = ref<InstanceType<typeof ScheduleFormModal> | null>(null);

const { $api } = useNuxtApp();

const { data: response, pending, refresh } = useLazyAsyncData('device-schedules', () => $api.schedules.list());
const clientSchedules = computed(() => {
	const clientId = props.id || props.device?.id;
	return (response.value?.data ?? []).filter(schedule => schedule.client_ids?.includes(clientId));
});
</script>
