<template>
	<!-- One organization's billing for platform operators: plan, status, this month's transfer, overrides, periods. -->
	<AppCard
		title="Billing"
		:description="account?.updated_by ? `Last changed ${formatDay(account.updated_at)} by ${account.updated_by}` : undefined"
	>
		<template
			v-if="account"
			#actions
		>
			<AppButton
				variant="secondary"
				size="sm"
				@click="open('plan')"
			>
				Set plan
			</AppButton>
			<AppButton
				variant="secondary"
				size="sm"
				@click="open('status')"
			>
				Set status
			</AppButton>
			<AppButton
				variant="secondary"
				size="sm"
				@click="open('override')"
			>
				Override limits
			</AppButton>
		</template>

		<OpEmpty
			v-if="!account"
			:icon="CreditCard"
			:loading="!error"
			:title="error ? 'Couldn’t load the billing' : 'Loading billing…'"
			:description="error || undefined"
		/>
		<div
			v-else
			class="flex flex-col gap-5"
		>
			<div
				v-if="account.policy?.fail_open"
				role="alert"
				class="flex flex-wrap items-start gap-2.5 rounded-[10px] bg-app-warn-bg p-3 text-[13px] text-app-warn"
			>
				<AlertTriangle
					class="mt-px h-4 w-4 shrink-0"
					aria-hidden="true"
				/>
				<span class="min-w-0 flex-1">The hard cap was not applied this month (failed open): {{ account.policy.fail_open }}.</span>
				<AppButton
					size="sm"
					variant="secondary"
					:disabled="saving"
					@click="clearFailOpen"
				>
					Checked: let the cap apply
				</AppButton>
			</div>
			<dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-4">
				<div>
					<dt class="text-app-text-3">
						Plan
					</dt>
					<dd class="mt-1 text-[15px] font-medium text-app-text">
						{{ account.plan_details?.name || account.plan }}
						<span class="font-mono text-xs text-app-text-3">{{ account.plan }}</span>
					</dd>
					<dd
						v-if="account.plan_unassigned"
						class="text-xs text-app-text-3"
					>
						not chosen yet (no limits)
					</dd>
				</div>
				<div>
					<dt class="text-app-text-3">
						Status
					</dt>
					<dd class="mt-1 flex flex-wrap items-center gap-2">
						<BillingPill v-bind="accountPill(account, provider)" />
					</dd>
					<dd class="mt-0.5 text-xs text-app-text-3">
						{{ summary.detail }}
					</dd>
				</div>
				<div>
					<dt class="text-app-text-3">
						Spending limit
					</dt>
					<dd class="mt-1 text-[15px] font-medium text-app-text">
						{{ account.plan_details?.overage === 'bill' ? spendingLimitLabel(account.spending_limit_cents) : 'Not applicable' }}
					</dd>
				</div>
				<div>
					<dt class="text-app-text-3">
						Payment method
					</dt>
					<dd class="mt-1 text-[15px] font-medium text-app-text">
						{{ account.has_payment_method ? 'On file' : 'None' }}
					</dd>
				</div>
			</dl>
			<BillingMeter
				label="Transfer this month"
				:meter="meter"
				:value="formatBytes(account.policy?.used_bytes)"
				:of="account.policy?.allowance_bytes ? formatBytes(account.policy.allowance_bytes) : 'no limit'"
				:detail="`State: ${account.transfer_state || 'normal'}${account.policy?.overage_cents ? ` · overage so far ${formatCents(account.policy.overage_cents)}` : ''}`"
			/>
			<div
				v-if="account.cap_lifted_until || account.extra_transfer_bytes"
				class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] bg-app-muted px-3 py-2.5 text-[13px] text-app-text-2"
			>
				<span v-if="account.cap_lifted_until">Cap lifted until <strong class="text-app-text">{{ formatDay(account.cap_lifted_until) }}</strong></span>
				<span v-if="account.extra_transfer_bytes">Extra transfer this month: <strong class="text-app-text">{{ formatBytes(account.extra_transfer_bytes) }}</strong></span>
			</div>
		</div>
	</AppCard>

	<BillingPeriodsTable
		v-if="account"
		:periods="periods ?? []"
		:loading="periods === null && !periodsError"
		:error="periodsError"
		approvable
		:approving="approving"
		description="Held periods (overage above the review amount) wait for an approval before they are charged."
		@approve="approve"
	/>

	<OpDialog
		:model-value="dialog !== null"
		:title="dialog === 'plan' ? 'Set plan' : dialog === 'status' ? 'Set billing status' : 'Override this month’s limits'"
		:description="dialog === 'plan' ? 'The device limit follows the plan. Written to the audit logs of _system and of the organization.' : 'Written to the audit logs of _system and of the organization.'"
		size="sm"
		as-form
		@update:model-value="!$event && (dialog = null)"
		@submit="submit"
	>
		<div class="flex flex-col gap-4">
			<template v-if="dialog === 'plan'">
				<OpField
					label="Plan ID"
					for-id="ob-plan"
					:error="planIdError(planText) && planText ? planIdError(planText) : null"
					:help="knownPlans.length ? `Plans in use: ${knownPlans.join(', ')}` : 'A plan ID of the plans file.'"
				>
					<OpInput
						id="ob-plan"
						v-model="planText"
						mono
						list="ob-plans"
						autocapitalize="none"
						spellcheck="false"
					/>
					<datalist id="ob-plans">
						<option
							v-for="p in knownPlans"
							:key="p"
							:value="p"
						/>
					</datalist>
				</OpField>
			</template>

			<template v-else-if="dialog === 'status'">
				<OpField label="Status">
					<OpSegmented
						v-model="form.status"
						label="Billing status"
						block
						size="sm"
						:options="[{ value: 'paying', label: 'Paying' }, { value: 'trial', label: 'Trial' }, { value: 'comped', label: 'Comped' }, { value: 'exempt', label: 'Exempt' }]"
					/>
				</OpField>
				<p class="-mt-2 text-xs text-app-text-3">
					{{ statusHelp[form.status] }}
				</p>
				<OpField
					v-if="form.status === 'trial'"
					label="Trial ends"
					for-id="ob-trial"
				>
					<OpInput
						id="ob-trial"
						v-model="form.trialEndsAt"
						type="date"
						:min="tomorrow"
					/>
				</OpField>
				<OpField
					v-if="form.status === 'comped'"
					label="Comped until"
					hint="(the last day not charged, UTC)"
					for-id="ob-comped"
				>
					<OpInput
						id="ob-comped"
						v-model="form.compedUntil"
						type="date"
						:min="today"
					/>
				</OpField>
				<OpField
					v-if="form.status === 'exempt'"
					label="Limits"
				>
					<OpSegmented
						v-model="form.exemptLimits"
						label="Limits of an exempt organization"
						block
						size="sm"
						:options="[{ value: 'plan', label: 'Plan limits apply' }, { value: 'none', label: 'No limits' }]"
					/>
				</OpField>
				<OpField
					label="Reason"
					:hint="form.status === 'exempt' ? '(required)' : '(optional)'"
					for-id="ob-reason"
				>
					<OpInput
						id="ob-reason"
						v-model="form.reason"
						maxlength="500"
						placeholder="For example: launch customer"
					/>
				</OpField>
			</template>

			<template v-else-if="dialog === 'override'">
				<OpField
					label="Lift the hard cap until"
					hint="(UTC)"
					for-id="ob-lift"
					:help="account?.cap_lifted_until ? `Lifted until ${formatDay(account.cap_lifted_until)} now.` : 'Leave empty to keep it as it is.'"
				>
					<OpInput
						id="ob-lift"
						v-model="override.liftUntil"
						type="date"
						:min="tomorrow"
					/>
				</OpField>
				<OpCheckbox
					v-if="account?.cap_lifted_until"
					v-model="override.endLift"
				>
					End the cap lift now
				</OpCheckbox>
				<OpField
					label="Extra transfer this month"
					for-id="ob-extra"
					:error="override.extra.trim() ? extraTransferError(override.extra) : null"
					:help="`For example 50GiB; 0 removes it.${account?.extra_transfer_bytes ? ` Now ${formatBytes(account.extra_transfer_bytes)}.` : ''}`"
				>
					<OpInput
						id="ob-extra"
						v-model="override.extra"
						mono
						placeholder="50GiB"
					/>
				</OpField>
			</template>

			<p
				v-if="formError"
				role="alert"
				class="rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
			>
				{{ formError }}
			</p>
		</div>
		<template #footer>
			<AppButton
				variant="secondary"
				@click="dialog = null"
			>
				Cancel
			</AppButton>
			<div class="flex-1" />
			<AppButton
				type="submit"
				:disabled="saving || !canSubmit"
			>
				{{ saving ? 'Saving…' : 'Save' }}
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import { AlertTriangle, CreditCard } from 'lucide-vue-next';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import BillingMeter from '~/components/billing/BillingMeter.vue';
import BillingPeriodsTable from '~/components/billing/BillingPeriodsTable.vue';
import BillingPill from '~/components/billing/BillingPill.vue';
import {
	accountPill, billingStatusSummary, extraTransferError, formatCents, formatDay, isoDay, periodMonth, planIdError,
	spendingLimitLabel, statusChangeBody, transferMeter,
	type BillingAccount, type BillingPeriod, type BillingProviderAccount, type BillingStatus, type StatusForm,
} from '~/utils/billing';
import { formatBytes } from '~/utils/usage';

