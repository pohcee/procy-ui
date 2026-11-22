export const useClientDetail = () => {
	const deviceId = useRoute().params.id;

	const clientStore = useClientStore();
	const {
		currentClient: device,
		currentMetrics: metrics,
		currentDisks: disks,
		currentDiskHistory: diskHistory,
	} = storeToRefs(clientStore);

	onMounted(async () => {
		await clientStore.loadClients();
		await clientStore.loadClientById(deviceId as string);
	});
	return {
		deviceId,
		clientStore,
		device,
		metrics,
		disks,
		diskHistory,
	};
};
