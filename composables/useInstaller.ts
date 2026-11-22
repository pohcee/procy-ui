import type { InstallerResponse } from '~/types';
import { readAuthToken } from '~/utils/authToken';

export const useInstaller = () => {
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const installers = reactive({
		linux: '',
		windows: '',
		pairing_code: '',
	});

	async function fetchInstaller(params: {
		client_id: string;
		connect_url: string;
		fingerprint: string;
		password: string;
	}, pairingUrl: string, builtin = false) {
		error.value = null;
		if (!pairingUrl) {
			error.value = 'No pairing service is configured on the server. Enable the [pairing] section in rportd.conf.';
			return;
		}
		isLoading.value = true;

		try {
			// rportd's built-in pairing service requires the API token; an external
			// pairing service must never receive it.
			const token = builtin ? readAuthToken() : null;
			const response = await $fetch<InstallerResponse>(pairingUrl, {
				method: 'POST',
				body: params,
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			});

			Object.assign(installers, {
				linux: response.installers.linux,
				windows: response.installers.windows,
				pairing_code: response.pairing_code,
			});
		}
		catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to get pairing code';
		}
		finally {
			isLoading.value = false;
		}
	}

	return {
		isLoading,
		error,
		installers,
		fetchInstaller,
	};
};
