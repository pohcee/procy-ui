<template>
	<!-- Closed billing periods (calendar months, UTC), newest first. Operators can approve a held period. -->
	<AppCard
		flush
		:title="title"
		:description="description"
	>
		<template
			v-if="$slots.actions"
			#actions
		>
			<slot name="actions" />
		</template>
		<OpEmpty
			v-if="loading || error || !periods.length"
			:icon="CalendarRange"
			:loading="loading"
			:title="error ? 'Couldn’t load the periods' : loading ? 'Loading periods…' : emptyTitle"
			:description="error || (loading ? undefined : emptyText)"
		/>
		<template v-else>
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full min-w-[820px] border-collapse">
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
							v-for="p in periods"
							:key="`${p.organization}-${p.start}`"
							:class="['hover:bg-app-hover [&:last-child>td]:border-b-0', p.state === 'held' ? 'bg-app-warn-row' : '']"
						>
							<td
								v-if="showOrg"
								class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]"
							>
								<NuxtLink
									:to="orgLink(p.organization ?? '')"
									class="font-medium text-app-text hover:text-app-link hover:underline"
								>
									{{ orgNames?.[p.organization ?? ''] || p.organization }}
								</NuxtLink>
							</td>
							<td :class="['whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] font-medium text-app-text', showOrg ? '' : 'pl-4']">
								{{ monthLabel(periodMonth(p.start)) }}
								<span
									v-if="p.proration !== undefined && p.proration < 1 && p.proration > 0"
									class="block text-xs font-normal text-app-text-3"
								>from {{ formatDay(p.billed_from) }}</span>
							</td>
							<td class="border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
								{{ p.plan }}
								<span class="block text-xs text-app-text-3">{{ p.status }}</span>
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
								{{ formatCount(p.billable_devices) }}
								<span
									v-if="p.extra_devices"
									class="block text-xs text-app-text-3"
								>{{ formatCount(p.extra_devices) }} extra</span>
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
								{{ periodTransferLabel(p) }}
								<span
									v-if="p.overage_gib"
									class="block text-xs text-app-warn"
								>{{ formatCount(p.overage_gib) }} GiB over</span>
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
								{{ formatCents(p.overage_cents) }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] font-semibold text-app-text">
								{{ formatCents(p.total_cents) }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px]">
								<BillingPill v-bind="periodStateInfo(p.state)" />
								<span
									v-if="p.approved_by"
									class="mt-1 block text-xs text-app-text-3"
								>approved by {{ p.approved_by }}</span>
							</td>
							<td
								v-if="approvable"
								class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-3 pr-4 text-right"
							>
								<AppButton
									v-if="p.state === 'held'"
									size="sm"
									:disabled="approving === key(p)"
									@click="emit('approve', p)"
								>
									{{ approving === key(p) ? 'Approving…' : 'Approve' }}
								</AppButton>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<ul class="divide-y divide-app-border-subtle md:hidden">
				<li
					v-for="p in periods"
					:key="`${p.organization}-${p.start}`"
					:class="['flex flex-col gap-1.5 px-4 py-3', p.state === 'held' ? 'bg-app-warn-row' : '']"
				>
					<div class="flex items-center justify-between gap-3">
						<span class="min-w-0 truncate text-[15px] font-medium text-app-text">
							<template v-if="showOrg">{{ orgNames?.[p.organization ?? ''] || p.organization }} · </template>{{ monthLabel(periodMonth(p.start)) }}
						</span>
						<span class="shrink-0 text-sm font-semibold text-app-text">{{ formatCents(p.total_cents) }}</span>
					</div>
					<div class="flex flex-wrap items-center gap-2 text-xs text-app-text-3">
						<BillingPill v-bind="periodStateInfo(p.state)" />
						<span>{{ p.plan }} · {{ formatCount(p.billable_devices) }} devices · {{ periodTransferLabel(p) }}</span>
					</div>
					<AppButton
						v-if="approvable && p.state === 'held'"
						size="sm"
						class="self-start"
						:disabled="approving === key(p)"
						@click="emit('approve', p)"
					>
						{{ approving === key(p) ? 'Approving…' : `Approve ${formatCents(p.total_cents)}` }}
					</AppButton>
				</li>
			</ul>
		</template>
	</AppCard>
</template>

<script setup lang="ts">
import { CalendarRange } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import BillingPill from '~/components/billing/BillingPill.vue';
import { formatCents, formatDay, periodMonth, periodStateInfo, periodTransferLabel, type BillingPeriod } from '~/utils/billing';
import { formatCount, monthLabel, orgLink } from '~/utils/usage';

const props = withDefaults(defineProps<{
	periods: BillingPeriod[];
	loading?: boolean;
	error?: string | null;
	title?: string;
	description?: string;
	emptyTitle?: string;
	emptyText?: string;
	/** Show the organization column (the operator's list of every organization). */
	showOrg?: boolean;
	orgNames?: Record<string, string>;
	/** Show Approve on held periods. */
	approvable?: boolean;
	/** The period being approved (`org/YYYY-MM`). */
	approving?: string | null;
}>(), {
	title: 'Past periods',
	description: undefined,
	emptyTitle: 'No closed periods yet',
	emptyText: 'A month is closed two hours after it ends (UTC).',
	error: null,
	orgNames: undefined,
	approving: null,
});
const emit = defineEmits<{ (e: 'approve', p: BillingPeriod): void }>();

const key = (p: BillingPeriod) => `${p.organization}/${periodMonth(p.start)}`;

const columns = computed(() => [
	...(props.showOrg ? [{ label: 'Organization' }] : []),
	{ label: 'Month' },
	{ label: 'Plan' },
	{ label: 'Billable devices', right: true },
	{ label: 'Transfer', right: true },
	{ label: 'Overage', right: true },
	{ label: 'Total', right: true },
	{ label: 'State' },
	...(props.approvable ? [{ label: '', right: true }] : []),
]);
</script>
