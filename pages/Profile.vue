<template>
	<SettingsLayout>
		<!-- Preferences: General (theme first), then Remote desktop -->
		<AppCard
			title="Preferences"
			description="Apply to you only."
		>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="handleSaveSettings"
			>
				<h3 class="st-group-title">
					General
				</h3>
				<fieldset class="flex flex-col gap-2">
					<legend class="st-label mb-2">
						Theme
					</legend>
					<div class="grid grid-cols-3 gap-2 sm:gap-2.5">
						<label
							v-for="option in themeOptions"
							:key="option.value"
							:class="[
								'flex cursor-pointer flex-col gap-2.5 rounded-xl border bg-app-surface-2 p-2.5 transition-colors sm:p-3',
								'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-app-accent',
								colorMode === option.value
									? 'border-app-accent shadow-[0_0_0_1px_rgb(var(--app-accent))]'
									: 'border-app-border-strong hover:border-app-text-4',
							]"
						>
							<span
								aria-hidden="true"
								class="flex h-10 overflow-hidden rounded-lg border border-app-border sm:h-14"
							>
								<span
									v-for="(pane, index) in option.preview"
									:key="index"
									class="flex flex-1 flex-col gap-[5px] p-2"
									:style="{ background: pane.bg }"
								>
									<span
										class="h-1.5 w-3/5 rounded-full"
										:style="{ background: pane.line }"
									/>
									<span
										class="h-1.5 w-2/5 rounded-full"
										:style="{ background: pane.line }"
									/>
								</span>
							</span>
							<span class="flex items-center gap-2 text-sm font-medium text-app-text">
								<input
									v-model="colorMode"
									type="radio"
									name="theme"
									:value="option.value"
									class="h-4 w-4 shrink-0 accent-app-accent"
								>
								{{ option.label }}
							</span>
						</label>
					</div>
					<p class="st-help">
						{{ colorMode === 'auto'
							? 'System (default) follows your device’s light or dark setting and switches with it.'
							: 'Overrides your device setting in this browser.' }}
					</p>
				</fieldset>

				<div class="st-grid2">
					<div class="st-field">
						<label
							class="st-label"
							for="pref-history"
						>Command history max entries</label>
						<input
							id="pref-history"
							v-model="commandHistoryMaxEntries"
							class="st-ctl"
							type="number"
							min="0"
							max="200"
							autocomplete="off"
						>
						<span class="st-help">0 – 200</span>
					</div>
				</div>

				<h3 class="st-group-title mt-2">
					Remote desktop (RDP)
				</h3>
				<div class="st-grid2">
					<div class="st-field">
						<label
							class="st-label"
							for="pref-rdp-user"
						>Default RDP username</label>
						<input
							id="pref-rdp-user"
							v-model="defaultRdpUsername"
							class="st-ctl"
							type="text"
							autocomplete="off"
						>
					</div>
					<div class="st-field">
						<label
							class="st-label"
							for="pref-rdp-kb"
						>Local keyboard layout for browser-based RDP</label>
						<select
							id="pref-rdp-kb"
							v-model="keyboardLayout"
							class="st-ctl"
						>
							<option
								v-for="option in keyboardLayoutOptions"
								:key="option.value"
								:value="option.value"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
					<div class="st-field">
						<label
							class="st-label"
							for="pref-rdp-w"
						>Preferred window width</label>
						<select
							id="pref-rdp-w"
							v-model="rdpWidth"
							class="st-ctl"
						>
							<option
								v-for="option in rdpWidthOptions"
								:key="option.value"
								:value="option.value"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
					<div class="st-field">
						<label
							class="st-label"
							for="pref-rdp-h"
						>Preferred window height</label>
						<select
							id="pref-rdp-h"
							v-model="rdpHeight"
							class="st-ctl"
						>
							<option
								v-for="option in rdpHeightOptions"
								:key="option.value"
								:value="option.value"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
				</div>
				<div class="st-field">
					<label
						class="st-label"
						for="pref-rdp-open"
					>Open non-browser-based RDP connections with</label>
					<select
						id="pref-rdp-open"
						v-model="rdpConnectionMethod"
						class="st-ctl"
					>
						<option
							v-for="option in rdpConnectionOptions"
							:key="option.value"
							:value="option.value"
						>
							{{ option.label }}
						</option>
					</select>
				</div>
				<div class="flex flex-col gap-1">
					<label class="flex min-h-[32px] cursor-pointer items-center gap-2.5 text-sm text-app-text">
						<input
							v-model="useSecureShellExtension"
							type="checkbox"
							true-value="true"
							false-value="false"
							class="st-check"
						>
						Use Secure Shell Extension for Chrome
					</label>
					<p class="st-help pl-[28px]">
						Launch SSH connections directly in your browser.
						<a
							href="https://chrome.google.com/webstore/detail/secure-shell-app/iodihamcpbpeioajjeobimgagajmlibd"
							class="text-app-link underline-offset-2 hover:underline"
							target="_blank"
							rel="noopener noreferrer"
						>Requires the Secure Shell extension for Chrome.</a>
					</p>
				</div>

				<div class="flex justify-end border-t border-app-border-subtle pt-4">
					<AppButton type="submit">
						Save preferences
					</AppButton>
				</div>
			</form>
		</AppCard>

		<div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
			<!-- Profile -->
			<AppCard title="Profile">
				<template #actions>
					<AppButton
						variant="ghost"
						size="sm"
						@click="store.fetchProfile()"
					>
						<RotateCw
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Reload
					</AppButton>
				</template>
				<form
					class="flex flex-col gap-4"
					@submit.prevent="handleSaveProfile"
				>
					<div class="st-field">
						<label
							class="st-label"
							for="profile-username"
						>Username</label>
						<input
							id="profile-username"
							:value="profile.username"
							class="st-ctl"
							type="text"
							readonly
							autocomplete="off"
							aria-describedby="profile-username-help"
						>
						<span
							id="profile-username-help"
							class="st-help"
						>The username can’t be changed.</span>
					</div>
					<div class="st-field">
						<label
							class="st-label"
							for="profile-sendto"
						>Two-factor send to</label>
						<input
							id="profile-sendto"
							v-model="twoFaSendTo"
							class="st-ctl"
							type="text"
							autocomplete="off"
						>
					</div>

					<template v-if="showPasswordChange">
						<h3 class="mt-1 text-sm font-semibold text-app-text">
							Change password
						</h3>
						<div class="st-field">
							<label
								class="st-label"
								for="oldPassword"
							>Current password</label>
							<input
								id="oldPassword"
								v-model="oldPassword"
								class="st-ctl"
								type="password"
								autocomplete="current-password"
							>
						</div>
						<div class="st-field">
							<label
								class="st-label"
								for="newPassword"
							>New password</label>
							<input
								id="newPassword"
								v-model="newPassword"
								class="st-ctl"
								type="password"
								autocomplete="new-password"
							>
						</div>
						<div class="st-field">
							<label
								class="st-label"
								for="confirmPassword"
							>Confirm new password</label>
							<input
								id="confirmPassword"
								v-model="confirmPassword"
								:class="['st-ctl', { 'st-invalid': passwordMismatch }]"
								type="password"
								autocomplete="new-password"
								:aria-invalid="passwordMismatch || undefined"
							>
							<span
								v-if="passwordMismatch"
								class="st-error"
								role="alert"
							>Passwords do not match</span>
							<span
								v-else
								class="st-help"
							>Leave the password fields empty to keep your current password.</span>
						</div>
					</template>
					<div>
						<AppButton
							type="submit"
							variant="secondary"
							:disabled="isSavingProfile || (wantsPasswordChange && (!oldPassword || !newPassword || newPassword !== confirmPassword))"
						>
							Update profile
						</AppButton>
					</div>
				</form>
			</AppCard>

			<!-- Two-factor authentication -->
			<AppCard title="Two-factor authentication">
				<div class="flex flex-col gap-4">
					<div
						v-if="totpUnavailable"
						class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-surface-2 p-3.5 text-[13px] text-app-text-2"
					>
						<Info
							class="mt-px h-[18px] w-[18px] shrink-0 text-app-text-3"
							aria-hidden="true"
						/>
						Authenticator app 2FA is not enabled on this server.
					</div>
					<template v-else-if="totpSetup">
						<p class="text-[13px] text-app-text-2">
							Scan this QR code with your authenticator app. It will be required from your next login.
						</p>
						<div class="self-start rounded-xl border border-app-border bg-white p-2.5">
							<img
								:src="totpSetup.qr"
								alt="Authenticator app QR code"
								class="block h-40 w-40"
							>
						</div>
						<div class="st-field">
							<span class="st-label">Or enter this secret manually</span>
							<code class="break-all rounded-[10px] border border-app-border bg-app-surface-2 px-3 py-2.5 font-mono text-[13px] text-app-text">{{ totpSetup.secret }}</code>
						</div>
						<div>
							<AppButton @click="totpSetup = null">
								Done
							</AppButton>
						</div>
					</template>
					<template v-else-if="totpEnrolled">
						<div class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-ok-bg p-3.5 text-[13px] text-app-text-2">
							<ShieldCheck
								class="mt-px h-[18px] w-[18px] shrink-0 text-app-ok"
								aria-hidden="true"
							/>
							<div>
								<strong class="font-semibold text-app-text">Authenticator app linked.</strong>
								A code from your app is required at sign-in.
							</div>
						</div>
						<div>
							<AppButton
								variant="secondary"
								class="!text-app-danger"
								@click="disableTotp"
							>
								Disable authenticator app
							</AppButton>
						</div>
					</template>
					<template v-else>
						<div class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-warn-row p-3.5 text-[13px] text-app-text-2">
							<ShieldAlert
								class="mt-px h-[18px] w-[18px] shrink-0 text-app-warn"
								aria-hidden="true"
							/>
							<div>
								<strong class="font-semibold text-app-text">No authenticator app linked.</strong>
								<template v-if="profile.two_fa_send_to">
									Codes are sent to <span class="font-medium text-app-text">{{ profile.two_fa_send_to }}</span> instead.
								</template>
								<template v-else>
									Link one for a second sign-in factor.
								</template>
							</div>
						</div>
						<div>
							<AppButton
								variant="secondary"
								@click="enableTotp"
							>
								Enable authenticator app
							</AppButton>
						</div>
					</template>
				</div>
			</AppCard>
		</div>

		<!-- Sign-in: how this session signed in, and how the account may sign in (Postgres servers with [oidc]). -->
		<AppCard
			v-if="mySignIn || sessionMethod"
			title="Sign-in"
		>
			<div class="flex flex-col gap-4">
				<dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
					<div v-if="sessionMethod">
						<dt class="st-label">
							This session
						</dt>
						<dd class="mt-1 text-app-text">
							Signed in with {{ sessionMethod === 'Google' ? 'Google' : 'a password' }}
						</dd>
					</div>
					<div v-if="mySignIn">
						<dt class="st-label">
							Google account
						</dt>
						<dd class="mt-1 text-app-text">
							{{ profile.oidc_linked ? 'Linked' : 'Not linked yet: it is linked the first time you sign in with Google.' }}
						</dd>
					</div>
				</dl>
				<p
					v-if="systemOrg"
					class="rounded-[10px] bg-app-muted p-3 text-[13px] text-app-text-2"
					role="note"
				>
					Platform operators sign in with Google only.
				</p>
				<form
					v-else-if="mySignIn"
					class="flex flex-col gap-3"
					@submit.prevent="saveSignIn"
				>
					<fieldset class="flex flex-col gap-2">
						<legend class="st-label mb-2">
							How you sign in
						</legend>
						<label
							v-for="option in signInOptions"
							:key="option.value"
							:class="['flex min-h-[32px] items-center gap-2.5 text-sm', option.disabled ? 'cursor-not-allowed text-app-text-4' : 'cursor-pointer text-app-text']"
						>
							<input
								v-model="signInChoice"
								type="radio"
								name="sign-in"
								:value="option.value"
								:disabled="option.disabled"
								class="h-4 w-4 shrink-0 accent-app-accent"
							>
							{{ option.label }}
						</label>
						<p
							v-if="!profile.oidc_linked"
							class="st-help"
						>
							“Google only” is available once your Google account is linked.
						</p>
					</fieldset>
					<p
						v-if="signInError"
						role="alert"
						class="rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
					>
						{{ signInError }}
					</p>
					<div>
						<AppButton
							type="submit"
							variant="secondary"
							:disabled="savingSignIn || signInChoice === mySignIn"
						>
							Save sign-in method
						</AppButton>
					</div>
				</form>
			</div>
		</AppCard>

		<EmailConfirmCard v-if="signup" />
	</SettingsLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { Info, RotateCw, ShieldAlert, ShieldCheck } from 'lucide-vue-next';
