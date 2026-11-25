<template>
	<new-page-wrapper>
		<AppPage
			title="Usage"
			description="What your organization used this month: transfer through tunnels and uploads, devices and jobs."
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
					:title="statusReady ? 'Usage is not available' : 'Loading…'"
					:description="statusReady ? 'Usage metering is off on this server, or your account is not in the Administrators group.' : undefined"
				/>
			</AppCard>
			<UsageReportView
				v-else
				:report="report"
				:month="month"
				:loading="loading"
				:error="error"
				:device-names="deviceNames"
				link-devices
			/>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { BarChart3, RefreshCw } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import UsageMonthPicker from '~/components/usage/UsageMonthPicker.vue';
import UsageReportView from '~/components/usage/UsageReportView.vue';
import { currentMonth, isMonth, monthQuery, type UsageReport } from '~/utils/usage';

useHead({ title: 'Usage' });

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const statusStore = useStatusStore();
const { usage, operator } = useCapabilities();
const { isAdmin, profileReady } = useIsAdmin();

const statusReady = computed(() => !!statusStore.status?.version && profileReady.value);
const available = computed(() => usage.value && isAdmin.value && !operator.value);

const month = ref(isMonth(String(route.query.month ?? '')) ? String(route.query.month) : currentMonth());
const report = ref<UsageReport | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const deviceNames = ref<Record<string, string>>({});

let seq = 0;
const load = async () => {
	if (!available.value) return;
	const mine = ++seq;
	loading.value = true;
	error.value = null;
	try {
		const data = await $api.usage.report({ ...monthQuery(month.value), granularity: 'day' });
		if (mine !== seq) return;
		report.value = data;
		loadNames(data);
	}
	catch (e) {
		if (mine !== seq) return;
		report.value = null;
		error.value = `Couldn't load the usage: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === seq) loading.value = false;
	}
};

// Names for the top devices (best effort; the table falls back to ids).
const loadNames = async (data: UsageReport) => {
	const ids = (data.top_devices ?? []).map(d => d.client_id).filter(id => !(id in deviceNames.value));
	if (!ids.length) return;
	try {
		const res = await $api.clients.getClientsName(ids);
		const next = { ...deviceNames.value };
		for (const c of res?.data ?? []) if (c.id && c.name) next[c.id] = c.name;
		deviceNames.value = next;
	}
	catch {
		// ids only
	}
};

watch(month, (m) => {
	router.replace({ query: { ...route.query, month: m === currentMonth() ? undefined : m } });
	load();
});
watch(available, (ok) => {
	if (ok && !report.value) load();
}, { immediate: true });
</script>
