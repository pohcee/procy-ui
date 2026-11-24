import { defineStore } from 'pinia';
import type { ServerCapabilities, ServerStatus } from '~/types';

// One shared request when several components ask for the status at once.
let pendingLoad: Promise<void> | null = null;

export const useStatusStore = defineStore('status', {
	state: () => ({
		status: {} as ServerStatus,
		nbClient: 0,
	}),
	getters: {
		/** Whether the server offers a feature. Unknown (older server, status not loaded yet) counts as offered. */
		hasCapability: state => (name: keyof ServerCapabilities): boolean =>
			state.status?.capabilities?.[name] !== false,
	},
	actions: {
		async loadStatus() {
			try {
				const { $api } = useNuxtApp();
				const { data: response } = await $api.status.show();
				if (response.value) {
					this.$state.status = response.value.data as unknown as ServerStatus;
				}
			}
			catch (e) {
				console.log(e);
			}
		},
		/** Loads the status unless it is already loaded or loading. */
		ensureStatus(): Promise<void> {
			if (this.$state.status?.version) return Promise.resolve();
			pendingLoad ??= this.loadStatus().finally(() => {
				pendingLoad = null;
			});
			return pendingLoad;
		},
		async fetchNbClients() {
			try {
				const { $api } = useNuxtApp();
				const data = await $api.clients.getTotalClients();
				if (data?.meta) {
					this.$state.nbClient = data.meta.count;
				}
			}
			catch (e) {
				console.log(e);
			}
		},
	},
});
