<template>
	<!-- One organization for platform operators: facts, actions and its usage for a month. -->
	<AppPage>
		<template #header>
			<div class="min-w-0">
				<NuxtLink
					to="/organizations"
					class="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-app-text-3 hover:text-app-text"
				>
					<ChevronLeft
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Organizations
				</NuxtLink>
				<div class="flex flex-wrap items-center gap-2.5">
					<h1 class="truncate text-2xl font-bold tracking-tight text-app-text sm:text-[28px] sm:leading-tight">
						{{ shown?.name || id }}
					</h1>
					<OrgStatusPill
						v-if="shown"
						:status="shown.status"
					/>
				</div>
				<p class="mt-1 font-mono text-[13px] text-app-text-3">
					{{ id }}
				</p>
			</div>
		</template>
		<template
			v-if="shown"
			#actions
		>
			<AppButton
				v-if="signup"
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
			<AppButton
				variant="secondary"
				@click="emit('limit', shown)"
			>
				<Gauge
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Device limit
			</AppButton>
			<AppButton
				v-if="shown.status !== 'suspended'"
				variant="secondary"
				@click="emit('admin', shown)"
			>
				<UserPlus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add administrator
			</AppButton>
			<AppButton
				v-if="shown.status === 'suspended'"
				@click="emit('status', shown)"
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
				@click="emit('status', shown)"
			>
				<Pause
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Suspend
			</AppButton>
		</template>

		<div
			v-if="loadError"
			role="alert"
			class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
		>
			{{ loadError }}
		</div>

		<div
			v-if="shown?.status === 'suspended'"
			class="flex items-start gap-2.5 rounded-xl border border-app-border bg-app-danger-bg p-4 text-sm text-app-danger"
		>
			<CirclePause
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<span>Suspended: its users can't sign in and its sessions and API tokens don't work.</span>
		</div>

		<AppCard
			v-if="shown"
			flush
		>
			<dl class="grid grid-cols-2 divide-app-border-subtle sm:grid-cols-4 sm:divide-x">
				<div class="px-5 py-4">
					<dt class="text-[13px] font-medium text-app-text-3">
						Devices / limit
					</dt>
					<dd class="mt-1.5 text-[15px]">
						<OrgDeviceLimit :org="shown" />
					</dd>
				</div>
				<div class="px-5 py-4">
					<dt class="text-[13px] font-medium text-app-text-3">
						Users
					</dt>
					<dd class="mt-1.5 text-[15px] font-medium text-app-text">
						{{ formatCount(shown.user_count) }}
					</dd>
				</div>
				<div class="px-5 py-4">
					<dt class="text-[13px] font-medium text-app-text-3">
						Created
					</dt>
					<dd class="mt-1.5 text-[15px] font-medium text-app-text">
						{{ formatDate(shown.created_at) }}
					</dd>
				</div>
				<div class="px-5 py-4">
					<dt class="text-[13px] font-medium text-app-text-3">
						Transfer this month
					</dt>
					<dd class="mt-1.5 text-[15px] font-medium text-app-text">
						{{ usage && monthTransfer !== undefined ? formatBytes(monthTransfer) : '–' }}
					</dd>
				</div>
			</dl>
		</AppCard>

		<!-- Sign-in: whether the members must sign in with Google (servers that report require_oidc). -->
		<AppCard
			v-if="shown && typeof shown.require_oidc === 'boolean'"
			title="Sign-in"
		>
			<div class="flex flex-col gap-3">
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
							<template v-else-if="!oidcEnabled && !shown.require_oidc">
								Google sign-in isn’t enabled on this server, so it can’t be required.
							</template>
							<template v-else-if="shown.require_oidc">
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
						:aria-checked="shown.require_oidc || systemOrg"
						aria-labelledby="op-require-oidc-label"
						aria-describedby="op-require-oidc-help"
						:disabled="systemOrg || savingSignIn || (!oidcEnabled && !shown.require_oidc)"
						:class="[
							'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50',
							shown.require_oidc || systemOrg ? 'bg-app-accent' : 'bg-app-border-strong',
						]"
						@click="toggleRequireOidc"
					>
						<span
							:class="['inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', shown.require_oidc || systemOrg ? 'translate-x-[22px]' : 'translate-x-0.5']"
							aria-hidden="true"
						/>
					</button>
				</div>
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
				Members of {{ shown?.name || id }} with only a password will no longer be able to sign in. Their password
				sessions end, and they must sign in with the Google account of their email address. API tokens keep working.
			</p>
		</Modal>

		<OrgBilling
			v-if="shown && billing"
			:id="id"
		/>

		<OrgMembers
			v-if="shown"
			:id="id"
		/>

		<template v-if="usage">
			<div class="flex flex-wrap items-center justify-between gap-3 pt-2">
				<h2 class="text-lg font-semibold text-app-text">
					Usage
				</h2>
				<UsageMonthPicker v-model="month" />
			</div>
			<UsageReportView
				:report="report"
				:month="month"
				:loading="usageLoading"
				:error="usageError"
			/>
		</template>
		<p
			v-else
			class="text-[13px] text-app-text-3"
		>
			Usage metering is off on this server.
		</p>
	</AppPage>
