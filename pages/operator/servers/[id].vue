<template>
	<new-page-wrapper>
		<AppPage>
			<template #header>
				<div class="min-w-0">
					<NuxtLink
						to="/operator/servers"
						class="mb-2 inline-flex items-center gap-1 rounded text-[13px] font-medium text-app-text-3 hover:text-app-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
					>
						<ChevronLeft
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Servers
					</NuxtLink>
					<div class="flex flex-wrap items-center gap-2.5">
						<h1 class="truncate font-mono text-2xl font-bold tracking-tight text-app-text sm:text-[28px] sm:leading-tight">
							{{ id }}
						</h1>
						<ServerStatusPill
							v-if="node"
							:status="node.status"
						/>
					</div>
					<p
						v-if="node"
						class="mt-1 text-[13px] text-app-text-3"
					>
						{{ node.region || 'No region' }} · heartbeat {{ timeAgo(node.heartbeatAt) }}
					</p>
				</div>
			</template>
			<template
				v-if="!notFound"
				#actions
			>
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
					aria-label="Reload the server"
					@click="reload"
				>
					<RefreshCw
						:class="['h-4 w-4', loading ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
			</template>

			<AppCard
				v-if="notFound"
				flush
			>
				<OpEmpty
					:icon="ServerOff"
					title="Server not found"
					:description="`No node with the id ${id} has sent a heartbeat to this cluster.`"
				>
					<NuxtLink
						to="/operator/servers"
						class="inline-flex h-10 items-center rounded-[10px] border border-app-border-strong bg-app-surface px-4 text-sm font-medium text-app-text hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
					>
						All servers
					</NuxtLink>
				</OpEmpty>
			</AppCard>

			<template v-else>
				<div
					v-if="error"
					role="alert"
					class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
				>
					{{ error }}
				</div>

				<!-- Facts -->
				<AppCard v-if="node">
					<dl class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-6">
						<div
							v-for="f in facts"
							:key="f.label"
							class="min-w-0"
						>
							<dt class="text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3">
								{{ f.label }}
							</dt>
							<dd
								:class="['mt-1 truncate text-sm text-app-text', f.mono ? 'font-mono text-[13px]' : '']"
								:title="f.title"
							>
								{{ f.value }}
							</dd>
						</div>
					</dl>
				</AppCard>
				<OpEmpty
					v-else-if="!error"
					loading
					title="Loading server…"
				/>

				<template v-if="detail && node">
					<div :class="['grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4', loading ? 'opacity-60' : '']">
						<UsageTile
							label="Devices online"
							:icon="Monitor"
							:value="formatCount(node.onlineDevices)"
							:detail="`In ${formatCount(node.organizations)} ${node.organizations === 1 ? 'organization' : 'organizations'}`"
						/>
						<UsageTile
							label="Connects, last 24 hours"
							:icon="Plug"
							:value="formatCount(node.connects24h)"
							:detail="`${formatCount(node.disconnects24h)} disconnects`"
						/>
						<InOutTile
							label="Traffic today"
							:value="node.transferToday"
						/>
						<InOutTile
							:label="`Traffic, last ${detail.days} days`"
							:value="node.transferPeriod"
						/>
					</div>

					<p
						v-if="sinceNote"
						class="-mt-2 flex items-center gap-2 text-[13px] text-app-text-3"
					>
						<Info
							class="h-4 w-4 shrink-0"
							aria-hidden="true"
						/>
						Traffic is attributed to this server since {{ dayLabel(sinceNote) }}; earlier days show none.
					</p>

					<div :class="['grid grid-cols-1 gap-4 xl:grid-cols-2', loading ? 'opacity-60' : '']">
						<AppCard
							title="Transfer per day"
							description="To devices and from devices (UTC days)."
						>
							<ConsoleChart
								:label="`Transfer per day through server ${id}, to and from devices`"
								kind="line"
								format="bytes"
								:days="series.days"
								:series="[{ label: 'To devices', values: series.in }, { label: 'From devices', values: series.out }]"
								empty-title="No traffic recorded"
								:empty-description="sinceNote ? `Traffic is attributed to servers since ${dayLabel(sinceNote)}.` : 'Days fill in as devices on this server move data.'"
								compact
							/>
						</AppCard>
						<AppCard
							title="Connections per day"
							description="Device sessions started and ended on this server."
						>
							<ConsoleChart
								:label="`Device connects and disconnects per day on server ${id}`"
								:days="series.days"
								:series="[{ label: 'Connects', values: series.connects }, { label: 'Disconnects', values: series.disconnects }]"
								empty-title="No connections in this period"
								compact
							/>
						</AppCard>
					</div>

					<div class="grid grid-cols-1 gap-4 xl:grid-cols-5">
						<!-- Organizations -->
						<AppCard
							flush
							class="xl:col-span-2"
							title="Organizations on this server"
							:description="detail.organizations.length ? 'By devices online here, most first.' : undefined"
						>
							<OpEmpty
								v-if="!detail.organizations.length"
								:icon="Building2"
								title="No organizations"
								description="No device has a live session on this server."
							/>
							<table
								v-else
								class="w-full border-collapse text-left"
							>
								<caption class="sr-only">
									Organizations with devices online on server {{ id }}
								</caption>
								<thead>
									<tr class="bg-app-surface-2">
										<th
											scope="col"
											class="border-b border-app-border py-2.5 pl-4 pr-3 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
										>
											Organization
										</th>
										<th
											scope="col"
											class="whitespace-nowrap border-b border-app-border py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
										>
											Devices online
										</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="o in detail.organizations"
										:key="o.id"
										class="hover:bg-app-hover [&:last-child>td]:border-b-0"
									>
										<td class="border-b border-app-border-subtle py-2.5 pl-4 pr-3 text-[13px]">
											<NuxtLink
												:to="orgConsoleLink(o.id)"
												class="block max-w-[260px] truncate rounded font-medium text-app-text hover:text-app-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
											>
												{{ o.name }}
											</NuxtLink>
											<span class="block font-mono text-xs text-app-text-3">{{ o.id }}</span>
										</td>
										<td class="whitespace-nowrap border-b border-app-border-subtle py-2.5 pl-3 pr-4 text-right text-[13px] font-semibold tabular-nums text-app-text">
											{{ formatCount(o.onlineDevices) }}
										</td>
									</tr>
								</tbody>
							</table>
						</AppCard>

						<!-- Recent connections -->
						<AppCard
							flush
							class="xl:col-span-3"
							title="Recent connections"
							:description="detail.events.length ? `The latest ${detail.events.length}, newest first.` : undefined"
						>
							<OpEmpty
								v-if="!detail.events.length"
								:icon="Plug"
								title="No connections yet"
								description="Device connects and disconnects on this server show here."
							/>
							<ul
								v-else
								class="max-h-[420px] divide-y divide-app-border-subtle overflow-y-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
								tabindex="0"
								aria-label="Recent connections, newest first"
							>
								<li
									v-for="(e, i) in detail.events"
									:key="`${e.at}-${e.clientId}-${i}`"
									class="flex items-center gap-3 px-4 py-2.5"
								>
									<span
										:class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', e.event === 'connected' ? 'bg-app-ok-bg text-app-ok' : 'bg-app-muted text-app-text-3']"
									>
										<component
											:is="e.event === 'connected' ? Plug : Unplug"
											class="h-3.5 w-3.5"
											aria-hidden="true"
										/>
									</span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-[13px]">
											<span class="font-medium text-app-text">{{ e.deviceName || 'Unknown device' }}</span>
											<span class="text-app-text-2"> · {{ eventLabel(e.event).toLowerCase() }}</span>
										</p>
										<p class="truncate text-xs text-app-text-3">
											<NuxtLink
												v-if="e.organization"
												:to="orgConsoleLink(e.organization, 'devices')"
												class="rounded hover:text-app-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
											>{{ e.organizationName || e.organization }}</NuxtLink>
											<span
												v-if="e.clientId && e.clientId !== e.deviceName"
												class="font-mono"
											> · {{ e.clientId }}</span>
										</p>
									</div>
									<time
										:datetime="e.at"
										:title="dateTime(e.at)"
										class="shrink-0 whitespace-nowrap text-xs text-app-text-3"
									>{{ timeAgo(e.at) }}</time>
								</li>
							</ul>
						</AppCard>
					</div>

					<!-- Devices -->
					<AppCard
						flush
						:title="devices ? `Devices online · ${formatCount(devices.count)}` : 'Devices online'"
						description="Devices with a live session on this server, by organization. Metadata only."
					>
						<div
							v-if="devicesError"
							role="alert"
							class="m-4 rounded-[10px] bg-app-danger-bg p-3 text-sm text-app-danger"
						>
							{{ devicesError }}
						</div>
						<OpEmpty
							v-if="!devices || !devices.devices.length"
							:icon="Monitor"
							:loading="!devices && !devicesError"
							:title="!devices ? (devicesError ? 'Couldn’t load the devices' : 'Loading devices…') : 'No devices online'"
							:description="devices && !devices.devices.length ? 'No device has a live session on this server.' : undefined"
						/>
						<template v-else>
							<div class="hidden overflow-x-auto md:block">
								<table :class="['w-full min-w-[760px] border-collapse text-left', devicesLoading ? 'opacity-60' : '']">
									<caption class="sr-only">
										Devices with a live session on server {{ id }}
									</caption>
									<thead>
										<tr class="bg-app-surface-2">
											<th
												v-for="h in ['Device', 'Organization', 'Version', 'OS', 'Connected']"
												:key="h"
												scope="col"
												class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4 last:pr-4"
											>
												{{ h }}
											</th>
										</tr>
									</thead>
									<tbody>
										<tr
											v-for="d in devices.devices"
											:key="`${d.organization}/${d.id}`"
											class="hover:bg-app-hover [&:last-child>td]:border-b-0"
										>
											<td class="border-b border-app-border-subtle py-2.5 pl-4 pr-3 text-[13px]">
												<span class="block max-w-[240px] truncate font-medium text-app-text">{{ d.name }}</span>
												<span class="block max-w-[240px] truncate font-mono text-xs text-app-text-3">{{ d.id }}</span>
											</td>
											<td class="border-b border-app-border-subtle px-3 py-2.5 text-[13px]">
												<NuxtLink
													v-if="d.organization"
													:to="orgConsoleLink(d.organization, 'devices')"
													class="block max-w-[220px] truncate rounded text-app-text-2 hover:text-app-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
												>
													{{ d.organizationName }}
												</NuxtLink>
												<span
													v-else
													class="text-app-text-3"
												>—</span>
											</td>
											<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 font-mono text-xs text-app-text-2">
												{{ d.version || '—' }}
											</td>
											<td class="max-w-[200px] truncate border-b border-app-border-subtle px-3 py-2.5 text-[13px] text-app-text-2">
												{{ d.os || '—' }}
											</td>
											<td
												class="whitespace-nowrap border-b border-app-border-subtle py-2.5 pl-3 pr-4 text-[13px] text-app-text-2"
												:title="dateTime(d.connectedAt)"
											>
												{{ timeAgo(d.connectedAt) }}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
							<ul class="divide-y divide-app-border-subtle md:hidden">
								<li
									v-for="d in devices.devices"
									:key="`${d.organization}/${d.id}`"
									class="px-4 py-3"
								>
									<span class="block truncate text-[15px] font-medium text-app-text">{{ d.name }}</span>
									<p class="mt-1 text-xs text-app-text-3">
										<NuxtLink
											v-if="d.organization"
											:to="orgConsoleLink(d.organization, 'devices')"
											class="hover:text-app-link hover:underline"
										>{{ d.organizationName }}</NuxtLink>
										{{ [d.version, d.os].filter(Boolean).length ? ` · ${[d.version, d.os].filter(Boolean).join(' · ')}` : '' }}
										· connected {{ timeAgo(d.connectedAt) }}
									</p>
								</li>
							</ul>
							<OpPagination
								:page="page"
								:per-page="PER_PAGE"
								:count="devices.count"
								:shown="devices.devices.length"
								@previous="setPage(page - 1)"
								@next="setPage(page + 1)"
							/>
						</template>
					</AppCard>
				</template>
			</template>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { Building2, ChevronLeft, Info, Monitor, Plug, RefreshCw, ServerOff, Unplug } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpPagination from '~/components/operate/OpPagination.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import ConsoleChart from '~/components/operator/console/ConsoleChart.vue';
