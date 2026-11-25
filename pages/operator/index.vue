<template>
	<new-page-wrapper>
		<AppPage
			title="Overview"
			description="The whole platform at a glance: organizations, devices, transfer and what needs attention."
		>
			<template #actions>
				<span
					v-if="data?.generatedAt"
					class="text-xs text-app-text-3"
				>Updated {{ timeAgo(data.generatedAt) }}</span>
				<AppButton
					variant="secondary"
					:disabled="pending"
					aria-label="Reload the overview"
					@click="load"
				>
					<RefreshCw
						:class="['h-4 w-4', pending ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
			</template>

			<div
				v-if="error"
				role="alert"
				class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
			>
				{{ error }}
			</div>

			<!-- Tiles -->
			<div
				:class="['grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3', pending && data ? 'opacity-60' : '']"
			>
				<NuxtLink
					to="/operator/organizations"
					class="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
				>
					<UsageTile
						label="Organizations"
						:icon="Building2"
						:value="formatCount(data?.organizations.total)"
						:detail="orgDetail"
						:loading="!data"
					/>
				</NuxtLink>
				<UsageTile
					label="Devices online"
					:icon="Monitor"
					:value="data ? `${formatCount(data.devices.online)} / ${formatCount(data.devices.total)}` : '–'"
					:detail="data ? `${devicesOnlineShare} of all devices are connected` : undefined"
					:loading="!data"
				/>
				<NuxtLink
					to="/operator/invitations"
					class="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
				>
					<UsageTile
						label="Invitations pending"
						:icon="Mail"
						:value="data?.invitationsPending === null ? 'n/a' : formatCount(data?.invitationsPending)"
						detail="Accepted by the invitee in the app"
						:loading="!data"
					/>
				</NuxtLink>
				<InOutTile
					label="Transfer, last 24 hours"
					:value="data?.transfer?.last24h ?? null"
					:loading="!data"
				/>
				<InOutTile
					label="Transfer, last 30 days"
					:value="data?.transfer?.last30d ?? null"
					:loading="!data"
				/>
				<NuxtLink
					v-if="signupsShown"
					to="/operator/signups"
					class="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
				>
					<UsageTile
						label="Signups awaiting approval"
						:icon="UserPlus"
						:value="formatCount(data?.signupsAwaiting)"
						:detail="data?.oldestSignupWaitingSince ? `Oldest waiting since ${timeAgo(data.oldestSignupWaitingSince)}` : 'None waiting'"
						:loading="!data"
					/>
				</NuxtLink>
			</div>

			<!-- Needs attention -->
			<AppCard
				flush
				title="Needs attention"
				:description="data && data.attention.length ? `${data.attention.length} ${data.attention.length === 1 ? 'item' : 'items'}, most severe first` : undefined"
			>
				<OpEmpty
					v-if="!data"
					:loading="!error"
					:title="error ? 'Couldn’t load the overview' : 'Loading…'"
				/>
				<div
					v-else-if="!data.attention.length"
					class="flex items-center gap-3 px-4 py-5"
				>
					<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-ok-bg text-app-ok">
						<CircleCheck
							class="h-[18px] w-[18px]"
							aria-hidden="true"
						/>
					</span>
					<div>
						<p class="text-sm font-medium text-app-text">
							Nothing needs attention
						</p>
						<p class="text-[13px] text-app-text-3">
							No organization is near its device limit or transfer cap{{ billing ? ', no trial is ending' : '' }}{{ signup ? ' and no signup has waited a day' : '' }}.
						</p>
					</div>
				</div>
				<ul
					v-else
					class="divide-y divide-app-border-subtle"
				>
					<li
						v-for="(item, i) in data.attention"
						:key="`${item.kind}-${item.organization?.id ?? ''}-${i}`"
					>
						<component
							:is="attentionLink(item) ? NuxtLink : 'div'"
							:to="attentionLink(item) ?? undefined"
							:class="['flex items-start gap-3 px-4 py-3', attentionLink(item) ? 'hover:bg-app-hover' : '']"
						>
							<span
								:class="['mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', item.severity === 'critical' ? 'bg-app-danger-bg text-app-danger' : item.severity === 'warning' ? 'bg-app-warn-bg text-app-warn' : 'bg-app-muted text-app-text-3']"
							>
								<component
									:is="item.severity === 'critical' ? OctagonAlert : item.severity === 'warning' ? AlertTriangle : Info"
									class="h-4 w-4"
									aria-hidden="true"
								/>
							</span>
							<div class="min-w-0 flex-1">
								<p class="flex flex-wrap items-center gap-x-2 text-sm">
									<span :class="['text-xs font-semibold uppercase tracking-[0.04em]', item.severity === 'critical' ? 'text-app-danger' : item.severity === 'warning' ? 'text-app-warn' : 'text-app-text-3']">{{ severityLabel(item.severity) }}</span>
									<span class="font-medium text-app-text">{{ attentionLabel(item.kind) }}</span>
									<span
										v-if="item.organization"
										class="text-app-text-2"
									>· {{ item.organization.name }}</span>
								</p>
								<p
									v-if="item.message"
									class="mt-0.5 text-[13px] text-app-text-3"
								>
									{{ item.message }}
								</p>
							</div>
							<ChevronRight
								v-if="attentionLink(item)"
								class="mt-1.5 h-4 w-4 shrink-0 text-app-text-4"
								aria-hidden="true"
							/>
						</component>
					</li>
				</ul>
			</AppCard>

			<!-- 30-day charts -->
			<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<AppCard
					title="Transfer per day"
					description="Last 30 days (UTC): to devices and from devices."
				>
					<ConsoleChart
						v-if="data"
						label="Platform transfer per day, to devices and from devices"
						kind="line"
						format="bytes"
						:days="series.days"
						:series="[{ label: 'To devices', values: series.in }, { label: 'From devices', values: series.out }]"
						:empty-title="data.metering ? 'No usage recorded yet' : 'Usage metering is off'"
						:empty-description="data.metering ? 'Metering has only just started; days fill in as devices move data.' : 'Turn on [usage] in the server configuration to record transfer.'"
					/>
					<OpEmpty
						v-else
						:loading="!error"
						title="Loading…"
					/>
				</AppCard>
				<AppCard
					title="Devices per day"
					description="Devices that had a session each day, last 30 days (UTC)."
				>
					<ConsoleChart
						v-if="data"
						label="Devices with a session per day"
						:days="series.days"
						:series="[{ label: 'Devices', values: series.devices }]"
						peak-total
						:empty-title="data.metering ? 'No usage recorded yet' : 'Usage metering is off'"
						:empty-description="data.metering ? 'Metering has only just started; each day counts the devices that connected.' : undefined"
					/>
					<OpEmpty
						v-else
						:loading="!error"
						title="Loading…"
					/>
				</AppCard>
			</div>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { AlertTriangle, Building2, ChevronRight, CircleCheck, Info, Mail, Monitor, OctagonAlert, RefreshCw, UserPlus } from 'lucide-vue-next';
