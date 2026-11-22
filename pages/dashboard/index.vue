<template>
	<new-page-wrapper>
		<AppPage
			title="Devices"
			description="Every client connected to this server. Select one to inspect it, run commands or open tunnels."
		>
			<template #actions>
				<AppButton
					variant="secondary"
					@click="openAddClientModal"
				>
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Add device
				</AppButton>
				<AppButton to="/execute">
					<Terminal
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Run command
				</AppButton>
			</template>

			<NoClients v-if="loaded && totalCount === 0 && !loadError" />

			<template v-else>
				<!-- Summary tiles (tablet/desktop) -->
				<div class="hidden gap-4 md:grid md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
					<div class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
						<div class="text-[13px] font-medium text-app-text-3">
							Total devices
						</div>
						<div class="mt-1.5 text-[28px] font-bold tracking-tight text-app-text">
							{{ loaded ? stats.total : '–' }}
						</div>
					</div>
					<div class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
						<div class="flex items-center gap-2 text-[13px] font-medium text-app-text-3">
							<span
								class="h-2 w-2 rounded-full bg-[#22C55E]"
								aria-hidden="true"
							/>Online
						</div>
						<div class="mt-1.5 text-[28px] font-bold tracking-tight text-app-text">
							{{ loaded ? stats.online : '–' }}
						</div>
					</div>
					<div class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
						<div class="flex items-center gap-2 text-[13px] font-medium text-app-text-3">
							<span
								class="h-2 w-2 rounded-full border-2 border-app-text-4"
								aria-hidden="true"
							/>Offline
						</div>
						<div class="mt-1.5 text-[28px] font-bold tracking-tight text-app-text">
							{{ loaded ? stats.offline : '–' }}
						</div>
					</div>
					<div
						v-if="stats.reportingUpdates"
						class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4"
					>
						<div class="text-[13px] font-medium text-app-text-3">
							Security updates pending
						</div>
						<div :class="['mt-1.5 text-[28px] font-bold tracking-tight', stats.security ? 'text-app-warn' : 'text-app-text']">
							{{ stats.security }}
						</div>
					</div>
				</div>

				<!-- Device list card -->
				<section
					aria-label="Device list"
					class="rounded-xl border border-app-border bg-app-surface"
				>
					<!-- Toolbar -->
					<div class="flex flex-col gap-3 border-b border-app-border px-4 py-3.5 xl:flex-row xl:items-center xl:justify-between">
						<div
							role="group"
							aria-label="Filter by group"
							class="scrollbar-hide order-2 -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
						>
							<button
								v-for="pill in pills"
								:key="pill.id"
								type="button"
								:aria-pressed="group === pill.id"
								:title="pill.description || undefined"
								:class="[
									'inline-flex h-9 flex-none items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
									group === pill.id
										? 'border-app-accent bg-app-accent text-white'
										: 'border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover',
								]"
								@click="setGroup(pill.id)"
							>
								<Star
									v-if="pill.id === 'favorites'"
									class="h-3.5 w-3.5"
									aria-hidden="true"
								/>
								{{ pill.label }}
								<span class="text-xs opacity-80">{{ pill.count }}</span>
							</button>
						</div>
						<div class="order-1 flex flex-wrap items-center gap-2.5 xl:order-3">
							<div
								role="group"
								aria-label="Filter by status"
								class="order-2 flex w-full rounded-[10px] bg-app-muted p-[3px] sm:order-1 sm:inline-flex sm:w-auto"
							>
								<button
									v-for="option in statusOptions"
									:key="option.id"
									type="button"
									:aria-pressed="status === option.id"
									:class="[
										'h-[34px] flex-1 rounded-lg px-3 text-[13px] font-medium transition-colors sm:flex-none',
										status === option.id
											? 'bg-app-raised text-app-text shadow-[0_1px_2px_rgba(16,22,31,0.12)]'
											: 'text-app-text-3 hover:text-app-text',
									]"
									@click="status = option.id"
								>
									{{ option.label }}
								</button>
							</div>
							<div class="order-1 flex w-full items-center gap-2.5 sm:order-2 sm:w-auto">
								<div class="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-app-border-strong bg-app-surface px-3 sm:h-10 sm:w-[260px] sm:flex-none">
									<ListFilter
										class="h-4 w-4 flex-none text-app-text-3"
										aria-hidden="true"
									/>
									<label
										for="device-filter"
										class="sr-only"
									>Filter by name, IP, group or OS</label>
									<input
										id="device-filter"
										v-model="query"
										type="search"
										placeholder="Filter by name, IP or group"
										class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-app-text outline-none placeholder:text-app-text-4 focus:ring-0"
									>
								</div>
								<button
									type="button"
									aria-label="Reload the device list (filters are kept)"
									title="Reload the device list (filters are kept)"
									class="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover"
									@click="refresh"
								>
									<RefreshCw
										:class="['h-4 w-4', loading ? 'animate-spin' : '']"
										aria-hidden="true"
									/>
								</button>
								<HeadlessMenu
									as="div"
									class="relative"
								>
									<HeadlessMenuButton
										aria-label="Device list settings"
										title="Device list settings"
										class="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover"
									>
										<Settings2
											class="h-4 w-4"
											aria-hidden="true"
										/>
									</HeadlessMenuButton>
									<HeadlessMenuItems class="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-app-border bg-app-surface p-1.5 shadow-lg focus:outline-none">
										<div class="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3">
											Row density
										</div>
										<HeadlessMenuItem
											v-for="option in densityOptions"
											:key="option.id"
											v-slot="{ active }"
										>
											<button
												type="button"
												role="menuitemradio"
												:aria-checked="density === option.id"
												:class="['flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-left text-sm text-app-text', active ? 'bg-app-hover' : '']"
												@click="density = option.id"
											>
												<Check
													:class="['h-4 w-4', density === option.id ? 'text-app-accent' : 'invisible']"
													aria-hidden="true"
												/>
												{{ option.label }}
											</button>
										</HeadlessMenuItem>
									</HeadlessMenuItems>
								</HeadlessMenu>
							</div>
						</div>
					</div>

					<!-- Phone summary line -->
					<div
						v-if="loaded"
						class="border-b border-app-border-subtle px-4 py-2.5 text-[13px] text-app-text-3 md:hidden"
					>
						{{ stats.online }} online · {{ stats.offline }} offline<template v-if="stats.security">
							· <span class="font-semibold text-app-warn">{{ stats.security }} security update{{ stats.security === 1 ? '' : 's' }}</span>
						</template>
					</div>

					<!-- Table (tablet/desktop) -->
					<div
						v-if="rows.length"
						class="hidden overflow-x-auto md:block"
					>
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr class="bg-app-surface-2 text-left">
									<th
										v-for="col in columns"
										:key="col.id"
										scope="col"
										:class="['border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4', col.class]"
									>
										<span :class="col.id === 'actions' ? 'sr-only' : ''">{{ col.label }}</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="row in rows"
									:key="row.client.id"
									class="hover:bg-app-hover"
								>
									<td :class="['w-full max-w-0 border-b border-app-border-subtle pl-4 pr-3', cellPad]">
										<div class="flex min-w-0 items-center gap-3">
											<ClientIcon
												:os-full-name="row.client.os_full_name"
												:os-kernel="row.client.os_kernel"
												:os-family="row.client.os_family"
												:os="row.client.os"
												:tile="density === 'condensed' ? 28 : 36"
											/>
											<div class="min-w-0">
												<div class="flex items-center gap-1.5">
													<NuxtLink
														:to="`/dashboard/${row.client.id}`"
														class="truncate font-mono text-sm font-medium text-app-text hover:text-app-link hover:underline"
													>
														{{ row.client.name || row.client.id }}
													</NuxtLink>
													<Star
														v-if="row.favorite"
														class="h-3.5 w-3.5 flex-none fill-[#D97706] text-[#D97706]"
														role="img"
														aria-label="Favorite"
													/>
												</div>
												<div
													v-if="density !== 'condensed'"
													class="mt-0.5 truncate text-xs text-app-text-3"
													:title="row.os || undefined"
												>
													{{ row.os || '—' }}
												</div>
												<div
													v-if="density === 'spacious' && row.client.tags?.length"
													class="mt-1 flex flex-wrap gap-1"
												>
													<span
														v-for="tag in row.client.tags"
														:key="tag"
														class="rounded border border-app-border-strong px-1.5 text-[11px] text-app-text-3"
													>{{ tag }}</span>
												</div>
											</div>
										</div>
									</td>
									<td :class="['whitespace-nowrap border-b border-app-border-subtle px-3', cellPad]">
										<span :class="['inline-flex items-center gap-2 text-[13px] font-medium', row.online ? 'text-app-ok' : 'text-app-text-3']">
											<span
												aria-hidden="true"
												:class="['h-2 w-2 rounded-full', row.online ? 'bg-[#22C55E]' : 'border-2 border-app-text-4']"
											/>
											{{ row.statusText }}
										</span>
										<div
											v-if="row.updates.tone === 'security' || row.updates.tone === 'pending'"
											:class="['mt-0.5 text-xs xl:hidden', updatesToneClass[row.updates.tone]]"
										>
											{{ row.updates.text }}
										</div>
									</td>
									<td :class="['whitespace-nowrap border-b border-app-border-subtle px-3 font-mono text-[13px] text-app-text-2', cellPad]">
										{{ row.ip || '—' }}
									</td>
									<td :class="['hidden border-b border-app-border-subtle px-3 xl:table-cell', cellPad]">
										<div class="flex min-w-[9rem] max-w-[16rem] flex-wrap gap-1.5">
											<button
												v-for="g in row.client.groups ?? []"
												:key="g"
												type="button"
												:aria-label="`Show group ${g}`"
												class="whitespace-nowrap rounded-md bg-app-chip px-2 py-[3px] text-xs font-medium text-app-text-2 hover:text-app-link"
												@click="setGroup(g)"
											>
												{{ g }}
											</button>
											<span
												v-if="!row.client.groups?.length"
												class="text-[13px] text-app-text-4"
											>—</span>
										</div>
									</td>
									<td :class="['hidden whitespace-nowrap border-b border-app-border-subtle px-3 text-[13px] xl:table-cell', cellPad, updatesToneClass[row.updates.tone]]">
										{{ row.updates.text }}
									</td>
									<td :class="['whitespace-nowrap border-b border-app-border-subtle pl-3 pr-4 text-right', cellPad]">
										<div class="inline-flex items-center">
											<NuxtLink
												:to="`/dashboard/${row.client.id}?tab=run`"
												:aria-label="`Run a command on ${row.client.name || row.client.id}`"
												:title="`Run a command on ${row.client.name || row.client.id}`"
												class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
											>
												<Terminal
													class="h-4 w-4"
													aria-hidden="true"
												/>
											</NuxtLink>
											<DeviceActionsMenu
												:device="row.client"
												list
												small
												@action="onRowAction(row.client, $event)"
											/>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Card list (phone) -->
					<ul
						v-if="rows.length"
						class="flex flex-col md:hidden"
					>
						<li
							v-for="row in rows"
							:key="row.client.id"
						>
							<NuxtLink
								:to="`/dashboard/${row.client.id}`"
								class="flex items-center gap-3 border-b border-app-border-subtle px-4 py-3.5 text-app-text hover:bg-app-hover"
							>
								<ClientIcon
									:os-full-name="row.client.os_full_name"
									:os-kernel="row.client.os_kernel"
									:os-family="row.client.os_family"
									:os="row.client.os"
									:tile="40"
								/>
								<span class="flex min-w-0 flex-1 flex-col gap-[3px]">
									<span class="flex items-center gap-1.5">
										<span class="truncate font-mono text-sm font-medium">{{ row.client.name || row.client.id }}</span>
										<Star
											v-if="row.favorite"
											class="h-3.5 w-3.5 flex-none fill-[#D97706] text-[#D97706]"
											role="img"
											aria-label="Favorite"
										/>
									</span>
									<span class="truncate text-xs text-app-text-3">
										<span
											v-if="row.ip"
											class="font-mono"
										>{{ row.ip }} · </span>{{ row.os }}
									</span>
									<span
										v-if="row.updates.tone !== 'none'"
										:class="['text-xs', updatesToneClass[row.updates.tone]]"
									>{{ row.updates.text }}</span>
								</span>
								<span :class="['inline-flex flex-none items-center gap-1.5 whitespace-nowrap text-xs font-medium', row.online ? 'text-app-ok' : 'text-app-text-3']">
									<span
										aria-hidden="true"
										:class="['h-2 w-2 rounded-full', row.online ? 'bg-[#22C55E]' : 'border-2 border-app-text-4']"
									/>
									{{ row.online ? 'Online' : 'Offline' }}
								</span>
							</NuxtLink>
						</li>
					</ul>

					<!-- Loading / error / empty -->
					<div
						v-if="!rows.length"
						class="px-4 py-12 text-center"
					>
						<template v-if="!loaded">
							<div class="text-sm text-app-text-3">
								Loading devices…
							</div>
						</template>
						<template v-else-if="loadError">
							<div class="text-[15px] font-semibold text-app-text">
								Couldn't load devices
							</div>
							<p class="mb-4 mt-1.5 text-[13px] text-app-text-3">
								{{ loadError }}
							</p>
							<AppButton
								variant="secondary"
								size="sm"
								@click="refresh"
							>
								Try again
							</AppButton>
						</template>
						<template v-else>
							<div class="text-[15px] font-semibold text-app-text">
								No devices match these filters
							</div>
							<p class="mb-4 mt-1.5 text-[13px] text-app-text-3">
								{{ group === 'favorites' && !favorites.length ? 'Mark devices as favorites with the star on their page.' : 'Try another group or status, or clear the filter text.' }}
							</p>
							<AppButton
								variant="secondary"
								size="sm"
								@click="clearFilters"
							>
								Clear filters
							</AppButton>
						</template>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-2 rounded-b-xl bg-app-surface-2 px-4 py-3 text-[13px] text-app-text-3">
						<span>Showing {{ rows.length }} of {{ stats.total }} devices</span>
						<span v-if="lastRefreshed">Last refreshed {{ refreshedLabel }}</span>
					</div>
				</section>
			</template>
		</AppPage>

		<AddClientModal
			ref="addClientModal"
			@save="handleCreateClientAccess"
		/>
		<InstallClientModal
			ref="installClientModal"
			@save="installClientModal?.close()"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useClipboard, useIntervalFn, useLocalStorage } from '@vueuse/core';
