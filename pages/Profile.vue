<template>
	<new-page-wrapper is-extra="true">
		<div class="flex flex-1 xl:overflow-hidden">
			<new-settings-sidebar />
			<div class="scrollbar-hide max-h-screen flex-1 xl:overflow-y-auto">
				<div class="mx-auto h-screen max-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
					<form @submit.prevent="handleSaveProfile">
						<div class="relative z-20 flex h-16 items-center justify-between">
							<div class="">
								<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
									Profile
								</h3>
								<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
									&nbsp;
								</p>
							</div>
							<div class="flex-1" />
							<div class="ml-2 flex-shrink-0">
								<button
									class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
									type="button"
									@click="store.fetchProfile()"
								>
									<span
										class="flex items-center justify-center gap-x-2"
									> Reload</span>
								</button>
							</div>
						</div>
						<div class="flex flex-col gap-y-8">
							<div
								class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900"
							>
								<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
									<div class="flex max-h-16 flex-1 content-center items-center">
										<h3 class="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-50">
											Update profile info
										</h3>
									</div>
								</div>
								<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
									<div class="h-full w-full">
										<div class="opacity-50 flex flex-col mt-8">
											<div class="relative mt-1 flex w-full flex-col">
												<input
													id="1dIVMpzYO6"
													:value="profile.username"
													class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													readonly=""
													type="text"
													autocomplete="off"
												><label
													class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
													for="1dIVMpzYO6"
												>Username</label>
											</div>
											<p class="mt-1 pl-1 text-sm text-theme-inverted">
												The username field is not
												editable
											</p>
										</div>
										<div class="flex flex-col mt-4">
											<div class="relative mt-1 flex w-full flex-col">
												<input
													id="CSNl6oSWY5"
													v-model="twoFaSendTo"
													class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													type="text"
													autocomplete="off"
												><label
													class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
													for="CSNl6oSWY5"
												>Two-factor send to</label>
											</div>
										</div>
										<div class="flex flex-col py-6">
											<label
												class="flex cursor-pointer select-none items-center justify-start text-sm text-theme-label"
											><input
												v-model="wantsPasswordChange"
												type="checkbox"
												class="mr-2 h-[16px] w-[16px] cursor-pointer rounded border-none bg-transparent ring-2 ring-gray-300 focus:ring-gray-300 focus:ring-offset-0 primary-text"
											>Change
												password</label>
										</div>
										<div
											v-if="wantsPasswordChange"
											class="flex flex-col gap-4"
										>
											<div class="relative flex w-full flex-col">
												<input
													id="oldPassword"
													v-model="oldPassword"
													class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													type="password"
													autocomplete="current-password"
												><label
													class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
													for="oldPassword"
												>Current password</label>
											</div>
											<div class="relative flex w-full flex-col">
												<input
													id="newPassword"
													v-model="newPassword"
													class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													placeholder=" "
													type="password"
													autocomplete="new-password"
												><label
													class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
													for="newPassword"
												>New password</label>
											</div>
											<div class="relative flex w-full flex-col">
												<input
													id="confirmPassword"
													v-model="confirmPassword"
													class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
													:class="{ error: confirmPassword && confirmPassword !== newPassword }"
													placeholder=" "
													type="password"
													autocomplete="new-password"
												><label
													class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
													for="confirmPassword"
												>Confirm new password</label>
											</div>
											<p
												v-if="confirmPassword && confirmPassword !== newPassword"
												class="text-sm text-red-500"
											>
												Passwords do not match
											</p>
										</div>
									</div>
								</div>
							</div>
							<div class="flex w-full items-center justify-end">
								<button
									class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm"
									type="submit"
									:disabled="isSavingProfile || (wantsPasswordChange && (!oldPassword || !newPassword || newPassword !== confirmPassword))"
								>
									Save profile
								</button>
							</div>
						</div>
					</form>
					<div class="mt-8 pb-8">
						<div class="relative z-20 flex h-16 items-center justify-between">
							<div class="">
								<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
									Two-factor authentication
								</h3>
							</div>
						</div>
						<div
							class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900"
						>
							<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
								<div
									v-if="totpUnavailable"
									class="text-sm text-gray-500"
								>
									Authenticator app 2FA is not enabled on this server.
								</div>
								<div v-else-if="totpEnrolled && !totpSetup">
									<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
										An authenticator app is currently linked to your account.
									</p>
									<button
										class="bg-red-600 hover:bg-red-700 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold"
										type="button"
										@click="disableTotp"
									>
										Disable authenticator app
									</button>
								</div>
								<div v-else-if="totpSetup">
									<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
										Scan this QR code with your authenticator app, then it will be active on next login.
									</p>
									<img
										:src="totpSetup.qr"
										alt="TOTP QR code"
										class="mb-3 h-40 w-40"
									>
									<p class="mb-3 break-all font-mono text-xs text-gray-500">
										{{ totpSetup.secret }}
									</p>
									<button
										class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold"
										type="button"
										@click="totpSetup = null"
									>
										Done
									</button>
								</div>
								<div v-else>
									<button
										class="bg-vtd-primary-500 hover:bg-vtd-primary-700 text-white cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-semibold"
										type="button"
										@click="enableTotp"
									>
										Enable authenticator app
									</button>
								</div>
							</div>
						</div>
					</div>
					<div class="pb-8">
						<form @submit.prevent="handleSaveSettings">
							<div class="relative z-20 flex h-16 items-center justify-between">
								<div class="">
									<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
										Settings
									</h3>
									<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
										&nbsp;
									</p>
								</div>
							</div>
							<div class="flex flex-col gap-y-8">
								<div
									class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900"
								>
									<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
										<div class="flex max-h-16 flex-1 content-center items-center">
											<h3 class="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-50">
												General
											</h3>
										</div>
									</div>
									<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
										<div class="h-full w-full">
											<div class="mt-4">
												<CustomThemedSelect
													id="zKC0s1Gc1T"
													v-model="colorMode"
													label="Selected theme"
													:options="themeOptions"
												/>
											</div>
											<div>
												<div class="mt-4">
													<CustomThemedSelect
														id="uDMB3DAEKQ"
														v-model="useSecureShellExtension"
														label="Use Secure Shell Extension for Chrome"
														placeholder="Select..."
														:options="yesNoOptions"
													/>
												</div>
												<div
													class="flex items-center justify-between space-x-0.5 pl-1 pt-1 text-sm text-gray-500"
												>
													<div>
														<span>Launch SSH connections directly in your
															browser.</span><span class="w-1 shrink-0">&nbsp;</span><a
															href="https://chrome.google.com/webstore/detail/secure-shell-app/iodihamcpbpeioajjeobimgagajmlibd"
															class="primary"
															target="_blank"
														>Requires the Secure Shell
															extension for Chrome. </a>
													</div>
												</div>
											</div>
											<div
												class="flex flex-col mt-4"
											>
												<div class="relative mt-1 flex w-full flex-col">
													<input
														id="lXseOVzBfm"
														v-model="commandHistoryMaxEntries"
														class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
														placeholder=" "
														type="number"
														min="0"
														max="200"
														autocomplete="off"
													><label
														class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
														for="lXseOVzBfm"
													>Command history max entries</label>
												</div>
												<p class="mt-1 pl-1 text-sm text-theme-inverted">
													0 - 200
												</p>
											</div>
										</div>
									</div>
								</div>
								<div
									class="flex flex-1 flex-col divide-y divide-gray-50 overflow-hidden rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-900"
								>
									<div class="px-4 py-4 sm:flex sm:items-center sm:px-6">
										<div class="flex max-h-16 flex-1 content-center items-center">
											<h3 class="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-50">
												RDP
											</h3>
										</div>
									</div>
									<div class="flex-1 px-4 py-5 text-gray-950 dark:text-gray-50 sm:p-6">
										<div class="h-full w-full">
											<div class="mt-4">
												<CustomThemedSelect
													id="KXSJoJIuLz"
													v-model="rdpConnectionMethod"
													label="Open non-browser-based RDP connections with"
													placeholder="Select..."
													:options="rdpConnectionOptions"
												/>
											</div>
											<div class="mt-4 grid grid-cols-2 gap-4">
												<CustomThemedSelect
													id="LtPRgDEHkP"
													v-model="rdpWidth"
													label="Preferred window width for RDP connections"
													placeholder="Select..."
													:options="rdpWidthOptions"
												/>
												<CustomThemedSelect
													id="mR1ssRdYGd"
													v-model="rdpHeight"
													label="Preferred window height for RDP connections"
													placeholder="Select..."
													:options="rdpHeightOptions"
												/>
											</div>
											<div class="flex flex-col mt-4">
												<div class="relative mt-1 flex w-full flex-col">
													<input
														id="liTVvYrv39"
														v-model="defaultRdpUsername"
														class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
														placeholder=" "
														type="text"
														autocomplete="off"
													><label
														class="order-1 flex pb-1 pl-1 text-theme-label peer-focus:text-primary text-sm font-normal"
														for="liTVvYrv39"
													>Default RDP username</label>
												</div>
											</div>
											<div class="mt-4">
												<CustomThemedSelect
													id="dvmVMJe2id"
													v-model="keyboardLayout"
													label="Local keyboard layout for browser-based RDP"
													placeholder="Select..."
													:options="keyboardLayoutOptions"
												/>
											</div>
										</div>
									</div>
								</div>
								<div class="flex w-full items-center justify-end">
									<button
										class="bg-primary-500 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
										type="submit"
									>
										<span
											class="flex items-center justify-center gap-x-2"
										> Save
											settings</span>
									</button>
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

