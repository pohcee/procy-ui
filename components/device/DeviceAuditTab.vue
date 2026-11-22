<template>
	<div class="flex flex-col gap-4">
		<AppCard
			title="Audit log"
			description="Recorded actions on this device."
			flush
		>
			<div
				v-if="pending"
				class="py-12 text-center text-sm text-app-text-3"
			>
				Loading audit log…
			</div>
			<div
				v-else-if="entries.length === 0"
				class="py-12 text-center text-sm text-app-text-3"
			>
				No audit entries for this client.
			</div>
			<div
				v-else
				class="overflow-x-auto"
			>
				<table class="w-full min-w-[640px] border-collapse text-sm">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="col in ['Timestamp', 'Username', 'Application', 'Action']"
								:key="col"
								scope="col"
								class="border-b border-app-border whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3"
							>
								{{ col }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(entry, index) in entries"
							:key="index"
							class="hover:bg-app-hover"
						>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 font-mono text-[13px] text-app-text-2">
								{{ useDateFormat(entry.timestamp, 'YYYY-MM-DD HH:mm:ss').value }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 font-medium text-app-text">
								{{ entry.username }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3">
								<span class="rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2">{{ entry.application }}</span>
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-app-text-2">
								{{ entry.action }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div
				v-if="entries.length > 0"
				class="flex items-center justify-between gap-3 bg-app-surface-2 px-4 py-3 text-[13px] text-app-text-3"
			>
				<span>
					Showing {{ 1 + page * ITEMS_PER_PAGE }} to {{ entries.length + page * ITEMS_PER_PAGE }} of {{ response?.meta?.count ?? 0 }} results
				</span>
				<div class="flex items-center gap-1">
					<button
						type="button"
						aria-label="Previous page"
						:disabled="page === 0"
						class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-40"
						@click="previous"
					>
						<ChevronLeft
							class="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
					<button
						type="button"
						aria-label="Next page"
						:disabled="disabledNext"
						class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-40"
						@click="next"
					>
						<ChevronRight
							class="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
				</div>
			</div>
		</AppCard>
	</div>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
});

const { $api } = useNuxtApp();

const ITEMS_PER_PAGE = 20;
const page = ref(0);

const { data: response, pending, refresh } = useLazyAsyncData(
	'device-audit-log',
	() => $api.auditLog.paginate(page.value, ITEMS_PER_PAGE, { client_id: props.id }),
	{ watch: [page] },
);

const entries = computed(() => response.value?.data ?? []);
const disabledNext = computed(() => Math.ceil((response?.value?.meta?.count ?? 0) / ITEMS_PER_PAGE) <= page.value + 1);

const next = async () => {
	if (!disabledNext.value) {
		page.value++;
		await refresh();
	}
};
const previous = async () => {
	if (page.value > 0) {
		page.value--;
		await refresh();
	}
};
</script>