import { Check, ListFilter, Plus, RefreshCw, Settings2, Star, Terminal } from 'lucide-vue-next';
import AddClientModal from '~/components/clients/AddClientModal.vue';
import InstallClientModal from '~/components/clients/InstallClientModal.vue';
import ClientIcon from '~/components/device/ClientIcon.vue';
import DeviceActionsMenu from '~/components/device/DeviceActionsMenu.vue';
import {
	isClientOnline,
	osLabel,
	relativeTime,
	updatesInfo,
	updatesToneClass,
	useFavoriteDevices,
} from '~/components/device/deviceHelpers';
import type { Client, ClientAuth } from '~/types';

type Status = 'any' | 'online' | 'offline';
type Density = 'condensed' | 'comfortable' | 'spacious';

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const { copy } = useClipboard();
const clientStore = useClientStore();
const statusStore = useStatusStore();
const { createClientAccess } = useClientAccess();
const { favorites, isFavorite, toggleFavorite } = useFavoriteDevices();

const clients = ref<Client[]>([]);
const totalCount = ref(0);
const loaded = ref(false);
const loading = ref(false);
const loadError = ref('');
const lastRefreshed = ref<Date | null>(null);
const now = ref(Date.now());
useIntervalFn(() => {
	now.value = Date.now();
}, 30000);

