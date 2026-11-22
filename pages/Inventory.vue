<template>
	<new-page-wrapper>
		<AppPage
			title="Inventory"
			description="Operating system, client version and pending updates for every device."
		>
			<div class="flex flex-wrap items-center gap-3">
				<div class="relative w-full min-w-0 sm:w-auto sm:max-w-md sm:flex-1">
					<Search
						class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-3"
						aria-hidden="true"
					/>
					<input
						v-model="filter"
						type="search"
						aria-label="Filter devices by name or IP address"
						placeholder="Filter by name or IP address…"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
						@keyup.enter="handleFilterList"
					>
				</div>
				<AppButton
					variant="secondary"
					:aria-label="connectionState ? `Filters: state ${connectionState}` : 'More filters'"
					@click="isFilterModalOpen = true"
				>
					<SlidersHorizontal
						class="h-4 w-4"
						aria-hidden="true"
					/>
					{{ connectionState ? `State: ${connectionState}` : 'More filters' }}
				</AppButton>
				<AppButton
					v-if="connectionState"
					variant="ghost"
					@click="connectionState = ''"
				>
					Clear
				</AppButton>
			</div>

			<section class="overflow-hidden rounded-xl border border-app-border bg-app-surface">
				<OpEmpty
					v-if="pending && !clients.length"
					loading
					title="Loading devices…"
				/>
				<OpEmpty
					v-else-if="!clients.length"
					:icon="Boxes"
					:title="filter || connectionState ? 'No matching devices' : 'No devices yet'"
					:description="filter || connectionState ? 'Try a different filter.' : 'Devices appear here once a client connects to this server.'"
				/>
				<template v-else>
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[900px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in columns"
										:key="col.label"
										scope="col"
										:class="[
											'whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4 last:pr-4',
											col.align === 'right' ? 'text-right' : 'text-left',
										]"
									>
										{{ col.label }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="client in clients"
									:key="client.id"
									class="cursor-pointer hover:bg-app-hover"
									@click="navigateTo(`/dashboard/${client.id}`)"
								>
									<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 align-middle text-[13px]">
										<div class="flex items-center gap-3">
											<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-muted">
												<ClientIcon
													:os-full-name="client.os_full_name"
													:os-kernel="client.os_kernel"
													:os-family="client.os_family"
													:os="client.os"
													:size="18"
												/>
											</span>
											<div class="min-w-0">
												<NuxtLink
													:to="`/dashboard/${client.id}`"
													class="block truncate font-mono font-medium text-app-text hover:text-app-link"
													@click.stop
												>
													{{ client.name || client.hostname }}
												</NuxtLink>
												<span :class="['mt-0.5 inline-flex items-center gap-1.5 text-xs', isOnline(client) ? 'text-app-ok' : 'text-app-text-3']">
													<span
														:class="['h-1.5 w-1.5 rounded-full', isOnline(client) ? 'bg-[#22C55E]' : 'bg-app-text-4']"
														aria-hidden="true"
													/>
													{{ isOnline(client) ? 'Online' : 'Offline' }}
												</span>
											</div>
										</div>
									</td>
									<td class="max-w-[180px] truncate border-b border-app-border-subtle px-3 py-3 align-middle font-mono text-xs text-app-text-3">
										{{ client.id }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 align-middle text-[13px] text-app-text-2">
										{{ client.os_full_name || client.os }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 align-middle font-mono text-[13px] text-app-text-2">
										{{ client.ipv4?.join(', ') || '—' }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 align-middle font-mono text-[13px] text-app-text-2">
										{{ client.version || '—' }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 text-right align-middle">
										<UpdatesCount
											:count="client.updates_status?.updates_available"
											kind="updates"
										/>
									</td>
									<td class="border-b border-app-border-subtle py-3 pl-3 pr-4 text-right align-middle">
										<UpdatesCount
											:count="client.updates_status?.security_updates_available"
											kind="security"
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="client in clients"
							:key="client.id"
						>
							<NuxtLink
								:to="`/dashboard/${client.id}`"
								class="flex items-start gap-3 px-4 py-3.5 hover:bg-app-hover"
							>
								<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-muted">
									<ClientIcon
										:os-full-name="client.os_full_name"
										:os-kernel="client.os_kernel"
										:os-family="client.os_family"
										:os="client.os"
										:size="18"
									/>
								</span>
								<span class="min-w-0 flex-1">
									<span class="flex items-center justify-between gap-2">
										<span class="truncate font-mono text-sm font-medium text-app-text">{{ client.name || client.hostname }}</span>
										<span :class="['inline-flex shrink-0 items-center gap-1.5 text-xs', isOnline(client) ? 'text-app-ok' : 'text-app-text-3']">
											<span
												:class="['h-1.5 w-1.5 rounded-full', isOnline(client) ? 'bg-[#22C55E]' : 'bg-app-text-4']"
												aria-hidden="true"
											/>
											{{ isOnline(client) ? 'Online' : 'Offline' }}
										</span>
									</span>
									<span class="mt-0.5 block truncate text-xs text-app-text-3">{{ client.os_full_name || client.os }}</span>
									<span class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-text-3">
										<span class="font-mono">{{ client.ipv4?.[0] || '—' }}</span>
										<span class="font-mono">v{{ client.version || '?' }}</span>
										<UpdatesCount
											:count="client.updates_status?.updates_available"
											kind="updates"
											labelled
										/>
										<UpdatesCount
											:count="client.updates_status?.security_updates_available"
											kind="security"
											labelled
										/>
									</span>
								</span>
							</NuxtLink>
						</li>
					</ul>
				</template>

				<OpPagination
					v-if="clients.length"
					:page="page"
					:per-page="ITEMS_PER_PAGE"
					:count="response?.meta?.count ?? 0"
					:shown="clients.length"
					@previous="previous"
					@next="next"
				/>
			</section>
		</AppPage>
		<CustomModalFilter
			v-model="isFilterModalOpen"
			v-model:connection-state="connectionState"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { Boxes, Search, SlidersHorizontal } from 'lucide-vue-next';
import ClientIcon from '~/components/device/ClientIcon.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpPagination from '~/components/operate/OpPagination.vue';
import UpdatesCount from '~/components/operate/UpdatesCount.vue';
import type { Client } from '~/types';

const { $api } = useNuxtApp();

const ITEMS_PER_PAGE = 20;

const columns = [
	{ label: 'Device', align: 'left' },
	{ label: 'ID', align: 'left' },
	{ label: 'OS', align: 'left' },
	{ label: 'IPv4', align: 'left' },
	{ label: 'Client version', align: 'left' },
	{ label: 'Updates', align: 'right' },
	{ label: 'Security', align: 'right' },
];

const page = ref(0);
const filter = ref('');
const connectionState = ref('');
const isFilterModalOpen = ref(false);

const { data: response, pending, refresh } = useLazyAsyncData(
	'inventory-clients',
	() => $api.clients.paginate(page.value, ITEMS_PER_PAGE, filter.value, connectionState.value),
	{ watch: [page, filter, connectionState] },
);

const clients = computed(() => response.value?.data ?? []);
const isOnline = (client: Client) => client.connection_state === 'connected' || !client.disconnected_at;

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
