<template>
	<new-page-wrapper>
		<div class="mx-auto h-screen max-h-screen max-w-7xl overflow-y-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
			<div class="relative z-20 flex h-16 items-center justify-between">
				<div class="">
					<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
						Audit Logs
					</h3>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						&nbsp;
					</p>
				</div>
			</div>
			<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<input
					v-model="filters.username"
					class="primary input-text h-10 rounded bg-transparent text-sm text-theme-inverted shadow-sm focus:outline-0 focus:ring-0"
					placeholder="Username"
					type="text"
					@keyup.enter="applyFilters"
				>
				<input
					v-model="filters.application"
					class="primary input-text h-10 rounded bg-transparent text-sm text-theme-inverted shadow-sm focus:outline-0 focus:ring-0"
					placeholder="Application (e.g. client)"
					type="text"
					@keyup.enter="applyFilters"
				>
				<input
					v-model="filters.action"
					class="primary input-text h-10 rounded bg-transparent text-sm text-theme-inverted shadow-sm focus:outline-0 focus:ring-0"
					placeholder="Action (e.g. create)"
					type="text"
					@keyup.enter="applyFilters"
				>
				<input
					v-model="filters.client_id"
					class="primary input-text h-10 rounded bg-transparent text-sm text-theme-inverted shadow-sm focus:outline-0 focus:ring-0"
					placeholder="Client ID"
					type="text"
					@keyup.enter="applyFilters"
				>
			</div>
			<div class="mb-4 flex justify-end gap-2">
				<button
					class="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200"
					type="button"
					@click="clearFilters"
				>
					Clear
				</button>
				<button
					class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold"
					type="button"
					@click="applyFilters"
				>
					Apply
				</button>
			</div>
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
					No results
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
								Remote IP
							</th>
							<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
								Application
							</th>
							<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
								Action
							</th>
							<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
								Client
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						<tr
							v-for="(entry, index) in entries"
							:key="index"
							class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
							@click="activeEntry = entry"
						>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								{{ useDateFormat(entry.timestamp, 'YYYY-MM-DD HH:mm:ss').value }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-white">
								{{ entry.username }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								{{ entry.remote_ip }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								{{ entry.application }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								{{ entry.action }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
								{{ entry.client_hostname || entry.client_id }}
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
		<Modal
			:model-value="isDetailOpen"
			title="Audit log entry"
			ok-text="Close"
			:show-cancel="false"
			@update:model-value="activeEntry = null"
			@ok="activeEntry = null"
		>
			<div class="absolute inset-0 overflow-auto p-6 pt-16 text-left text-sm">
				<pre class="whitespace-pre-wrap break-all rounded bg-gray-100 p-3 dark:bg-gray-800">{{ JSON.stringify(activeEntry, null, 2) }}</pre>
			</div>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { AuditLog } from '~/types';
import type { AuditLogFilters } from '~/repository/modules/auditlog';

const { $api } = useNuxtApp();

const ITEMS_PER_PAGE = 20;
const page = ref(0);
const filters = reactive<AuditLogFilters>({ username: '', application: '', action: '', client_id: '' });
const appliedFilters = ref<AuditLogFilters>({});
const activeEntry = ref<AuditLog | null>(null);

const { data: response, pending, refresh } = useLazyAsyncData(
	'audit-log',
	() => $api.auditLog.paginate(page.value, ITEMS_PER_PAGE, appliedFilters.value),
	{ watch: [page, appliedFilters] },
);

const entries = computed(() => response.value?.data ?? []);
const isDetailOpen = computed(() => activeEntry.value !== null);

const disabledNext = computed(() => Math.ceil((response?.value?.meta?.count ?? 0) / ITEMS_PER_PAGE) <= page.value + 1);

const applyFilters = () => {
	page.value = 0;
	appliedFilters.value = { ...filters };
};

const clearFilters = () => {
	filters.username = '';
	filters.application = '';
	filters.action = '';
	filters.client_id = '';
	applyFilters();
};

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