const group = ref(String(route.query.group ?? 'all'));
const status = ref<Status>('any');
const query = ref('');
const density = useLocalStorage<Density>('openrport-device-list-density', 'comfortable');

const statusOptions: { id: Status; label: string }[] = [
	{ id: 'any', label: 'Any status' },
	{ id: 'online', label: 'Online' },
	{ id: 'offline', label: 'Offline' },
];
const densityOptions: { id: Density; label: string }[] = [
	{ id: 'condensed', label: 'Condensed, single line' },
	{ id: 'comfortable', label: 'Comfortable, with OS' },
	{ id: 'spacious', label: 'Spacious, with tags' },
];
const columns = [
	{ id: 'device', label: 'Device', class: '' },
	{ id: 'status', label: 'Status', class: '' },
	{ id: 'ip', label: 'IP address', class: '' },
	{ id: 'groups', label: 'Groups', class: 'hidden xl:table-cell' },
	{ id: 'updates', label: 'Updates', class: 'hidden xl:table-cell' },
	{ id: 'actions', label: 'Actions', class: 'w-[96px]' },
];
const cellPad = computed(() => (density.value === 'condensed' ? 'py-2' : 'py-3'));

async function loadClients() {
	loading.value = true;
	try {
		const all: Client[] = [];
		let offset = 0;
		let count = 0;
		// Page through the whole fleet (500 per request is the server maximum).
		do {
			const response = await $api.clients.listFleet(offset);
			all.push(...(response?.data ?? []));
			count = response?.meta?.count ?? all.length;
			offset += 500;
		} while (all.length < count && offset < 20000);
		clients.value = all;
		totalCount.value = count;
		loadError.value = '';
	}
	catch (e) {
		console.error('Error loading clients:', e);
		loadError.value = 'The server did not return the device list. Check your connection and try again.';
	}
	finally {
		loading.value = false;
		loaded.value = true;
		lastRefreshed.value = new Date();
		now.value = Date.now();
	}
}