import InOutTile from '~/components/operator/console/InOutTile.vue';
import ServerStatusPill from '~/components/operator/console/ServerStatusPill.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import { dateTime, orgConsoleLink, shortDate, timeAgo } from '~/utils/operatorConsole';
import {
	DEFAULT_SERVER_DAYS, SERVER_PERIODS, dayLabel, eventLabel, meteredSinceNote, rolesLabel, serverPeriod,
	type ServerDetail, type ServerDevicePage,
} from '~/utils/servers';
import { formatCount } from '~/utils/usage';

definePageMeta({ layout: 'operator' });

const PER_PAGE = 25;

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();

const id = computed(() => String(route.params.id ?? ''));
useHead({ title: () => `Server ${id.value}` });

const days = ref(serverPeriod(route.query.days));
const detail = ref<ServerDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const notFound = ref(false);
const node = computed(() => detail.value?.node ?? null);

let seq = 0;
const load = async () => {
	const mine = ++seq;
	loading.value = true;
	error.value = null;
	try {
		const res = await $api.operator.node(id.value, days.value);
		if (mine !== seq) return;
		detail.value = res;
		notFound.value = !res.node;
	}
	catch (e) {
		if (mine !== seq) return;
		if (httpStatusOf(e) === 404) notFound.value = true;
		else error.value = `Couldn't load the server: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === seq) loading.value = false;
	}
};

const page = ref(0);
const devices = ref<ServerDevicePage | null>(null);
const devicesLoading = ref(false);
const devicesError = ref<string | null>(null);
let devSeq = 0;
const loadDevices = async () => {
	const mine = ++devSeq;
	devicesLoading.value = true;
	devicesError.value = null;
	try {
		const res = await $api.operator.nodeDevices(id.value, { limit: PER_PAGE, offset: page.value * PER_PAGE });
		if (mine === devSeq) devices.value = res;
	}
	catch (e) {
		if (mine === devSeq) devicesError.value = `Couldn't load the devices: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === devSeq) devicesLoading.value = false;
	}
};
const setPage = (p: number) => {
	page.value = Math.max(0, p);
	loadDevices();
};

