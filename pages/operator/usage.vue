<template>
	<new-page-wrapper>
		<AppPage
			title="Platform usage"
			description="Every organization's usage for a month (UTC), heaviest transfer first."
		>
			<template
				v-if="available"
				#actions
			>
				<UsageMonthPicker v-model="month" />
				<AppButton
					variant="secondary"
					:disabled="loading"
					aria-label="Reload usage"
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
					:icon="BarChart3"
					:loading="!statusReady"
					:title="statusReady ? 'Platform usage is not available' : 'Loading…'"
					:description="statusReady ? 'Usage metering is off on this server, or your account is not a platform operator.' : undefined"
				/>
			</AppCard>

			<template v-else>
				<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
					<UsageTile
						label="Transfer"
						:value="formatBytes(totals.transfer)"
						:detail="`${formatBytes(totals.toUser)} to users · ${formatBytes(totals.toDevice + totals.uploads)} to devices`"
						:loading="loading && !data"
					/>
					<UsageTile
						label="Egress cost"
						:value="formatUsd(estimateEgressCost(totals.transfer, price))"
						:detail="`Estimate at ${formatUsd(price)}/GiB`"
						:loading="loading && !data"
					/>
					<UsageTile
						label="Billable devices"
						:value="formatCount(totals.devices)"
						detail="Sum over organizations"
						:loading="loading && !data"
					/>
					<UsageTile
						label="Jobs run"
						:value="formatCount(totals.jobs)"
						:loading="loading && !data"
					/>
				</div>

				<section
					aria-label="Usage by organization"
					class="overflow-hidden rounded-xl border border-app-border bg-app-surface"
				>
					<div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3.5">
						<h2 class="text-[15px] font-semibold text-app-text">
							By organization <span class="font-medium text-app-text-3">· {{ rows.length }}</span>
						</h2>
						<div class="flex items-center gap-2">
							<label
								for="cost-per-gib"
								class="text-[13px] font-medium text-app-text-2"
							>Egress $/GiB <span class="font-normal text-app-text-3">(estimate)</span></label>
							<div class="relative">
								<span
									class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-app-text-3"
									aria-hidden="true"
								>$</span>
								<input
									id="cost-per-gib"
									v-model="priceText"
									inputmode="decimal"
									:aria-invalid="priceInvalid || undefined"
									aria-describedby="cost-per-gib-help"
									:class="[
										'h-10 w-[92px] rounded-[10px] border bg-app-surface-2 pl-6 pr-2 font-mono text-[13px] text-app-text focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25',
										priceInvalid ? 'border-app-danger' : 'border-app-border-strong',
									]"
								>
							</div>
							<span
								id="cost-per-gib-help"
								class="sr-only"
							>Used only for the estimated cost column; default {{ DEFAULT_COST_PER_GIB }}. Saved in this browser.</span>
						</div>
					</div>

					<div
						v-if="error"
						role="alert"
						class="m-4 rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
					>
						{{ error }}
					</div>
					<OpEmpty
						v-if="loading && !data"
						loading
						title="Loading usage…"
					/>
					<OpEmpty
						v-else-if="data && !rows.length"
						:icon="BarChart3"
						title="No organizations"
					/>
					<template v-else-if="rows.length">
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full min-w-[880px] border-collapse">
								<thead>
									<tr class="bg-app-surface-2">
										<th
											v-for="col in columns"
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
										v-for="row in rows"
										:key="row.id"
										class="hover:bg-app-hover"
									>
										<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]">
											<NuxtLink
												:to="orgLink(row.id)"
												class="block max-w-[240px] truncate font-medium text-app-text hover:text-app-link hover:underline"
											>
												{{ row.name || row.id }}
											</NuxtLink>
											<span class="flex items-center gap-1.5 font-mono text-xs text-app-text-3">
												{{ row.id }}
												<span
													v-if="row.status === 'suspended'"
													class="rounded bg-app-danger-bg px-1 font-sans font-semibold text-app-danger"
												>suspended</span>
											</span>
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px]">
											<div class="flex items-center justify-end gap-2.5">
												<span
													class="hidden h-1.5 w-16 overflow-hidden rounded-full bg-app-muted lg:block"
													aria-hidden="true"
												>
													<span
														class="block h-full rounded-full bg-app-accent"
														:style="{ width: `${row.share}%` }"
													/>
												</span>
												<span class="font-semibold text-app-text">{{ formatBytes(row.transfer) }}</span>
											</div>
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ formatBytes(row.totals?.tunnel_bytes_to_user) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ formatBytes(row.totals?.tunnel_bytes_to_device) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ formatBytes(row.totals?.upload_bytes_to_devices) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ formatCount(row.totals?.devices_billable) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
											{{ formatCount(row.totals?.jobs_run) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-3 pr-4 text-right text-[13px] font-medium text-app-text">
											{{ formatUsd(estimateEgressCost(row.transfer, price)) }}
										</td>
									</tr>
								</tbody>
								<tfoot>
									<tr class="bg-app-surface-2 text-[13px] font-semibold text-app-text">
										<th
											scope="row"
											class="py-3 pl-4 pr-3 text-left"
										>
											Total
										</th>
										<td class="px-3 py-3 text-right">
											{{ formatBytes(totals.transfer) }}
										</td>
										<td class="px-3 py-3 text-right">
											{{ formatBytes(totals.toUser) }}
										</td>
										<td class="px-3 py-3 text-right">
											{{ formatBytes(totals.toDevice) }}
										</td>
										<td class="px-3 py-3 text-right">
											{{ formatBytes(totals.uploads) }}
										</td>
										<td class="px-3 py-3 text-right">
											{{ formatCount(totals.devices) }}
										</td>
										<td class="px-3 py-3 text-right">
											{{ formatCount(totals.jobs) }}
										</td>
										<td class="py-3 pl-3 pr-4 text-right">
											{{ formatUsd(estimateEgressCost(totals.transfer, price)) }}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>

						<ul class="divide-y divide-app-border-subtle md:hidden">
							<li
								v-for="row in rows"
								:key="row.id"
							>
								<NuxtLink
									:to="orgLink(row.id)"
									class="flex flex-col gap-1.5 px-4 py-3 hover:bg-app-hover"
								>
									<div class="flex items-center justify-between gap-3">
										<span class="min-w-0 truncate text-[15px] font-medium text-app-text">{{ row.name || row.id }}</span>
										<span class="shrink-0 text-sm font-semibold text-app-text">{{ formatBytes(row.transfer) }}</span>
									</div>
									<span
										class="block h-1.5 w-full overflow-hidden rounded-full bg-app-muted"
										aria-hidden="true"
									>
										<span
											class="block h-full rounded-full bg-app-accent"
											:style="{ width: `${row.share}%` }"
										/>
									</span>
									<p class="text-xs text-app-text-3">
										<span class="font-mono">{{ row.id }}</span> · {{ formatCount(row.totals?.devices_billable) }} devices · ≈ {{ formatUsd(estimateEgressCost(row.transfer, price)) }} egress
									</p>
								</NuxtLink>
							</li>
						</ul>
					</template>
					<p class="border-t border-app-border px-4 py-3 text-xs text-app-text-3">
						The egress cost is an estimate: metered payload bytes × the $/GiB above, without free tiers or protocol overhead (about 5–10 % more). It is not what an organization is billed.
					</p>
				</section>
			</template>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { BarChart3, RefreshCw } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import UsageMonthPicker from '~/components/usage/UsageMonthPicker.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import type { OperatorUsage } from '~/repository/modules/operator';
import {
	DEFAULT_COST_PER_GIB,
	currentMonth,
	estimateEgressCost,
	formatBytes,
	formatCount,
	formatUsd,
	isMonth,
	parseCostPerGiB,
	sortByTransfer,
	transferOf,
} from '~/utils/usage';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Platform usage' });

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const statusStore = useStatusStore();
const { operator, usage } = useCapabilities();
const statusReady = computed(() => !!statusStore.status?.version);
const available = computed(() => operator.value && usage.value);

// The $/GiB is a per-browser preference; an invalid entry keeps the last valid price.
const priceText = useLocalStorage('operator_egress_cost_per_gib', String(DEFAULT_COST_PER_GIB));
const priceInvalid = computed(() => parseCostPerGiB(priceText.value) === null);
const price = computed(() => parseCostPerGiB(priceText.value) ?? DEFAULT_COST_PER_GIB);

const month = ref(isMonth(String(route.query.month ?? '')) ? String(route.query.month) : currentMonth());
const data = ref<OperatorUsage | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

let seq = 0;
const load = async () => {
	if (!available.value) return;
	const mine = ++seq;
	loading.value = true;
	error.value = null;
	try {
		const res = await $api.operator.usage(month.value);
		if (mine === seq) data.value = res;
	}
	catch (e) {
		if (mine !== seq) return;
		data.value = null;
		error.value = `Couldn't load the usage: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === seq) loading.value = false;
	}
};
watch(month, (m) => {
	router.replace({ query: { ...route.query, month: m === currentMonth() ? undefined : m } });
	load();
});
watch(available, ok => ok && load(), { immediate: true });

const rows = computed(() => {
	const sorted = sortByTransfer(data.value?.organizations ?? []);
	const max = Math.max(1, ...sorted.map(o => transferOf(o.totals)));
	return sorted.map((o) => {
		const transfer = transferOf(o.totals);
		return { ...o, transfer, share: transfer ? Math.max(2, Math.round((transfer / max) * 100)) : 0 };
	});
});
const totals = computed(() => rows.value.reduce((t, r) => ({
	transfer: t.transfer + r.transfer,
	toUser: t.toUser + (r.totals?.tunnel_bytes_to_user ?? 0),
	toDevice: t.toDevice + (r.totals?.tunnel_bytes_to_device ?? 0),
	uploads: t.uploads + (r.totals?.upload_bytes_to_devices ?? 0),
	devices: t.devices + (r.totals?.devices_billable ?? 0),
	jobs: t.jobs + (r.totals?.jobs_run ?? 0),
}), { transfer: 0, toUser: 0, toDevice: 0, uploads: 0, devices: 0, jobs: 0 }));

const columns = [
	{ label: 'Organization' },
	{ label: 'Transfer', right: true },
	{ label: 'To users', right: true },
	{ label: 'To devices', right: true },
	{ label: 'Uploads', right: true },
	{ label: 'Billable devices', right: true },
	{ label: 'Jobs', right: true },
	{ label: 'Egress (estimate)', right: true },
];
</script>
