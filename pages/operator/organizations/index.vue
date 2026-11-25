<template>
	<new-page-wrapper>
		<AppPage
			title="Organizations"
			description="Every organization on this server, with its devices, members and the last 30 days of transfer. Every change is written to the operator audit log."
		>
			<template #actions>
				<AppButton
					variant="secondary"
					:disabled="pending"
					aria-label="Reload organizations"
					@click="refresh"
				>
					<RefreshCw
						:class="['h-4 w-4', pending ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
				<AppButton @click="createOpen = true">
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Create organization
				</AppButton>
			</template>

			<section
				aria-label="Organization list"
				class="overflow-hidden rounded-xl border border-app-border bg-app-surface"
			>
				<div class="flex flex-wrap items-center gap-2.5 border-b border-app-border px-4 py-3.5">
					<div class="flex h-10 min-w-0 flex-1 basis-full items-center gap-2 rounded-[10px] border border-app-border-strong bg-app-surface px-3 sm:max-w-[280px] sm:basis-auto">
						<Search
							class="h-4 w-4 flex-none text-app-text-3"
							aria-hidden="true"
						/>
						<label
							for="org-filter"
							class="sr-only"
						>Search by name or ID</label>
						<input
							id="org-filter"
							v-model="q"
							type="search"
							placeholder="Search name or ID…"
							class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-app-text outline-none placeholder:text-app-text-4 focus:ring-0"
						>
					</div>
					<OpSegmented
						v-model="statusFilter"
						:options="statusOptions"
						label="Filter by status"
						size="sm"
					/>
					<div
						v-if="billingStatuses.length"
						class="flex items-center gap-2"
					>
						<label
							for="org-billing-filter"
							class="text-[13px] text-app-text-3"
						>Billing</label>
						<select
							id="org-billing-filter"
							v-model="billingFilter"
							class="h-8 rounded-lg border border-app-border-strong bg-app-surface px-2 pr-8 text-[13px] text-app-text focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
						>
							<option value="all">
								All
							</option>
							<option
								v-for="s in billingStatuses"
								:key="s"
								:value="s"
							>
								{{ accountPill({ organization: '', plan: '', status: s }).label }}
							</option>
						</select>
					</div>
					<!-- Sorting for the phone cards (the table sorts by its headers). -->
					<div class="flex items-center gap-2 md:hidden">
						<label
							for="org-sort"
							class="text-[13px] text-app-text-3"
						>Sort</label>
						<select
							id="org-sort"
							:value="sortKey"
							class="h-8 rounded-lg border border-app-border-strong bg-app-surface px-2 pr-8 text-[13px] text-app-text"
							@change="sortBy(($event.target as HTMLSelectElement).value as OrgSortKey, true)"
						>
							<option
								v-for="col in sortableColumns"
								:key="col.key"
								:value="col.key"
							>
								{{ col.label }}
							</option>
						</select>
					</div>
					<span class="ml-auto text-xs text-app-text-3">
						{{ loaded ? `${formatCount(rows.length)} of ${formatCount(orgs.length)}` : '' }}
					</span>
				</div>

				<div
					v-if="loadError"
					role="alert"
					class="m-4 rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
				>
					{{ loadError }}
				</div>
				<OpEmpty
					v-if="!loaded && !loadError"
					loading
					title="Loading organizations…"
				/>
				<OpEmpty
					v-else-if="loaded && !rows.length"
					:icon="Building2"
					:title="orgs.length ? 'No organization matches' : 'No organizations yet'"
					:description="orgs.length ? 'Change the search or the filters.' : 'Create one, then add its first administrator.'"
				/>
				<template v-else-if="rows.length">
					<!-- Desktop table -->
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[980px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in columns"
										:key="col.label"
										scope="col"
										:aria-sort="col.key && sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined"
										:class="['whitespace-nowrap border-b border-app-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4', col.right ? 'text-right' : 'text-left']"
									>
										<button
											v-if="col.key"
											type="button"
											:class="['inline-flex items-center gap-1 rounded uppercase hover:text-app-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-accent', sortKey === col.key ? 'text-app-text' : '', col.right ? 'flex-row-reverse' : '']"
											@click="sortBy(col.key)"
										>
											{{ col.label }}
											<component
												:is="sortKey !== col.key ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown"
												class="h-3.5 w-3.5"
												aria-hidden="true"
											/>
										</button>
										<template v-else>
											{{ col.label }}
										</template>
									</th>
									<th
										scope="col"
										class="w-14 border-b border-app-border px-3 py-2 pr-4"
									>
										<span class="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="org in rows"
									:key="org.id"
									class="hover:bg-app-hover"
								>
									<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]">
										<div class="flex items-center gap-2">
											<NuxtLink
												:to="orgConsoleLink(org.id)"
												class="block max-w-[220px] truncate font-medium text-app-text hover:text-app-link hover:underline"
											>
												{{ org.name || org.id }}
											</NuxtLink>
											<OrgStatusPill
												v-if="org.status !== 'active'"
												:status="org.status"
											/>
										</div>
										<span class="block truncate font-mono text-xs text-app-text-3">{{ org.id }}</span>
									</td>
									<td
										v-if="billingKnown"
										class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px]"
									>
										<template v-if="org.billing">
											<span class="block font-medium text-app-text">{{ org.billing.plan || '—' }}</span>
											<BillingPill
												v-if="org.billing.status"
												class="mt-1"
												v-bind="accountPill({ organization: org.id, plan: org.billing.plan ?? '', status: org.billing.status })"
											/>
										</template>
										<span
											v-else
											class="text-app-text-4"
										>—</span>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px]">
										<OrgDeviceLimit :org="org" />
										<span
											v-if="org.stats?.devicesOnline !== null && org.stats?.devicesOnline !== undefined"
											class="block text-xs text-app-text-3"
										>{{ formatCount(org.stats.devicesOnline) }} online</span>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
										{{ formatCount(org.user_count) }}
									</td>
									<template v-if="usage">
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] tabular-nums text-app-text">
											{{ bytesOrDash(org.stats?.transferIn) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] tabular-nums text-app-text">
											{{ bytesOrDash(org.stats?.transferOut) }}
										</td>
									</template>
									<td
										class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2"
										:title="activityTitle(org)"
									>
										{{ timeAgo(org.stats?.lastActivityAt) }}
									</td>
									<td
										class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2"
										:title="org.created_at"
									>
										{{ shortDate(org.created_at) }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
										{{ sourceLabel(org.stats?.source) }}
									</td>
									<td class="border-b border-app-border-subtle py-3 pl-3 pr-4 text-right">
										<SettingsRowActions
											:items="rowActions(org)"
											:label="`Actions for ${org.name || org.id}`"
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Phone cards -->
					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="org in rows"
							:key="org.id"
							class="flex items-start gap-3 px-4 py-3.5"
						>
							<NuxtLink
								:to="orgConsoleLink(org.id)"
								class="min-w-0 flex-1"
							>
								<div class="flex flex-wrap items-center gap-2">
									<span class="truncate text-[15px] font-medium text-app-text">{{ org.name || org.id }}</span>
									<OrgStatusPill :status="org.status" />
								</div>
								<span class="mt-0.5 block truncate font-mono text-xs text-app-text-3">{{ org.id }}</span>
								<dl class="mt-2 grid grid-cols-[88px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
									<dt class="text-app-text-3">
										Devices
									</dt>
									<dd>
										<OrgDeviceLimit :org="org" />
										<span
											v-if="typeof org.stats?.devicesOnline === 'number'"
											class="text-app-text-3"
										> · {{ formatCount(org.stats.devicesOnline) }} online</span>
									</dd>
									<dt class="text-app-text-3">
										Users
									</dt>
									<dd class="text-app-text-2">
										{{ formatCount(org.user_count) }}
									</dd>
									<template v-if="org.billing">
										<dt class="text-app-text-3">
											Plan
										</dt>
										<dd class="text-app-text-2">
											{{ org.billing.plan || '—' }}<template v-if="org.billing.status">
												· {{ accountPill({ organization: org.id, plan: org.billing.plan ?? '', status: org.billing.status }).label }}
											</template>
										</dd>
									</template>
									<template v-if="usage">
										<dt class="text-app-text-3">
											30 days
										</dt>
										<dd class="text-app-text">
											{{ bytesOrDash(org.stats?.transferIn) }} <span class="text-app-text-3">to devices</span> · {{ bytesOrDash(org.stats?.transferOut) }} <span class="text-app-text-3">from</span>
										</dd>
									</template>
									<dt class="text-app-text-3">
										Last activity
									</dt>
									<dd class="text-app-text-2">
										{{ timeAgo(org.stats?.lastActivityAt) }}
									</dd>
								</dl>
							</NuxtLink>
							<SettingsRowActions
								:items="rowActions(org)"
								:label="`Actions for ${org.name || org.id}`"
							/>
						</li>
					</ul>
				</template>
			</section>
		</AppPage>

		<OrgCreateDialog
			v-model="createOpen"
			@created="onCreated"
		/>
		<OrgLimitDialog
			:org="limitOrg"
			@close="limitOrg = null"
			@saved="onSaved($event, 'Device limit saved'); limitOrg = null"
		/>
		<OrgStatusDialog
			:org="statusOrg"
			@close="statusOrg = null"
			@saved="onSaved($event, $event.status === 'suspended' ? 'Organization suspended' : 'Organization reactivated'); statusOrg = null"
		/>
		<OrgAdminDialog
			:org="adminOrg"
			@close="adminOrg = null"
			@created="onAdminCreated"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import {
	Building2, ChevronDown, ChevronsUpDown, ChevronUp, Eye, Gauge, Pause, Play, Plus, RefreshCw, Search, UserPlus,
} from 'lucide-vue-next';
import BillingPill from '~/components/billing/BillingPill.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import OrgAdminDialog from '~/components/operator/OrgAdminDialog.vue';
import OrgCreateDialog from '~/components/operator/OrgCreateDialog.vue';
import OrgDeviceLimit from '~/components/operator/OrgDeviceLimit.vue';
import OrgLimitDialog from '~/components/operator/OrgLimitDialog.vue';
import OrgStatusDialog from '~/components/operator/OrgStatusDialog.vue';
import OrgStatusPill from '~/components/operator/OrgStatusPill.vue';
import type { Organization, OrganizationAdmin } from '~/repository/modules/operator';
import { accountPill } from '~/utils/billing';
import {
	billingStatusesOf, dateTime, orgSortDefaultDir, filterOrgs, orgConsoleLink, shortDate, sortOrgs, sourceLabel, timeAgo,
	type ConsoleOrg, type OrgSortKey, type OrgSortDir,
} from '~/utils/operatorConsole';
import { formatBytes, formatCount } from '~/utils/usage';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Organizations' });

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { usage } = useCapabilities();

const orgs = ref<ConsoleOrg[]>([]);
const loaded = ref(false);
const pending = ref(false);
const loadError = ref<string | null>(null);

const refresh = async () => {
	pending.value = true;
	loadError.value = null;
	try {
		orgs.value = await $api.operator.listWithStats('30d');
	}
	catch (e) {
		loadError.value = `Couldn't load the organizations: ${apiErrorMessage(e)}`;
	}
	finally {
		pending.value = false;
		loaded.value = true;
	}
};
onMounted(refresh);

// ---- filters and sorting ----
const q = ref('');
const statusFilter = ref<'all' | 'active' | 'suspended'>('all');
const billingFilter = ref('all');
const suspendedCount = computed(() => orgs.value.filter(o => o.status === 'suspended').length);
const statusOptions = computed(() => [
	{ value: 'all' as const, label: 'All', count: orgs.value.length },
	{ value: 'active' as const, label: 'Active', count: orgs.value.filter(o => o.status === 'active').length },
	{ value: 'suspended' as const, label: 'Suspended', count: suspendedCount.value },
]);
const billingStatuses = computed(() => billingStatusesOf(orgs.value));
const billingKnown = computed(() => orgs.value.some(o => o.billing));

const sortKey = ref<OrgSortKey>('name');
const sortDir = ref<OrgSortDir>('asc');
const sortBy = (key: OrgSortKey, fresh = false) => {
	if (!fresh && sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
	else {
		sortKey.value = key;
		sortDir.value = orgSortDefaultDir(key);
	}
};

const rows = computed(() => sortOrgs(
	filterOrgs(orgs.value, { q: q.value, status: statusFilter.value, billing: billingFilter.value }),
	sortKey.value,
	sortDir.value,
));

const columns = computed<{ label: string; key?: OrgSortKey; right?: boolean }[]>(() => [
	{ label: 'Organization', key: 'name' },
	...(billingKnown.value ? [{ label: 'Plan', key: 'plan' as const }] : []),
	{ label: 'Devices / limit', key: 'devices' },
	{ label: 'Users', key: 'users', right: true },
	...(usage.value
		? [{ label: 'To devices, 30 d', key: 'transfer_in' as const, right: true }, { label: 'From devices, 30 d', key: 'transfer_out' as const, right: true }]
		: []),
	{ label: 'Last activity', key: 'last_activity' },
	{ label: 'Created', key: 'created' },
	{ label: 'Source', key: 'source' },
]);
const sortableColumns = computed(() => columns.value.filter((c): c is { label: string; key: OrgSortKey; right?: boolean } => !!c.key));

const bytesOrDash = (v: number | null | undefined) => (typeof v === 'number' ? formatBytes(v) : '—');
const activityTitle = (org: ConsoleOrg) => {
	const parts = [
		org.stats?.lastDeviceAt ? `Last device connect or disconnect: ${dateTime(org.stats.lastDeviceAt)}` : '',
		org.stats?.lastLoginAt ? `Last sign-in: ${dateTime(org.stats.lastLoginAt)}` : '',
	].filter(Boolean);
	return parts.length ? parts.join('\n') : 'No device connection or sign-in recorded yet';
};

// ---- actions ----
const createOpen = ref(false);
const limitOrg = ref<Organization | null>(null);
const statusOrg = ref<Organization | null>(null);
const adminOrg = ref<Organization | null>(null);

const rowActions = (org: ConsoleOrg) => [
	{ label: 'View details', icon: Eye, action: () => navigateTo(orgConsoleLink(org.id)) },
	{ label: 'Set device limit', icon: Gauge, action: () => (limitOrg.value = org) },
	...(org.status === 'suspended'
		? [{ label: 'Reactivate', icon: Play, action: () => (statusOrg.value = org) }]
		: [
				{ label: 'Add administrator', icon: UserPlus, action: () => (adminOrg.value = org) },
				{ label: 'Suspend', icon: Pause, danger: true, action: () => (statusOrg.value = org) },
			]),
];

const replace = (org: Organization) => {
	const i = orgs.value.findIndex(o => o.id === org.id);
	// Keep the stats and counts of the list row when the response leaves them out.
	if (i >= 0) orgs.value.splice(i, 1, { ...orgs.value[i], ...org });
	else orgs.value.push({ stats: null, billing: null, ...org, device_limit: org.device_limit ?? null, name: org.name || org.id });
};
const onSaved = (org: Organization, text: string) => {
	replace(org);
	snackbar.add({ type: 'success', text });
};
const onCreated = (org: Organization) => {
	replace(org);
	snackbar.add({ type: 'success', text: `Created ${org.name || org.id}. Add its first administrator next.` });
	adminOrg.value = orgs.value.find(o => o.id === org.id) ?? org;
};
const onAdminCreated = (admin: OrganizationAdmin) => {
	const org = orgs.value.find(o => o.id === admin.organization);
	if (org) replace({ ...org, user_count: (org.user_count ?? 0) + 1 });
};
</script>
