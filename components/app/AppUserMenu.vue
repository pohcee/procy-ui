<template>
	<div>
		<AppOrgSwitcher />
		<div class="flex items-center gap-2.5 border-t border-[#222B37] px-2.5 pt-3">
			<span
				aria-hidden="true"
				class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2A3442] text-[13px] font-semibold uppercase text-white"
			>{{ initials }}</span>
			<!-- Who is signed in. Profile/settings live under the "Settings" nav item. -->
			<div class="min-w-0 flex-1">
				<span class="block truncate text-[13px] font-semibold text-white">{{ username || 'Account' }}</span>
				<span class="block text-xs text-[#8C96A5]">{{ operator ? 'Platform operator' : 'Signed in' }}</span>
			</div>
			<button
				type="button"
				aria-label="Log out"
				:disabled="loggingOut"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#C9D1DC] hover:bg-app-nav-hover hover:text-white"
				@click="logout"
			>
				<LogOut
					class="h-[18px] w-[18px]"
					aria-hidden="true"
				/>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { LogOut } from 'lucide-vue-next';

const emit = defineEmits<{ (e: 'navigate'): void }>();

const tokenStore = useTokenStore();
const { operator } = useCapabilities();
const profileStore = useProfile();
const { profile } = storeToRefs(profileStore);
const router = useRouter();

const username = computed(() => profile.value?.username ?? '');
const initials = computed(() => (username.value || '?').slice(0, 2));

onMounted(() => {
	if (!profile.value?.username) {
		profileStore.fetchProfile();
	}
});

const loggingOut = ref(false);
const logout = async () => {
	// One logout per click: a second request for an already-ended session is
	// rejected by the server (and briefly bans the user).
	if (loggingOut.value) return;
	loggingOut.value = true;
	emit('navigate');
	try {
		await tokenStore.logOut();
		await router.replace('/auth');
	}
	finally {
		loggingOut.value = false;
	}
};
</script>
