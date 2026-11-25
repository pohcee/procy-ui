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
import { ChevronLeft, CirclePause, Gauge, Pause, Play, UserPlus } from 'lucide-vue-next';
import OrgDeviceLimit from '~/components/operator/OrgDeviceLimit.vue';
import OrgStatusPill from '~/components/operator/OrgStatusPill.vue';
import UsageMonthPicker from '~/components/usage/UsageMonthPicker.vue';
import UsageReportView from '~/components/usage/UsageReportView.vue';
import type { Organization } from '~/repository/modules/operator';
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
const { usage } = useCapabilities();

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
