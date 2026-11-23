<template>
	<new-page-wrapper>
		<AppPage
			title="Schedules"
			description="Run commands and scripts automatically on a cron schedule."
		>
			<template #actions>
				<AppButton @click="formModal?.openForCreate()">
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					New schedule
				</AppButton>
			</template>

			<div class="flex flex-wrap items-center gap-3">
				<div class="relative w-full min-w-0 sm:w-auto sm:max-w-sm sm:flex-1">
					<Search
						class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-3"
						aria-hidden="true"
					/>
					<input
						v-model="search"
						type="search"
						aria-label="Search schedules"
						placeholder="Search by name or command…"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
					>
				</div>
				<OpSegmented
					v-model="typeFilter"
					:options="typeOptions"
					label="Filter by type"
				/>
			</div>

			<section class="overflow-hidden rounded-xl border border-app-border bg-app-surface">
				<OpEmpty
					v-if="pending && !schedules.length"
					loading
					title="Loading schedules…"
				/>
				<OpEmpty
					v-else-if="schedules.length === 0"
					:icon="CalendarClock"
					title="No schedules yet"
					description="Schedules run a command or script on a cron expression, on devices, groups or tags."
				>
					<AppButton @click="formModal?.openForCreate()">
						<Plus
							class="h-4 w-4"
							aria-hidden="true"
						/>
						New schedule
					</AppButton>
				</OpEmpty>
				<OpEmpty
					v-else-if="filtered.length === 0"
					:icon="Search"
					title="No matching schedules"
					description="Try a different search or type filter."
				/>
				<template v-else>
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[760px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in ['Name', 'Type', 'Cron', 'Targets', 'Last run']"
										:key="col"
										scope="col"
										class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
									>
										{{ col }}
									</th>
									<th
										scope="col"
										class="border-b border-app-border px-3 py-2.5 pr-4"
									>
										<span class="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="schedule in filtered"
									:key="schedule.id"
									class="hover:bg-app-hover"
								>
									<td class="border-b border-app-border-subtle py-3.5 pl-4 pr-3 align-middle text-[13px]">
										<div class="font-medium text-app-text">
											{{ schedule.name }}
										</div>
										<div
											class="mt-0.5 max-w-[320px] truncate font-mono text-xs text-app-text-3"
											:title="preview(schedule)"
										>
											{{ preview(schedule) }}
										</div>
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3.5 align-middle">
										<span :class="['rounded-md px-2 py-[3px] text-xs font-semibold', typeClass(schedule)]">
											{{ typeLabel(schedule) }}
										</span>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle font-mono text-[13px] text-app-text">
										{{ schedule.schedule }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3.5 align-middle text-[13px] text-app-text-2">
										{{ targetSummary(schedule) }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle text-[13px]">
										<LastRun :schedule="schedule" />
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle py-3.5 pl-3 pr-4 text-right align-middle">
										<AppButton
											variant="ghost"
											size="sm"
											:aria-label="`Edit ${schedule.name}`"
											@click="formModal?.openForEdit(schedule)"
										>
											<Pencil
												class="h-4 w-4"
												aria-hidden="true"
											/>
											Edit
										</AppButton>
										<AppButton
											variant="danger"
											size="sm"
											:aria-label="`Delete ${schedule.name}`"
											@click="triggerDelete(schedule)"
										>
											<Trash2
												class="h-4 w-4"
												aria-hidden="true"
											/>
										</AppButton>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="schedule in filtered"
							:key="schedule.id"
							class="flex flex-col gap-2 px-4 py-3.5"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-app-text">
										{{ schedule.name }}
									</p>
									<p class="mt-0.5 font-mono text-xs text-app-text-2">
										{{ schedule.schedule }}
									</p>
								</div>
								<span :class="['shrink-0 rounded-md px-2 py-[3px] text-xs font-semibold', typeClass(schedule)]">
									{{ typeLabel(schedule) }}
								</span>
							</div>
							<p class="text-[13px] text-app-text-2">
								{{ targetSummary(schedule) }}
							</p>
							<div class="flex items-center justify-between gap-2 text-[13px]">
								<LastRun :schedule="schedule" />
								<div class="flex gap-1">
									<AppButton
										variant="secondary"
										size="sm"
										:aria-label="`Edit ${schedule.name}`"
										@click="formModal?.openForEdit(schedule)"
									>
										Edit
									</AppButton>
									<AppButton
										variant="danger"
										size="sm"
										:aria-label="`Delete ${schedule.name}`"
										@click="triggerDelete(schedule)"
									>
										Delete
									</AppButton>
								</div>
							</div>
						</li>
					</ul>
				</template>
			</section>
		</AppPage>
		<ScheduleFormModal
			ref="formModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			title="Delete schedule?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<p class="text-sm text-app-text-2">
				“<span class="font-medium text-app-text">{{ activeSchedule?.name }}</span>” will be deleted and stop running.
			</p>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { CalendarClock, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next';
import ScheduleFormModal, { decodeScript } from '~/components/schedules/ScheduleFormModal.vue';
import LastRun from '~/components/schedules/ScheduleLastRun.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import { useRunLibrary } from '~/composables/useRunLibrary';
import type { Schedule } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const library = useRunLibrary();

const formModal = ref<InstanceType<typeof ScheduleFormModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeSchedule = ref<Schedule | null>(null);
const search = ref('');
const typeFilter = ref<'all' | 'command' | 'script' | 'library'>('all');

const { data: response, pending, refresh } = useLazyAsyncData('schedules', () => $api.schedules.list());
const schedules = computed(() => response.value?.data ?? []);

const typeOptions = computed(() => [
	{ value: 'all' as const, label: 'All' },
	{ value: 'command' as const, label: 'Commands' },
	{ value: 'script' as const, label: 'Scripts' },
	{ value: 'library' as const, label: 'Library' },
]);

const { data: entryList } = useLazyAsyncData('schedules-library-entries', async () => {
	try {
		return await library.listAll();
	}
	catch {
		return [];
	}
});
const entryNames = computed(() => new Map((entryList.value ?? []).map(e => [e.id, e.name])));

const typeLabel = (schedule: Schedule) => ({ script: 'Script', library: 'Library', command: 'Command' })[schedule.type] ?? 'Command';
const typeClass = (schedule: Schedule) => ({
	script: 'bg-app-purple-bg text-app-purple',
	library: 'bg-app-accent/15 text-app-accent',
	command: 'bg-app-blue-bg text-app-blue',
})[schedule.type] ?? 'bg-app-blue-bg text-app-blue';

const preview = (schedule: Schedule) => schedule.type === 'library'
	? `Library: ${entryNames.value.get(schedule.library_entry_id ?? '') ?? 'unknown entry'}`
	: ((schedule.type === 'script' ? decodeScript(schedule.script ?? '') : schedule.command) ?? '').split('\n')[0];

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	return schedules.value.filter((schedule) => {
		if (typeFilter.value !== 'all' && schedule.type !== typeFilter.value) return false;
		if (!term) return true;
		return schedule.name.toLowerCase().includes(term) || preview(schedule).toLowerCase().includes(term);
	});
});

const targetSummary = (schedule: Schedule) => {
	const parts = [];
	if (schedule.client_ids?.length) parts.push(`${schedule.client_ids.length} device${schedule.client_ids.length === 1 ? '' : 's'}`);
	if (schedule.group_ids?.length) parts.push(`${schedule.group_ids.length} group${schedule.group_ids.length === 1 ? '' : 's'}`);
	if (schedule.tags?.tags?.length) parts.push(`tags: ${schedule.tags.tags.join(schedule.tags.operator === 'OR' ? ' or ' : ' and ')}`);
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
