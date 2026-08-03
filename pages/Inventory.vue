<template>
	<new-page-wrapper>
		<div class="mx-auto h-screen max-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
			<div class="relative z-20 flex h-16 items-center justify-between">
				<div class="">
					<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
						Inventory
					</h3>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						&nbsp;
					</p>
				</div>
				<div class="flex-1" />
			</div>
			<div class="my-4 flex items-center justify-between gap-2">
				<div class="relative flex w-full">
					<div class="flex w-full items-center justify-between rounded">
						<input
							v-model="filter"
							class="h-full w-full rounded-l border-none py-0 focus:outline-none focus:outline-0 focus:ring-0"
							placeholder="Filter clients by name or IP Address"
							type="text"
							@keyup.enter="handleFilterList"
						>
						<button
							class="bg-primary-800 hover:bg-primary-800 focus-visible:outline-primary disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shrink-0 rounded-l-none"
							type="button"
							@click="isFilterModalOpen = true"
						>
							<span class="flex items-center justify-center gap-x-2">
								<span>{{ connectionState ? `State: ${connectionState}` : 'More Filters' }}</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24px"
									height="24px"
									viewBox="0 0 24 24"
									class="icon"
								>
									<path
										fill="currentColor"
										d="M6 13h12v-2H6M3 6v2h18V6M10 18h4v-2h-4v2Z"
									/>
								</svg>
							</span>
						</button>
					</div>
				</div>
			</div>
			<div class="w-full">
				<div class="relative z-10 w-full">
					<div
						class="flow-root overflow-hidden border border-gray-100 ring-1 ring-black ring-opacity-10 dark:border-gray-600 sm:rounded-lg"
					>
						<div class="overflow-auto relative z-10 -mb-2">
							<div class="inline-block min-w-full align-middle">
								<div class="sm:rounded-t-lg overflow-hidden">
									<div>
										<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
											<thead class="rounded-lg bg-gray-50 dark:bg-gray-950">
												<tr>
													<th
														class="w-10 text-right py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													/>
													<th
														class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>Client</span>
													</th>
													<th
														class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>ID</span>
													</th>
													<th
														class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>OS</span>
													</th>
													<th
														class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>IPv4</span>
													</th>
													<th
														class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>Client Version</span>
													</th>
													<th
														class="text-center py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>Updates</span>
													</th>
													<th
														class="text-center py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
														scope="col"
													>
														<span>Security Updates</span>
													</th>
												</tr>
											</thead>
											<tbody
												class="z-10 divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
											>
												<tr v-if="pending">
													<td
														colspan="8"
														class="w-full flex-1 py-6 text-center text-gray-800 dark:text-gray-200"
													>
														Loading clients...
													</td>
												</tr>
												<tr v-else-if="!response?.data?.length">
													<td
														colspan="8"
														class="w-full flex-1 py-6 text-center text-gray-800 dark:text-gray-200"
													>
														No results
													</td>
												</tr>
												<tr
													v-for="client in response?.data"
													v-else
													:key="client.id"
													class="cursor-pointer border-t-1 group relative border-gray-200 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800"
													@click="navigateTo(`/dashboard/${client.id}`)"
												>
													<td class="whitespace-nowrap py-3.5 pl-4 pr-3 text-right sm:pl-6">
														<ClientIcon
															:os_full_name="client.os_full_name"
															:os_kernel="client.os_kernel"
															:os_family="client.os_family"
															:os="client.os"
															:size="20"
														/>
													</td>
													<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														<div class="flex items-center gap-2">
															<span
																class="h-2 w-2 shrink-0 rounded-full"
																:class="client.connection_state === 'connected' || !client.disconnected_at ? 'bg-green-500' : 'bg-gray-400'"
															/>
															{{ client.name || client.hostname }}
														</div>
													</td>
													<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														{{ client.id }}
													</td>
													<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														{{ client.os_full_name || client.os }}
													</td>
													<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														{{ client.ipv4?.join(', ') }}
													</td>
													<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														{{ client.version }}
													</td>
													<td class="text-center min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														<span
															v-if="client.updates_status?.updates_available"
															class="bg-primary-50 dark:bg-primary-500/10 text-primary-800 dark:text-primary-400 ring-primary-600/20 dark:ring-primary-400/30 px-2 py-1 inline-flex items-center gap-x-1.5 rounded-md text-xs font-medium ring-1 ring-inset"
														>{{ client.updates_status.updates_available }}</span>
														<span v-else>&mdash;</span>
													</td>
													<td class="text-center min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
														<span
															v-if="client.updates_status?.security_updates_available"
															class="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-red-600/20 dark:ring-red-400/30 px-2 py-1 inline-flex items-center gap-x-1.5 rounded-md text-xs font-medium ring-1 ring-inset"
														>{{ client.updates_status.security_updates_available }}</span>
														<span v-else>&mdash;</span>
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
						<div class="relative z-0 -mx-4 mt-2 sm:-mx-6 lg:-mx-8">
							<div class="inline-block min-w-full align-middle sm:px-6 lg:px-8">
								<div class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950">
									<div>
										<div
											class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-600 sm:pl-6"
										>
											<div class="flex w-full items-center justify-between">
												<div class="flex items-center justify-between">
													<span
														class="text-xs text-gray-500"
													> Showing <span
														class="font-medium"
													>{{ response?.data?.length ? 1 + (page * ITEMS_PER_PAGE) : 0 }}</span> to <span
														class="font-medium"
													>{{ (response?.data?.length ?? 0) + (page * ITEMS_PER_PAGE) }}</span> of <span
														class="font-medium"
													>{{ response?.meta?.count ?? 0 }}</span> results </span>
												</div>
												<div class="flex-1" />
												<div class="flex w-full max-w-[90px] items-center justify-between">
													<button
														:disabled="page === 0"
														class="rounded-full p-1 text-gray-500 transition-all duration-300 hover:bg-gray-300 hover:text-primary disabled:cursor-not-allowed disabled:text-gray-300 hover:disabled:bg-transparent hover:dark:bg-gray-900 disabled:dark:text-gray-700 hover:dark:disabled:bg-transparent"
														@click="previous"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 20 20"
															fill="currentColor"
															aria-hidden="true"
															class="h-6 w-6"
														>
															<path
																fill-rule="evenodd"
																d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
																clip-rule="evenodd"
															/>
														</svg>
													</button>
													<button
														:disabled="disabledNext"
														class="rounded-full p-1 text-gray-500 transition-all duration-300 hover:bg-gray-300 hover:text-primary disabled:cursor-not-allowed disabled:text-gray-300 hover:disabled:bg-transparent hover:dark:bg-gray-900 disabled:dark:text-gray-700 hover:dark:disabled:bg-transparent"
														@click="next"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 20 20"
															fill="currentColor"
															aria-hidden="true"
															class="h-6 w-6"
														>
															<path
																fill-rule="evenodd"
																d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
																clip-rule="evenodd"
															/>
														</svg>
													</button>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="h-12 w-full" />
				</div>
			</div>
		</div>
		<CustomModalFilter
			v-model="isFilterModalOpen"
			v-model:connection-state="connectionState"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import ClientIcon from '~/components/device/ClientIcon.vue';

const { $api } = useNuxtApp();

const ITEMS_PER_PAGE = 20;

const page = ref(0);
const filter = ref('');
const connectionState = ref('');
const isFilterModalOpen = ref(false);

const { data: response, pending, refresh } = useLazyAsyncData(
	'inventory-clients',
	() => $api.clients.paginate(page.value, ITEMS_PER_PAGE, filter.value, connectionState.value),
	{ watch: [page, filter, connectionState] },
);

const disabledNext = computed(() => {
	return Math.ceil((response?.value?.meta?.count ?? 0) / ITEMS_PER_PAGE) <= page.value + 1;
});

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

const handleFilterList = useDebounceFn(() => {
	page.value = 0;
	refresh();
}, 300);

watch(connectionState, () => {
	page.value = 0;
	refresh();
});
</script>
