<template>
	<!-- Expanded row of the device list: the details that don't earn a column. -->
	<dl class="grid gap-x-8 gap-y-3 py-1 text-[13px] sm:grid-cols-2 xl:grid-cols-4">
		<div class="min-w-0">
			<dt class="text-xs font-medium text-app-text-3">
				Device ID
			</dt>
			<dd class="mt-0.5 flex min-w-0 items-center gap-1">
				<span class="truncate font-mono text-app-text-2">{{ client.id }}</span>
				<button
					type="button"
					class="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-app-text-3 hover:bg-app-hover hover:text-app-text"
					:aria-label="`Copy the ID of ${client.name || client.id}`"
					title="Copy ID"
					@click="emit('copy-id')"
				>
					<Copy
						class="h-3.5 w-3.5"
						aria-hidden="true"
					/>
				</button>
			</dd>
		</div>
		<div
			v-for="item in facts"
			:key="item.label"
			class="min-w-0"
		>
			<dt class="text-xs font-medium text-app-text-3">
				{{ item.label }}
			</dt>
			<dd
				:class="['mt-0.5 break-words', item.mono ? 'font-mono' : '', item.tone ?? 'text-app-text-2']"
				:title="item.title"
			>
				{{ item.value }}
			</dd>
		</div>
		<div class="min-w-0 sm:col-span-2">
			<dt class="text-xs font-medium text-app-text-3">
				Groups
			</dt>
			<dd class="mt-1 flex flex-wrap gap-1.5">
				<button
					v-for="g in client.groups ?? []"
					:key="g"
					type="button"
					:aria-label="`Show group ${g}`"
					class="whitespace-nowrap rounded-md bg-app-chip px-2 py-[3px] font-mono text-xs font-medium text-app-text-2 hover:text-app-link"
					@click="emit('group', g)"
				>
					{{ g }}
				</button>
				<span
					v-if="!client.groups?.length"
					class="text-app-text-4"
				>None</span>
			</dd>
		</div>
		<div class="min-w-0 sm:col-span-2">
			<dt class="text-xs font-medium text-app-text-3">
				Tags and labels
			</dt>
			<dd class="mt-1 flex flex-wrap gap-1.5">
				<button
					v-for="tag in client.tags ?? []"
					:key="tag"
					type="button"
					:aria-label="`Show devices tagged ${tag}`"
					class="rounded border border-app-border-strong px-1.5 text-xs text-app-text-2 hover:text-app-link"
					@click="emit('tag', tag)"
				>
					{{ tag }}
				</button>
				<span
					v-for="(value, key) in client.labels ?? {}"
					:key="key"
					class="rounded bg-app-muted px-1.5 font-mono text-xs text-app-text-2"
				>{{ key }}={{ value }}</span>
				<span
					v-if="!client.tags?.length && !Object.keys(client.labels ?? {}).length"
					class="text-app-text-4"
				>None</span>
			</dd>
		</div>
	</dl>
</template>

<script setup lang="ts">
import { Copy } from 'lucide-vue-next';
import { relativeTime } from '~/components/device/deviceHelpers';
import { isOutdated } from '~/utils/deviceList';
import type { Client } from '~/types';

const props = defineProps<{
	client: Client;
	/** Newest client version in the fleet. */
	newest: string;
}>();
const emit = defineEmits<{
	(e: 'copy-id'): void;
	(e: 'group' | 'tag', value: string): void;
}>();

interface Fact { label: string; value: string; mono?: boolean; tone?: string; title?: string }

function formatMemory(bytes?: number): string {
	if (!bytes) return '';
	const gib = bytes / 1024 ** 3;
	return gib >= 1 ? `${gib.toFixed(gib >= 10 ? 0 : 1)} GiB` : `${Math.round(bytes / 1024 ** 2)} MiB`;
}

const facts = computed<Fact[]>(() => {
	const c = props.client;
	const outdated = isOutdated(c.version, props.newest);
	const hardware = [
		c.os_arch,
		c.num_cpus ? `${c.num_cpus} CPU${c.num_cpus === 1 ? '' : 's'}` : '',
		formatMemory(c.mem_total),
	].filter(Boolean).join(' · ');
	const updates = c.updates_status;
	const list: Fact[] = [
		{
			label: 'Client version',
			value: c.version ? `${c.version}${outdated ? ` (newest is ${props.newest})` : ''}` : 'Unknown',
			mono: !!c.version,
			tone: outdated ? 'font-medium text-app-warn' : undefined,
		},
		{ label: 'Hostname', value: c.hostname || '—', mono: !!c.hostname },
		{ label: 'Operating system', value: c.os_full_name || c.os || '—' },
		{ label: 'Architecture / hardware', value: hardware || '—' },
		{ label: 'IP addresses', value: c.ipv4?.length ? c.ipv4.join(', ') : '—', mono: !!c.ipv4?.length },
		{ label: 'Connected from', value: c.address || '—', mono: !!c.address, title: 'Public address of the client connection' },
		{
			label: 'Updates',
			value: updates
				? `${updates.updates_available ?? 0} pending, ${updates.security_updates_available ?? 0} security${updates.reboot_pending ? ', reboot pending' : ''}`
				: 'Not reported',
			tone: updates?.security_updates_available ? 'font-medium text-app-warn' : undefined,
		},
	];
	if (c.last_heartbeat_at) list.push({ label: 'Last heartbeat', value: relativeTime(c.last_heartbeat_at), title: new Date(c.last_heartbeat_at).toLocaleString() });
	if (c.timezone) list.push({ label: 'Timezone', value: c.timezone });
	return list;
});
</script>
