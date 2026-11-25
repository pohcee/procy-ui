<template>
	<new-page-wrapper>
		<AppPage
			title="Platform billing"
			description="Every organization's billing status and payment state, held periods to approve, and what was reported to the payment provider."
		>
			<template
				v-if="available"
				#actions
			>
				<AppButton
					variant="secondary"
					:disabled="loading"
					aria-label="Reload billing"
					@click="load"
				>
					<RefreshCw
						:class="['h-4 w-4', loading ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
			</template>

			<AppCard
				v-if="!available"
				flush
			>
				<OpEmpty
					:icon="CreditCard"
					:loading="!statusReady"
					:title="statusReady ? 'Platform billing is not available' : 'Loading…'"
					:description="statusReady ? 'Billing is off on this server, or your account is not a platform operator.' : undefined"
				/>
			</AppCard>

			<template v-else>
				<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
					<UsageTile
						v-for="t in tiles"
						:key="t.label"
						:label="t.label"
						:value="t.value"
						:detail="t.detail"
						:loading="loading && !accounts"
					/>
				</div>

				<!-- Typed confirmation of an account action, in the page -->
				<section
					v-if="pending"
					ref="confirmPanel"
					:aria-label="pending.kind === 'suspend' ? 'Confirm suspension' : 'Restore access'"
					:class="['flex flex-col gap-3 rounded-xl border p-5', pending.kind === 'suspend' ? 'border-app-danger/40 bg-app-danger-bg' : 'border-app-border bg-app-surface']"
				>
					<h2 class="text-[15px] font-semibold text-app-text">
						{{ pending.kind === 'suspend' ? `Suspend ${orgName(pending.id)}?` : `Restore ${orgName(pending.id)} without a payment?` }}
					</h2>
					<p class="text-sm text-app-text-2">
						<template v-if="pending.kind === 'suspend'">
							Its payment has been overdue for the whole read-only period. Suspending it signs its users out and stops its devices at their next connection. Nothing is deleted; reactivate it from Organizations. Audited.
						</template>
						<template v-else>
							Ends the overdue episode now: the organization gets full access back although the invoice is unpaid. The next failed payment starts a new one. Audited.
						</template>
					</p>
					<form
						class="flex flex-wrap items-end gap-3"
						@submit.prevent="confirmPending"
					>
						<OpField
							label="Type the organization ID to confirm"
							for-id="billing-confirm"
							class="w-full max-w-[320px]"
						>
							<OpInput
								id="billing-confirm"
								v-model="typed"
								mono
								:placeholder="pending.id"
								autocapitalize="none"
								spellcheck="false"
							/>
						</OpField>
						<AppButton
							type="submit"
							:class="pending.kind === 'suspend' ? '!bg-app-danger hover:!bg-app-danger/90' : ''"
							:disabled="acting || typed.trim() !== pending.id"
						>
							{{ acting ? 'Working…' : pending.kind === 'suspend' ? 'Confirm suspension' : 'Restore access' }}
						</AppButton>
						<AppButton
							variant="secondary"
							@click="pending = null"
						>
							Cancel
						</AppButton>
					</form>
					<p
						v-if="actError"
						role="alert"
						class="rounded-[10px] bg-app-surface p-3 text-sm text-app-danger"
					>
						{{ actError }}
					</p>
				</section>

				<!-- Accounts -->
				<AppCard
					flush
					:title="`Accounts${rows.length ? ` · ${rows.length}` : ''}`"
					description="Payment trouble first: suspension proposed, read-only, grace period."
				>
					<template #actions>
						<OpSegmented
							v-model="filter"
							label="Show accounts"
							size="sm"
							:options="filterOptions"
						/>
					</template>
					<div
						v-if="error"
						role="alert"
						class="m-4 rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
					>
						{{ error }}
					</div>
					<OpEmpty
						v-if="!accounts && !error"
						loading
						title="Loading accounts…"
					/>
					<OpEmpty
						v-else-if="accounts && !shownRows.length"
						:icon="CreditCard"
						:title="filter === 'all' ? 'No organizations' : 'Nothing needs attention'"
					/>
					<template v-else-if="shownRows.length">
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full min-w-[900px] border-collapse">
								<thead>
									<tr class="bg-app-surface-2">
										<th
											v-for="col in accountColumns"
											:key="col.label"
											scope="col"
											:class="['whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4 last:pr-4', col.right ? 'text-right' : 'text-left']"
										>
											{{ col.label }}
										</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="r in shownRows"
										:key="r.account.organization"
										class="hover:bg-app-hover [&:last-child>td]:border-b-0"
									>
										<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]">
											<NuxtLink
												:to="orgLink(r.account.organization)"
												class="block max-w-[220px] truncate font-medium text-app-text hover:text-app-link hover:underline"
											>
												{{ orgName(r.account.organization) }}
											</NuxtLink>
											<span class="font-mono text-xs text-app-text-3">{{ r.account.organization }}</span>
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
											{{ r.account.plan_details?.name || r.account.plan }}
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px]">
											<BillingPill v-bind="r.pill" />
											<span
												v-if="r.note"
												class="mt-1 block text-xs text-app-text-3"
											>{{ r.note }}</span>
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px]">
											<div class="flex items-center justify-end gap-2.5">
												<span
													v-if="r.meter.ratio !== null"
													class="hidden h-1.5 w-16 overflow-hidden rounded-full bg-app-muted lg:block"
													aria-hidden="true"
												>
													<span
														:class="['block h-full rounded-full', { ok: 'bg-app-accent', warn: 'bg-app-warn', danger: 'bg-app-danger' }[r.meter.tone]]"
														:style="{ width: `${r.meter.fill}%` }"
													/>
												</span>
												<span class="whitespace-nowrap text-app-text-2">{{ formatBytes(r.account.policy?.used_bytes) }}<template v-if="r.meter.percentLabel"> · {{ r.meter.percentLabel }}</template></span>
											</div>
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
											{{ r.provider?.subscription_status || (r.account.has_payment_method ? 'card on file' : '—') }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-3 pr-4 text-right">
											<div class="flex justify-end gap-1.5">
												<AppButton
													v-if="r.pill.kind === 'suspension_proposed'"
													size="sm"
													variant="danger"
													class="border border-app-border-strong"
													@click="ask('suspend', r.account.organization)"
												>
													Confirm suspension
												</AppButton>
												<AppButton
													v-if="['grace', 'read_only', 'suspension_proposed'].includes(r.pill.kind)"
													size="sm"
													variant="secondary"
													@click="ask('restore', r.account.organization)"
												>
													Restore
												</AppButton>
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<ul class="divide-y divide-app-border-subtle md:hidden">
							<li
								v-for="r in shownRows"
								:key="r.account.organization"
								class="flex flex-col gap-2 px-4 py-3"
							>
								<div class="flex items-center justify-between gap-3">
									<NuxtLink
										:to="orgLink(r.account.organization)"
										class="min-w-0 truncate text-[15px] font-medium text-app-text"
									>
										{{ orgName(r.account.organization) }}
									</NuxtLink>
									<BillingPill v-bind="r.pill" />
								</div>
								<p class="text-xs text-app-text-3">
									{{ r.account.plan_details?.name || r.account.plan }} · {{ formatBytes(r.account.policy?.used_bytes) }}<template v-if="r.meter.percentLabel">
										({{ r.meter.percentLabel }})
									</template><template v-if="r.note">
										· {{ r.note }}
									</template>
								</p>
								<div
									v-if="['grace', 'read_only', 'suspension_proposed'].includes(r.pill.kind)"
									class="flex gap-2"
								>
									<AppButton
										v-if="r.pill.kind === 'suspension_proposed'"
										size="sm"
										variant="danger"
										class="border border-app-border-strong"
										@click="ask('suspend', r.account.organization)"
									>
										Confirm suspension
									</AppButton>
									<AppButton
										size="sm"
										variant="secondary"
										@click="ask('restore', r.account.organization)"
									>
										Restore
									</AppButton>
								</div>
							</li>
						</ul>
					</template>
				</AppCard>

				<!-- Held periods -->
				<BillingPeriodsTable
					:periods="held ?? []"
					:loading="held === null && !heldError"
					:error="heldError"
					title="Held periods"
					description="Months with overage above the review amount wait for an approval before they are charged."
					empty-title="No held periods"
					empty-text="Nothing waits for an approval."
					show-org
					:org-names="names"
					approvable
					:approving="approving"
					@approve="approve"
				/>

				<!-- Provider: reports and stats -->
				<AppCard
					v-if="hasProvider === false"
					title="Payment provider"
				>
					<p class="text-sm text-app-text-3">
						No payment provider on this server (<span class="font-mono">[billing] provider = "none"</span>): plans, statuses and periods work without one, nothing is charged.
					</p>
				</AppCard>
				<template v-else>
					<AppCard
						flush
						title="Usage reported to the provider"
						description="One row per organization, metric and closed month; a mismatch differs from the provider's meter summary and is never corrected automatically."
					>
						<template #actions>
							<UsageMonthPicker v-model="reportMonth" />
						</template>
						<OpEmpty
							v-if="reports === null || reportsError || !reports.length"
							:icon="FileCheck"
							:loading="reports === null && !reportsError"
							:title="reportsError ? 'Couldn’t load the reports' : reports === null ? 'Loading reports…' : 'Nothing reported for this month'"
							:description="reportsError || (reports?.length === 0 ? 'A month is reported within 15 minutes of its close; quantities of 0 are not sent.' : undefined)"
						/>
						<div
							v-else
							class="overflow-x-auto"
						>
							<table class="w-full min-w-[760px] border-collapse">
								<thead>
									<tr class="bg-app-surface-2">
										<th
											v-for="col in reportColumns"
											:key="col.label"
											scope="col"
											:class="['whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4 last:pr-4', col.right ? 'text-right' : 'text-left']"
										>
											{{ col.label }}
										</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="r in reports"
										:key="r.identifier || `${r.organization}-${r.metric}-${r.period_start}`"
										:class="['hover:bg-app-hover [&:last-child>td]:border-b-0', r.state === 'mismatch' || r.state === 'failed' ? 'bg-app-danger-bg/40' : '']"
									>
										<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px] font-medium text-app-text">
											{{ orgName(r.organization) }}
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
											{{ metricLabel(r.metric) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] font-semibold text-app-text">
											{{ formatCount(r.quantity) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ r.provider_value === null || r.provider_value === undefined ? '—' : formatCount(r.provider_value) }}
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px]">
											<BillingPill v-bind="reportStateInfo(r.state)" />
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ formatCount(r.attempts) }}
										</td>
										<td class="max-w-[260px] truncate border-b border-app-border-subtle py-3 pl-3 pr-4 text-xs text-app-text-3">
											<span :title="r.last_error">{{ r.last_error || (r.confirmed_at ? `confirmed ${formatDay(r.confirmed_at)}` : r.sent_at ? `sent ${formatDay(r.sent_at)}` : '') }}</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</AppCard>

					<AppCard
						title="Reconciliation and webhooks"
						description="This node's counters since it started."
					>
						<p
							v-if="statsError"
							class="text-sm text-app-danger"
						>
							{{ statsError }}
						</p>
						<p
							v-else-if="stats && !statRows.length"
							class="text-sm text-app-text-3"
						>
							No counters yet.
						</p>
						<dl
							v-else
							class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5"
						>
							<div
								v-for="s in statRows"
								:key="s.key"
							>
								<dt class="text-[13px] text-app-text-3">
									{{ s.label }}
								</dt>
								<dd :class="['mt-1 text-[22px] font-bold tracking-tight', s.bad && s.value > 0 ? 'text-app-danger' : 'text-app-text']">
									{{ formatCount(s.value) }}
								</dd>
							</div>
						</dl>
					</AppCard>
				</template>
			</template>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { CreditCard, FileCheck, RefreshCw } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import BillingPeriodsTable from '~/components/billing/BillingPeriodsTable.vue';
