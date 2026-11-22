<template>
	<div class="flex flex-col gap-5">
		<!-- Phone: compact usage bars (PhoneDevice mockup) -->
		<section
			v-if="hasMetrics || rootDisk"
			aria-label="Resource usage"
			class="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-3.5 md:hidden"
		>
			<div
				v-for="bar in phoneBars"
				:key="bar.label"
			>
				<div class="flex justify-between text-[13px]">
					<span class="font-medium text-app-text-3">{{ bar.label }}</span>
					<span class="font-semibold text-app-text">{{ bar.value }}% <span
						v-if="bar.detail"
						class="font-normal text-app-text-3"
					>· {{ bar.detail }}</span></span>
				</div>
				<div
					role="meter"
					:aria-label="bar.label"
					aria-valuemin="0"
					aria-valuemax="100"
					:aria-valuenow="bar.value"
					class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-chip"
				>
					<div
						class="h-1.5 bg-app-accent"
						:style="{ width: `${bar.value}%` }"
					/>
				</div>
			</div>
		</section>

		<!-- Phone: updates row -->
		<button
			v-if="updates.tone === 'security' || updates.tone === 'pending'"
			type="button"
			:class="['flex items-center gap-3 rounded-xl border border-app-border px-3.5 py-3 text-left text-app-text md:hidden', updates.tone === 'security' ? 'bg-app-warn-row' : 'bg-app-surface']"
			@click="scrollToUpdates"
		>
			<ShieldAlert
				class="h-5 w-5 text-app-warn"
				aria-hidden="true"
			/>
			<span class="flex-1 text-sm"><strong class="font-semibold">{{ updates.pending }} update{{ updates.pending === 1 ? '' : 's' }}</strong>
				<span
					v-if="updates.security"
					class="font-semibold text-app-warn"
				> · {{ updates.security }} security</span></span>
			<ChevronRight
				class="h-4 w-4 text-app-text-3"
				aria-hidden="true"
			/>
		</button>

		<!-- Phone: section list -->
		<nav
			aria-label="Device sections"
			class="overflow-hidden rounded-xl border border-app-border bg-app-surface md:hidden"
		>
			<button
				v-for="(section, i) in sections"
				:key="section.id"
				type="button"
				:class="['flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px] text-app-text hover:bg-app-hover', i > 0 ? 'border-t border-app-border-subtle' : '']"
				@click="emit('select-tab', section.id)"
			>
				{{ section.label }}
				<span class="ml-auto text-app-text-3">
					<ChevronRight
						class="h-4 w-4"
						aria-hidden="true"
					/>
				</span>
			</button>
		</nav>

		<!-- Desktop/tablet metric tiles -->
		<div class="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
			<section
				aria-label="CPU"
				class="rounded-xl border border-app-border bg-app-surface p-[18px]"
			>
				<div class="flex items-baseline justify-between gap-2">
					<h2 class="text-[13px] font-semibold text-app-text-3">
						CPU
					</h2>
					<span class="truncate text-xs text-app-text-3">{{ device?.num_cpus ? `${device.num_cpus} cores` : '' }}{{ hasMetrics ? ` · last ${metricsSpan}` : '' }}</span>
				</div>
				<div class="mt-2 text-[28px] font-bold tracking-tight text-app-text">
					{{ hasMetrics ? `${latest.cpu}%` : '—' }}
				</div>
				<svg
					v-if="sparkPath"
					viewBox="0 0 240 48"
					width="100%"
					height="48"
					preserveAspectRatio="none"
					role="img"
					:aria-label="`CPU usage over the last ${metricsSpan}, between ${cpuMin} and ${cpuMax} percent, currently ${latest.cpu} percent`"
					class="mt-2 block"
				>
					<path
						:d="sparkPath"
						fill="none"
						class="stroke-app-accent"
						stroke-width="2"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
				<p
					v-else
					class="mt-6 text-xs text-app-text-3"
				>
					No monitoring data yet.
				</p>
			</section>

			<section
				aria-label="Memory"
				class="rounded-xl border border-app-border bg-app-surface p-[18px]"
			>
				<div class="flex items-baseline justify-between gap-2">
					<h2 class="text-[13px] font-semibold text-app-text-3">
						Memory
					</h2>
					<span
						v-if="device?.mem_total"
						class="truncate text-xs text-app-text-3"
					>{{ hasMetrics ? `${bytesToSize(device.mem_total * latest.mem / 100)} of ` : '' }}{{ bytesToSize(device.mem_total) }}</span>
				</div>
				<div class="mt-2 text-[28px] font-bold tracking-tight text-app-text">
					{{ hasMetrics ? `${latest.mem}%` : '—' }}
				</div>
				<UsageMeter
					v-if="hasMetrics"
					label="Memory used"
					:value="latest.mem"
					class="mt-[26px]"
				/>
			</section>

			<section
				aria-label="Disk"
				class="rounded-xl border border-app-border bg-app-surface p-[18px]"
			>
				<div class="flex items-baseline justify-between gap-2">
					<h2 class="text-[13px] font-semibold text-app-text-3">
						Disk
					</h2>
					<span
						v-if="rootDisk"
						class="truncate text-xs text-app-text-3"
					><span class="font-mono">{{ rootDisk.mount }}</span> · {{ bytesToSize(rootDisk.total - rootDisk.free) }} of {{ bytesToSize(rootDisk.total) }}</span>
				</div>
				<div class="mt-2 text-[28px] font-bold tracking-tight text-app-text">
					{{ rootDisk ? `${Math.round(rootDisk.usedPercent)}%` : '—' }}
				</div>
				<UsageMeter
					v-if="rootDisk"
					:label="`${rootDisk.mount} used`"
					:value="Math.round(rootDisk.usedPercent)"
					class="mt-[26px]"
				/>
				<div
					v-if="otherDisk"
					class="mt-2 truncate text-xs text-app-text-3"
				>
					<span class="font-mono">{{ otherDisk.mount }}</span> {{ bytesToSize(otherDisk.total - otherDisk.free) }} of {{ bytesToSize(otherDisk.total) }} · {{ Math.round(otherDisk.usedPercent) }}%
				</div>
			</section>

			<section
				aria-label="IO usage"
				class="rounded-xl border border-app-border bg-app-surface p-[18px]"
			>
				<div class="flex items-baseline justify-between gap-2">
					<h2 class="text-[13px] font-semibold text-app-text-3">
						IO usage
					</h2>
					<span
						v-if="lastSample"
						class="truncate text-xs text-app-text-3"
					>{{ relativeTime(lastSample) }}</span>
				</div>
				<div class="mt-2 text-[28px] font-bold tracking-tight text-app-text">
					{{ hasMetrics ? `${latest.io}%` : '—' }}
				</div>
				<UsageMeter
					v-if="hasMetrics"
					label="IO usage"
					:value="latest.io"
					class="mt-[26px]"
				/>
				<button
					type="button"
					class="mt-2 text-xs font-medium text-app-link hover:underline"
					@click="emit('select-tab', 'monitoring')"
				>
					View monitoring
				</button>
			</section>
		</div>

		<!-- System + network -->
		<div class="grid gap-4 lg:grid-cols-2">
			<AppCard title="System">
				<dl class="kv">
					<dt>Hostname</dt>
					<dd class="font-mono">
						{{ device?.hostname || '—' }}
					</dd>
					<dt>Operating system</dt>
					<dd>{{ device?.os_full_name || '—' }}<span v-if="device?.os_version && !device?.os_full_name?.includes(device.os_version)"> {{ device.os_version }}</span></dd>
					<dt>Kernel</dt>
					<dd class="font-mono">
						{{ device?.os_kernel || '—' }}<span v-if="device?.os_arch"> · {{ device.os_arch }}</span>
					</dd>
					<template v-if="device?.cpu_model_name || device?.num_cpus">
						<dt>CPU</dt>
						<dd>{{ device?.cpu_model_name }}<span v-if="device?.num_cpus"> · {{ device.num_cpus }} vCPU</span></dd>
					</template>
					<template v-if="device?.mem_total">
						<dt>Memory</dt>
						<dd>{{ bytesToSize(device.mem_total) }}</dd>
					</template>
					<template v-if="virtualization">
						<dt>Virtualization</dt>
						<dd>{{ virtualization }}</dd>
					</template>
					<template v-if="device?.timezone">
						<dt>Timezone</dt>
						<dd>{{ device.timezone }}</dd>
					</template>
					<dt>rport client</dt>
					<dd class="font-mono">
						{{ device?.version || '—' }}
					</dd>
					<template v-if="device?.last_heartbeat_at">
						<dt>Last heartbeat</dt>
						<dd>{{ formatedDate(String(device.last_heartbeat_at)) }}</dd>
					</template>
					<template v-else-if="device?.disconnected_at">
						<dt>Disconnected since</dt>
						<dd>{{ formatedDate(String(device.disconnected_at)) }}</dd>
					</template>
					<template v-if="device?.client_auth_id">
						<dt>Auth ID</dt>
						<dd class="font-mono">
							<NuxtLink
								:to="`/client-access#${device.client_auth_id}`"
								class="text-app-link hover:underline"
							>
								{{ device.client_auth_id }}
							</NuxtLink>
						</dd>
					</template>
					<dt>Client ID</dt>
					<dd class="font-mono text-xs">
						{{ device?.id }}
					</dd>
				</dl>
			</AppCard>

			<AppCard title="Network">
				<div class="flex flex-col">
					<div
						v-if="device?.address"
						class="flex justify-between gap-3 border-b border-app-border-subtle py-2.5"
					>
						<span class="text-[13px] text-app-text-3">Connected from</span>
						<span class="break-all text-right font-mono text-[13px] text-app-text">{{ device.address }}</span>
					</div>
					<div
						v-for="(ip, i) in visibleIps"
						:key="ip.value"
						:class="['flex justify-between gap-3 py-2.5', i < visibleIps.length - 1 || hiddenIpCount ? 'border-b border-app-border-subtle' : '']"
					>
						<span class="text-[13px] text-app-text-3">{{ ip.label }}</span>
						<span class="break-all text-right font-mono text-[13px] text-app-text">{{ ip.value }}</span>
					</div>
					<button
						v-if="hiddenIpCount || showAllIps"
						type="button"
						class="self-start py-2 text-[13px] font-medium text-app-link hover:underline"
						:aria-expanded="showAllIps"
						@click="showAllIps = !showAllIps"
					>
						{{ showAllIps ? 'Show fewer addresses' : `Show ${hiddenIpCount} more address${hiddenIpCount === 1 ? '' : 'es'}` }}
					</button>
					<p
						v-if="!allIps.length && !device?.address"
						class="text-[13px] text-app-text-3"
					>
						No IP addresses reported.
					</p>
				</div>

				<h3 class="mb-2.5 mt-[18px] text-[13px] font-semibold text-app-text-3">
					Groups &amp; tags
				</h3>
				<div class="flex flex-wrap gap-1.5">
					<NuxtLink
						v-for="group in device?.groups ?? []"
						:key="`g-${group}`"
						:to="{ path: '/dashboard', query: { group } }"
						class="rounded-md bg-app-chip px-2 py-1 text-xs font-medium text-app-text-2 hover:text-app-link"
					>
						{{ group }}
					</NuxtLink>
					<span
						v-for="tag in device?.tags ?? []"
						:key="`t-${tag}`"
						class="inline-flex items-center gap-1 rounded-md border border-app-border-strong bg-app-surface px-2 py-[3px] text-xs font-medium text-app-text-2"
					>
						<Tag
							class="h-3 w-3 text-app-text-3"
							aria-hidden="true"
						/>{{ tag }}
					</span>
					<span
						v-for="[key, value] in labels"
						:key="`l-${key}`"
						class="rounded-md border border-app-border-strong bg-app-surface px-2 py-[3px] font-mono text-xs font-medium text-app-text-2"
					>{{ key }}={{ value }}</span>
					<button
						type="button"
						class="h-7 rounded-md border border-dashed border-app-border-strong px-2 text-xs text-app-text-2 hover:bg-app-hover"
						@click="emit('edit-tags')"
					>
						+ Edit tags &amp; labels
					</button>
				</div>
			</AppCard>
		</div>

		<!-- Updates + activity -->
		<div class="grid gap-4 lg:grid-cols-2">
			<section
				ref="updatesEl"
				class="rounded-xl border border-app-border bg-app-surface p-5"
			>
				<div class="mb-3.5 flex items-center justify-between gap-3">
					<div class="min-w-0">
						<h2 class="text-[15px] font-semibold text-app-text">
							Updates
						</h2>
						<p
							v-if="device?.updates_status"
							class="mt-1 text-[13px] text-app-text-3"
						>
							{{ updates.pending }} pending
							<template v-if="updates.security">
								· <span class="font-semibold text-app-warn">{{ updates.security }} security</span>
							</template>
							<template v-if="device.updates_status.reboot_pending">
								· <span class="font-semibold text-app-warn">reboot pending</span>
							</template>
							· checked {{ relativeTime(device.updates_status.refreshed) }}
						</p>
					</div>
				</div>
				<template v-if="device?.updates_status">
					<div
						v-if="summaries.length"
						class="flex flex-col"
					>
						<div
							v-for="(update, i) in visibleSummaries"
							:key="i"
							class="flex justify-between gap-3 border-t border-app-border-subtle py-2.5 text-[13px]"
						>
							<span class="min-w-0 break-words font-mono text-app-text">{{ update.title }}</span>
							<span
								v-if="update.is_security_update"
								class="h-fit flex-none rounded px-1.5 py-0.5 text-[11px] font-bold text-app-warn bg-app-warn-bg"
							>SECURITY</span>
						</div>
						<button
							v-if="summaries.length > 5"
							type="button"
							class="self-start pt-2 text-[13px] font-medium text-app-link hover:underline"
							:aria-expanded="showAllUpdates"
							@click="showAllUpdates = !showAllUpdates"
						>
							{{ showAllUpdates ? 'Show fewer' : `Show all ${summaries.length} updates` }}
						</button>
					</div>
					<p
						v-else
						class="border-t border-app-border-subtle pt-3 text-[13px] text-app-text-3"
					>
						Everything is up to date.
					</p>
				</template>
				<p
					v-else
					class="rounded-lg bg-app-warn-bg px-4 py-3 text-[13px] text-app-warn"
				>
					The client version does not support update supervision, or update supervision is disabled.
				</p>
			</section>

			<section class="rounded-xl border border-app-border bg-app-surface p-5">
				<div class="mb-3.5 flex items-center justify-between gap-3">
					<h2 class="text-[15px] font-semibold text-app-text">
						Recent activity
					</h2>
					<button
						type="button"
						class="text-[13px] font-medium text-app-link hover:underline"
						@click="emit('select-tab', 'audit')"
					>
						View audit log
					</button>
				</div>
				<ol
					v-if="activity.length"
					class="flex flex-col"
				>
					<li
						v-for="(entry, i) in activity"
						:key="i"
						class="flex gap-3 border-t border-app-border-subtle py-2.5"
					>
						<span
							aria-hidden="true"
							:class="['mt-[5px] h-2 w-2 flex-none rounded-full', entry.action === 'delete' ? 'border-2 border-app-danger' : entry.action === 'create' ? 'bg-app-accent' : 'bg-[#22C55E]']"
						/>
						<div class="min-w-0 flex-1">
							<div class="text-[13px] text-app-text">
								<strong class="font-semibold">{{ entry.username || 'system' }}</strong>
								{{ entry.action }}
								<code class="rounded bg-app-muted px-1.5 py-px font-mono text-xs">{{ entry.application }}</code>
							</div>
							<div class="mt-0.5 text-xs text-app-text-3">
								{{ relativeTime(entry.timestamp) }}<span v-if="entry.remote_ip"> · from <span class="font-mono">{{ entry.remote_ip }}</span></span>
							</div>
						</div>
					</li>
				</ol>
				<p
					v-else
					class="border-t border-app-border-subtle pt-3 text-[13px] text-app-text-3"
				>
					{{ activityLoaded ? 'No recorded activity for this device yet.' : 'Loading…' }}
				</p>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ChevronRight, ShieldAlert, Tag } from 'lucide-vue-next';
