import { defineStore } from 'pinia';
import type { Client, ClientGroup, ClientMetric, ClientMountpoint, ClientsResponse, DiskUsage } from '~/types';
import { parseMountpoints } from '~/lib/utils';

export const useClientStore = defineStore('clients', {
	state: () => ({
		clients: [] as Array<Client>,
		groups: [] as Array<ClientGroup>,
		currentClient: {} as Client,
		currentMetrics: [] as Array<ClientMetric>,
		currentDisks: [] as Array<DiskUsage>,
		currentDiskHistory: [] as Array<ClientMountpoint>,
	}),
	getters: {
		getClients(state) {
			return state.clients;
		},
		getCurrentClient(state) {
			return state.currentClient;
		},
		getCurrentMetrics(state) {
			return state.currentMetrics;
		},
	},
	actions: {

		async loadClients() {
			try {
				const data: ClientsResponse = (await this.fetchClients()) as ClientsResponse;
				if (data) {
					this.clients = <Client[]>data.data;
				}
			}
			catch (error) {
				console.error('Error loading clients:', error);
			}
		},
		async loadGroups() {
			const { $api } = useNuxtApp();
			const data = await $api.groups.listGroups();

			this.$state.groups = <ClientGroup[]>data.data;
		},

		async loadGroupList(id: string) {
			const { $api } = useNuxtApp();
			const data = await $api.clients.listByGroup(id);
			return data.data;
		},
		async fetchClients() {
			const { $api } = useNuxtApp();
			try {
				return await $api.clients.listClients();
			}
			catch (e) {
				console.error('Error fetching clients:', e);
			}
		},
		async loadClientById(clientId: string) {
			const { $api } = useNuxtApp();
			try {
				const data = await $api.clients.show(clientId);
				this.$state.currentClient = <Client>data.data;
				await this.loadMetrics(clientId);
				await this.loadMountpoints(clientId);
			}
			catch (e) {
				console.error('Error fetching client:', e);
			}
		},
		async loadMetrics(clientId: string, since?: string, until?: string) {
			const { $api } = useNuxtApp();
			try {
				const metricsData = await $api.clients.metrics(clientId, since, until);
				this.$state.currentMetrics = <ClientMetric[]>metricsData.data;
			}
			catch (e) {
				console.error('Error fetching client metrics:', e);
				this.$state.currentMetrics = [];
			}
		},
		async loadMountpoints(clientId: string, since?: string, until?: string) {
			const { $api } = useNuxtApp();
			try {
				const mountpointsData = await $api.clients.mountpoints(clientId, since, until);
				this.$state.currentDiskHistory = mountpointsData.data;
				this.$state.currentDisks = parseMountpoints(mountpointsData.data[0]?.mountpoints);
			}
			catch (e) {
				console.error('Error fetching client mountpoints:', e);
				this.$state.currentDiskHistory = [];
				this.$state.currentDisks = [];
			}
		},
		updateClient(client: Partial<Client>) {
			this.$state.currentClient = {
				...client,
				...this.$state.currentClient,
			};
		},
	},
});