import BillingPill from '~/components/billing/BillingPill.vue';
import UsageMonthPicker from '~/components/usage/UsageMonthPicker.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import {
	accountPill, formatCents, formatDay, metricLabel, periodMonth, reportStateInfo, statLabel, transferMeter,
	type BillingAccount, type BillingPeriod, type BillingProviderAccount, type BillingUsageReport, type Pill,
} from '~/utils/billing';
import { currentMonth, formatBytes, formatCount, orgLink, shiftMonth } from '~/utils/usage';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Platform billing' });

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const statusStore = useStatusStore();
const { operator, billing } = useCapabilities();
const statusReady = computed(() => !!statusStore.status?.version);
const available = computed(() => operator.value && billing.value);

const accounts = ref<BillingAccount[] | null>(null);
const providers = ref<BillingProviderAccount[]>([]);
/** null: unknown; false: no payment provider (404). */
const hasProvider = ref<boolean | null>(null);
const names = ref<Record<string, string>>({});
const held = ref<BillingPeriod[] | null>(null);
const heldError = ref<string | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const stats = ref<Record<string, number> | null>(null);
const statsError = ref<string | null>(null);

const orgName = (id: string) => names.value[id] || id;

const load = async () => {
	if (!available.value || loading.value) return;
	loading.value = true;
	error.value = null;
	try {
		const [a, p, h, o, s] = await Promise.allSettled([
			$api.billing.operatorAccounts(),
			$api.billing.providerAccounts(),
			$api.billing.operatorPeriods('held'),
			$api.operator.list(),
			$api.billing.providerStats(),
		]);
		if (a.status === 'fulfilled') accounts.value = a.value;
		else error.value = `Couldn't load the accounts: ${apiErrorMessage(a.reason)}`;
		if (p.status === 'fulfilled') {
			providers.value = p.value;
			hasProvider.value = true;
		}
		else {
			providers.value = [];
			hasProvider.value = httpStatusOf(p.reason) === 404 ? false : null;
		}
		if (h.status === 'fulfilled') {
			held.value = h.value;
			heldError.value = null;
		}
		else heldError.value = apiErrorMessage(h.reason);
		if (o.status === 'fulfilled') names.value = Object.fromEntries(o.value.map(x => [x.id, x.name]));
		if (s.status === 'fulfilled') {
			stats.value = s.value;
			statsError.value = null;
		}
		else if (httpStatusOf(s.reason) !== 404) statsError.value = apiErrorMessage(s.reason);
		if (hasProvider.value) await loadReports();
	}
	finally {
		loading.value = false;
	}
};
watch(available, ok => ok && load(), { immediate: true });

