import type { MyInvitation } from '~/utils/membership';

// One list per session, shared by the menu badge and the Invitations page.
const invitations = ref<MyInvitation[] | null>(null);
const failed = ref(false);
let pending: Promise<void> | null = null;
let loadedFor: string | null = null;

/**
 * The signed-in login's pending invitations into other organizations (capability `organizations` only; servers
 * without it show nothing). Accepting one makes the organization appear in the switcher.
 */
export const useInvitations = () => {
	const { $api } = useNuxtApp();
	const { organizations } = useCapabilities();
	const membership = useMembership();

	const load = () => {
		failed.value = false;
		pending = $api.membership.myInvitations()
			.then((list) => {
				invitations.value = list ?? [];
			})
			.catch(() => {
				invitations.value = null;
				failed.value = true;
			})
			.finally(() => {
				pending = null;
			});
		return pending;
	};

	// Once the status says the server has organizations, per session token.
	watch(organizations, (on) => {
		const token = readAuthToken();
		if (!on || !token || loadedFor === token || pending) return;
		loadedFor = token;
		invitations.value = null;
		load();
	}, { immediate: true });

	const count = computed(() => invitations.value?.length ?? 0);

	const remove = (id: string) => {
		invitations.value = invitations.value?.filter(i => i.id !== id) ?? null;
	};
	const accept = async (id: string) => {
		await $api.membership.accept(id);
		remove(id);
		await membership.reload();
	};
	const decline = async (id: string) => {
		await $api.membership.decline(id);
		remove(id);
	};

	return { invitations, failed, count, available: organizations, reload: () => pending ?? load(), accept, decline, switchTo: membership.switchTo };
};
