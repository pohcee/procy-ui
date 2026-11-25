<template>
	<!-- The organization's recent audit entries (metadata only: never request or response bodies). -->
	<AppCard
		flush
		title="Activity"
		description="Sign-ins and administration from the organization’s audit log, and operator actions on it. Password sign-ins are recorded from this release on."
	>
		<template #actions>
			<OpSegmented
				:model-value="kind"
				:options="ACTIVITY_KINDS"
				label="Show"
				size="sm"
				@update:model-value="setKind"
			/>
		</template>
		<OpEmpty
			v-if="entries === null || error || !entries.length"
			:icon="ListChecks"
			:loading="entries === null && !error"
			:title="error ? 'Couldn’t load the activity' : entries === null ? 'Loading activity…' : 'No activity yet'"
			:description="error || (entries?.length === 0 ? (kind === 'sign_in' ? 'No sign-ins recorded yet.' : 'Nothing recorded for this organization yet.') : undefined)"
		/>
		<template v-else>
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full min-w-[820px] border-collapse text-left">
					<thead>
						<tr class="bg-app-surface-2">
							<th
								v-for="h in ['Time', 'Action', 'User', 'Source', 'From', 'Affected']"
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
							v-for="e in entries"
							:key="e.id"
							class="hover:bg-app-hover [&:last-child>td]:border-b-0"
						>
							<td
								class="whitespace-nowrap border-b border-app-border-subtle py-2.5 pl-4 pr-3 text-[13px] text-app-text-2"
								:title="e.timestamp"
							>
								{{ dateTime(e.timestamp) }}
							</td>
							<td class="border-b border-app-border-subtle px-3 py-2.5 text-[13px]">
								<span class="font-mono text-xs text-app-text-2">{{ e.application }}</span>
								<span
									:class="['ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', isFailedSignIn(e) ? 'bg-app-danger-bg text-app-danger' : 'bg-app-chip text-app-text-2']"
								>
									<AlertTriangle
										v-if="isFailedSignIn(e)"
										class="h-3 w-3"
										aria-hidden="true"
									/>
									{{ e.action || '—' }}
								</span>
							</td>
							<td class="max-w-[200px] truncate border-b border-app-border-subtle px-3 py-2.5 text-[13px] text-app-text">
								{{ e.username || '—' }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 text-[13px] text-app-text-2">
								{{ e.source === 'operator' ? 'Operator' : 'Organization' }}
							</td>
							<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-2.5 font-mono text-xs text-app-text-2">
								{{ e.remoteIp || '—' }}
							</td>
							<td class="max-w-[180px] truncate border-b border-app-border-subtle px-3 py-2.5 font-mono text-xs text-app-text-3">
								{{ e.affectedId || '—' }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<ul class="divide-y divide-app-border-subtle md:hidden">
				<li
					v-for="e in entries"
					:key="e.id"
					class="px-4 py-3"
				>
					<p class="flex flex-wrap items-center gap-1.5 text-[13px]">
						<span class="font-mono text-xs text-app-text-2">{{ e.application }}</span>
						<span :class="['rounded-md px-1.5 py-0.5 text-xs font-medium', isFailedSignIn(e) ? 'bg-app-danger-bg text-app-danger' : 'bg-app-chip text-app-text-2']">{{ e.action || '—' }}</span>
					</p>
					<p class="mt-1 text-xs text-app-text-3">
						{{ [e.username, e.source === 'operator' ? 'operator' : '', e.remoteIp, dateTime(e.timestamp)].filter(Boolean).join(' · ') }}
					</p>
				</li>
			</ul>
			<div
				v-if="next"
				class="flex justify-center border-t border-app-border-subtle px-4 py-3"
			>
				<AppButton
					variant="secondary"
					size="sm"
					:disabled="loadingMore"
					@click="loadMore"
				>
					{{ loadingMore ? 'Loading…' : 'Load more' }}
				</AppButton>
			</div>
		</template>
	</AppCard>
</template>

<script setup lang="ts">
import { AlertTriangle, ListChecks } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import { ACTIVITY_KINDS, dateTime, isFailedSignIn, type ActivityEntry, type ActivityKind } from '~/utils/operatorConsole';

const props = defineProps<{ id: string }>();
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const route = useRoute();
const router = useRouter();

const PAGE = 100;
const kind = computed<ActivityKind>(() => (ACTIVITY_KINDS.some(k => k.value === route.query.kind) ? route.query.kind as ActivityKind : 'all'));
const setKind = (k: ActivityKind) => router.replace({ query: { ...route.query, kind: k === 'all' ? undefined : k } });

const entries = ref<ActivityEntry[] | null>(null);
const next = ref<string | null>(null);
const error = ref<string | null>(null);
const loadingMore = ref(false);

let seq = 0;
const load = async () => {
	const mine = ++seq;
	entries.value = null;
	next.value = null;
	error.value = null;
	try {
		const page = await $api.operator.activity(props.id, { kind: kind.value, limit: PAGE });
		if (mine !== seq) return;
		entries.value = page.entries;
		next.value = page.next;
	}
	catch (e) {
		if (mine === seq) error.value = apiErrorMessage(e);
	}
};

const loadMore = async () => {
	if (!next.value || loadingMore.value) return;
	const mine = seq;
	loadingMore.value = true;
	try {
		const page = await $api.operator.activity(props.id, { kind: kind.value, limit: PAGE, before: next.value });
		if (mine !== seq) return;
		const seen = new Set((entries.value ?? []).map(e => e.id));
		entries.value = [...(entries.value ?? []), ...page.entries.filter(e => !seen.has(e.id))];
		next.value = page.next;
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't load more: ${apiErrorMessage(e)}` });
	}
	finally {
		loadingMore.value = false;
	}
};

watch([() => props.id, kind], load, { immediate: true });
</script>