// Reports default to the last closed month.
const reportMonth = ref(shiftMonth(currentMonth(), -1));
const reports = ref<BillingUsageReport[] | null>(null);
const reportsError = ref<string | null>(null);
let reportSeq = 0;
const loadReports = async () => {
	const mine = ++reportSeq;
	reports.value = null;
	reportsError.value = null;
	try {
		const list = await $api.billing.providerReports(reportMonth.value);
		if (mine === reportSeq) reports.value = list;
	}
	catch (e) {
		if (mine === reportSeq) reportsError.value = apiErrorMessage(e);
	}
};
watch(reportMonth, () => hasProvider.value && loadReports());

const severity: Record<Pill['kind'], number> = { suspension_proposed: 0, read_only: 1, grace: 2, trial: 3, comped: 4, paying: 5, free: 6, exempt: 7, unknown: 8 };
const rows = computed(() => {
	const byOrg = new Map(providers.value.map(p => [p.organization, p]));
	return (accounts.value ?? []).map((account) => {
		const provider = byOrg.get(account.organization) ?? null;
		const pill = accountPill(account, provider);
		let note = '';
		if (pill.kind === 'suspension_proposed') note = `proposed ${formatDay(provider?.suspension_proposed_at)}`;
		else if (pill.kind === 'read_only') note = `since ${formatDay(provider?.read_only_at)}`;
		else if (pill.kind === 'grace') note = `payment failed ${formatDay(provider?.failed_at)}`;
		else if (pill.kind === 'trial') note = `ends ${formatDay(account.trial_ends_at)}`;
		else if (pill.kind === 'comped') note = `until ${formatDay(account.comped_until)}`;
		return { account, provider, pill, note, meter: transferMeter(account.policy, account.transfer_state) };
	}).sort((a, b) => severity[a.pill.kind] - severity[b.pill.kind] || orgName(a.account.organization).localeCompare(orgName(b.account.organization)));
});
const filter = ref<'attention' | 'all'>('all');
const attention = (k: Pill['kind']) => ['suspension_proposed', 'read_only', 'grace'].includes(k);
const shownRows = computed(() => (filter.value === 'all' ? rows.value : rows.value.filter(r => attention(r.pill.kind) || r.meter.tone === 'danger')));
const filterOptions = computed(() => [
	{ value: 'all' as const, label: 'All' },
	{ value: 'attention' as const, label: 'Needs attention', count: rows.value.filter(r => attention(r.pill.kind) || r.meter.tone === 'danger').length },
]);

