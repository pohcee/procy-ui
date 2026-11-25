<template>
	<!-- The operator's actions on one organization. Every change is written to the operator audit log. -->
	<div class="flex flex-col gap-4">
		<AppCard title="Device limit">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="min-w-0 text-[13px] text-app-text-3">
					<p class="text-[15px]">
						<OrgDeviceLimit :org="org" />
					</p>
					<p class="mt-1">
						{{ billing ? 'The plan sets the limit; a limit set here applies until the plan changes.' : 'New devices can’t pair once the limit is reached.' }}
					</p>
				</div>
				<AppButton
					variant="secondary"
					@click="emit('limit')"
				>
					<Gauge
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Set device limit
				</AppButton>
			</div>
		</AppCard>

		<AppCard
			v-if="billing"
			title="Transfer cap"
		>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<p class="min-w-0 text-[13px] text-app-text-3">
					Lifting the hard cap and extra transfer for this month are set with the plan and billing status, on the Billing tab.
				</p>
				<AppButton
					variant="secondary"
					:to="orgConsoleLink(org.id, 'billing')"
				>
					Open billing
				</AppButton>
			</div>
		</AppCard>

		<!-- Sign-in: whether the members must sign in with Google (servers that report require_oidc). -->
		<AppCard
			v-if="typeof org.require_oidc === 'boolean'"
			title="Sign-in"
		>
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<p
						id="op-require-oidc-label"
						class="text-sm font-medium text-app-text"
					>
						Require Google sign-in
					</p>
					<p
						id="op-require-oidc-help"
						class="mt-0.5 text-[13px] text-app-text-3"
					>
						<template v-if="systemOrg">
							Platform operators always sign in with Google only.
						</template>
						<template v-else-if="!oidcEnabled && !org.require_oidc">
							Google sign-in isn’t enabled on this server, so it can’t be required.
						</template>
						<template v-else-if="org.require_oidc">
							Members sign in with their Google account only; passwords don’t work here.
						</template>
						<template v-else>
							Members sign in with a password or Google, as each member’s sign-in setting allows.
						</template>
					</p>
				</div>
				<button
					type="button"
					role="switch"
					:aria-checked="org.require_oidc || systemOrg"
					aria-labelledby="op-require-oidc-label"
					aria-describedby="op-require-oidc-help"
					:disabled="systemOrg || savingSignIn || (!oidcEnabled && !org.require_oidc)"
					:class="[
						'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50',
						org.require_oidc || systemOrg ? 'bg-app-accent' : 'bg-app-border-strong',
					]"
					@click="toggleRequireOidc"
				>
					<span
						:class="['inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', org.require_oidc || systemOrg ? 'translate-x-[22px]' : 'translate-x-0.5']"
						aria-hidden="true"
					/>
				</button>
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
				Members of {{ org.name || org.id }} with only a password will no longer be able to sign in. Their password
				sessions end, and they must sign in with the Google account of their email address. API tokens keep working.
			</p>
		</Modal>

		<AppCard
			v-if="signup"
			title="Export"
		>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<p class="min-w-0 text-[13px] text-app-text-3">
					The organization’s configuration as JSON, without secrets.
				</p>
				<AppButton
					variant="secondary"
					:disabled="exporting"
					@click="exportOrg"
				>
					<Download
						class="h-4 w-4"
						aria-hidden="true"
					/>
					{{ exporting ? 'Exporting…' : 'Export' }}
				</AppButton>
			</div>
		</AppCard>

		<AppCard title="Status">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="min-w-0 text-[13px] text-app-text-3">
					<p class="mb-1">
						<OrgStatusPill :status="org.status" />
					</p>
					{{ org.status === 'suspended'
						? 'Suspended: its users can’t sign in, and its sessions and API tokens don’t work. Reactivating restores access.'
						: 'Suspending signs everyone out at once and stops its API tokens; devices stay paired.' }}
				</div>
				<AppButton
					v-if="org.status === 'suspended'"
					:disabled="!!deletion"
					@click="emit('status')"
				>
					<Play
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Reactivate
				</AppButton>
				<AppButton
					v-else
					variant="danger"
					class="border border-app-border-strong"
					@click="emit('status')"
				>
					<Pause
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Suspend
				</AppButton>
			</div>
		</AppCard>

		<AppCard
			v-if="signup"
			title="Deletion"
		>
			<p
				v-if="deletionError"
				class="text-[13px] text-app-danger"
			>
				Couldn’t load the deletion state: {{ deletionError }}
			</p>
			<div
				v-else-if="deletion"
				class="flex flex-wrap items-center justify-between gap-4"
			>
				<div class="min-w-0 text-[13px] text-app-text-2">
					<p class="font-medium text-app-danger">
						Deletion pending
					</p>
					<p class="mt-0.5 text-app-text-3">
						Requested {{ shortDate(deletion.requestedAt) }}{{ deletion.requestedBy ? ` by ${deletion.requestedBy}` : '' }}; deleted after
						{{ shortDate(deletion.deleteAfter) }}. Cancelling gives it back its previous status.
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<AppButton
						variant="secondary"
						:disabled="cancelling"
						@click="confirmCancel = true"
					>
						Cancel deletion
					</AppButton>
					<AppButton
						variant="danger"
						class="border border-app-border-strong"
						to="/operator/deletions"
					>
						Delete now…
					</AppButton>
				</div>
			</div>
			<p
				v-else
				class="text-[13px] text-app-text-3"
			>
				{{ deletion === undefined ? 'Loading…' : 'No deletion requested. Administrators delete their organization from its Organization settings; it is suspended at once and deleted when the hold ends. Pending deletions are listed under Deletions.' }}
			</p>
		</AppCard>
		<Modal
			v-model="confirmCancel"
			title="Cancel the deletion?"
			ok-text="Cancel deletion"
			cancel-text="Keep it"
			:show-cancel="true"
			@ok="cancelDeletion"
		>
			<p class="text-sm text-app-text-2">
				{{ org.name || org.id }} won’t be deleted and gets its previous status back.
			</p>
		</Modal>
	</div>
