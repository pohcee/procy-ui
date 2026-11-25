<template>
	<!-- One organization at a glance: a KPI row, then daily transfer, devices and jobs over 7, 30 or 90 days. -->
	<div class="flex flex-col gap-5">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
			<UsageTile
				label="Devices online"
				:icon="Monitor"
				:value="devices ? `${formatCount(devices.online)} / ${formatCount(devices.total)}` : '–'"
				:detail="org.device_limit === null ? 'No device limit' : `Limit ${formatCount(org.device_limit)}`"
				:loading="devices === null && !devicesError"
			/>
			<UsageTile
				label="Users"
				:icon="UsersIcon"
				:value="formatCount(org.user_count)"
			/>
			<InOutTile
				label="Transfer this month"
				:value="month?.metering && month.totals ? { in: month.totals.in, out: month.totals.out } : null"
				:loading="month === null && !monthError"
				:unavailable="monthError ? 'Couldn’t load it' : 'Usage metering is off'"
			/>
			<UsageTile
				label="Jobs this month"
				:icon="Terminal"
				:value="month?.metering ? formatCount(month.totals?.jobs ?? 0) : 'n/a'"
				:detail="month?.metering && month.totals?.jobs ? `${formatCount(month.totals.jobsCommand)} commands · ${formatCount(month.totals.jobsScript)} scripts · ${formatCount(month.totals.jobsLibrary)} library` : undefined"
				:loading="month === null && !monthError"
			/>
			<UsageTile
				label="Plan"
				:icon="CreditCard"
				:value="billing ? (plan?.name || '—') : 'n/a'"
				:detail="billing ? plan?.status : 'Billing is not enabled on this server'"
				:loading="billing && plan === null"
			/>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-lg font-semibold text-app-text">
				Usage per day
			</h2>
			<OpSegmented
				:model-value="range"
				:options="STATS_RANGES.map(r => ({ value: r.value, label: r.label }))"
				label="Time range"
				size="sm"
				@update:model-value="setRange"
			/>
		</div>

		<AppCard
			v-if="!usage || report?.metering === false"
			flush
		>
			<OpEmpty
				:icon="BarChart3"
				title="Usage metering is off"
				description="This server doesn't record transfer, devices per day or jobs. Turn on [usage] in the server configuration."
			/>
		</AppCard>
		<div
			v-else-if="reportError"
			role="alert"
			class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
		>
			{{ reportError }}
		</div>
		<div
			v-else
			:class="['grid grid-cols-1 gap-4 xl:grid-cols-2', loadingReport && report ? 'opacity-60' : '']"
		>
			<AppCard
				class="xl:col-span-2"
				title="Transfer per day"
				description="To devices and from devices (UTC days)."
			>
				<ConsoleChart
					v-if="report"
					:label="`Transfer per day of ${org.name || org.id}, to and from devices`"
					kind="line"
					format="bytes"
					:days="series.days"
					:series="[{ label: 'To devices', values: series.in }, { label: 'From devices', values: series.out }]"
					:empty-description="emptyHelp"
				/>
				<OpEmpty
					v-else
					loading
					title="Loading…"
				/>
			</AppCard>
			<AppCard
				title="Devices per day"
				description="Devices that had a session each day."
			>
				<ConsoleChart
					v-if="report"
					:label="`Devices with a session per day of ${org.name || org.id}`"
					:days="series.days"
					:series="[{ label: 'Devices', values: series.devices }]"
					peak-total
					compact
					:empty-description="emptyHelp"
				/>
				<OpEmpty
					v-else
					loading
					title="Loading…"
				/>
			</AppCard>
			<AppCard
				title="Jobs per day"
				description="Commands, scripts and library runs started."
			>
				<ConsoleChart
					v-if="report"
					:label="`Jobs per day of ${org.name || org.id}, by type`"
					:days="series.days"
					:series="[{ label: 'Commands', values: series.jobsCommand }, { label: 'Scripts', values: series.jobsScript }, { label: 'Library', values: series.jobsLibrary }]"
					stacked
					compact
					:empty-title="seriesHasData(series) ? 'No jobs in this range' : 'No usage recorded yet'"
					:empty-description="seriesHasData(series) ? undefined : emptyHelp"
				/>
				<OpEmpty
					v-else
					loading
					title="Loading…"
				/>
			</AppCard>
		</div>
	</div>
