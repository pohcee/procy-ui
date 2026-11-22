<template>
	<new-page-wrapper>
		<AppPage
			title="Tunnels"
			description="Reach a port on a device through the server, without a VPN. Tunnels close themselves when idle."
		>
			<template #actions>
				<AppButton
					variant="secondary"
					:disabled="pending"
					@click="() => refreshTunnels()"
				>
					<RefreshCw
						:class="['h-4 w-4', pending ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					Reload
				</AppButton>
			</template>

			<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
				<!-- Active tunnels -->
				<div class="flex min-w-0 flex-col gap-4">
					<section
						aria-label="Active tunnels"
						class="overflow-hidden rounded-xl border border-app-border bg-app-surface"
					>
						<div class="flex items-center justify-between border-b border-app-border px-4 py-3.5">
							<h2 class="text-[15px] font-semibold text-app-text">
								Active tunnels <span class="font-medium text-app-text-3">· {{ rows.length }}</span>
							</h2>
						</div>

						<OpEmpty
							v-if="pending && !rows.length"
							loading
							title="Loading tunnels…"
						/>
						<OpEmpty
							v-else-if="!rows.length"
							:icon="ArrowLeftRight"
							title="No active tunnels"
							description="Create one with the form to reach SSH, RDP, VNC or a web UI on a device."
						/>
						<template v-else>
							<!-- Desktop table -->
							<div class="hidden overflow-x-auto md:block">
								<table class="w-full min-w-[720px] border-collapse">
									<thead>
										<tr class="bg-app-surface-2">
											<th
												v-for="col in columns"
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
											v-for="tunnel in rows"
											:key="tunnel.id"
											:class="[
												tunnel.openToAll ? 'bg-app-warn-row' : '',
												selectedId === tunnel.id ? 'shadow-[inset_3px_0_0_rgb(var(--app-accent))]' : '',
											]"
										>
											<td class="border-b border-app-border-subtle py-3.5 pl-4 pr-3 align-middle text-[13px]">
												<NuxtLink
													:to="`/dashboard/${tunnel.client_id}`"
													class="whitespace-nowrap font-mono font-medium text-app-text hover:text-app-link hover:underline"
												>
													{{ tunnel.client_name }}
												</NuxtLink>
												<div class="mt-0.5 max-w-[150px] text-xs text-app-text-3">
													{{ tunnel.createdAgo }}<template v-if="tunnel.name">
														· {{ tunnel.name }}
													</template>
												</div>
											</td>
											<td class="border-b border-app-border-subtle px-3 py-3.5 align-middle">
												<span :class="['inline-block whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-semibold', tunnel.badge.class]">{{ tunnel.badge.label }}</span>
												<span
													v-if="tunnel.http_proxy"
													class="ml-1.5 whitespace-nowrap rounded-md bg-app-chip px-2 py-[3px] text-xs font-medium text-app-text-2"
												>proxy</span>
											</td>
											<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle font-mono text-[13px] text-app-text">
												:{{ tunnel.lport }} → {{ tunnel.destination }}
												<div
													v-if="tunnel.protocol && tunnel.protocol !== 'tcp'"
													class="text-xs text-app-text-3"
												>
													{{ tunnel.protocol }}
												</div>
											</td>
											<td class="border-b border-app-border-subtle px-3 py-3.5 align-middle text-[13px]">
												<span
													v-if="tunnel.openToAll"
													class="inline-flex items-center gap-1.5 font-semibold text-app-warn"
												>
													<TriangleAlert
														class="h-3.5 w-3.5"
														aria-hidden="true"
													/>
													Any IP
												</span>
												<span
													v-else
													class="break-all font-mono text-app-text"
												>{{ tunnel.acl }}</span>
											</td>
											<td
												:class="[
													'min-w-[100px] border-b border-app-border-subtle px-3 py-3.5 align-middle text-[13px]',
													tunnel.closes.never ? 'font-semibold text-app-warn' : 'text-app-text-2',
												]"
											>
												{{ tunnel.closes.label }}
											</td>
											<td class="whitespace-nowrap border-b border-app-border-subtle py-3.5 pl-3 pr-4 text-right align-middle">
												<div class="inline-flex items-center gap-1">
													<TunnelActions
														compact
														:tunnel="tunnel"
														@connect="select(tunnel)"
														@open="openInBrowser(tunnel)"
														@rdp="downloadRdp(tunnel)"
														@close="triggerDeleteTunnel(tunnel)"
													/>
												</div>
											</td>
										</tr>
									</tbody>
								</table>
							</div>

							<!-- Phone cards -->
							<ul class="divide-y divide-app-border-subtle md:hidden">
								<li
									v-for="tunnel in rows"
									:key="tunnel.id"
									:class="['flex flex-col gap-2.5 px-4 py-3.5', tunnel.openToAll ? 'bg-app-warn-row' : '']"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<NuxtLink
												:to="`/dashboard/${tunnel.client_id}`"
												class="block truncate font-mono text-sm font-medium text-app-text hover:text-app-link"
											>
												{{ tunnel.client_name }}
											</NuxtLink>
											<p class="mt-0.5 text-xs text-app-text-3">
												{{ tunnel.createdAgo }}
											</p>
										</div>
										<span :class="['shrink-0 rounded-md px-2 py-[3px] text-xs font-semibold', tunnel.badge.class]">{{ tunnel.badge.label }}</span>
									</div>
									<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
										<dt class="text-app-text-3">
											Port
										</dt>
										<dd class="font-mono text-app-text">
											:{{ tunnel.lport }} → {{ tunnel.destination }}
										</dd>
										<dt class="text-app-text-3">
											From
										</dt>
										<dd>
											<span
												v-if="tunnel.openToAll"
												class="inline-flex items-center gap-1.5 font-semibold text-app-warn"
											>
												<TriangleAlert
													class="h-3.5 w-3.5"
													aria-hidden="true"
												/>Any IP
											</span>
											<span
												v-else
												class="break-all font-mono text-app-text"
											>{{ tunnel.acl }}</span>
										</dd>
										<dt class="text-app-text-3">
											Closes
										</dt>
										<dd :class="tunnel.closes.never ? 'font-semibold text-app-warn' : 'text-app-text-2'">
											{{ tunnel.closes.label }}
										</dd>
									</dl>
									<div class="flex flex-wrap gap-2">
										<TunnelActions
											:tunnel="tunnel"
											@connect="select(tunnel)"
											@open="openInBrowser(tunnel)"
											@rdp="downloadRdp(tunnel)"
											@close="triggerDeleteTunnel(tunnel)"
										/>
									</div>
								</li>
							</ul>
						</template>
					</section>

					<!-- How to connect -->
					<section
						v-if="selected"
						aria-label="How to connect"
						class="flex flex-col gap-2.5 rounded-xl border border-app-border bg-app-surface p-[18px]"
					>
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-[15px] font-semibold text-app-text">
								Connect to <span class="font-mono">{{ selected.client_name }}</span>
							</h2>
							<span :class="['rounded-md px-2 py-[3px] text-xs font-semibold', selected.badge.class]">{{ selected.badge.label }}</span>
						</div>
						<div class="flex items-center gap-2.5 rounded-[10px] bg-[#0F151D] py-1.5 pl-3.5 pr-1.5">
							<code class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-[#E6EBF2]">{{ connectCommand }}</code>
							<button
								type="button"
								class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#222B37] px-3 text-[13px] font-medium text-[#E6EBF2] hover:bg-[#2A3442]"
								@click="copyCommand"
							>
								<component
									:is="copied ? Check : Copy"
									class="h-3.5 w-3.5"
									aria-hidden="true"
								/>
								{{ copied ? 'Copied' : 'Copy' }}
							</button>
						</div>
						<p class="text-[13px] text-app-text-3">
							{{ connectHint }}
						</p>
						<p
							v-if="selected.openToAll"
							class="flex items-center gap-1.5 text-[13px] font-medium text-app-warn"
						>
							<TriangleAlert
								class="h-4 w-4 shrink-0"
								aria-hidden="true"
							/>
							Any IP address can use this port.
						</p>
						<p
							v-else
							class="text-[13px] text-app-text-3"
						>
							Only <span class="font-mono text-app-text-2">{{ selected.acl }}</span>
							<template v-if="profileIp && selected.acl.includes(profileIp)">
								(your current IP)
							</template> can use this port.
						</p>
					</section>
				</div>

				<!-- New tunnel -->
				<section
					aria-label="New tunnel"
					class="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-5"
				>
					<h2 class="text-[15px] font-semibold text-app-text">
						New tunnel
					</h2>
					<CustomThemedSelect
						id="tunnel-device"
						v-model="newTunnelDeviceId"
						label="Device"
						mono
						:placeholder="clients.length ? 'Select a device…' : 'No devices'"
						:options="deviceOptions"
					/>
					<TunnelsTunnelForm
						v-if="newTunnelDevice"
						:key="`${newTunnelDevice.id}-${formKey}`"
						:device="newTunnelDevice"
						embedded
					/>
					<p
						v-else
						class="text-[13px] text-app-text-3"
					>
						Pick the device you want to reach.
					</p>
				</section>
			</div>
		</AppPage>
		<Modal
			v-model="deleteConfirmOpen"
			title="Close tunnel?"
			ok-text="Close tunnel"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteTunnel"
		>
			<p class="text-sm text-app-text-2">
				The tunnel to <span class="font-mono font-medium text-app-text">{{ activeTunnel?.client_name }}</span>
				on server port <span class="font-mono font-medium text-app-text">{{ activeTunnel?.lport }}</span> will be closed. Anyone connected through it is disconnected.
			</p>
		</Modal>
	</new-page-wrapper>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { formatTimeAgo, useNow } from '@vueuse/core';
import { ArrowLeftRight, Check, Copy, RefreshCw, TriangleAlert } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import TunnelActions, { type TunnelRow } from '~/components/tunnels/TunnelActions.vue';
import type { Client, Tunnel } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const config = useRuntimeConfig();
const statusStore = useStatusStore();
const profileStore = useProfile();
const tunnelStore = useTunnelStore();
const { isAddingTunnel } = storeToRefs(tunnelStore);
const { ip: profileIp } = storeToRefs(profileStore);

const columns = ['Device', 'Service', 'Server port → device', 'Allowed from', 'Closes'];

const clientNames = ref<Client[]>([]);
const clients = ref<Client[]>([]);

const { data: fetchedTunnels, pending, refresh: refreshTunnels } = useAsyncData('tunnels', () => $api.tunnels.index());
const ids = computed(() => fetchedTunnels.value?.map(item => item.client_id));

watchEffect(() => {
	if (ids.value?.length) {
		$api.clients.getClientsName(ids.value as Array<string>).then((response) => {
			clientNames.value = response.data;
		});
	}
});

onMounted(async () => {
	tunnelStore.openAddTunel();
	const [clientsResponse] = await Promise.all([
		$api.clients.listClients(),
		statusStore.status?.version ? Promise.resolve() : statusStore.loadStatus(),
		profileStore.ip ? Promise.resolve() : profileStore.loadServerIp(),
	]);
	clients.value = clientsResponse.data;
	if (!newTunnelDeviceId.value && clients.value.length === 1) newTunnelDeviceId.value = clients.value[0].id;
});
let leaving = false;
onBeforeUnmount(() => {
	leaving = true;
	tunnelStore.closeAddTunnel();
});

// The form closes the "add tunnel" flag after a successful create: refresh and reset the form.
const formKey = ref(0);
watch(isAddingTunnel, async (adding) => {
	if (adding || leaving) return;
	snackbar.add({ type: 'success', text: 'Tunnel created' });
	formKey.value++;
	tunnelStore.openAddTunel();
	await refreshTunnels();
});

const newTunnelDeviceId = ref<string | undefined>(undefined);
const newTunnelDevice = computed(() => clients.value.find(c => c.id === newTunnelDeviceId.value) ?? null);
const deviceOptions = computed(() => clients.value.map(c => ({
	value: c.id,
	label: `${c.name || c.id}${c.disconnected_at ? ' (offline)' : ''}`,
})));

// Host users connect to: the server's tunnel host, else the API host name.
const serverHost = computed(() => {
	if (statusStore.status?.tunnel_host) return statusStore.status.tunnel_host;
	try {
		return new URL(String(config.public.apiUrl)).hostname;
	}
	catch {
		return window.location.hostname;
	}
});

const BADGES: Record<string, { label: string; class: string }> = {
	ssh: { label: 'SSH', class: 'bg-app-blue-bg text-app-blue' },
	rdp: { label: 'RDP', class: 'bg-app-purple-bg text-app-purple' },
	vnc: { label: 'VNC', class: 'bg-app-warn-bg text-app-warn' },
	realvnc: { label: 'RealVNC', class: 'bg-app-warn-bg text-app-warn' },
	http: { label: 'HTTP', class: 'bg-app-ok-bg text-app-ok' },
	https: { label: 'HTTPS', class: 'bg-app-ok-bg text-app-ok' },
};

const formatMinutes = (minutes: number) => {
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${m} min` : `${h} h`;
};

const closesInfo = (tunnel: Tunnel) => {
	const parts: string[] = [];
	if (tunnel.idle_timeout_minutes > 0) parts.push(`after ${formatMinutes(tunnel.idle_timeout_minutes)} idle`);
	if (tunnel.auto_close > 0) {
		// auto_close is a Go duration (nanoseconds) counted from creation.
		const closeAt = new Date(tunnel.created_at).getTime() + tunnel.auto_close / 1e6;
		const left = Math.max(0, Math.round((closeAt - now.value.getTime()) / 60000));
		parts.push(`in ${formatMinutes(left)}`);
	}
	return parts.length ? { label: parts.join(' · '), never: false } : { label: 'Never', never: true };
};

const now = useNow({ interval: 30_000 });
const rows = computed<TunnelRow[]>(() => (fetchedTunnels.value ?? []).map((tunnel) => {
	const client = clientNames.value.find(c => c.id === tunnel.client_id);
	const scheme = (tunnel.scheme || '').toLowerCase();
	const local = !tunnel.rhost || ['127.0.0.1', 'localhost', '::1'].includes(tunnel.rhost);
	return {
		...tunnel,
		client_name: client?.name || tunnel.client_id,
		badge: BADGES[scheme] ?? { label: (tunnel.scheme || tunnel.protocol || 'TCP').toUpperCase(), class: 'bg-app-chip text-app-text-2' },
		destination: local ? `${tunnel.rport}` : `${tunnel.rhost}:${tunnel.rport}`,
		openToAll: !tunnel.acl || tunnel.acl.split(',').some(a => ['0.0.0.0/0', '::/0', '0.0.0.0'].includes(a.trim())),
		closes: closesInfo(tunnel),
		createdAgo: [
			(tunnel as Tunnel & { owner?: string }).owner ? `by ${(tunnel as Tunnel & { owner?: string }).owner}` : '',
			formatTimeAgo(new Date(tunnel.created_at), {}, now.value),
		].filter(Boolean).join(' · '),
		isWeb: scheme === 'http' || scheme === 'https' || !!tunnel.tunnel_url || tunnel.http_proxy,
		isRdp: scheme === 'rdp',
		isSsh: scheme === 'ssh',
	};
}));

const selectedId = ref<string | null>(null);
const selected = computed(() => rows.value.find(r => r.id === selectedId.value)
	?? rows.value.find(r => r.isSsh || r.isRdp) ?? rows.value[0] ?? null);
const select = (tunnel: TunnelRow) => {
	selectedId.value = tunnel.id;
};

const tunnelUrl = (tunnel: TunnelRow) => tunnel.tunnel_url
	|| `${tunnel.scheme === 'https' ? 'https' : 'http'}://${serverHost.value}:${tunnel.lport}`;

const connectCommand = computed(() => {
	const t = selected.value;
	if (!t) return '';
	if (t.isSsh) return `ssh -p ${t.lport} <user>@${serverHost.value}`;
	if (t.isRdp) return `mstsc /v:${serverHost.value}:${t.lport}`;
	if (t.isWeb) return tunnelUrl(t);
	return `${serverHost.value}:${t.lport}`;
});
const connectHint = computed(() => {
	const t = selected.value;
	if (!t) return '';
	if (t.isSsh) return 'Replace <user> with an account on the device.';
	if (t.isRdp) return 'Run on Windows, or download the .rdp file for any RDP client.';
	if (t.isWeb) return 'Open in a browser.';
	return 'Point your client at this address.';
});

const copied = ref(false);
const copyCommand = async () => {
	try {
		await navigator.clipboard.writeText(connectCommand.value);
		copied.value = true;
		setTimeout(() => {
			copied.value = false;
		}, 1500);
	}
	catch {
		snackbar.add({ type: 'error', text: 'Could not copy to the clipboard' });
	}
};

const openInBrowser = (tunnel: TunnelRow) => {
	window.open(tunnelUrl(tunnel), '_blank', 'noopener');
};

const downloadRdp = (tunnel: TunnelRow) => {
	const content = `full address:s:${serverHost.value}:${tunnel.lport}\r\nprompt for credentials:i:1\r\n`;
	const url = URL.createObjectURL(new Blob([content], { type: 'application/x-rdp' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = `${tunnel.client_name}-${tunnel.lport}.rdp`;
	link.click();
	URL.revokeObjectURL(url);
};

const deleteConfirmOpen = ref(false);
const activeTunnel = ref<TunnelRow | null>(null);

const triggerDeleteTunnel = (tunnel: TunnelRow) => {
	activeTunnel.value = tunnel;
	deleteConfirmOpen.value = true;
};

const confirmDeleteTunnel = async () => {
	if (!activeTunnel.value) return;
	await $api.clients.deleteTunnel(activeTunnel.value.client_id, activeTunnel.value.id);
	snackbar.add({ type: 'success', text: 'Tunnel closed' });
	deleteConfirmOpen.value = false;
	await refreshTunnels();
};
</script>