async function loadGroups() {
	try {
		await clientStore.loadGroups();
	}
	catch (e) {
		console.error('Error loading client groups:', e);
	}
}

async function refresh() {
	await Promise.all([loadClients(), loadGroups()]);
}

onMounted(refresh);

const inGroup = (client: Client, id: string) => {
	if (id === 'all') return true;
	if (id === 'favorites') return isFavorite(client.id);
	return (client.groups ?? []).includes(id);
};

const pills = computed(() => [
	{ id: 'all', label: 'All', count: totalCount.value, description: '' },
	{ id: 'favorites', label: 'Favorites', count: clients.value.filter(c => isFavorite(c.id)).length, description: 'Devices you starred in this browser' },
	...clientStore.groups.map(g => ({
		id: g.id,
		label: g.id,
		count: clients.value.filter(c => inGroup(c, g.id)).length || g.num_clients || 0,
		description: g.description,
	})),
]);

const stats = computed(() => {
	const online = clients.value.filter(c => isClientOnline(c)).length;
	return {
		total: totalCount.value,
		online,
		offline: clients.value.length - online,
		reportingUpdates: clients.value.some(c => !!c.updates_status),
		security: clients.value.reduce((n, c) => n + (c.updates_status?.security_updates_available ?? 0), 0),
	};
});

