<template>
	<new-page-wrapper>
		<!-- Not a platform operator (or a standalone server): nothing to manage. -->
		<AppPage
			v-if="!operator"
			title="Organizations"
		>
			<AppCard flush>
				<OpEmpty
					:icon="Building2"
					:loading="!statusReady"
					:title="statusReady ? 'Only platform operators manage organizations' : 'Loading…'"
					:description="statusReady ? 'This server has no operator API, or your account is not a platform operator.' : undefined"
				/>
			</AppCard>
		</AppPage>

		<OrgDetail
			v-else-if="detailId"
			:id="detailId"
			:org="detailOrg"
			:month-transfer="detailOrg ? transferById[detailOrg.id] : undefined"
			@changed="onChanged"
			@limit="limitOrg = $event"
			@admin="adminOrg = $event"
			@status="statusOrg = $event"
		/>

		<AppPage
			v-else
			title="Organizations"
			description="Every organization on this server. Platform operators only; every change is written to the operator audit log."
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

			<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
				<UsageTile
					label="Organizations"
					:value="formatCount(orgs.length)"
					:loading="!loaded"
				/>
				<UsageTile
					label="Suspended"
					:value="formatCount(suspendedCount)"
					:loading="!loaded"
				/>
				<UsageTile
					label="Devices"
					:value="formatCount(deviceTotal)"
					:loading="!loaded"
				/>
				<UsageTile
					v-if="usage"
					:label="`Transfer in ${monthLabel(month).split(' ')[0]}`"
					:value="formatBytes(transferTotal)"
					:detail="`≈ ${formatUsd(estimateEgressCost(transferTotal))} egress (estimate)`"
					:loading="!usageLoaded"
				/>
				<UsageTile
					v-else
					label="Users"
					:value="formatCount(userTotal)"
					:loading="!loaded"
				/>
			</div>

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
					:description="orgs.length ? 'Change the search or the status filter.' : 'Create one, then add its first administrator.'"
				/>
				<template v-else-if="rows.length">
					<!-- Desktop table -->
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[760px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in columns"
										:key="col.label"
										scope="col"
										:class="['whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4', col.right ? 'text-right' : 'text-left']"
									>
										{{ col.label }}
									</th>
									<th
										scope="col"
										class="w-14 border-b border-app-border px-3 py-2.5 pr-4"
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
										<NuxtLink
											:to="orgLink(org.id)"
											active-class=""
											exact-active-class=""
											class="block max-w-[260px] truncate font-medium text-app-text hover:text-app-link hover:underline"
										>
											{{ org.name || org.id }}
										</NuxtLink>
										<span class="block truncate font-mono text-xs text-app-text-3">{{ org.id }}</span>
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3">
										<OrgStatusPill :status="org.status" />
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px]">
										<OrgDeviceLimit :org="org" />
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
										{{ formatCount(org.user_count) }}
									</td>
									<td
										class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2"
										:title="org.created_at"
									>
										{{ formatDate(org.created_at) }}
									</td>
									<td
										v-if="usage"
										class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] font-medium text-app-text"
									>
										{{ usageLoaded ? formatBytes(transferById[org.id] ?? 0) : '–' }}
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
								:to="orgLink(org.id)"
								active-class=""
								exact-active-class=""
								class="min-w-0 flex-1"
							>
								<div class="flex flex-wrap items-center gap-2">
									<span class="truncate text-[15px] font-medium text-app-text">{{ org.name || org.id }}</span>
									<OrgStatusPill :status="org.status" />
								</div>
								<span class="mt-0.5 block truncate font-mono text-xs text-app-text-3">{{ org.id }}</span>
								<dl class="mt-2 grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
									<dt class="text-app-text-3">
										Devices
									</dt>
									<dd><OrgDeviceLimit :org="org" /></dd>
									<dt class="text-app-text-3">
										Users
									</dt>
									<dd class="text-app-text-2">
										{{ formatCount(org.user_count) }}
									</dd>
									<template v-if="usage">
										<dt class="text-app-text-3">
											Transfer
										</dt>
										<dd class="font-medium text-app-text">
											{{ usageLoaded ? formatBytes(transferById[org.id] ?? 0) : '–' }} <span class="font-normal text-app-text-3">this month</span>
										</dd>
									</template>
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
import { Building2, Eye, Gauge, Pause, Play, Plus, RefreshCw, Search, UserPlus } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import OrgAdminDialog from '~/components/operator/OrgAdminDialog.vue';
import OrgCreateDialog from '~/components/operator/OrgCreateDialog.vue';
import OrgDetail from '~/components/operator/OrgDetail.vue';
import OrgDeviceLimit from '~/components/operator/OrgDeviceLimit.vue';
import OrgLimitDialog from '~/components/operator/OrgLimitDialog.vue';
import OrgStatusDialog from '~/components/operator/OrgStatusDialog.vue';
import OrgStatusPill from '~/components/operator/OrgStatusPill.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import type { Organization, OrganizationAdmin } from '~/repository/modules/operator';
import {
	currentMonth,
	estimateEgressCost,
	formatBytes,
	formatCount,
	formatUsd,
	monthLabel,
	transferOf,
} from '~/utils/usage';