</template>

<script setup lang="ts">
import { Download, Gauge, Pause, Play } from 'lucide-vue-next';
import Modal from '~/components/Modal.vue';
import OrgDeviceLimit from '~/components/operator/OrgDeviceLimit.vue';
import OrgStatusPill from '~/components/operator/OrgStatusPill.vue';
import type { Organization } from '~/repository/modules/operator';
import { downloadJson } from '~/utils/download';
import { isSystemOrg } from '~/utils/oidc';
import { orgConsoleLink, shortDate } from '~/utils/operatorConsole';
import { exportFileName, type OrgDeletion } from '~/utils/signup';

const props = defineProps<{ org: Organization }>();
const emit = defineEmits<{
	(e: 'limit' | 'status'): void;
	(e: 'changed', org: Organization): void;
}>();

const { $api } = useNuxtApp();
const { billing, signup } = useCapabilities();
const snackbar = useSnackbar();
const statusStore = useStatusStore();

// ---- export ----
const exporting = ref(false);
const exportOrg = async () => {
	exporting.value = true;
	try {
		downloadJson(await $api.operator.exportOrg(props.org.id), exportFileName(props.org.id));
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't export it: ${apiErrorMessage(e)}` });
	}
	finally {
		exporting.value = false;
	}
};

// ---- sign-in (PUT …/sign-in { require_oidc } → the organization) ----
const oidcEnabled = computed(() => statusStore.status?.oidc_enabled !== false);
const systemOrg = computed(() => isSystemOrg(props.org.id));
const savingSignIn = ref(false);
const confirmRequireOidc = ref(false);
const saveRequireOidc = async (value: boolean) => {
	confirmRequireOidc.value = false;
	savingSignIn.value = true;
	try {
		const updated = await $api.operator.setSignIn(props.org.id, value);
		emit('changed', { ...props.org, ...updated, require_oidc: updated?.require_oidc ?? value });
		snackbar.add({ type: 'success', text: value ? 'Google sign-in is now required' : 'Passwords are allowed again' });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't change the sign-in setting: ${apiErrorMessage(e)}` });
	}
	finally {
		savingSignIn.value = false;
	}
};
const toggleRequireOidc = () => {
	if (savingSignIn.value || systemOrg.value) return;
	if (props.org.require_oidc) saveRequireOidc(false);
	else confirmRequireOidc.value = true;
};

// ---- deletion (servers with signup) ----
/** undefined: loading; null: none pending. */
const deletion = ref<OrgDeletion | null | undefined>(undefined);
const deletionError = ref<string | null>(null);
const confirmCancel = ref(false);
const cancelling = ref(false);
const loadDeletion = async () => {
	if (!signup.value) return;
	deletionError.value = null;
	try {
		const list = await $api.operator.deletions({ state: 'pending' });
		deletion.value = list.find(d => d.organizationId === props.org.id && d.state === 'pending') ?? null;
	}
	catch (e) {
		deletionError.value = apiErrorMessage(e);
	}
};
const cancelDeletion = async () => {
	confirmCancel.value = false;
	cancelling.value = true;
	try {
		await $api.operator.cancelDeletion(props.org.id);
		snackbar.add({ type: 'success', text: 'Deletion cancelled' });
		deletion.value = null;
		emit('changed', await $api.operator.get(props.org.id));
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't cancel the deletion: ${apiErrorMessage(e)}` });
	}
	finally {
		cancelling.value = false;
	}
};
watch(() => props.org.id, loadDeletion, { immediate: true });
</script>
