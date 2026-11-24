<template>
	<new-page-wrapper>
		<AppPage v-if="clientError">
			<div class="flex flex-col items-center gap-3 rounded-xl border border-app-border bg-app-surface px-6 py-14 text-center">
				<h1 class="text-lg font-semibold text-app-text">
					{{ clientError === 'not-found' ? 'Device not found' : 'Couldn’t load this device' }}
				</h1>
				<p class="max-w-md text-sm text-app-text-3">
					<template v-if="clientError === 'not-found'">
						No client with ID <span class="font-mono text-app-text-2">{{ deviceId }}</span> is known to this server. It may have been removed.
					</template>
					<template v-else>
						The server didn’t return details for this device. Check your connection and try again.
					</template>
				</p>
				<div class="mt-2 flex flex-wrap justify-center gap-2.5">
					<AppButton
						variant="secondary"
						to="/dashboard"
					>
						Back to devices
					</AppButton>
					<AppButton
						v-if="clientError !== 'not-found'"
						@click="clientStore.loadClientById(String(deviceId))"
					>
						Try again
					</AppButton>
				</div>
			</div>
		</AppPage>
		<DeviceHeader
			v-else
			:device="device"
			:device-id="String(deviceId)"
			@action="onAction"
		>
			<div
				ref="tablistEl"
				role="tablist"
				aria-label="Device sections"
				class="scrollbar-hide -mx-4 mt-3 flex gap-1 overflow-x-auto overflow-y-hidden px-4 sm:mx-0 sm:px-0 md:mt-[18px]"
				@keydown="onTabKeydown"
			>
				<button
					v-for="tab in tabs"
					:id="`device-tab-${tab.id}`"
					:key="tab.id"
					type="button"
					role="tab"
					:aria-selected="selectedTab === tab.id"
					:aria-controls="`device-panel-${tab.id}`"
					:tabindex="selectedTab === tab.id ? 0 : -1"
					:class="[
						'-mb-px h-11 flex-none whitespace-nowrap border-b-2 px-3.5 text-sm transition-colors',
						selectedTab === tab.id
							? 'border-app-accent font-semibold text-app-text'
							: 'border-transparent font-medium text-app-text-3 hover:text-app-text',
					]"
					@click="selectTab(tab.id)"
				>
					{{ tab.label }}
				</button>
			</div>
		</DeviceHeader>

		<div
			v-if="!clientError"
			class="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-7"
		>
			<TunnelsTunnelForm
				v-if="isAddingTunnel"
				:device="device"
			/>
			<div
				v-else
				:id="`device-panel-${selectedTab}`"
				role="tabpanel"
				:aria-labelledby="`device-tab-${selectedTab}`"
				class="min-w-0 text-sm"
			>
				<DeviceOverviewTab
					v-if="selectedTab === 'overview'"
					:device="device"
					:metrics="metrics"
					:disks="disks"
					:sections="tabs.filter(t => t.id !== 'overview')"
					@select-tab="selectTab"
					@edit-tags="isTagsOpen = true"
				/>
				<DeviceMonitoringTab
					v-else-if="selectedTab === 'monitoring'"
					:device="device"
					:metrics="metrics"
					:disk-history="diskHistory"
				/>
				<RunWorkspace
					v-else-if="selectedTab === 'run' && device?.id"
					:client-id="device.id"
				/>
				<DeviceFilesTab
					v-else-if="selectedTab === 'files'"
					:device="device"
				/>
				<DeviceTunnelsTab
					v-else-if="selectedTab === 'tunnels' && device?.id"
					:id="device.id"
					:device-name="device.name || device.id"
					@addtunnel="tunnelStore.openAddTunel()"
				/>
				<DeviceInventoryTab
					v-else-if="selectedTab === 'inventory'"
					:device="device"
					:metrics="metrics"
					:disks="disks"
				/>
				<DeviceMetaDataTab
					v-else-if="selectedTab === 'meta-data' && device?.id"
					:client-id="device.id"
					:client-name="device.name || device.id"
				/>
				<DeviceSchedulesTab
					v-else-if="selectedTab === 'schedules' && device?.id"
					:id="device.id"
				/>
				<DeviceAuditTab
					v-else-if="selectedTab === 'audit' && device?.id"
					:id="device.id"
				/>
			</div>
		</div>

		<TagsLabelDialog
			v-model="isTagsOpen"
			v-model:model-value-client="device"
		/>
	</new-page-wrapper>
