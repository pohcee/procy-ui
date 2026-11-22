import { defineStore } from 'pinia';
import { FetchError } from 'ofetch';
import type { TunnelPayload } from '~/types';

export const useTunnelStore = defineStore('tunnel', {
	state: () => ({
		isAddingTunnel: false,
	}),

	actions: {
		openAddTunel() {
			this.isAddingTunnel = true;
		},
		async createTunnel(clientID: string, payload: TunnelPayload) {
			const { $api } = useNuxtApp();
			try {
				const data = await $api.clients.createTunnel(clientID, payload);
				return { data: data, error: null };
			}
			catch (e: unknown) {
				return {
					data: null,
					error: e instanceof FetchError ? e.data as unknown : undefined,
				};
			}
		},
		closeAddTunnel() {
			this.isAddingTunnel = false;
		},
	},
});
