<template>
	<AppCard title="Updates status">
		<template #actions>
			<AppButton
				variant="secondary"
				size="sm"
				:disabled="isLoading"
				@click="reload"
			>
				<RefreshCw
					:class="['h-3.5 w-3.5', isLoading ? 'animate-spin' : '']"
					aria-hidden="true"
				/>
				Reload
			</AppButton>
		</template>
		<div v-if="device?.updates_status != null">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex flex-col gap-2 text-[13px]">
					<div class="flex items-center gap-2">
						<span class="inline-flex h-6 min-w-[32px] items-center justify-center rounded-full bg-app-blue-bg px-2 text-xs font-semibold text-app-blue">{{ device.updates_status.updates_available }}</span>
						<span class="font-medium text-app-text">Updates</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="inline-flex h-6 min-w-[32px] items-center justify-center rounded-full bg-app-warn-bg px-2 text-xs font-semibold text-app-warn">{{ device.updates_status.security_updates_available }}</span>
						<span class="font-medium text-app-text">Security updates</span>
					</div>
					<div
						v-if="device.updates_status.reboot_pending"
						class="font-semibold text-app-warn"
					>
						Reboot pending
					</div>
				</div>
				<AppButton
					variant="secondary"
					size="sm"
					@click="viewUpdates"
				>
					More details
				</AppButton>
			</div>
			<p class="mt-5 text-xs text-app-text-3">
				Last status from {{ formatedDate(String(device.updates_status.refreshed)) }}
			</p>
		</div>
		<div
			v-else
			class="flex gap-3 rounded-lg bg-app-warn-bg px-4 py-3 text-[13px] text-app-warn"
			role="status"
		>
			<TriangleAlert
				class="mt-0.5 h-4 w-4 flex-none"
				aria-hidden="true"
			/>
			<div>
				The client version does not support update supervision, or update supervision is disabled.
			</div>
		</div>
		<Modal
			v-model="updateConfirm"
			:title="`Available updates for ${device?.name}`"
			ok-text="Ok"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="updateConfirm = false"
		>
			<div class="mt-4 overflow-x-auto rounded-lg border border-app-border">
				<table class="w-full min-w-[560px] border-collapse text-sm">
					<thead>
						<tr class="bg-app-surface-2 text-left">
							<th
								scope="col"
								class="border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								Title
							</th>
							<th
								scope="col"
								class="border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								Security
							</th>
							<th
								scope="col"
								class="border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								Description
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(update, index) in device.updates_status?.update_summaries"
							:key="index"
							class="hover:bg-app-hover"
						>
							<td class="border-b border-app-border-subtle px-3 py-3 font-mono text-[13px] text-app-text">
								{{ update.title }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3">
								<span
									v-if="update.is_security_update"
									class="inline-flex items-center gap-1.5 rounded bg-app-warn-bg px-1.5 py-0.5 text-[11px] font-bold text-app-warn"
								>
									<ShieldAlert
										class="h-3.5 w-3.5"
										aria-hidden="true"
									/>
									SECURITY
								</span>
								<span
									v-else
									class="text-[13px] text-app-text-4"
								>—</span>
							</td>
							<td class="border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
								{{ update.description }}
							</td>
						</tr>
						<tr v-if="!device.updates_status?.update_summaries?.length">
							<td
								colspan="3"
								class="px-3 py-8 text-center text-[13px] text-app-text-3"
							>
								No pending updates.
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</Modal>
	</AppCard>
</template>

<script setup lang="ts">
import { RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-vue-next';
import { formatedDate } from '~/lib/utils';
import type { Client } from '~/types';

const props = defineProps<{
	device: Client;
}>();

const clientStore = useClientStore();
const updateConfirm = ref(false);
const isLoading = ref(false);

const viewUpdates = () => {
	updateConfirm.value = true;
};

// Re-reads the client (its updates_status is refreshed by the rport client on its own schedule).
async function reload() {
	if (!props.device?.id) return;
	isLoading.value = true;
	try {
		await clientStore.loadClientById(props.device.id);
	}
	finally {
		isLoading.value = false;
	}
}
</script>