const props = defineProps<{ id: string }>();

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const account = ref<BillingAccount | null>(null);
const provider = ref<BillingProviderAccount | null>(null);
const error = ref<string | null>(null);
const periods = ref<BillingPeriod[] | null>(null);
const periodsError = ref<string | null>(null);
const knownPlans = ref<string[]>([]);

let seq = 0;
const load = async () => {
	const mine = ++seq;
	error.value = null;
	periodsError.value = null;
	const [a, p, prov, all] = await Promise.allSettled([
		$api.billing.orgAccount(props.id),
		$api.billing.orgPeriods(props.id),
		$api.billing.providerAccounts(),
		$api.billing.operatorAccounts(),
	]);
	if (mine !== seq) return;
	if (a.status === 'fulfilled') account.value = a.value;
	else error.value = apiErrorMessage(a.reason);
	if (p.status === 'fulfilled') periods.value = p.value;
	else periodsError.value = apiErrorMessage(p.reason);
	provider.value = prov.status === 'fulfilled' ? prov.value.find(x => x.organization === props.id) ?? null : null;
	if (all.status === 'fulfilled') knownPlans.value = [...new Set(all.value.map(x => x.plan).filter(Boolean))].sort();
};
watch(() => props.id, () => {
	account.value = null;
	periods.value = null;
	load();
}, { immediate: true });