const rows = computed(() => {
	const q = query.value.trim().toLowerCase();
	return clients.value
		.filter(c => inGroup(c, group.value))
		.filter(c => status.value === 'any' || (status.value === 'online') === isClientOnline(c))
		.filter((c) => {
			if (!q) return true;
			const haystack = [
				c.name, c.id, c.hostname, osLabel(c), c.os_kernel,
				...(c.ipv4 ?? []), ...(c.groups ?? []), ...(c.tags ?? []),
			].filter(Boolean).join(' ').toLowerCase();
			return haystack.includes(q);
		})
		.map((c) => {
			const online = isClientOnline(c);
			const seen = relativeTime(c.disconnected_at);
			return {
				client: c,
				online,
				favorite: isFavorite(c.id),
				os: osLabel(c),
				ip: c.ipv4?.[0] ?? '',
				statusText: online ? 'Online' : `Offline${seen ? ` · ${seen}` : ''}`,
				updates: updatesInfo(c),
			};
		});
});

const refreshedLabel = computed(() => {
	void now.value;
	return relativeTime(lastRefreshed.value);
});

function setGroup(id: string) {
	group.value = id;
}
watch(group, (value) => {
	router.replace({ query: { ...route.query, group: value === 'all' ? undefined : value } });
});
watch(() => route.query.group, (value) => {
	group.value = String(value ?? 'all');
});

function clearFilters() {
	group.value = 'all';
	status.value = 'any';
	query.value = '';
}

async function onRowAction(client: Client, action: string) {
	switch (action) {
		case 'command':
			navigateTo(`/dashboard/${client.id}?tab=run`);
			break;
		case 'tunnel':
			navigateTo(`/dashboard/${client.id}?tab=tunnels`);
			break;
		case 'favorite':
			toggleFavorite(client.id);
			break;
		case 'copy-id':
			await copy(client.id);
			snackbar.add({ type: 'success', text: 'Client ID copied' });
			break;
	}
}

// Add device = create client credentials, then show the install commands for them.
const addClientModal = ref<InstanceType<typeof AddClientModal> | null>(null);
const installClientModal = ref<InstanceType<typeof InstallClientModal> | null>(null);

const openAddClientModal = () => {
	addClientModal.value?.open();
};

const handleCreateClientAccess = async (data: ClientAuth) => {
	try {
		await createClientAccess(data);
	}
	catch (e) {
		console.error('Error creating client access:', e);
		snackbar.add({ type: 'error', text: 'Could not create the client access' });
		return;
	}
	addClientModal.value?.close();
	snackbar.add({ type: 'success', text: `Client access ${data.id} created` });
	if (!statusStore.status?.connect_url) {
		await statusStore.loadStatus();
	}
	await installClientModal.value?.open({ ...data }, statusStore.status);
};
</script>
