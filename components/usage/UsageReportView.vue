<template>
	<!--
		A month of an organization's usage: headline tiles, the daily transfer chart and the top devices.
		Used by the Usage page (own organization) and the operator's organization detail.
	-->
	<div class="flex flex-col gap-5">
		<div
			v-if="error"
			role="alert"
			class="flex items-start gap-2.5 rounded-xl border border-app-border bg-app-danger-bg p-4 text-sm text-app-danger"
		>
			<CircleAlert
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<span>{{ error }}</span>
		</div>

		<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			<UsageTile
				label="Transfer"
				:icon="ArrowLeftRight"
				:value="formatBytes(transferOf(t))"
				:detail="`${formatBytes(t.tunnel_bytes_to_user)} to users · ${formatBytes(t.tunnel_bytes_to_device)} to devices`"
				:loading="loading"
			/>
			<UsageTile
				label="Billable devices"
				:icon="Monitor"
				:value="formatCount(t.devices_billable)"
				:detail="`Peak day ${formatCount(t.devices_peak_day)} · at once ${formatCount(t.devices_peak)}`"
				:loading="loading"
			/>
			<UsageTile
				label="Jobs run"
				:icon="Terminal"
				:value="formatCount(t.jobs_run)"
				:detail="`${formatCount(t.jobs_command)} commands · ${formatCount(t.jobs_script)} scripts · ${formatCount(t.jobs_library)} library`"
				:loading="loading"
			/>
			<UsageTile
				label="Uploads to devices"
				:icon="Upload"
				:value="formatBytes(t.upload_bytes_to_devices)"
				detail="Each device's copy counts"
				:loading="loading"
			/>
		</div>

		<AppCard
			title="Daily transfer"
			description="Payload bytes per UTC day. Transfer is what tunnels carried both ways plus the uploads the devices read."
		>
			<div
				v-if="loading && !report"
				class="flex h-[280px] items-center justify-center"
			>
				<div
					class="h-6 w-6 animate-spin rounded-full border-2 border-app-border-strong border-t-app-accent"
					aria-hidden="true"
				/>
				<span class="sr-only">Loading usage…</span>
			</div>
			<UsageTransferChart
				v-else
				:series="series"
				:month="month"
			/>
		</AppCard>

		<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
			<AppCard
				title="Top devices by transfer"
				:description="`The ${topDevices.length === 10 ? '10 ' : ''}devices that moved the most in ${monthLabel(month)}.`"
				flush
			>
				<OpEmpty
					v-if="!topDevices.length"
					:icon="Monitor"
					:loading="loading && !report"
					:title="loading && !report ? 'Loading…' : 'No device transfer this month'"
				/>
				<template v-else>
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="(h, i) in ['Device', 'To users', 'To devices', 'Uploads', 'Transfer']"
										:key="h"
										scope="col"
										:class="['whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4 last:pr-4', i ? 'text-right' : 'text-left']"
									>
										{{ h }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="d in topDevices"
									:key="d.client_id"
								>
									<td class="max-w-[280px] border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px]">
										<DeviceRef
											:id="d.client_id"
											:name="deviceNames?.[d.client_id]"
											:link="linkDevices"
										/>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
										{{ formatBytes(d.tunnel_bytes_to_user) }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
										{{ formatBytes(d.tunnel_bytes_to_device) }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-right text-[13px] text-app-text-2">
										{{ formatBytes(d.upload_bytes_to_devices) }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-3 pr-4 text-right text-[13px]">
										<div class="flex items-center justify-end gap-2.5">
											<span
												class="hidden h-1.5 w-16 overflow-hidden rounded-full bg-app-muted lg:block"
												aria-hidden="true"
											>
												<span
													class="block h-full rounded-full bg-app-accent"
													:style="{ width: `${share(d)}%` }"
												/>
											</span>
											<span class="font-semibold text-app-text">{{ formatBytes(transferOf(d)) }}</span>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="d in topDevices"
							:key="d.client_id"
							class="flex flex-col gap-1 px-4 py-3"
						>
							<div class="flex items-center justify-between gap-3">
								<DeviceRef
									:id="d.client_id"
									:name="deviceNames?.[d.client_id]"
									:link="linkDevices"
									class="min-w-0"
								/>
								<span class="shrink-0 text-sm font-semibold text-app-text">{{ formatBytes(transferOf(d)) }}</span>
							</div>
							<p class="text-xs text-app-text-3">
								{{ formatBytes(d.tunnel_bytes_to_user) }} to users · {{ formatBytes(d.tunnel_bytes_to_device) }} to devices<template v-if="d.upload_bytes_to_devices">
									· {{ formatBytes(d.upload_bytes_to_devices) }} uploads
								</template>
							</p>
						</li>
					</ul>
				</template>
			</AppCard>

			<AppCard title="Also metered">
				<dl class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 text-[13px]">
					<dt class="text-app-text-3">
						API and UI responses
					</dt>
					<dd class="text-right font-medium text-app-text">
						{{ loading ? '–' : formatBytes(t.api_bytes_out) }}
					</dd>
					<dt class="text-app-text-3">
						Average devices connected
					</dt>
					<dd class="text-right font-medium text-app-text">
						{{ loading ? '–' : formatCount(t.devices_avg) }}
					</dd>
					<dt class="text-app-text-3">
						Device-days
					</dt>
					<dd class="text-right font-medium text-app-text">
						{{ loading ? '–' : formatCount(t.device_days) }}
					</dd>
					<dt class="text-app-text-3">
						Connected device-hours
					</dt>
					<dd class="text-right font-medium text-app-text">
						{{ loading ? '–' : formatCount(Math.round(t.device_hours ?? 0)) }}
					</dd>
					<dt class="text-app-text-3">
						Monitoring measurements
					</dt>
					<dd class="text-right font-medium text-app-text">
						{{ loading ? '–' : formatCount(t.monitoring_rows) }}
					</dd>
				</dl>
				<p class="mt-4 text-xs text-app-text-3">
					Billable devices is the average of the daily device counts so far, rounded up. Days are UTC.
				</p>
			</AppCard>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ArrowLeftRight, CircleAlert, Monitor, Terminal, Upload } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import UsageTile from '~/components/usage/UsageTile.vue';
import UsageTransferChart from '~/components/usage/UsageTransferChart.vue';
import {
	dailyTransferSeries,
	formatBytes,
	formatCount,
	monthLabel,
	transferOf,
	type UsageReport,
	type UsageTopDevice,
	type UsageTotals,
} from '~/utils/usage';

const props = defineProps<{
	report: UsageReport | null | undefined;
	month: string;
	loading?: boolean;
	error?: string | null;
	/** client id → name, for the device column (operators don't see the organization's devices). */
	deviceNames?: Record<string, string>;
	/** Link device rows to their device page (the organization's own users only). */
	linkDevices?: boolean;
}>();

const t = computed<UsageTotals>(() => props.report?.totals ?? {});
const series = computed(() => dailyTransferSeries(props.report?.periods, props.month));
const topDevices = computed(() => props.report?.top_devices ?? []);
const topMax = computed(() => Math.max(1, ...topDevices.value.map(transferOf)));
const share = (d: UsageTopDevice) => Math.max(2, Math.round((transferOf(d) / topMax.value) * 100));

// Device cell: name over id (or just the id), optionally a link to the device page.
const DeviceRef = defineComponent({
	props: { id: { type: String, required: true }, name: { type: String, default: '' }, link: { type: Boolean, default: false } },
	setup(p) {
		return () => {
			const body = [
				h('span', { class: 'block truncate font-mono font-medium' }, p.name || p.id),
				p.name && p.name !== p.id ? h('span', { class: 'block truncate font-mono text-xs text-app-text-3' }, p.id) : null,
			];
			return p.link
				? h(resolveComponent('NuxtLink'), { to: `/dashboard/${encodeURIComponent(p.id)}`, class: 'block min-w-0 text-app-text hover:text-app-link' }, () => body)
				: h('div', { class: 'min-w-0 text-app-text' }, body);
		};
	},
});
</script>