const summary = computed(() => billingStatusSummary(account.value));
const meter = computed(() => transferMeter(account.value?.policy, account.value?.transfer_state));

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const statusHelp: Record<BillingStatus, string> = {
	paying: 'Charged at the plan’s prices. Ends a trial or comped period at once.',
	trial: 'Not charged until the trial ends; then paying on the plan with a payment method, else the free plan.',
	comped: 'Not charged through the last day; then as a trial that ends.',
	exempt: 'Metered but never charged and never sent to the payment provider.',
};

const dialog = ref<'plan' | 'status' | 'override' | null>(null);
const planText = ref('');
const form = reactive<Required<StatusForm>>({ status: 'paying', trialEndsAt: '', compedUntil: '', reason: '', exemptLimits: 'plan' });
const override = reactive({ liftUntil: '', endLift: false, extra: '' });
const formError = ref<string | null>(null);
const saving = ref(false);

const open = (what: 'plan' | 'status' | 'override') => {
	const a = account.value;
	formError.value = null;
	if (what === 'plan') planText.value = a?.plan ?? '';
	if (what === 'status') {
		Object.assign(form, {
			status: (['paying', 'trial', 'comped', 'exempt'].includes(a?.status ?? '') ? a?.status : 'paying') as BillingStatus,
			trialEndsAt: isoDay(a?.trial_ends_at),
			compedUntil: isoDay(a?.comped_until),
			reason: a?.reason ?? '',
			exemptLimits: a?.exempt_limits === 'none' ? 'none' : 'plan',
		});
	}
	if (what === 'override') Object.assign(override, { liftUntil: '', endLift: false, extra: '' });
	dialog.value = what;
};

const canSubmit = computed(() => {
	if (dialog.value === 'plan') return !planIdError(planText.value) && planText.value.trim() !== account.value?.plan;
	if (dialog.value === 'status') return !statusChangeBody(form).error;
	if (dialog.value === 'override') {
		const extra = override.extra.trim();
		return (!!override.liftUntil || override.endLift || !!extra) && !(extra && extraTransferError(extra));
	}
	return false;
});

const submit = async () => {
	if (!canSubmit.value || saving.value) return;
	saving.value = true;
	formError.value = null;
	try {
		if (dialog.value === 'plan') {
			account.value = await $api.billing.setPlan(props.id, planText.value.trim());
		}
		else if (dialog.value === 'status') {
			const { body, error: e } = statusChangeBody(form);
			if (!body) throw new Error(e ?? 'invalid');
			account.value = await $api.billing.setStatus(props.id, body);
		}
		else if (dialog.value === 'override') {
			const extra = override.extra.trim();
			account.value = await $api.billing.setOverride(props.id, {
				...(override.endLift ? { end_cap_lift: true } : override.liftUntil ? { cap_lifted_until: `${override.liftUntil}T00:00:00Z` } : {}),
				...(extra ? { extra_transfer: extra.replace(/\s+/g, '') } : {}),
			});
		}
		snackbar.add({ type: 'success', text: 'Billing updated' });
		dialog.value = null;
	}
	catch (e) {
		formError.value = apiErrorMessage(e);
	}
	finally {
		saving.value = false;
	}
};

const clearFailOpen = async () => {
	saving.value = true;
	try {
		account.value = await $api.billing.setOverride(props.id, { clear_fail_open: true });
		snackbar.add({ type: 'success', text: 'The hard cap applies again' });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't change it: ${apiErrorMessage(e)}` });
	}
	finally {
		saving.value = false;
	}
};

const approving = ref<string | null>(null);
const approve = async (p: BillingPeriod) => {
	const month = periodMonth(p.start);
	approving.value = `${p.organization}/${month}`;
	try {
		const updated = await $api.billing.approvePeriod(props.id, month);
		periods.value = (periods.value ?? []).map(x => (x.start === p.start ? { ...x, ...updated } : x));
		snackbar.add({ type: 'success', text: `Approved ${month} (${formatCents(p.total_cents)})` });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't approve it: ${apiErrorMessage(e)}` });
	}
	finally {
		approving.value = null;
	}
};
</script>
