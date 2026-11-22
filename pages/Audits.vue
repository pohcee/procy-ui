<template>
	<new-page-wrapper>
		<AppPage
			title="Audit log"
			description="Who did what, from where, and on which device."
		>
			<form
				class="grid grid-cols-1 gap-3 rounded-xl border border-app-border bg-app-surface p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
				aria-label="Filter the audit log"
				@submit.prevent="applyFilters"
			>
				<OpField
					v-for="field in filterFields"
					:key="field.key"
					:label="field.label"
					:for-id="`audit-${field.key}`"
				>
					<OpInput
						:id="`audit-${field.key}`"
						v-model="filters[field.key]"
						:mono="field.mono"
						:placeholder="field.placeholder"
					/>
				</OpField>
				<div class="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
					<AppButton
						variant="secondary"
						class="flex-1 lg:flex-none"
						@click="clearFilters"
					>
						Clear
					</AppButton>
					<AppButton
						type="submit"
						class="flex-1 lg:flex-none"
					>
						Apply
					</AppButton>
				</div>
			</form>

			<section class="overflow-hidden rounded-xl border border-app-border bg-app-surface">
				<OpEmpty
					v-if="pending && !entries.length"
					loading
					title="Loading audit log…"
				/>
				<OpEmpty
					v-else-if="entries.length === 0"
					:icon="ListChecks"
					:title="hasFilters ? 'No matching entries' : 'No audit entries yet'"
					:description="hasFilters ? 'Try different filters, or clear them.' : 'Actions taken through the API and UI are recorded here.'"
				/>
				<template v-else>
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[820px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in ['Time', 'User', 'Remote IP', 'Application', 'Action', 'Device']"
										:key="col"
										scope="col"
										class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
									>
										{{ col }}
									</th>
									<th
										scope="col"
										class="border-b border-app-border px-3 py-2.5 pr-4"
									>
										<span class="sr-only">Details</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="(entry, index) in entries"
									:key="index"
									class="cursor-pointer hover:bg-app-hover"
									@click="activeEntry = entry"
								>
									<td class="whitespace-nowrap border-b border-app-border-subtle py-3 pl-4 pr-3 align-middle font-mono text-xs text-app-text-2">
										{{ useDateFormat(entry.timestamp, 'YYYY-MM-DD HH:mm:ss').value }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 align-middle text-[13px] font-medium text-app-text">
										{{ entry.username || '—' }}
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 align-middle font-mono text-[13px] text-app-text-2">
										{{ entry.remote_ip || '—' }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 align-middle text-[13px] text-app-text-2">
										{{ entry.application }}
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 align-middle">
										<span :class="['rounded-md px-2 py-[3px] text-xs font-semibold', actionClass(entry.action)]">{{ entry.action }}</span>
									</td>
									<td class="max-w-[200px] truncate border-b border-app-border-subtle px-3 py-3 align-middle font-mono text-[13px] text-app-text-2">
										{{ entry.client_hostname || entry.client_id || '—' }}
									</td>
									<td class="border-b border-app-border-subtle py-3 pl-3 pr-4 text-right align-middle">
										<button
											type="button"
											class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
											:aria-label="`Show details of ${entry.action} by ${entry.username || 'unknown user'}`"
											@click.stop="activeEntry = entry"
										>
											<ChevronRight
												class="h-4 w-4"
												aria-hidden="true"
											/>
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="(entry, index) in entries"
							:key="index"
						>
							<button
								type="button"
								class="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-app-hover"
								@click="activeEntry = entry"
							>
								<span class="flex w-full items-center justify-between gap-2">
									<span class="flex min-w-0 items-center gap-2">
										<span :class="['shrink-0 rounded-md px-2 py-[3px] text-xs font-semibold', actionClass(entry.action)]">{{ entry.action }}</span>
										<span class="truncate text-sm text-app-text">{{ entry.application }}</span>
									</span>
									<ChevronRight
										class="h-4 w-4 shrink-0 text-app-text-3"
										aria-hidden="true"
									/>
								</span>
								<span class="text-xs text-app-text-3">
									<span class="font-medium text-app-text-2">{{ entry.username || '—' }}</span>
									<template v-if="entry.client_hostname || entry.client_id">
										on <span class="font-mono">{{ entry.client_hostname || entry.client_id }}</span>
									</template>
								</span>
								<span class="font-mono text-xs text-app-text-3">
									{{ useDateFormat(entry.timestamp, 'YYYY-MM-DD HH:mm:ss').value }}<template v-if="entry.remote_ip"> · {{ entry.remote_ip }}</template>
								</span>
							</button>
						</li>
					</ul>
				</template>
				<OpPagination
					v-if="entries.length > 0"
					:page="page"
					:per-page="ITEMS_PER_PAGE"
					:count="response?.meta?.count ?? 0"
					:shown="entries.length"
					@previous="previous"
					@next="next"
				/>
			</section>
		</AppPage>
		<Modal
			:model-value="isDetailOpen"
			title="Audit log entry"
			ok-text="Close"
			:show-cancel="false"
			@update:model-value="activeEntry = null"
			@ok="activeEntry = null"
		>
			<dl
				v-if="activeEntry"
				class="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]"
			>
				<dt class="text-app-text-3">
					Time
				</dt>
				<dd class="font-mono text-app-text">
					{{ useDateFormat(activeEntry.timestamp, 'YYYY-MM-DD HH:mm:ss').value }}
				</dd>
				<dt class="text-app-text-3">
					User
				</dt>
				<dd class="text-app-text">
					{{ activeEntry.username || '—' }}
				</dd>
				<dt class="text-app-text-3">
					Action
				</dt>
				<dd class="text-app-text">
					{{ activeEntry.application }} · {{ activeEntry.action }}
				</dd>
			</dl>
			<pre class="whitespace-pre-wrap break-all rounded-[10px] bg-[#0F151D] p-3 font-mono text-xs leading-5 text-[#E6EBF2]">{{ JSON.stringify(activeEntry, null, 2) }}</pre>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import { ChevronRight, ListChecks } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpPagination from '~/components/operate/OpPagination.vue';
import type { AuditLog } from '~/types';
import type { AuditLogFilters } from '~/repository/modules/auditlog';

const { $api } = useNuxtApp();

const ITEMS_PER_PAGE = 20;
const page = ref(0);
const filters = reactive<Required<Pick<AuditLogFilters, 'username' | 'application' | 'action' | 'client_id'>>>({ username: '', application: '', action: '', client_id: '' });
const appliedFilters = ref<AuditLogFilters>({});
const activeEntry = ref<AuditLog | null>(null);

const filterFields: { key: keyof typeof filters; label: string; placeholder: string; mono?: boolean }[] = [
	{ key: 'username', label: 'User', placeholder: 'e.g. admin' },
	{ key: 'application', label: 'Application', placeholder: 'e.g. client' },
	{ key: 'action', label: 'Action', placeholder: 'e.g. create' },
	{ key: 'client_id', label: 'Device ID', placeholder: 'Client ID', mono: true },
];

const { data: response, pending, refresh } = useLazyAsyncData(
	'audit-log',
	() => $api.auditLog.paginate(page.value, ITEMS_PER_PAGE, appliedFilters.value),
	{ watch: [page, appliedFilters] },
);

const entries = computed(() => response.value?.data ?? []);
const isDetailOpen = computed(() => activeEntry.value !== null);
const hasFilters = computed(() => Object.values(appliedFilters.value).some(Boolean));

const disabledNext = computed(() => Math.ceil((response?.value?.meta?.count ?? 0) / ITEMS_PER_PAGE) <= page.value + 1);

const actionClass = (action: string) => {
	const a = (action || '').toLowerCase();
	if (a.includes('delete') || a.includes('remove') || a.includes('close')) return 'bg-app-danger-bg text-app-danger';
	if (a.includes('create') || a.includes('add') || a.includes('open')) return 'bg-app-ok-bg text-app-ok';
	if (a.includes('update') || a.includes('edit') || a.includes('change')) return 'bg-app-blue-bg text-app-blue';
	return 'bg-app-chip text-app-text-2';
};

const applyFilters = () => {
	page.value = 0;
	appliedFilters.value = { ...filters };
};

const clearFilters = () => {
	filters.username = '';
	filters.application = '';
	filters.action = '';
	filters.client_id = '';
	applyFilters();
};

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