useHead({ title: 'Organizations' });

const { $api } = useNuxtApp();
const route = useRoute();
const snackbar = useSnackbar();
const statusStore = useStatusStore();
const { operator, usage } = useCapabilities();
const statusReady = computed(() => !!statusStore.status?.version);

const orgs = ref<Organization[]>([]);
const loaded = ref(false);
const pending = ref(false);
const loadError = ref<string | null>(null);
const month = currentMonth();
const transferById = ref<Record<string, number>>({});
const usageLoaded = ref(false);

const refresh = async () => {
	if (!operator.value) return;
	pending.value = true;
	loadError.value = null;
	try {
		orgs.value = await $api.operator.list();
	}
	catch (e) {
		loadError.value = `Couldn't load the organizations: ${apiErrorMessage(e)}`;
	}
	finally {
		pending.value = false;
		loaded.value = true;
	}
	if (usage.value) loadUsage();
};

const loadUsage = async () => {
	try {
		const res = await $api.operator.usage(month);
		transferById.value = Object.fromEntries((res?.organizations ?? []).map(o => [o.id, transferOf(o.totals)]));
	}
	catch {
		transferById.value = {};
	}
	finally {
		usageLoaded.value = true;
	}
};

watch(operator, ok => ok && refresh(), { immediate: true });

const detailId = computed(() => (typeof route.query.id === 'string' && route.query.id ? route.query.id : null));
const detailOrg = computed(() => orgs.value.find(o => o.id === detailId.value) ?? null);

// ---- list ----
const q = ref('');
const statusFilter = ref<'all' | 'active' | 'suspended'>('all');
const suspendedCount = computed(() => orgs.value.filter(o => o.status === 'suspended').length);
const deviceTotal = computed(() => orgs.value.reduce((n, o) => n + (o.device_count ?? 0), 0));
const userTotal = computed(() => orgs.value.reduce((n, o) => n + (o.user_count ?? 0), 0));
const transferTotal = computed(() => Object.values(transferById.value).reduce((a, b) => a + b, 0));
const statusOptions = computed(() => [
	{ value: 'all' as const, label: 'All', count: orgs.value.length },
	{ value: 'active' as const, label: 'Active', count: orgs.value.length - suspendedCount.value },
	{ value: 'suspended' as const, label: 'Suspended', count: suspendedCount.value },
]);
const rows = computed(() => {
	const needle = q.value.trim().toLowerCase();
	return orgs.value.filter(o => (statusFilter.value === 'all' || o.status === statusFilter.value)
		&& (!needle || o.id.toLowerCase().includes(needle) || (o.name ?? '').toLowerCase().includes(needle)));
});
const columns = computed(() => [
	{ label: 'Organization' },
	{ label: 'Status' },
	{ label: 'Devices / limit' },
	{ label: 'Users', right: true },
	{ label: 'Created' },
	...(usage.value ? [{ label: 'Transfer this month', right: true }] : []),
]);

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const formatDate = (value: string) => {
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
};

// ---- actions ----
const createOpen = ref(false);
const limitOrg = ref<Organization | null>(null);
const statusOrg = ref<Organization | null>(null);
const adminOrg = ref<Organization | null>(null);

const rowActions = (org: Organization) => [
	{ label: 'View details and usage', icon: Eye, action: () => navigateTo(orgLink(org.id)) },
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
	// Keep the counts of the list row when the response leaves them out.
	if (i >= 0) orgs.value.splice(i, 1, { ...orgs.value[i], ...org });
	else orgs.value.push(org);
};
const onSaved = (org: Organization, text: string) => {
	replace(org);
	snackbar.add({ type: 'success', text });
};
const onChanged = (org: Organization) => replace(org);
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