const tiles = computed(() => {
	const count = (k: Pill['kind']) => rows.value.filter(r => r.pill.kind === k).length;
	const heldTotal = (held.value ?? []).reduce((s, p) => s + (p.total_cents ?? 0), 0);
	return [
		{ label: 'Paying', value: formatCount(count('paying')), detail: `${formatCount(count('free'))} free · ${formatCount(count('exempt'))} exempt` },
		{ label: 'Trial', value: formatCount(count('trial')), detail: `${formatCount(count('comped'))} comped` },
		{ label: 'Grace period', value: formatCount(count('grace')), detail: 'Payment failed, full service' },
		{ label: 'Read-only', value: formatCount(count('read_only') + count('suspension_proposed')), detail: `${formatCount(count('suspension_proposed'))} suspension proposed` },
		{ label: 'Held periods', value: formatCount(held.value?.length ?? 0), detail: heldTotal ? `${formatCents(heldTotal)} to approve` : 'Nothing to approve' },
	];
});

const statRows = computed(() => Object.entries(stats.value ?? {}).map(([key, value]) => ({ key, value, ...statLabel(key) })));

// Restore / confirm suspension, confirmed by typing the organization ID.
const pending = ref<{ kind: 'restore' | 'suspend'; id: string } | null>(null);
const typed = ref('');
const acting = ref(false);
const actError = ref<string | null>(null);
const confirmPanel = ref<HTMLElement | null>(null);
const ask = async (kind: 'restore' | 'suspend', id: string) => {
	pending.value = { kind, id };
	typed.value = '';
	actError.value = null;
	await nextTick();
	confirmPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	(confirmPanel.value?.querySelector('input') as HTMLInputElement | null)?.focus();
};
const confirmPending = async () => {
	const p = pending.value;
	if (!p || acting.value || typed.value.trim() !== p.id) return;
	acting.value = true;
	actError.value = null;
	try {
		if (p.kind === 'suspend') {
			await $api.billing.confirmSuspension(p.id);
			snackbar.add({ type: 'success', text: `${orgName(p.id)} is suspended` });
		}
		else {
			await $api.billing.restore(p.id);
			snackbar.add({ type: 'success', text: `${orgName(p.id)} has full access again` });
		}
		pending.value = null;
		await load();
	}
	catch (e) {
		actError.value = httpStatusOf(e) === 409 ? 'Suspension is no longer proposed for this organization (it may have paid). Reload to see its state.' : apiErrorMessage(e);
	}
	finally {
		acting.value = false;
	}
};

const approving = ref<string | null>(null);
const approve = async (p: BillingPeriod) => {
	const month = periodMonth(p.start);
	const org = p.organization ?? '';
	approving.value = `${org}/${month}`;
	try {
		await $api.billing.approvePeriod(org, month);
		held.value = (held.value ?? []).filter(x => !(x.organization === org && x.start === p.start));
		snackbar.add({ type: 'success', text: `Approved ${orgName(org)} ${month} (${formatCents(p.total_cents)})` });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't approve it: ${apiErrorMessage(e)}` });
	}
	finally {
		approving.value = null;
	}
};

const accountColumns = [
	{ label: 'Organization' },
	{ label: 'Plan' },
	{ label: 'Status' },
	{ label: 'Transfer this month', right: true },
	{ label: 'Subscription' },
	{ label: '', right: true },
];
const reportColumns = [
	{ label: 'Organization' },
	{ label: 'Metric' },
	{ label: 'Quantity', right: true },
	{ label: 'Provider', right: true },
	{ label: 'State' },
	{ label: 'Attempts', right: true },
	{ label: 'Detail' },
];
</script>
