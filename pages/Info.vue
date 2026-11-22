<template>
	<SettingsLayout
		heading="Server info"
		description="How this OpenRPort2 server is configured, and which versions are running."
	>
		<template #actions>
			<AppButton
				variant="secondary"
				:disabled="pending"
				@click="() => refresh()"
			>
				<RotateCw
					:class="['h-4 w-4', { 'animate-spin': pending }]"
					aria-hidden="true"
				/>
				Reload
			</AppButton>
		</template>

		<AppCard
			flush
			title="Server API"
		>
			<dl class="divide-y divide-app-border-subtle">
				<div
					v-for="row in serverRows"
					:key="row.label"
					class="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-4"
				>
					<dt class="text-[13px] font-medium text-app-text-3 sm:text-sm">
						{{ row.label }}
					</dt>
					<dd class="min-w-0 text-sm text-app-text">
						<span
							v-if="row.kind === 'status'"
							:class="['inline-flex items-center gap-2', row.on ? 'text-app-ok' : 'text-app-text-2']"
						>
							<span
								aria-hidden="true"
								:class="['h-2 w-2 rounded-full', row.on ? 'bg-[#22C55E]' : 'bg-app-text-4']"
							/>
							{{ row.value }}
						</span>
						<span
							v-else-if="row.kind === 'chip'"
							class="st-chip"
						>{{ row.value }}</span>
						<span
							v-else
							:class="[row.kind === 'mono' ? 'break-all font-mono text-[13px]' : '']"
						>{{ row.value }}</span>
					</dd>
				</div>
			</dl>
		</AppCard>

		<AppCard
			flush
			title="Frontend"
		>
			<dl class="divide-y divide-app-border-subtle">
				<div class="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-4">
					<dt class="text-[13px] font-medium text-app-text-3 sm:text-sm">
						Version
					</dt>
					<dd class="break-all font-mono text-[13px] text-app-text">
						openrport-frontend-{{ appVersion }}
					</dd>
				</div>
				<div class="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-4">
					<dt class="text-[13px] font-medium text-app-text-3 sm:text-sm">
						VNC® Viewer
					</dt>
					<dd class="text-sm">
						<a
							href="https://www.realvnc.com/en/connect/download/viewer/"
							rel="noopener noreferrer"
							target="_blank"
							class="inline-flex items-center gap-1 text-app-link underline-offset-2 hover:underline"
						>
							Download the latest version
							<ExternalLink
								class="h-3.5 w-3.5"
								aria-hidden="true"
							/>
							<span class="sr-only">(opens in a new tab)</span>
						</a>
					</dd>
				</div>
			</dl>
		</AppCard>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { ExternalLink, RotateCw } from 'lucide-vue-next';
import type { Status } from '~/types';

const { $api } = useNuxtApp();
const config = useRuntimeConfig();
const appVersion = config.public.appVersion;

const serverStatus = ref<Status | null>(null);
const { data: status, pending, refresh } = await $api.status.show();

serverStatus.value = status.value?.data as Status;

watch(status, (value) => {
	serverStatus.value = value?.data as Status;
});

type InfoRow = { label: string; value: string | number; kind?: 'text' | 'mono' | 'chip' | 'status'; on?: boolean };
const serverRows = computed<InfoRow[]>(() => {
	const s = serverStatus.value;
	const show = (value: unknown) => (value === undefined || value === null || value === '' ? '—' : String(value));
	return [
		{ label: 'Clients auth mode', value: show(s?.clients_auth_mode), kind: 'chip' },
		{ label: 'Clients auth source', value: show(s?.clients_auth_source) },
		{ label: 'Clients connected', value: show(s?.clients_connected) },
		{ label: 'Clients disconnected', value: show(s?.clients_disconnected) },
		{ label: 'Users auth source', value: show(s?.users_auth_source), kind: 'chip' },
		{ label: 'Two-factor authentication', value: s?.two_fa_enabled ? 'Enabled' : 'Disabled', kind: 'status', on: !!s?.two_fa_enabled },
		{ label: 'Two-factor delivery method', value: show(s?.two_fa_delivery_method) },
		{ label: 'Fingerprint', value: show(s?.fingerprint), kind: 'mono' },
		{ label: 'Version', value: show(s?.version), kind: 'mono' },
	];
});
</script>
