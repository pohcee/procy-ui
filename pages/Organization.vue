<template>
	<SettingsLayout
		heading="Organization"
		description="How members sign in, take your organization's configuration with you, or delete the organization."
	>
		<AppCard
			v-if="!available && !signIn"
			flush
		>
			<OpEmpty
				:icon="Building2"
				:loading="!statusReady || signInLoading"
				:title="statusReady && !signInLoading ? 'Not available' : 'Loading…'"
				:description="statusReady && !signInLoading ? 'Export and deletion are for administrators, on servers with self-service signup.' : undefined"
			/>
		</AppCard>

		<!-- Sign-in: whether members must sign in with Google (servers with organizations; 404 standalone). -->
		<AppCard
			v-if="signIn"
			title="Sign-in"
			description="How the members of this organization sign in."
		>
			<div class="flex flex-col gap-3">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<p
							id="org-require-oidc-label"
							class="text-sm font-medium text-app-text"
						>
							Require Google sign-in
						</p>
						<p
							id="org-require-oidc-help"
							class="mt-0.5 text-[13px] text-app-text-3"
						>
							<template v-if="!signIn.oidcEnabled && !signIn.requireOidc">
								Google sign-in isn’t enabled on this server, so it can’t be required.
							</template>
							<template v-else-if="signIn.requireOidc">
								Members sign in with their Google account only; passwords don’t work here.
							</template>
							<template v-else>
								Members can sign in with a password or with Google, as each member’s sign-in setting allows.
							</template>
						</p>
					</div>
					<button
						type="button"
						role="switch"
						:aria-checked="signIn.requireOidc"
						aria-labelledby="org-require-oidc-label"
						aria-describedby="org-require-oidc-help"
						:disabled="savingSignIn || (!signIn.oidcEnabled && !signIn.requireOidc)"
						:class="[
							'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50',
							signIn.requireOidc ? 'bg-app-accent' : 'bg-app-border-strong',
						]"
						@click="toggleRequireOidc"
					>
						<span
							:class="['inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform', signIn.requireOidc ? 'translate-x-[22px]' : 'translate-x-0.5']"
							aria-hidden="true"
						/>
					</button>
				</div>
				<p
					v-if="signInError"
					role="alert"
					class="rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
				>
					{{ signInError }}
				</p>
			</div>
		</AppCard>
		<Modal
			v-model="confirmRequireOidc"
			title="Require Google sign-in?"
			ok-text="Require Google sign-in"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="saveRequireOidc(true)"
		>
			<p class="text-sm text-app-text-2">
				Members with only a password will no longer be able to sign in. Their password sessions end, and they must
				sign in with the Google account of their email address. API tokens keep working.
			</p>
		</Modal>

		<template v-if="available">
			<!-- Export -->
			<AppCard
				title="Export"
				description="Users and their groups, user groups, devices, device groups, stored tunnels, schedules and the script library, as JSON."
			>
				<div class="flex flex-col gap-3 text-sm text-app-text-2">
					<p>
						No secrets are included: no passwords, two-factor secrets, API tokens, device credentials or vault values.
						The export is written to the platform’s audit log.
					</p>
					<p
						v-if="exportError"
						role="alert"
						class="rounded-[10px] bg-app-danger-bg p-3 text-app-danger"
					>
						{{ exportError }}
					</p>
					<div>
						<AppButton
							variant="secondary"
							:disabled="exporting"
							@click="doExport"
						>
							<Download
								class="h-4 w-4"
								aria-hidden="true"
							/>
							{{ exporting ? 'Preparing…' : 'Download export' }}
						</AppButton>
					</div>
				</div>
			</AppCard>

			<!-- Deletion requested -->
			<section
				v-if="deletion"
				role="status"
				class="flex flex-col gap-3 rounded-xl border border-app-danger/40 bg-app-danger-bg p-5"
			>
				<h3 class="text-[15px] font-semibold text-app-text">
					Deletion requested
				</h3>
				<p class="text-sm text-app-text-2">
					<span class="font-medium text-app-text">{{ deletion.organizationName }}</span> is suspended now and will be
					deleted on <span class="font-medium text-app-text">{{ formatDay(deletion.deleteAfter) }}</span>.
					<template v-if="deletion.cancelLinksSent">
						{{ deletion.cancelLinksSent === 1 ? 'Its administrator was' : `Its ${deletion.cancelLinksSent} administrators were` }}
						emailed a link to cancel until then.
					</template>
					Your session has ended.
				</p>
				<div>
					<AppButton @click="signOut">
						Sign out
					</AppButton>
				</div>
			</section>

			<!-- Delete -->
			<section
				v-else
				aria-labelledby="org-delete-title"
				class="flex flex-col gap-4 rounded-xl border border-app-danger/40 bg-app-surface p-5"
			>
				<div>
					<h3
						id="org-delete-title"
						class="text-[15px] font-semibold text-app-danger"
					>
						Delete this organization
					</h3>
					<ul class="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-app-text-2">
						<li>It is suspended at once: nobody can sign in, and its devices stop connecting.</li>
						<li>Billing stops; a subscription is canceled.</li>
						<li>Every administrator with an email address gets a link to cancel within 30 days.</li>
						<li>After 30 days everything is deleted for good and the vault key is destroyed. The ID is never given out again.</li>
					</ul>
					<p class="mt-2 text-[13px] text-app-text-3">
						Download an export first if you want to keep the configuration.
					</p>
				</div>
				<form
					class="flex flex-col gap-4"
					@submit.prevent="requestDeletion"
				>
					<OpField
						label="Reason"
						hint="(optional)"
						for-id="org-delete-reason"
					>
						<OpInput
							id="org-delete-reason"
							v-model="reason"
							maxlength="1000"
							placeholder="What made you leave?"
						/>
					</OpField>
					<OpField
						:label="orgId ? `Type the organization ID “${orgId}” to confirm` : 'Type the organization ID to confirm'"
						for-id="org-delete-confirm"
						:help="orgId ? undefined : 'The ID is the short name in your sign-in link and the organization switcher.'"
					>
						<OpInput
							id="org-delete-confirm"
							v-model="typed"
							mono
							:placeholder="orgId || 'organization-id'"
							autocapitalize="none"
							spellcheck="false"
						/>
					</OpField>
					<p
						v-if="deleteError"
						role="alert"
						class="rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
					>
						{{ deleteError }}
					</p>
					<div>
						<AppButton
							type="submit"
							class="!bg-app-danger hover:!bg-app-danger/90"
							:disabled="deleting || !confirmOk"
						>
							<Trash2
								class="h-4 w-4"
								aria-hidden="true"
							/>
							{{ deleting ? 'Requesting…' : 'Delete organization' }}
						</AppButton>
					</div>
				</form>
			</section>
		</template>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { Building2, Download, Trash2 } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import { formatDay } from '~/utils/billing';