const reload = () => {
	load();
	loadDevices();
};
watch(id, () => {
	detail.value = null;
	devices.value = null;
	notFound.value = false;
	page.value = 0;
	reload();
}, { immediate: true });

const setDays = (v: string | number) => {
	days.value = serverPeriod(v);
	router.replace({ query: { ...route.query, days: days.value === DEFAULT_SERVER_DAYS ? undefined : String(days.value) } });
	load();
};

const series = computed(() => {
	const rows = detail.value?.daily ?? [];
	return {
		days: rows.map(r => r.day),
		in: rows.map(r => r.in),
		out: rows.map(r => r.out),
		connects: rows.map(r => r.connects),
		disconnects: rows.map(r => r.disconnects),
	};
});

const sinceNote = computed(() => meteredSinceNote(node.value?.meteredSince ?? null, series.value.days[0]));

const facts = computed(() => {
	const n = node.value;
	if (!n) return [];
	return [
		{ label: 'Region', value: n.region || '—' },
		{ label: 'Version', value: n.version || '—', mono: true },
		{ label: 'Roles', value: rolesLabel(n.roles) },
		{ label: 'Started', value: n.startedAt ? shortDate(n.startedAt) : '—', title: dateTime(n.startedAt) },
		{ label: 'Last heartbeat', value: timeAgo(n.heartbeatAt), title: dateTime(n.heartbeatAt) },
		// Not in the list contract; shown when the server sends it.
		...(n.peerAddress ? [{ label: 'Peer address', value: n.peerAddress, mono: true }] : []),
	];
});
</script>