const store = useProfile();
const { profile } = storeToRefs(store);
const { colorMode } = useTheme();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const themeOptions = [
	{ value: 'auto', label: 'System' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
];
const yesNoOptions = [
	{ value: 'true', label: 'Yes' },
	{ value: 'false', label: 'No' },
];
const rdpConnectionOptions = [
	{ value: 'microsoft_remote_desktop', label: 'Microsoft Remote Desktop via RDP file download (Win & Mac)' },
	{ value: 'schema_link', label: 'Open a rdp:// schema link (Linux & FreeRDP, custom scripts)' },
];
const rdpWidthOptions = [
	{ value: '960', label: '960' },
	{ value: '1024', label: '1024' },
	{ value: '1280', label: '1280' },
];
const rdpHeightOptions = [
	{ value: '720', label: '720' },
	{ value: '768', label: '768' },
	{ value: '960', label: '960' },
];
const keyboardLayoutOptions = [
	{ value: 'pt-br-qwerty', label: 'Brazilian (Portuguese)' },
	{ value: 'en-gb-qwerty', label: 'English (UK)' },
	{ value: 'en-us-qwerty', label: 'English (US)' },
	{ value: 'fr-fr-azerty', label: 'French' },
	{ value: 'fr-be-azerty', label: 'French (Belgian)' },
	{ value: 'fr-ch-qwertz', label: 'French (Swiss)' },
	{ value: 'de-de-qwertz', label: 'German' },
	{ value: 'de-ch-qwertz', label: 'German (Swiss)' },
	{ value: 'hu-hu-qwertz', label: 'Hungarian' },
	{ value: 'it-it-qwerty', label: 'Italian' },
	{ value: 'ja-jp-qwerty', label: 'Japanese' },
	{ value: 'no-no-qwerty', label: 'Norwegian' },
	{ value: 'es-es-qwerty', label: 'Spanish' },
	{ value: 'es-latam-qwerty', label: 'Spanish (Latin American)' },
	{ value: 'tr-tr-qwerty', label: 'Turkish-Q' },
];

// Client-only display preferences (no backend field exists for these; persisted locally).
const useSecureShellExtension = useLocalStorage('profile_use_secure_shell_extension', 'false');
const commandHistoryMaxEntries = useLocalStorage('profile_command_history_max_entries', 50);
const rdpConnectionMethod = useLocalStorage('profile_rdp_connection_method', 'microsoft_remote_desktop');
const rdpWidth = useLocalStorage('profile_rdp_width', '1024');
const rdpHeight = useLocalStorage('profile_rdp_height', '768');
const defaultRdpUsername = useLocalStorage('profile_default_rdp_username', '');
const keyboardLayout = useLocalStorage('profile_keyboard_layout', 'en-us-qwerty');

const twoFaSendTo = ref('');
const wantsPasswordChange = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isSavingProfile = ref(false);

watch(profile, (value) => {
	twoFaSendTo.value = value?.two_fa_send_to ?? '';
}, { immediate: true });

const handleSaveProfile = async () => {
	if (wantsPasswordChange.value && (!oldPassword.value || newPassword.value !== confirmPassword.value)) return;
	isSavingProfile.value = true;
	try {
		await $api.profile.updateProfile({
			username: profile.value.username,
			two_fa_send_to: twoFaSendTo.value,
			...(wantsPasswordChange.value ? { password: newPassword.value, old_password: oldPassword.value } : {}),
		});
		snackbar.add({ type: 'success', text: 'Profile updated' });
		wantsPasswordChange.value = false;
		oldPassword.value = '';
		newPassword.value = '';
		confirmPassword.value = '';
		await store.fetchProfile();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to update profile' });
	}
	finally {
		isSavingProfile.value = false;
	}
};

const handleSaveSettings = () => {
	snackbar.add({
		type: 'success',
		text: 'Settings saved',
	});
};

const totpEnrolled = ref(false);
const totpUnavailable = ref(false);
const totpSetup = ref<{ secret: string; qr: string } | null>(null);

const refreshTotpStatus = async () => {
	try {
		await $api.profile.getTotP();
		totpEnrolled.value = true;
		totpUnavailable.value = false;
	}
	catch (error: any) {
		if (error?.response?.status === 400) {
			totpUnavailable.value = true;
		}
		totpEnrolled.value = false;
	}
};

const enableTotp = async () => {
	try {
		totpSetup.value = await $api.profile.createTotP();
		totpEnrolled.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to generate authenticator secret' });
	}
};

const disableTotp = async () => {
	try {
		await $api.profile.deleteTotP();
		totpEnrolled.value = false;
		snackbar.add({ type: 'success', text: 'Authenticator app disabled' });
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to disable authenticator app' });
	}
};

await store.fetchProfile();
await refreshTotpStatus();
</script>

<style scoped>
/* Estilos de la página (opcional) */
</style>
