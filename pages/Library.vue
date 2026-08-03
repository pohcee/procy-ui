<template>
	<new-page-wrapper>
		<div class="mx-auto h-screen max-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
			<div>
				<div class="relative z-20 flex h-16 items-center justify-between">
					<div class="">
						<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
							Library
						</h3>
						<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
							&nbsp;
						</p>
					</div>
					<div class="flex-1" />
					<div class="ml-2 flex-shrink-0">
						<button
							class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm"
							type="button"
							@click="openCreateModal"
						>
							New {{ activeTab === 'scripts' ? 'script' : 'command' }}
						</button>
					</div>
				</div>
				<div class="border-b border-gray-200 mt-6">
					<nav
						class="-mb-px flex space-x-6"
						aria-label="Tabs"
					>
						<span
							class="cursor-pointer whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
							:class="activeTab === 'commands' ? 'primary-text border-primary' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
							@click="activeTab = 'commands'"
						>Commands</span>
						<span
							class="cursor-pointer whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
							:class="activeTab === 'scripts' ? 'primary-text border-primary' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
							@click="activeTab = 'scripts'"
						>Scripts</span>
					</nav>
				</div>
				<h3 class="mt-4 text-gray-800 dark:text-gray-200">
					Browse {{ activeTab === 'scripts' ? 'Scripts' : 'Commands' }}
				</h3>
				<div class="mt-4 flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="30px"
						height="30px"
						viewBox="0 0 24 24"
						class="icon primary-text mr-2 mt-1.5"
					>
						<path
							fill="currentColor"
							d="m18.9 20.3l-5.6-5.6q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5q0-2.725 1.888-4.612T9.5 3q2.725 0 4.612 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l5.625 5.625q.275.275.275.675t-.3.7q-.275.275-.7.275t-.7-.275ZM9.5 14q1.875 0 3.188-1.313T14 9.5q0-1.875-1.313-3.188T9.5 5Q7.625 5 6.312 6.313T5 9.5q0 1.875 1.313 3.188T9.5 14Z"
						/>
					</svg>
					<div class="flex flex-col flex flex-1">
						<div class="relative mt-1 flex w-full flex-col">
							<input
								id="librarySearch"
								v-model="search"
								class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
								:placeholder="`Search ${activeTab}`"
								type="text"
								autocomplete="off"
							>
						</div>
					</div>
				</div>
				<div class="mt-6 rounded-md border overflow-hidden">
					<div
						v-if="pending"
						class="p-6 text-center text-sm text-gray-500"
					>
						Loading...
					</div>
					<div
						v-else-if="filteredItems.length === 0"
						class="select-none p-4"
					>
						<div class="mt-1 flex items-center rounded p-2.5 bg-blue-50">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24px"
								height="24px"
								viewBox="0 0 24 24"
								class="icon text-blue-400 shrink-0"
							>
								<g
									fill="none"
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
								>
									<circle
										cx="12"
										cy="12"
										r="9"
									/>
									<path d="M12 15v-3m0-3v0" />
								</g>
							</svg>
							<p class="ml-3 text-sm font-medium text-blue-800">
								No data found
							</p>
						</div>
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
									Tags
								</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
									Timeout
								</th>
								<th class="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">
									Updated
								</th>
								<th class="px-4 py-3" />
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
							<tr
								v-for="item in filteredItems"
								:key="item.id"
							>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-white">
									{{ item.name }}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
									{{ item.tags?.join(', ') }}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
									{{ item.timeout_sec }}s
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
									{{ useDateFormat(item.updated_at, 'YYYY-MM-DD HH:mm').value }}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-right text-sm">
									<button
										class="text-primary-600 hover:underline"
										type="button"
										@click="openEditModal(item)"
									>
										Edit
									</button>
									<button
										class="ml-3 text-red-600 hover:underline"
										type="button"
										@click="triggerDelete(item)"
									>
										Delete
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
		<LibraryItemModal
			ref="itemModal"
			:type="activeTab === 'scripts' ? 'script' : 'command'"
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
				<div>Do you want to delete "{{ activeItem?.name }}"?</div>
			</div>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import LibraryItemModal from '~/components/custom/LibraryItemModal.vue';
import type { Command, Script } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const activeTab = ref<'commands' | 'scripts'>('commands');
const search = ref('');
const itemModal = ref<InstanceType<typeof LibraryItemModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeItem = ref<Command | Script | null>(null);

const { data: response, pending, refresh } = useLazyAsyncData(
	() => `library-${activeTab.value}`,
	() => activeTab.value === 'scripts' ? $api.library.listScript() : $api.library.listCommand(),
	{ watch: [activeTab] },
);

const filteredItems = computed(() => {
	const items = response.value?.data ?? [];
	if (!search.value) return items;
	const term = search.value.toLowerCase();
	return items.filter(item => item.name.toLowerCase().includes(term) || item.tags?.some(tag => tag.toLowerCase().includes(term)));
});

const openCreateModal = () => {
	itemModal.value?.openForCreate();
};
const openEditModal = (item: Command | Script) => {
	itemModal.value?.openForEdit(item);
};

const triggerDelete = (item: Command | Script) => {
	activeItem.value = item;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeItem.value) return;
	if (activeTab.value === 'scripts') {
		await $api.library.deleteScript(activeItem.value.id);
	}
	else {
		await $api.library.deleteCommand(activeItem.value.id);
	}
	snackbar.add({ type: 'success', text: 'Deleted from library' });
	deleteConfirmOpen.value = false;
	await refresh();
};
</script>
