<template>
	<!-- The organization's devices, read-only metadata (no IPs, tags or contents), with counts by version and OS. -->
	<div class="flex flex-col gap-5">
		<div
			v-if="error"
			role="alert"
			class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
		>
			{{ error }}
		</div>

		<div
			v-if="data && data.devices.length"
			class="grid grid-cols-1 gap-4 lg:grid-cols-2"
		>
			<AppCard
				v-for="group in groups"
				:key="group.title"
				:title="group.title"
			>
				<ul class="flex flex-col gap-2.5">
					<li
						v-for="row in group.rows.slice(0, 8)"
						:key="row.value"
						class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]"
					>
						<span
							class="truncate font-medium text-app-text"
							:title="row.value"
						>{{ row.value }}</span>
						<span
							class="order-last col-span-2 h-2 overflow-hidden rounded-full bg-app-muted sm:order-none sm:col-span-1"
							aria-hidden="true"
						>
							<span
								class="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
								:style="{ width: `${Math.max(2, (row.count / maxCount(group.rows)) * 100)}%` }"
							/>
						</span>
						<span class="text-right tabular-nums text-app-text-2">{{ formatCount(row.count) }}</span>
					</li>
					<li
						v-if="group.rows.length > 8"
						class="text-xs text-app-text-3"
					>
						and {{ group.rows.length - 8 }} more ({{ formatCount(group.rows.slice(8).reduce((a, r) => a + r.count, 0)) }} devices)
					</li>
				</ul>
			</AppCard>
		</div>

		<AppCard
			flush
			:title="data ? `${formatCount(data.total)} ${data.total === 1 ? 'device' : 'devices'} · ${formatCount(data.online)} online` : 'Devices'"
			description="As counted for the device limit. Read-only: the console never shows device contents."
		>
			<OpEmpty
				v-if="!data || !data.devices.length"
				:icon="Monitor"
				:loading="!data && !error"
				:title="!data ? (error ? 'Couldn’t load the devices' : 'Loading devices…') : 'No devices yet'"
				:description="data && !data.devices.length ? 'Devices show here once they are paired with this organization.' : undefined"
			/>
			<template v-else>
				<div class="hidden overflow-x-auto md:block">
					<table class="w-full min-w-[820px] border-collapse text-left">
						<thead>
							<tr class="bg-app-surface-2">
								<th
									v-for="h in ['Device', 'State', 'Node', 'Version', 'OS', 'Last seen', 'First seen']"
									:key="h"
									scope="col"
									class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
								>
									{{ h }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="d in data.devices"
								:key="d.id"
								class="hover:bg-app-hover [&:last-child>td]:border-b-0"
							>
								<td class="border-b border-app-border-subtle py-2.5 pl-4 pr-3 text-[13px]">
									<span class="block max-w-[240px] truncate font-medium text-app-text">{{ d.name }}</span>
									<span class="block max-w-[240px] truncate font-mono text-xs text-app-text-3">{{ d.id }}</span>
								</td>
								<td class="border-b border-app-border-subtle px-3 py-2.5">
									<OnlinePill :online="d.online" />
								</td>
								<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 font-mono text-xs text-app-text-2">
									{{ d.nodeId || '—' }}
								</td>
								<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 font-mono text-xs text-app-text-2">
									{{ d.version || '—' }}
								</td>
								<td class="max-w-[200px] truncate border-b border-app-border-subtle px-3 py-2.5 text-[13px] text-app-text-2">
									{{ d.os || '—' }}
								</td>
								<td
									class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 text-[13px] text-app-text-2"
									:title="dateTime(d.lastSeenAt)"
								>
									{{ d.online ? 'Now' : timeAgo(d.lastSeenAt) }}
								</td>
								<td
									class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 text-[13px] text-app-text-2"
									:title="dateTime(d.firstSeenAt)"
								>
									{{ shortDate(d.firstSeenAt) || '—' }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="d in data.devices"
						:key="d.id"
						class="px-4 py-3"
					>
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-[15px] font-medium text-app-text">{{ d.name }}</span>
							<OnlinePill :online="d.online" />
						</div>
						<p class="mt-1 text-xs text-app-text-3">
							{{ [d.version, d.os, d.nodeId ? `node ${d.nodeId}` : ''].filter(Boolean).join(' · ') || '—' }}
						</p>
						<p class="mt-0.5 text-xs text-app-text-3">
							Last seen {{ d.online ? 'now' : timeAgo(d.lastSeenAt) }}<template v-if="d.firstSeenAt">
								· first seen {{ shortDate(d.firstSeenAt) }}
							</template>
						</p>
					</li>
				</ul>
			</template>
		</AppCard>
	</div>
</template>

<script setup lang="ts">
import { Monitor } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OnlinePill from '~/components/operator/console/OnlinePill.vue';
import { dateTime, shortDate, timeAgo, type OrgDevices, type ValueCount } from '~/utils/operatorConsole';
import { formatCount } from '~/utils/usage';

const props = defineProps<{ id: string }>();
const { $api } = useNuxtApp();

const data = ref<OrgDevices | null>(null);
const error = ref<string | null>(null);

const groups = computed(() => [
	{ title: 'By client version', rows: data.value?.byVersion ?? [] },
	{ title: 'By operating system', rows: data.value?.byOs ?? [] },
]);
const maxCount = (rows: ValueCount[]) => rows.reduce((m, r) => Math.max(m, r.count), 1);

let seq = 0;
watch(() => props.id, async (id) => {
	const mine = ++seq;
	data.value = null;
	error.value = null;
	try {
		const d = await $api.operator.orgDevices(id);
		if (mine === seq) data.value = d;
	}
	catch (e) {
		if (mine === seq) error.value = `Couldn't load the devices: ${apiErrorMessage(e)}`;
	}
}, { immediate: true });
</script>
