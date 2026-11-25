let pendingProfile: Promise<void> | null = null;

/** Whether the signed-in user is in the Administrators group (loads the profile once when needed). */
export const useIsAdmin = () => {
	const profileStore = useProfile();
	const { profile } = storeToRefs(profileStore);
	if (!profile.value?.username && !pendingProfile) {
		pendingProfile = profileStore.fetchProfile().finally(() => {
			pendingProfile = null;
		});
	}
	const isAdmin = computed(() => (profile.value?.groups ?? []).includes('Administrators'));
	const profileReady = computed(() => !!profile.value?.username);
	return { isAdmin, profileReady };
};
