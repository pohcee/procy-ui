import { currentOrg, showOrgSwitcher, type OrgRef } from '~/utils/membership';
import { setAuthCookies } from '~/stores/auth';

// One list per session, shared by the desktop sidebar and the phone drawer.
const orgs = ref<OrgRef[] | null>(null);
let pending: Promise<void> | null = null;
let loadedFor: string | null = null;

/**
 * The user's organizations and switching between them (membership API, not final: see
 * repository/modules/membership.ts). Servers without the API answer 404, and then nothing is shown.
 */
export const useMembership = () => {
	const { $api } = useNuxtApp();
	const token = readAuthToken();

	if (token && loadedFor !== token && !pending) {
		loadedFor = token;
		orgs.value = null;
		pending = $api.membership.list()
			.then((list) => {
				orgs.value = list;
			})
			.catch(() => {
				orgs.value = null;
			})
			.finally(() => {
				pending = null;
			});
	}

	const visible = computed(() => showOrgSwitcher(orgs.value));
	const current = computed(() => (orgs.value ? currentOrg(orgs.value) : null));

	const switching = ref(false);
	const switchTo = async (id: string) => {
		if (switching.value || id === current.value?.id) return;
		switching.value = true;
		try {
			const newToken = await $api.membership.switchTo(id);
			if (newToken) setAuthCookies(newToken);
			// Everything on screen belongs to the old organization: start over.
			window.location.assign('/dashboard');
		}
		finally {
			switching.value = false;
		}
	};

	return { orgs, visible, current, switching, switchTo };
};