</template>

<script setup lang="ts">
import { ChevronLeft, CirclePause, Download, Gauge, Pause, Play, UserPlus } from 'lucide-vue-next';
import OrgDeviceLimit from '~/components/operator/OrgDeviceLimit.vue';
import OrgBilling from '~/components/operator/OrgBilling.vue';
import OrgMembers from '~/components/operator/OrgMembers.vue';
import OrgStatusPill from '~/components/operator/OrgStatusPill.vue';
import Modal from '~/components/Modal.vue';
import { isSystemOrg } from '~/utils/oidc';
import UsageMonthPicker from '~/components/usage/UsageMonthPicker.vue';
import UsageReportView from '~/components/usage/UsageReportView.vue';
import type { Organization } from '~/repository/modules/operator';
import { downloadJson } from '~/utils/download';
import { exportFileName } from '~/utils/signup';
import { currentMonth, formatBytes, formatCount, monthQuery, type UsageReport } from '~/utils/usage';

const props = defineProps<{
	id: string;
	/** The list's copy (kept current by the page's dialogs); fetched here when the list doesn't have it. */
	org: Organization | null;
	monthTransfer?: number;
}>();
const emit = defineEmits<{
	(e: 'changed' | 'limit' | 'admin' | 'status', org: Organization): void;
}>();

const { $api } = useNuxtApp();
const { usage, billing, signup } = useCapabilities();
const snackbar = useSnackbar();

// The organization's configuration without secrets, as a JSON download (servers with signup).
const exporting = ref(false);
const exportOrg = async () => {
	exporting.value = true;
	try {
		downloadJson(await $api.operator.exportOrg(props.id), exportFileName(props.id));
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't export it: ${apiErrorMessage(e)}` });
	}
	finally {
		exporting.value = false;
	}
};

// ---- Sign-in (PUT …/sign-in { require_oidc } → the organization) ----
const statusStore = useStatusStore();
const oidcEnabled = computed(() => statusStore.status?.oidc_enabled !== false);
const systemOrg = computed(() => isSystemOrg(props.id));
const savingSignIn = ref(false);
const confirmRequireOidc = ref(false);
const saveRequireOidc = async (value: boolean) => {
	confirmRequireOidc.value = false;
	savingSignIn.value = true;
	try {
		const updated = await $api.operator.setSignIn(props.id, value);
		const next = { ...(shown.value ?? {}), ...updated, require_oidc: updated?.require_oidc ?? value } as Organization;
		fetched.value = next;
		emit('changed', next);
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
	if (!shown.value || savingSignIn.value || systemOrg.value) return;
	if (shown.value.require_oidc) saveRequireOidc(false);
	else confirmRequireOidc.value = true;
};

const fetched = ref<Organization | null>(null);
const loadError = ref<string | null>(null);
const shown = computed(() => props.org ?? fetched.value);

useHead({ title: () => shown.value?.name || props.id });

const loadOrg = async () => {
	loadError.value = null;
	try {
		fetched.value = await $api.operator.get(props.id);
		emit('changed', fetched.value);
	}
	catch (e) {
		loadError.value = httpStatusOf(e) === 404 ? `There is no organization “${props.id}”.` : `Couldn't load the organization: ${apiErrorMessage(e)}`;
	}
};

const month = ref(currentMonth());
const report = ref<UsageReport | null>(null);
const usageLoading = ref(false);
const usageError = ref<string | null>(null);
let seq = 0;
const loadUsage = async () => {
	if (!usage.value) return;
	const mine = ++seq;
	usageLoading.value = true;
	usageError.value = null;
	try {
		const data = await $api.operator.orgUsage(props.id, { ...monthQuery(month.value), granularity: 'day' });
		if (mine === seq) report.value = data;
	}
	catch (e) {
		if (mine !== seq) return;
		report.value = null;
		usageError.value = `Couldn't load the usage: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === seq) usageLoading.value = false;
	}
};

watch(() => props.id, () => {
	fetched.value = null;
	report.value = null;
	month.value = currentMonth();
	loadOrg();
	loadUsage();
}, { immediate: true });
watch(month, loadUsage);

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const formatDate = (value: string) => {
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
};
</script>