import EmailConfirmCard from '~/components/account/EmailConfirmCard.vue';
import { authMethodLabel, isSystemOrg, parseSignIn, passwordAllowed, signInLabel, SIGN_IN_METHODS, type SignInMethod } from '~/utils/oidc';

const store = useProfile();
const { profile } = storeToRefs(store);
const { colorMode } = useTheme();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { signup, operator } = useCapabilities();
const { current } = useMembership();

// ---- Sign-in method (GET /me → sign_in, auth_method, oidc_linked; PUT /me/sign-in) ----
const mySignIn = computed(() => parseSignIn(profile.value?.sign_in));
const sessionMethod = computed(() => authMethodLabel(profile.value?.auth_method));
const systemOrg = computed(() => isSystemOrg(current.value?.id, operator.value));
/** No password change for Google-only accounts and platform operators. */
const showPasswordChange = computed(() => passwordAllowed({ signIn: mySignIn.value, systemOrg: systemOrg.value }));
const signInChoice = ref<SignInMethod>('both');
watch(mySignIn, (value) => {
	if (value) signInChoice.value = value;
}, { immediate: true });
const signInOptions = computed(() => SIGN_IN_METHODS.map(value => ({
	value,
	label: signInLabel(value),
	disabled: value === 'oidc' && !profile.value?.oidc_linked,
})));
const savingSignIn = ref(false);
const signInError = ref('');
const saveSignIn = async () => {
	savingSignIn.value = true;
	signInError.value = '';
	try {
		await $api.profile.setSignIn(signInChoice.value);
		snackbar.add({ type: 'success', text: `Sign-in method saved: ${signInLabel(signInChoice.value)}` });
		await store.fetchProfile();
	}
	catch (e) {
		signInError.value = `Couldn't change how you sign in: ${apiErrorMessage(e)}`;
	}
	finally {
		savingSignIn.value = false;
	}
};

// Mini previews of each theme (fixed colours: they depict the themes themselves).
const LIGHT = { bg: '#F5F6F8', line: '#D5DAE1' };
const DARK = { bg: '#0B0F14', line: '#2E3947' };
const themeOptions = [
	{ value: 'auto', label: 'System', preview: [LIGHT, DARK] },
	{ value: 'light', label: 'Light', preview: [LIGHT, { bg: '#FFFFFF', line: '#D5DAE1' }] },
	{ value: 'dark', label: 'Dark', preview: [DARK, { bg: '#121821', line: '#2E3947' }] },
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
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
// A password change is requested as soon as any of the password fields is filled in.
const wantsPasswordChange = computed(() => !!(oldPassword.value || newPassword.value || confirmPassword.value));
const passwordMismatch = computed(() => !!confirmPassword.value && confirmPassword.value !== newPassword.value);
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
	catch (error: unknown) {
		if ((error as { response?: { status?: number } } | null)?.response?.status === 400) {
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
