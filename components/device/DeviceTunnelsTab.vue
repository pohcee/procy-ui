<template>
	<div class="flex flex-col gap-4">
		<AppCard
			title="Tunnels"
			description="Active tunnels to this device."
			flush
		>
			<template #actions>
				<AppButton
					v-if="canCreateTunnels"
					size="sm"
					@click="$emit('addtunnel')"
				>
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Add tunnel
				</AppButton>
			</template>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[640px] border-collapse text-sm">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="col in tunnelColumns"
								:key="col"
								scope="col"
								:class="thClass"
							>
								{{ col }}
							</th>
							<th
								scope="col"
								:class="thClass"
							>
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="!tunnels?.tunnels?.length">
							<td
								:colspan="tunnelColumns.length + 1"
								class="py-12 text-center text-app-text-3"
							>
								No active tunnels.
							</td>
						</tr>
						<tr
							v-for="tunnel in tunnels?.tunnels"
							:key="tunnel.id"
							class="hover:bg-app-hover"
						>
							<td :class="[tdClass, 'font-mono']">
								{{ tunnel.acl || 'any' }}
							</td>
							<td :class="[tdClass, 'font-mono text-app-text']">
								{{ tunnel.lport }}
							</td>
							<td :class="tdClass">
								{{ tunnel.http_proxy ? 'Enabled' : 'Disabled' }}
							</td>
							<td :class="[tdClass, 'font-mono']">
								{{ tunnel.rhost }}
							</td>
							<td :class="[tdClass, 'font-mono']">
								{{ tunnel.rport }}
							</td>
							<td :class="tdClass">
								<span class="rounded-md bg-app-chip px-2 py-0.5 font-mono text-xs font-medium text-app-text-2">{{ tunnel.protocol }}<span v-if="tunnel.scheme">:{{ tunnel.scheme }}</span></span>
							</td>
							<td :class="tdClass">
								-
							</td>
							<td :class="[tdClass, 'whitespace-nowrap']">
								{{ useTimeAgo(new Date(tunnel.created_at)).value }}
							</td>
							<td :class="[tdClass, 'whitespace-nowrap text-right']">
								<div class="inline-flex items-center gap-1.5">
									<TunnelConnectButton
										:tunnel="tunnel"
										:device-name="deviceName"
										:client-id="id"
									/>
									<DropdownMenu>
										<DropdownMenuTrigger as-child>
											<button
												type="button"
												:aria-label="`Actions for tunnel ${tunnel.lport}`"
												:class="iconBtnClass"
											>
												<MoreHorizontal
													class="h-4 w-4"
													aria-hidden="true"
												/>
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent :class="menuClass">
											<DropdownMenuItem
												v-if="tunnel.tunnel_url"
												:class="menuItemClass"
												@click="copy(tunnel.tunnel_url)"
											>
												Copy URL
											</DropdownMenuItem>
											<DropdownMenuItem
												:class="[menuItemClass, 'text-app-danger']"
												@click="triggerDeleteTunnel(tunnel)"
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</AppCard>

		<AppCard
			title="Stored tunnels and service forwarding"
			description="Saved tunnel definitions for this device."
			flush
		>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[640px] border-collapse text-sm">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="col in storedColumns"
								:key="col"
								scope="col"
								:class="thClass"
							>
								{{ col }}
							</th>
							<th
								scope="col"
								:class="thClass"
							>
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="!storedTuns?.length">
							<td
								:colspan="storedColumns.length + 1"
								class="py-12 text-center text-app-text-3"
							>
								No stored tunnels.
							</td>
						</tr>
						<tr
							v-for="tun in storedTuns"
							:key="tun.id"
							class="hover:bg-app-hover"
						>
							<td :class="[tdClass, 'font-mono']">
								{{ tun.acl || 'any' }}
							</td>
							<td :class="tdClass">
								<span class="rounded-md bg-app-chip px-2 py-0.5 font-mono text-xs font-medium text-app-text-2">{{ tun.scheme }}</span>
							</td>
							<td :class="[tdClass, 'font-mono']">
								{{ tun.remote_ip }}
							</td>
							<td :class="[tdClass, 'font-mono']">
								{{ tun.remote_port }}
							</td>
							<td :class="[tdClass, 'font-medium text-app-text']">
								{{ tun.name }}
							</td>
							<td :class="tdClass">
								{{ tun.further_options?.is_service_forwarding ? 'Yes' : 'No' }}
							</td>
							<td :class="[tdClass, 'w-12 text-right']">
								<DropdownMenu>
									<DropdownMenuTrigger as-child>
										<button
											type="button"
											:aria-label="`Actions for stored tunnel ${tun.name}`"
											:class="iconBtnClass"
										>
											<MoreHorizontal
												class="h-4 w-4"
												aria-hidden="true"
											/>
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent :class="menuClass">
										<DropdownMenuItem
											:class="[menuItemClass, 'text-app-danger']"
											@click="triggerDeleteStoredTunnel(tun)"
										>
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</AppCard>

		<Modal
			v-model="deleteTunnelConfirmOpen"
			title="Close tunnel?"
			ok-text="Close tunnel"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteTunnel"
		>
			<p class="py-2 text-sm text-app-text-2">
				The tunnel on server port <span class="font-mono font-medium text-app-text">{{ activeTunnel?.lport }}</span> will be closed. Anyone connected through it is disconnected.
			</p>
		</Modal>
		<Modal
			v-model="deleteStoredTunnelConfirmOpen"
			title="Please confirm!"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteStoredTunnel"
		>
			<p class="py-2 text-sm text-app-text-2">
				Do you want to delete the stored tunnel "{{ activeStoredTunnel?.name }}"?
			</p>
		</Modal>
	</div>
