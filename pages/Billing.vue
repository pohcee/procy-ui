<template>
	<new-page-wrapper>
		<AppPage
			title="Billing"
			description="Your organization's plan, this month's use against the allowance, payments and invoices."
		>
			<template
				v-if="available"
				#actions
			>
				<AppButton
					v-if="canPay"
					variant="secondary"
					:disabled="busy !== null"
					@click="run('portal', openPortal)"
				>
					<CreditCard
						class="h-4 w-4"
						aria-hidden="true"
					/>
					{{ busy === 'portal' ? 'Opening…' : 'Manage payment' }}
				</AppButton>
				<AppButton
					variant="secondary"
					:disabled="loading"
					aria-label="Reload billing"
					@click="loadAll"
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
					:title="statusReady ? 'Billing is not available' : 'Loading…'"
					:description="statusReady ? 'Billing is off on this server, or your account is not in the Administrators group.' : undefined"
				/>
			</AppCard>

			<template v-else>
				<div
					v-if="returnNotice"
					role="status"
					:class="['flex items-start gap-2.5 rounded-xl p-4 text-sm', returnNotice.ok ? 'bg-app-ok-bg text-app-ok' : 'bg-app-muted text-app-text-2']"
				>
					<component
						:is="returnNotice.ok ? CircleCheck : Info"
						class="mt-px h-[18px] w-[18px] shrink-0"
						aria-hidden="true"
					/>
					<span class="flex-1">{{ returnNotice.text }}</span>
					<button
						type="button"
						aria-label="Dismiss"
						class="-m-1 rounded p-1 hover:bg-black/5"
						@click="clearReturn"
					>
						<X
							class="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
				</div>
				<div
					v-if="error"
					role="alert"
					class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
				>
					{{ error }}
				</div>

				<AppCard
					v-if="!account && loading"
					flush
				>
					<OpEmpty
						loading
						title="Loading billing…"
					/>
				</AppCard>

				<template v-if="account">
					<div class="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
						<!-- Plan and status -->
						<AppCard>
							<div class="flex flex-col gap-4">
								<div>
									<p class="text-[13px] font-medium text-app-text-3">
										Plan
									</p>
									<div class="mt-1 flex flex-wrap items-center gap-2.5">
										<h2 class="text-[26px] font-bold tracking-tight text-app-text">
											{{ account.plan_details?.name || account.plan || 'No plan' }}
										</h2>
										<BillingPill
											:label="pill.label"
											:tone="pill.tone"
										/>
									</div>
									<p
										v-if="summary.detail"
										class="mt-1 text-sm text-app-text-2"
									>
										{{ summary.detail }}
									</p>
								</div>
								<ul
									v-if="facts.length"
									class="flex flex-col gap-1.5 text-[13px] text-app-text-2"
								>
									<li
										v-for="f in facts"
										:key="f"
										class="flex items-center gap-2"
									>
										<Check
											class="h-3.5 w-3.5 shrink-0 text-app-text-3"
											aria-hidden="true"
										/>
										{{ f }}
									</li>
								</ul>
								<dl class="grid grid-cols-2 gap-3 border-t border-app-border-subtle pt-4 text-[13px]">
									<div>
										<dt class="text-app-text-3">
											Payment method
										</dt>
										<dd class="mt-0.5 font-medium text-app-text">
											{{ account.status === 'exempt' ? 'Not needed' : account.has_payment_method ? 'On file' : 'None' }}
										</dd>
									</div>
									<div v-if="payment?.subscription_status">
										<dt class="text-app-text-3">
											Subscription
										</dt>
										<dd class="mt-0.5 font-medium capitalize text-app-text">
											{{ payment.subscription_status.replace(/_/g, ' ') }}
										</dd>
									</div>
									<div>
										<dt class="text-app-text-3">
											Billing since
										</dt>
										<dd class="mt-0.5 font-medium text-app-text">
											{{ formatDay(account.started_at) || '—' }}
										</dd>
									</div>
								</dl>
								<div
									v-if="canPay"
									class="flex flex-wrap gap-2.5"
								>
									<AppButton
										v-if="!account.has_payment_method"
										:disabled="busy !== null || readOnly"
										@click="run('checkout', () => buy(account!.plan))"
									>
										{{ busy === 'checkout' ? 'Opening checkout…' : 'Add payment method' }}
									</AppButton>
									<AppButton
										variant="secondary"
										:disabled="busy !== null || readOnly"
										@click="planDialog = true"
									>
										Change plan
									</AppButton>
								</div>
								<p
									v-else-if="hasProvider === false"
									class="text-xs text-app-text-3"
								>
									Plans are set by the platform operator on this server.
								</p>
								<p
									v-else-if="payment?.chargeable === false"
									class="text-xs text-app-text-3"
								>
									Exempt organizations are never charged and have no checkout.
								</p>
								<p
									v-if="readOnly && canPay"
									class="text-xs text-app-danger"
								>
									Plan changes are paused while a payment is overdue. Use Manage payment to pay it.
								</p>
							</div>
						</AppCard>

						<!-- This month -->
						<AppCard
							:title="`This month · ${monthLabel(currentMonth())}`"
							:description="`Resets on ${formatDay(nextMonthStart())} (UTC). Updated every few minutes.`"
						>
							<div class="flex flex-col gap-6">
								<BillingMeter
									label="Transfer (tunnels and uploads)"
									:meter="transfer"
									:value="formatBytes(account.policy?.used_bytes)"
									:of="account.policy?.allowance_bytes ? formatBytes(account.policy.allowance_bytes) : 'no limit'"
									:detail="transferDetail"
								/>
								<BillingMeter
									label="Devices"
									:meter="devices"
									:value="deviceCount === null ? '–' : formatCount(deviceCount)"
									:of="deviceLimit === null ? undefined : formatCount(deviceLimit)"
									:detail="deviceDetail"
								/>
								<div
									v-if="account.cap_lifted_until || account.extra_transfer_bytes"
									class="flex flex-col gap-1 rounded-[10px] bg-app-muted px-3 py-2.5 text-xs text-app-text-2"
								>
									<span v-if="account.cap_lifted_until">The transfer cap is lifted until {{ formatDay(account.cap_lifted_until) }}.</span>
									<span v-if="account.extra_transfer_bytes">Includes {{ formatBytes(account.extra_transfer_bytes) }} extra transfer this month.</span>
								</div>
							</div>
						</AppCard>
					</div>

					<!-- Spending limit (plans that bill overage) -->
					<AppCard
						v-if="account.plan_details?.overage === 'bill'"
						title="Spending limit"
						description="The most overage to pay in a month. Reaching it acts as the hard cap: new tunnels and uploads pause until next month; devices stay connected."
					>
						<form
							class="flex flex-wrap items-start gap-3"
							@submit.prevent="saveLimit(parsedLimit.value)"
						>
							<OpField
								label="Overage limit per month"
								for-id="spending-limit"
								hint="(USD)"
								:error="limitText !== '' ? parsedLimit.error : null"
								:help="`Now: ${spendingLimitLabel(account.spending_limit_cents)}. Leave empty for no limit (overage is unlimited).`"
								class="w-full max-w-[340px]"
							>
								<div class="relative">
									<span
										class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-app-text-3"
										aria-hidden="true"
									>$</span>
									<OpInput
										id="spending-limit"
										v-model="limitText"
										inputmode="decimal"
										placeholder="No limit"
										class="pl-7"
										:invalid="!!parsedLimit.error"
										aria-describedby="spending-limit-help"
									/>
								</div>
							</OpField>
							<AppButton
								type="submit"
								class="sm:mt-[26px]"
								:disabled="limitSaving || !!parsedLimit.error || !limitChanged || readOnly"
							>
								{{ limitSaving ? 'Saving…' : 'Save limit' }}
							</AppButton>
							<AppButton
								v-if="account.spending_limit_cents !== null && account.spending_limit_cents !== undefined"
								variant="ghost"
								class="sm:mt-[26px]"
								:disabled="limitSaving || readOnly"
								@click="saveLimit(null)"
							>
								Remove limit
							</AppButton>
						</form>
					</AppCard>

					<!-- Invoices -->
					<AppCard
						v-if="hasProvider"
						flush
						title="Invoices"
						description="Issued and collected by the payment provider; the links open its pages."
					>
						<OpEmpty
							v-if="invoices === null || invoicesError || !invoices.length"
							:icon="Receipt"
							:loading="invoices === null && !invoicesError"
							:title="invoicesError ? 'Couldn’t load the invoices' : invoices === null ? 'Loading invoices…' : 'No invoices yet'"
							:description="invoicesError || (invoices?.length === 0 ? 'Usage is invoiced at the start of the next month.' : undefined)"
						/>
						<template v-else>
							<table class="hidden w-full border-collapse md:table">
								<thead>
									<tr class="bg-app-surface-2">
										<th
											v-for="col in invoiceColumns"
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
										v-for="inv in invoices"
										:key="inv.id"
										class="hover:bg-app-hover [&:last-child>td]:border-b-0"
									>
										<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 font-mono text-[13px] text-app-text">
											{{ inv.number || inv.id }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
											{{ formatDay(inv.created) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
											{{ inv.period_start ? `${formatDay(inv.period_start)} – ${formatDay(inv.period_end)}` : '—' }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] font-semibold text-app-text">
											{{ formatCents(inv.total ?? inv.amount_due, inv.currency) }}
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3 text-[13px]">
											<BillingPill v-bind="invoiceStateInfo(inv.status)" />
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-3 pr-4 text-right text-[13px]">
											<a
												v-if="safeUrl(inv.hosted_url)"
												:href="safeUrl(inv.hosted_url)"
												target="_blank"
												rel="noopener noreferrer"
												class="font-medium text-app-link hover:underline"
											>{{ inv.status === 'open' ? 'Pay' : 'View' }}</a>
											<a
												v-if="safeUrl(inv.pdf)"
												:href="safeUrl(inv.pdf)"
												target="_blank"
												rel="noopener noreferrer"
												class="ml-3 font-medium text-app-link hover:underline"
											>PDF</a>
										</td>
									</tr>
								</tbody>
							</table>
							<ul class="divide-y divide-app-border-subtle md:hidden">
								<li
									v-for="inv in invoices"
									:key="inv.id"
									class="flex items-center justify-between gap-3 px-4 py-3"
								>
									<div class="min-w-0">
										<p class="truncate font-mono text-[13px] text-app-text">
											{{ inv.number || inv.id }}
										</p>
										<p class="mt-0.5 text-xs text-app-text-3">
											{{ formatDay(inv.created) }} · {{ invoiceStateInfo(inv.status).label }}
										</p>
									</div>
									<div class="flex shrink-0 items-center gap-3 text-[13px]">
										<span class="font-semibold text-app-text">{{ formatCents(inv.total ?? inv.amount_due, inv.currency) }}</span>
										<a
											v-if="safeUrl(inv.hosted_url)"
											:href="safeUrl(inv.hosted_url)"
											target="_blank"
											rel="noopener noreferrer"
											class="font-medium text-app-link"
										>{{ inv.status === 'open' ? 'Pay' : 'View' }}</a>
									</div>
								</li>
							</ul>
						</template>
					</AppCard>

					<BillingPeriodsTable
						:periods="periods ?? []"
						:loading="periods === null && !periodsError"
						:error="periodsError"
						description="Each month is closed two hours after it ends, with its quantities frozen. Usage arriving later shows on the Usage page but is never billed."
					/>
				</template>
			</template>

			<!-- Change plan -->
			<OpDialog
				v-model="planDialog"
				title="Change plan"
				description="Opens the payment provider's checkout for the plan. With a subscription, the plan changes at once and its limits apply right away."
				size="sm"
				as-form
				@submit="changePlan"
			>
				<OpField
					label="Plan ID"
					for-id="plan-id"
					:error="planTouched ? planIdError(planText) : null"
					help="The plan's ID from the price list, for example “team”."
				>
					<OpInput
						id="plan-id"
						v-model="planText"
						mono
						autocapitalize="none"
						spellcheck="false"
						@blur="planTouched = true"
					/>
				</OpField>
				<p
					v-if="planError"
					role="alert"
					class="mt-3 rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
				>
					{{ planError }}
				</p>
				<template #footer>
					<AppButton
						variant="secondary"
						@click="planDialog = false"
					>
						Cancel
					</AppButton>
					<div class="flex-1" />
					<AppButton
						type="submit"
						:disabled="busy !== null || !!planIdError(planText) || planText.trim() === account?.plan"
					>
						{{ busy === 'plan' ? 'Opening…' : 'Continue' }}
					</AppButton>
				</template>
			</OpDialog>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { Check, CircleCheck, CreditCard, Info, Receipt, RefreshCw, X } from 'lucide-vue-next';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import BillingMeter from '~/components/billing/BillingMeter.vue';
import BillingPeriodsTable from '~/components/billing/BillingPeriodsTable.vue';
import BillingPill from '~/components/billing/BillingPill.vue';
import {
	billingStatusSummary, deviceMeter, formatCents, formatDay, invoiceStateInfo, nextMonthStart, parseSpendingLimit,
	planFacts, planIdError, spendingLimitLabel, spendingLimitText, transferMeter,
	type BillingInvoice, type BillingPeriod,
} from '~/utils/billing';
import { currentMonth, formatBytes, formatCount, monthLabel } from '~/utils/usage';

useHead({ title: 'Billing' });

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const statusStore = useStatusStore();
const { profileReady } = useIsAdmin();
const { available, account, accountError, payment, hasProvider, load, openPortal, checkout } = useBilling();

const statusReady = computed(() => !!statusStore.status?.version && profileReady.value);

const loading = ref(false);
const error = ref<string | null>(null);
const periods = ref<BillingPeriod[] | null>(null);
const periodsError = ref<string | null>(null);
const invoices = ref<BillingInvoice[] | null>(null);
const invoicesError = ref<string | null>(null);
const deviceCount = ref<number | null>(null);

const loadAll = async () => {
	if (!available.value || loading.value) return;
	loading.value = true;
	error.value = null;
	try {
		await load();
		if (accountError.value) error.value = `Couldn't load the billing: ${accountError.value}`;
		await Promise.all([
			$api.billing.periods().then((p) => {
				periods.value = p;
				periodsError.value = null;
			}).catch((e) => {
				periodsError.value = apiErrorMessage(e);
			}),
			hasProvider.value
				? $api.billing.invoices().then((list) => {
						invoices.value = list;
						invoicesError.value = null;
					}).catch((e) => {
						invoicesError.value = httpStatusOf(e) === 502 ? 'The payment provider could not be reached. Try again shortly.' : apiErrorMessage(e);
					})
				: Promise.resolve(),
			$api.clients.getTotalClients().then((r) => {
				deviceCount.value = r?.meta?.count ?? null;
			}).catch(() => {
				deviceCount.value = null;
			}),
		]);
	}
	finally {
		loading.value = false;
	}
};
watch(available, ok => ok && loadAll(), { immediate: true });

const summary = computed(() => billingStatusSummary(account.value));
/** The payment trouble wins over the billing status. */
const pill = computed(() => {
	const d = payment.value?.dunning?.state;
	if (payment.value?.access === 'read_only' || d === 'read_only' || d === 'suspension_proposed') return { label: 'Read-only', tone: 'danger' as const };
	if (d === 'past_due') return { label: 'Payment failed', tone: 'warn' as const };
	return { label: summary.value.label, tone: summary.value.tone };
});
const facts = computed(() => planFacts(account.value?.plan_details));
const readOnly = computed(() => payment.value?.access === 'read_only');
const canPay = computed(() => hasProvider.value === true && payment.value?.chargeable !== false && account.value?.status !== 'exempt');

const transfer = computed(() => transferMeter(account.value?.policy, account.value?.transfer_state));
const transferDetail = computed(() => {
	const a = account.value;
	const p = a?.policy;
	if (!a || !p) return '';
	if (!p.allowance_bytes) return a.plan_unassigned ? 'No plan chosen yet: metered, without limits.' : '';
	const parts: string[] = [];
	if (p.soft_cap_bytes) parts.push(`Notice at ${formatBytes(p.soft_cap_bytes)}`);
	if (a.plan_details?.overage === 'bill') {
		parts.push(p.overage_cents ? `overage so far ${formatCents(p.overage_cents)}` : 'transfer past the allowance is billed as overage');
	}
	else if (p.hard_cap_bytes) {
		parts.push(`new tunnels and uploads pause at ${formatBytes(p.hard_cap_bytes)}`);
	}
	return parts.join(' · ');
});
const deviceLimit = computed(() => {
	const p = account.value?.policy;
	if (p && p.max_clients !== undefined) return p.max_clients;
	return account.value?.plan_details?.max_clients ?? null;
});
const devices = computed(() => deviceMeter(deviceCount.value, deviceLimit.value));
const deviceDetail = computed(() => {
	const included = account.value?.plan_details?.included_devices;
	const price = account.value?.plan_details?.price_per_device;
	if (included && price) return `${deviceLimit.value === null ? 'No device limit. ' : ''}${formatCount(included)} included; each billable device above them is ${formatCents(Math.round(price * 100))} a month (billable: the average of the daily counts).`;
	return deviceLimit.value === null ? 'Registered devices; the plan has no device limit.' : 'Registered devices against the plan’s limit.';
});

// The spending limit editor.
const limitText = ref('');
watch(() => account.value?.spending_limit_cents, (c) => {
	limitText.value = spendingLimitText(c);
}, { immediate: true });
const parsedLimit = computed(() => parseSpendingLimit(limitText.value));
const limitChanged = computed(() => {
	const cur = account.value?.spending_limit_cents;
	const next = parsedLimit.value.value;
	return (next === null ? null : Math.round(next * 100)) !== (cur ?? null);
});
const limitSaving = ref(false);
const saveLimit = async (usd: number | null) => {
	if (limitSaving.value) return;
	limitSaving.value = true;
	try {
		account.value = await $api.billing.setSpendingLimit(usd);
		snackbar.add({ type: 'success', text: usd === null ? 'Spending limit removed' : `Spending limit set to ${formatCents(Math.round(usd * 100))} per month` });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't save the spending limit: ${apiErrorMessage(e)}` });
	}
	finally {
		limitSaving.value = false;
	}
};

// Portal, checkout and plan changes.
const busy = ref<'portal' | 'checkout' | 'plan' | null>(null);
const run = async (what: 'portal' | 'checkout' | 'plan', fn: () => Promise<unknown>) => {
	if (busy.value) return;
	busy.value = what;
	try {
		await fn();
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't open the payment page: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};
const buy = async (plan: string) => {
	if (await checkout(plan)) {
		snackbar.add({ type: 'success', text: `Plan changed to ${account.value?.plan_details?.name || plan}` });
		await loadAll();
	}
};

const planDialog = ref(false);
const planText = ref('');
const planTouched = ref(false);
const planError = ref<string | null>(null);
watch(planDialog, (open) => {
	if (!open) return;
	planText.value = account.value?.plan ?? '';
	planTouched.value = false;
	planError.value = null;
});
const changePlan = async () => {
	if (planIdError(planText.value) || busy.value) return;
	planError.value = null;
	busy.value = 'plan';
	try {
		await buy(planText.value.trim());
		planDialog.value = false;
	}
	catch (e) {
		planError.value = httpStatusOf(e) === 409 ? 'This plan is not sold through the payment provider, or the organization is exempt.' : apiErrorMessage(e);
	}
	finally {
		busy.value = null;
	}
};

// Back from the provider's checkout (?checkout=success|canceled).
const returnNotice = computed(() => {
	const c = route.query.checkout;
	if (c === 'success') return { ok: true, text: 'Thank you: the payment method was added. It can take a minute to show here.' };
	if (c === 'canceled') return { ok: false, text: 'The checkout was canceled; nothing changed.' };
	return null;
});
const clearReturn = () => router.replace({ query: { ...route.query, checkout: undefined } });
watch(returnNotice, (n) => {
	// The provider's webhook may land a moment later.
	if (n?.ok) setTimeout(() => loadAll(), 4000);
}, { immediate: true });

/** Only the provider's https pages are linked. */
const safeUrl = (u: string | undefined) => (u && /^https:\/\//i.test(u) ? u : undefined);

const invoiceColumns = [
	{ label: 'Invoice' },
	{ label: 'Date' },
	{ label: 'Period' },
	{ label: 'Amount', right: true },
	{ label: 'Status' },
	{ label: '', right: true },
];
</script>