import { NuxtLink } from '#components';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import ConsoleChart from '~/components/operator/console/ConsoleChart.vue';
import InOutTile from '~/components/operator/console/InOutTile.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import {
	attentionLabel, attentionLink, daySeries, lastDays, severityLabel, timeAgo, type Overview,
} from '~/utils/operatorConsole';
import { formatCount } from '~/utils/usage';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Operator console' });

const { $api } = useNuxtApp();
const { billing, signup } = useCapabilities();

const data = ref<Overview | null>(null);
const pending = ref(false);
const error = ref<string | null>(null);

const load = async () => {
	pending.value = true;
	error.value = null;
	try {
		data.value = await $api.operator.overview();
	}
	catch (e) {
		error.value = `Couldn't load the overview: ${apiErrorMessage(e)}`;
	}
	finally {
		pending.value = false;
	}
};
onMounted(load);

const orgDetail = computed(() => {
	const o = data.value?.organizations;
	if (!o) return undefined;
	return [`${formatCount(o.active)} active`, ...(billing.value ? [`${formatCount(o.trial)} trial`] : []), `${formatCount(o.suspended)} suspended`].join(' · ');
});

const devicesOnlineShare = computed(() => {
	const d = data.value?.devices;
	if (!d || !d.total) return '0 %';
	return `${Math.round((d.online / d.total) * 100)} %`;
});

const signupsShown = computed(() => signup.value || (data.value?.signupsAwaiting ?? null) !== null);

// The server sends every day; the series is laid over the last 30 UTC days anyway, so gaps read as zero.
const series = computed(() => daySeries(data.value?.series ?? [], lastDays(30)));
</script>