import UsageMeter from '~/components/device/UsageMeter.vue';
import { relativeTime, updatesInfo } from '~/components/device/deviceHelpers';
import { bytesToSize, formatedDate } from '~/lib/utils';
import type { AuditLog, Client, ClientMetric, DiskUsage } from '~/types';

const props = defineProps<{
	device: Client;
	metrics: ClientMetric[];
	disks: DiskUsage[];
	sections: { id: string; label: string }[];
}>();

const emit = defineEmits<{
	(e: 'select-tab', tab: string): void;
	(e: 'edit-tags'): void;
}>();

const { $api } = useNuxtApp();

const sorted = computed(() => [...(props.metrics ?? [])].sort(
	(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
));
const hasMetrics = computed(() => sorted.value.length > 0);
const round = (n: number | undefined) => Math.round(Number(n) || 0);
const latest = computed(() => {
	const last = sorted.value[sorted.value.length - 1];
	return { cpu: round(last?.cpu_usage_percent), mem: round(last?.memory_usage_percent), io: round(last?.io_usage_percent) };
});
const lastSample = computed(() => sorted.value[sorted.value.length - 1]?.timestamp);
const metricsSpan = computed(() => {
	if (sorted.value.length < 2) return 'sample';
	const ms = new Date(sorted.value[sorted.value.length - 1].timestamp).getTime() - new Date(sorted.value[0].timestamp).getTime();
	const minutes = Math.max(1, Math.round(ms / 60000));
	return minutes < 120 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
});
const cpuValues = computed(() => sorted.value.map(m => Number(m.cpu_usage_percent) || 0));
const cpuMin = computed(() => round(Math.min(...cpuValues.value)));
const cpuMax = computed(() => round(Math.max(...cpuValues.value)));
const sparkPath = computed(() => {
	const values = cpuValues.value;
	if (values.length < 2) return '';
	const max = Math.max(10, ...values);
	const step = 240 / (values.length - 1);
	return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(46 - (v / max) * 42).toFixed(1)}`).join(' ');
});

const rootDisk = computed<DiskUsage | undefined>(() => props.disks?.find(d => d.mount === '/' || d.mount.toUpperCase() === 'C:') ?? props.disks?.[0]);
const otherDisk = computed<DiskUsage | undefined>(() => props.disks?.find(d => d !== rootDisk.value));

const phoneBars = computed(() => {
	const bars: { label: string; value: number; detail?: string }[] = [];
	if (hasMetrics.value) {
		bars.push({ label: 'CPU', value: latest.value.cpu });
		bars.push({
			label: 'Memory',
			value: latest.value.mem,
			detail: props.device?.mem_total ? `${bytesToSize(props.device.mem_total * latest.value.mem / 100)} / ${bytesToSize(props.device.mem_total)}` : undefined,
		});
	}
	if (rootDisk.value) {
		bars.push({
			label: `Disk ${rootDisk.value.mount}`,
			value: Math.round(rootDisk.value.usedPercent),
			detail: `${bytesToSize(rootDisk.value.total - rootDisk.value.free)} / ${bytesToSize(rootDisk.value.total)}`,
		});
	}
	return bars;
});

const virtualization = computed(() => {
	const system = props.device?.os_virtualization_system;
	const role = props.device?.os_virtualization_role;
	if (!system || system.toUpperCase() === 'UNKNOWN') return '';
	return role && role !== 'unknown' ? `${system} ${role}` : system;
});

const allIps = computed(() => [
	...(props.device?.ipv4 ?? []).map(value => ({ label: 'IPv4', value })),
	...(props.device?.ipv6 ?? []).map(value => ({ label: 'IPv6', value })),
]);
const showAllIps = ref(false);
const visibleIps = computed(() => (showAllIps.value ? allIps.value : allIps.value.slice(0, 4)));
const hiddenIpCount = computed(() => (showAllIps.value ? 0 : Math.max(0, allIps.value.length - 4)));

const labels = computed(() => Object.entries(props.device?.labels ?? {}));

const updates = computed(() => updatesInfo(props.device));
const summaries = computed(() => props.device?.updates_status?.update_summaries ?? []);
const showAllUpdates = ref(false);
const visibleSummaries = computed(() => (showAllUpdates.value ? summaries.value : summaries.value.slice(0, 5)));
const updatesEl = ref<HTMLElement | null>(null);
const scrollToUpdates = () => updatesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const activity = ref<AuditLog[]>([]);
const activityLoaded = ref(false);
async function loadActivity() {
	if (!props.device?.id) return;
	try {
		const response = await $api.auditLog.paginate(0, 5, { client_id: props.device.id });
		activity.value = response?.data ?? [];
	}
	catch {
		activity.value = [];
	}
	activityLoaded.value = true;
}
watch(() => props.device?.id, loadActivity, { immediate: true });
</script>

<style scoped>
.kv {
	display: grid;
	grid-template-columns: minmax(110px, 150px) minmax(0, 1fr);
	gap: 10px 16px;
	margin: 0;
}
.kv dt {
	font-size: 13px;
	color: rgb(var(--app-text-3));
}
.kv dd {
	margin: 0;
	font-size: 13px;
	color: rgb(var(--app-text));
	overflow-wrap: anywhere;
}
</style>