</template>

<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
import DeviceHeader from '~/components/device/DeviceHeader.vue';
import DeviceOverviewTab from '~/components/device/DeviceOverviewTab.vue';
import RunWorkspace from '~/components/run/RunWorkspace.vue';
import TagsLabelDialog from '~/components/device/TagsLabelDialog.vue';
import { useFavoriteDevices } from '~/components/device/deviceHelpers';
import { useClientDetail } from '~/composables/useClientDetail';
import type { Capability } from '~/composables/useCapabilities';

definePageMeta({
	// Re-create the page when switching devices (the detail composable reads the id once).
	key: route => String(route.params.id),
});

const allTabs: { id: string; label: string; capability?: Capability }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'monitoring', label: 'Monitoring', capability: 'monitoring' },
	{ id: 'run', label: 'Run' },
	{ id: 'files', label: 'Files', capability: 'file_upload' },
	{ id: 'tunnels', label: 'Tunnels' },
	{ id: 'inventory', label: 'Inventory' },
	{ id: 'schedules', label: 'Schedules', capability: 'scheduled_jobs' },
	{ id: 'audit', label: 'Audit' },
	{ id: 'meta-data', label: 'Meta-data' },
];
const { has } = useCapabilities();
// Tabs for features the server doesn't offer are hidden.
const tabs = computed(() => allTabs.filter(t => !t.capability || has(t.capability)));
const tabIds = computed(() => tabs.value.map(t => t.id));

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const { copy } = useClipboard();
const tunnelStore = useTunnelStore();
const { isAddingTunnel } = storeToRefs(tunnelStore);
const { deviceId, clientStore, device, metrics, disks, diskHistory } = useClientDetail();
const { currentClientError: clientError } = storeToRefs(clientStore);
const { toggleFavorite } = useFavoriteDevices();

// Commands and Scripts were merged into one "Run" tab; keep old links working.
const legacyTabs: Record<string, string> = { commands: 'run', scripts: 'run' };
const queryTab = () => {
	const raw = String(route.query.tab ?? '');
	const tab = legacyTabs[raw] ?? raw;
	return tabIds.value.includes(tab) ? tab : 'overview';
};
const selectedTab = ref(queryTab());
const isTagsOpen = ref(false);
const tablistEl = ref<HTMLElement | null>(null);

watch([() => route.query.tab, tabIds], () => {
	selectedTab.value = queryTab();
});

function selectTab(tab: string) {
	if (isAddingTunnel.value) tunnelStore.closeAddTunnel();
	selectedTab.value = tab;
	router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } });
	nextTick(() => {
		tablistEl.value?.querySelector<HTMLElement>(`#device-tab-${tab}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	});
}

function onTabKeydown(event: KeyboardEvent) {
	const index = tabIds.value.indexOf(selectedTab.value);
	let next = -1;
	if (event.key === 'ArrowRight') next = (index + 1) % tabIds.value.length;
	else if (event.key === 'ArrowLeft') next = (index - 1 + tabIds.value.length) % tabIds.value.length;
	else if (event.key === 'Home') next = 0;
	else if (event.key === 'End') next = tabIds.value.length - 1;
	if (next < 0) return;
	event.preventDefault();
	selectTab(tabIds.value[next]);
	nextTick(() => tablistEl.value?.querySelector<HTMLElement>(`#device-tab-${tabIds.value[next]}`)?.focus());
}

async function onAction(action: string) {
	switch (action) {
		case 'tunnel':
			selectTab('tunnels');
			tunnelStore.openAddTunel();
			break;
		case 'command':
			selectTab('run');
			break;
		case 'tags':
			isTagsOpen.value = true;
			break;
		case 'reload':
			await clientStore.loadClientById(String(deviceId));
			snackbar.add({ type: 'success', text: 'Device data reloaded' });
			break;
		case 'favorite':
			toggleFavorite(device.value?.id);
			break;
		case 'copy-id':
			await copy(device.value?.id ?? String(deviceId));
			snackbar.add({ type: 'success', text: 'Client ID copied' });
			break;
		case 'audit':
			selectTab('audit');
			break;
		case 'client-access':
			navigateTo(`/client-access#${device.value?.client_auth_id}`);
			break;
	}
}

onBeforeUnmount(() => {
	tunnelStore.closeAddTunnel();
});
</script>