import { downloadJson } from '~/utils/download';
import { exportFileName, type OrgDeletion } from '~/utils/signup';
import type { OrgSignIn } from '~/utils/oidc';
import Modal from '~/components/Modal.vue';

useHead({ title: 'Organization' });

const { $api } = useNuxtApp();
const router = useRouter();
const statusStore = useStatusStore();
const tokenStore = useTokenStore();
const { signup, operator } = useCapabilities();
const { isAdmin, profileReady } = useIsAdmin();
const { current } = useMembership();

const statusReady = computed(() => !!statusStore.status?.version && profileReady.value);
const available = computed(() => signup.value && isAdmin.value && !operator.value);
/** The organization's ID when the membership list knows it (servers with organizations). */
const orgId = computed(() => current.value?.id ?? '');

// ---- Sign-in (GET/PUT /organization/sign-in; null: no such setting on this server) ----
const signIn = ref<OrgSignIn | null>(null);
const signInLoading = ref(false);
const signInError = ref('');
const savingSignIn = ref(false);
const confirmRequireOidc = ref(false);
let signInRequested = false;
watch([isAdmin, operator], async ([admin, op]) => {
	if (!admin || op || signInRequested) return;
	signInRequested = true;
	signInLoading.value = true;
	try {
		signIn.value = await $api.account.orgSignIn();
	}
	catch {
		signIn.value = null;
	}
	finally {
		signInLoading.value = false;
	}
}, { immediate: true });

const saveRequireOidc = async (value: boolean) => {
	confirmRequireOidc.value = false;
	savingSignIn.value = true;
	signInError.value = '';
	try {
		signIn.value = await $api.account.setOrgSignIn(value);
	}
	catch (e) {
		signInError.value = `Couldn't change the sign-in setting: ${apiErrorMessage(e)}`;
	}
	finally {
		savingSignIn.value = false;
	}
};
// Turning it on locks out password-only members: confirm first. Turning it off needs no confirmation.
const toggleRequireOidc = () => {
	if (!signIn.value || savingSignIn.value) return;
	if (signIn.value.requireOidc) saveRequireOidc(false);
	else confirmRequireOidc.value = true;
};

const exporting = ref(false);
const exportError = ref('');
const doExport = async () => {
	if (exporting.value) return;
	exporting.value = true;
	exportError.value = '';
	try {
		const data = await $api.account.exportOrganization();
		const id = String((data as { organization?: { id?: unknown } } | null)?.organization?.id ?? orgId.value ?? '');
		downloadJson(data, exportFileName(id));
	}
	catch (e) {
		exportError.value = `Couldn't export the organization: ${apiErrorMessage(e)}`;
	}
	finally {
		exporting.value = false;
	}
};

const reason = ref('');
const typed = ref('');
const deleting = ref(false);
const deleteError = ref('');
const deletion = ref<OrgDeletion | null>(null);
const confirmOk = computed(() => (orgId.value ? typed.value.trim() === orgId.value : typed.value.trim().length > 0));

const requestDeletion = async () => {
	if (!confirmOk.value || deleting.value) return;
	deleting.value = true;
	deleteError.value = '';
	try {
		deletion.value = await $api.account.requestDeletion(typed.value.trim(), reason.value.trim() || undefined);
	}
	catch (e) {
		const status = httpStatusOf(e);
		if (status === 400) deleteError.value = 'That is not this organization’s ID.';
		else if (status === 409) deleteError.value = apiErrorTitle(e) || 'A deletion is pending already, or no administrator has an email address for the cancel link.';
		else deleteError.value = `Couldn't request the deletion: ${apiErrorMessage(e)}`;
	}
	finally {
		deleting.value = false;
	}
};

// The organization is suspended: the session no longer works.
const signOut = async () => {
	await tokenStore.logOut();
	await router.replace('/auth');
};
</script>
