<template>
	<new-page-wrapper>
		<AppPage
			title="Servers"
			description="The cluster's nodes: which are live, how many devices each serves and the traffic each carries."
		>
			<template #actions>
				<OpSegmented
					:model-value="days"
					:options="SERVER_PERIODS"
					label="Period"
					size="sm"
					@update:model-value="setDays"
				/>
				<AppButton
					variant="secondary"
					:disabled="loading"
					aria-label="Reload the servers"
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
				v-if="unavailable"
				flush
			>
				<OpEmpty
					:icon="ServerIcon"
					title="Servers are not available"
					description="This server doesn't record cluster nodes (it runs on SQLite as a single node), or your account is not a platform operator."
				/>
			</AppCard>

			<template v-else>
				<div
					v-if="error"
					role="alert"
					class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
				>
					{{ error }}
				</div>

				<div :class="['grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4', loading && data ? 'opacity-60' : '']">
					<UsageTile
						label="Servers live"
						:icon="ServerIcon"
						:value="data ? `${formatCount(live)} / ${formatCount(data.nodes.length)}` : '–'"
						:detail="data ? `${formatCount(stale)} stale · ${formatCount(gone)} gone` : undefined"
						:loading="!data"
					/>
					<UsageTile
						label="Devices online"
						:icon="Monitor"
						:value="formatCount(data?.totals.onlineDevices)"
						:detail="data ? `On ${formatCount(live)} live ${live === 1 ? 'server' : 'servers'}` : undefined"
						:loading="!data"
					/>
					<UsageTile
						label="Connects, last 24 hours"
						:icon="Plug"
						:value="formatCount(connects)"
						:detail="data ? `${formatCount(disconnects)} disconnects` : undefined"
						:loading="!data"
					/>
					<InOutTile
						:label="`Traffic, last ${data?.days ?? days} days`"
						:value="data ? data.totals.transferPeriod : null"
						:loading="!data"
						unavailable="Couldn’t load it"
					/>
				</div>

				<div
					v-if="data && data.unassignedOnline > 0"
					class="flex items-start gap-2.5 rounded-xl border border-app-border bg-app-warn-bg p-4 text-sm text-app-warn"
				>
					<AlertTriangle
						class="mt-px h-[18px] w-[18px] shrink-0"
						aria-hidden="true"
					/>
					<span>{{ formatCount(data.unassignedOnline) }} {{ data.unassignedOnline === 1 ? 'device has a live session' : 'devices have a live session' }} on a node that isn't registered (no heartbeat recorded). They're not counted under any server below.</span>
				</div>

				<section
					aria-labelledby="servers-heading"
					class="overflow-hidden rounded-xl border border-app-border bg-app-surface"
				>
					<div class="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3.5">
						<h2
							id="servers-heading"
							class="text-[15px] font-semibold text-app-text"
						>
							Nodes <span
								v-if="data"
								class="font-medium text-app-text-3"
							>· {{ data.nodes.length }}</span>
						</h2>
						<p class="text-xs text-app-text-3">
							Live first, then stale; gone servers (no heartbeat for a day) last.
						</p>
					</div>

					<OpEmpty
						v-if="!data"
						:loading="!error"
						:icon="ServerIcon"
						:title="error ? 'Couldn’t load the servers' : 'Loading servers…'"
					/>
					<OpEmpty
						v-else-if="!data.nodes.length"
						:icon="ServerIcon"
						title="No servers yet"
						description="A node shows here once it sends its first heartbeat."
					/>
					<template v-else>
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full min-w-[1080px] border-collapse">
								<caption class="sr-only">
									Servers, live first; traffic is to devices, then from devices.
								</caption>
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
										v-for="n in data.nodes"
										:key="n.id"
										:class="['cursor-pointer hover:bg-app-hover [&:last-child>td]:border-b-0', n.status === 'gone' ? 'text-app-text-3' : '']"
										@click="openNode(n.id)"
									>
										<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]">
											<NuxtLink
												:to="serverLink(n.id)"
												class="block max-w-[220px] truncate rounded font-mono font-medium text-app-text hover:text-app-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
												@click.stop
											>
												{{ n.id }}
											</NuxtLink>
											<span class="block text-xs text-app-text-3">{{ n.region || 'No region' }}</span>
										</td>
										<td class="border-b border-app-border-subtle px-3 py-3">
											<ServerStatusPill :status="n.status" />
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 font-mono text-xs text-app-text-2">
											{{ n.version || '—' }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
											{{ rolesLabel(n.roles) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] font-semibold tabular-nums text-app-text">
											{{ formatCount(n.onlineDevices) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] tabular-nums text-app-text-2">
											{{ formatCount(n.organizations) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] tabular-nums text-app-text-2">
											{{ formatCount(n.connects24h) }} <span class="text-app-text-4">/</span> {{ formatCount(n.disconnects24h) }}
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] tabular-nums">
											<InOutCell :value="n.transferToday" />
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] tabular-nums">
											<InOutCell :value="n.transferPeriod" />
										</td>
										<td
											class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-3 pr-4 text-[13px] text-app-text-2"
											:title="dateTime(n.heartbeatAt)"
										>
											{{ timeAgo(n.heartbeatAt) }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>

						<ul class="divide-y divide-app-border-subtle md:hidden">
							<li
								v-for="n in data.nodes"
								:key="n.id"
							>
								<NuxtLink
									:to="serverLink(n.id)"
									class="flex flex-col gap-1 px-4 py-3 hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
								>
									<div class="flex items-center justify-between gap-3">
										<span class="min-w-0 truncate font-mono text-[15px] font-medium text-app-text">{{ n.id }}</span>
										<ServerStatusPill :status="n.status" />
									</div>
									<p class="text-xs text-app-text-3">
										{{ [n.region, n.version, rolesLabel(n.roles)].filter(x => x && x !== '—').join(' · ') || '—' }}
									</p>
									<p class="text-xs text-app-text-2">
										{{ formatCount(n.onlineDevices) }} devices online · {{ formatCount(n.organizations) }} orgs · heartbeat {{ timeAgo(n.heartbeatAt) }}
									</p>
									<p class="text-xs text-app-text-3">
										{{ data.days }} days: {{ formatBytes(n.transferPeriod.in) }} to devices · {{ formatBytes(n.transferPeriod.out) }} from devices
									</p>
								</NuxtLink>
							</li>
						</ul>
					</template>
					<p
						v-if="data && data.nodes.length"
						class="border-t border-app-border px-4 py-3 text-xs text-app-text-3"
					>
						Traffic shows to devices (in) over from devices (out), in UTC days.
						<template v-if="sinceNote">
							Traffic is attributed to servers only since {{ dayLabel(sinceNote) }}, so the {{ data.days }}-day totals cover less than the period.
						</template>
					</p>
				</section>
			</template>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { AlertTriangle, Monitor, Plug, RefreshCw, Server as ServerIcon } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import InOutCell from '~/components/operator/console/InOutCell.vue';
import InOutTile from '~/components/operator/console/InOutTile.vue';
import ServerStatusPill from '~/components/operator/console/ServerStatusPill.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import { dateTime, lastDays, timeAgo } from '~/utils/operatorConsole';
import {
	DEFAULT_SERVER_DAYS, SERVER_PERIODS, dayLabel, earliestMeteredSince, liveCount, meteredSinceNote, rolesLabel, serverLink, serverPeriod,
	type ServerList,
} from '~/utils/servers';
import { formatBytes, formatCount } from '~/utils/usage';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Servers' });

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();

const days = ref(serverPeriod(route.query.days));
const data = ref<ServerList | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const unavailable = ref(false);

let seq = 0;
const load = async () => {
	const mine = ++seq;
	loading.value = true;
	error.value = null;
	try {
		const res = await $api.operator.nodes(days.value);
		if (mine === seq) data.value = res;
	}
	catch (e) {
		if (mine !== seq) return;
		const status = httpStatusOf(e);
		// The endpoint doesn't exist on SQLite servers (or for non-operators).
		if (status === 404 || status === 501) unavailable.value = true;
		else error.value = `Couldn't load the servers: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === seq) loading.value = false;
	}
};
onMounted(load);

const setDays = (v: string | number) => {
	days.value = serverPeriod(v);
	router.replace({ query: { ...route.query, days: days.value === DEFAULT_SERVER_DAYS ? undefined : String(days.value) } });
	load();
};

const live = computed(() => liveCount(data.value?.nodes ?? []));
const stale = computed(() => (data.value?.nodes ?? []).filter(n => n.status === 'stale').length);
const gone = computed(() => (data.value?.nodes ?? []).filter(n => n.status === 'gone').length);
const connects = computed(() => (data.value?.nodes ?? []).reduce((a, n) => a + n.connects24h, 0));
const disconnects = computed(() => (data.value?.nodes ?? []).reduce((a, n) => a + n.disconnects24h, 0));
const sinceNote = computed(() => {
	if (!data.value) return null;
	return meteredSinceNote(earliestMeteredSince(data.value.nodes), lastDays(data.value.days)[0]);
});

const openNode = (id: string) => router.push(serverLink(id));

const columns = computed(() => [
	{ label: 'Server' },
	{ label: 'Status' },
	{ label: 'Version' },
	{ label: 'Roles' },
	{ label: 'Devices online', right: true },
	{ label: 'Orgs', right: true },
	{ label: 'Connects / disc. 24h', right: true },
	{ label: 'Traffic today', right: true },
	{ label: `Traffic ${data.value?.days ?? days.value} days`, right: true },
	{ label: 'Last heartbeat' },
]);
</script>