</template>

<script setup lang="ts">
import { BarChart3, CreditCard, Monitor, Terminal, Users as UsersIcon } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import ConsoleChart from '~/components/operator/console/ConsoleChart.vue';
import InOutTile from '~/components/operator/console/InOutTile.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import type { Organization } from '~/repository/modules/operator';
import { accountPill } from '~/utils/billing';
import {
	STATS_RANGES, daySeries, isStatsRange, monthToDateQuery, rangeQuery, seriesHasData,
	type OrgDevices, type OrgStatsReport, type StatsRange,
} from '~/utils/operatorConsole';
import { formatCount } from '~/utils/usage';

const props = defineProps<{ org: Organization }>();

const { $api } = useNuxtApp();
const { usage, billing } = useCapabilities();
const route = useRoute();
const router = useRouter();

const emptyHelp = 'Metering has only just started on this server; days fill in as devices connect and move data.';

// ---- range (?range=7d|30d|90d, linkable) ----
const range = computed<StatsRange>(() => (isStatsRange(route.query.range) ? route.query.range : '30d'));
const setRange = (r: StatsRange) => router.replace({ query: { ...route.query, range: r === '30d' ? undefined : r } });

// ---- devices (online / total) ----
const devices = ref<OrgDevices | null>(null);
const devicesError = ref(false);
const loadDevices = async () => {
	devicesError.value = false;
	try {
		devices.value = await $api.operator.orgDevices(props.org.id);
	}
	catch {
		devicesError.value = true;
		devices.value = { total: props.org.device_count, online: 0, devices: [], byVersion: [], byOs: [] };
	}
};

// ---- plan ----
const plan = ref<{ name: string; status: string } | null>(null);
const loadPlan = async () => {
	if (!billing.value) return;
	try {
		const a = await $api.billing.orgAccount(props.org.id);
		plan.value = { name: a.plan_details?.name || a.plan || '—', status: accountPill(a).label };
	}
	catch {
		plan.value = { name: '—', status: 'Couldn’t load the billing' };
	}
};

// ---- this month ----
const month = ref<OrgStatsReport | null>(null);
const monthError = ref(false);
const loadMonth = async () => {
	if (!usage.value) {
		month.value = { metering: false, periods: [], totals: null };
		return;
	}
	monthError.value = false;
	try {
		month.value = await $api.operator.orgStats(props.org.id, monthToDateQuery());
	}
	catch {
		monthError.value = true;
	}
};

// ---- range report ----
const report = ref<OrgStatsReport | null>(null);
const reportError = ref<string | null>(null);
const loadingReport = ref(false);
const days = ref<string[]>(rangeQuery(range.value).days);
let seq = 0;
const loadReport = async () => {
	if (!usage.value) return;
	const mine = ++seq;
	const q = rangeQuery(range.value);
	loadingReport.value = true;
	reportError.value = null;
	try {
		const r = await $api.operator.orgStats(props.org.id, { from: q.from, to: q.to, granularity: q.granularity });
		if (mine !== seq) return;
		report.value = r;
		days.value = q.days;
	}
	catch (e) {
		if (mine === seq) reportError.value = `Couldn't load the usage: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === seq) loadingReport.value = false;
	}
};

const series = computed(() => daySeries(report.value?.periods ?? [], days.value));

watch(() => props.org.id, () => {
	devices.value = null;
	report.value = null;
	month.value = null;
	plan.value = null;
	loadDevices();
	loadPlan();
	loadMonth();
	loadReport();
}, { immediate: true });
watch(range, loadReport);
</script>