</template>

<script setup>
import { useTimeAgo, useClipboard } from '@vueuse/core';
import { MoreHorizontal, Plus } from 'lucide-vue-next';
import TunnelConnectButton from '~/components/tunnels/TunnelConnectButton.vue';

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
	deviceName: {
		type: String,
		default: '',
	},
});

defineEmits(['addtunnel']);
const { canCreateTunnels } = useCapabilities();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { copy } = useClipboard();

const tunnelColumns = ['Allowed clients', 'Exposed port', 'HTTP proxy', 'Destination', 'Port', 'Protocol', 'Name', 'Created'];
const storedColumns = ['Allowed clients', 'Scheme', 'Destination', 'Port', 'Name', 'Service forwarding'];
const thClass = 'whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 border-b border-app-border';
const tdClass = 'px-3 py-3 border-b border-app-border-subtle text-app-text-2';
const iconBtnClass = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text';
const menuClass = 'w-max min-w-[11rem] rounded-[10px] border border-app-border bg-app-surface p-1 text-app-text shadow-lg';
const menuItemClass = 'flex w-full cursor-pointer items-center whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] focus:bg-app-hover';

const { data: tunnels, refresh: refreshTunnels } = useAsyncData(`tunnels_${props.id}`, () => $api.clients.tunnels(props.id));
const { data: storedTuns, refresh: refreshStoredTunnels } = useAsyncData(`stored_tunnels_${props.id}`, () => $api.clients.storedTunnels(props.id));

const deleteTunnelConfirmOpen = ref(false);
const activeTunnel = ref(null);
const deleteStoredTunnelConfirmOpen = ref(false);
const activeStoredTunnel = ref(null);

const triggerDeleteTunnel = (tunnel) => {
	activeTunnel.value = tunnel;
	deleteTunnelConfirmOpen.value = true;
};

const confirmDeleteTunnel = async () => {
	if (!activeTunnel.value) return;
	try {
		// force: the dialog warns that connected sessions are dropped (rportd refuses otherwise, 409).
		await $api.clients.deleteTunnel(props.id, activeTunnel.value.id, true);
		snackbar.add({ type: 'success', text: 'Tunnel closed' });
		deleteTunnelConfirmOpen.value = false;
	}
	catch (err) {
		snackbar.add({ type: 'error', text: `Could not close the tunnel: ${apiErrorMessage(err)}` });
	}
	await refreshTunnels();
};

const triggerDeleteStoredTunnel = (tun) => {
	activeStoredTunnel.value = tun;
	deleteStoredTunnelConfirmOpen.value = true;
};

const confirmDeleteStoredTunnel = async () => {
	if (!activeStoredTunnel.value) return;
	await $api.clients.deleteStoredTunnel(props.id, activeStoredTunnel.value.id);
	snackbar.add({ type: 'success', text: 'Stored tunnel deleted' });
	deleteStoredTunnelConfirmOpen.value = false;
	await refreshStoredTunnels();
};
</script>
