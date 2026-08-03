<template>
	<div class="h-full w-full flex-1">
		<div class="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
			<div
				v-if="pending"
				class="p-6 text-center text-sm text-gray-500"
			>
				Loading audit log...
			</div>
			<div
				v-else-if="entries.length === 0"
				class="p-6 text-center text-sm text-gray-500"
			>
				No audit entries for this client.
			</div>
			<table
				v-else
				class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
			>
				<thead class="bg-gray-50 dark:bg-gray-950">
					<tr>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Timestamp
						</th>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Username
						</th>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Application
						</th>
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
							Action
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
					<tr
						v-for="(entry, index) in entries"
						:key="index"
					>
						<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
							{{ useDateFormat(entry.timestamp, 'YYYY-MM-DD HH:mm:ss').value }}
						</td>
						<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-white">
							{{ entry.username }}
						</td>
						<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
							{{ entry.application }}
						</td>
						<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
							{{ entry.action }}
						</td>
					</tr>
				</tbody>
			</table>
			<div
				v-if="entries.length > 0"
				class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
			>
				<span class="text-xs text-gray-500">
					Showing {{ 1 + page * ITEMS_PER_PAGE }} to {{ entries.length + page * ITEMS_PER_PAGE }} of {{ response?.meta?.count ?? 0 }} results
				</span>
				<div class="flex items-center gap-2">
					<button
						:disabled="page === 0"
						class="rounded-full p-1 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300"
						@click="previous"
					>
						<ChevronLeft class="h-5 w-5" />
					</button>
					<button
						:disabled="disabledNext"
						class="rounded-full p-1 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300"
						@click="next"
					>
						<ChevronRight class="h-5 w-5" />
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
});

const { $api } = useNuxtApp();

const ITEMS_PER_PAGE = 20;
const page = ref(0);

const { data: response, pending, refresh } = useLazyAsyncData(
	'device-audit-log',
	() => $api.auditLog.paginate(page.value, ITEMS_PER_PAGE, { client_id: props.id }),
	{ watch: [page] },
);

const entries = computed(() => response.value?.data ?? []);
const disabledNext = computed(() => Math.ceil((response?.value?.meta?.count ?? 0) / ITEMS_PER_PAGE) <= page.value + 1);

const next = async () => {
	if (!disabledNext.value) {
		page.value++;
		await refresh();
	}
};
const previous = async () => {
	if (page.value > 0) {
		page.value--;
		await refresh();
	}
};
</script>
