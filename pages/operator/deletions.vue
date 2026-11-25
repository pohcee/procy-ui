<template>
	<new-page-wrapper>
		<AppPage
			title="Deletions"
			description="Organizations whose deletion was requested: suspended at once, deleted when the 30-day hold ends."
		>
			<template
				v-if="available"
				#actions
			>
				<OpSegmented
					v-model="filter"
					label="Show deletions"
					size="sm"
					:options="[{ value: 'pending', label: 'Pending' }, { value: '', label: 'All' }]"
				/>
				<AppButton
					variant="secondary"
					:disabled="loading"
					aria-label="Reload deletions"
					@click="load"
				>
					<RefreshCw
						:class="['h-4 w-4', loading ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
			</template>

			<!-- Expedite: irreversible, confirmed by typing the ID, in the page -->
			<section
				v-if="expediting"
				ref="panel"
				aria-label="Delete now"
				class="flex flex-col gap-3 rounded-xl border border-app-danger/40 bg-app-danger-bg p-5"
			>
				<h2 class="text-[15px] font-semibold text-app-text">
					Delete {{ expediting.organizationName }} now?
				</h2>
				<p class="text-sm text-app-text-2">
					Ends the hold of {{ formatDay(expediting.deleteAfter) }}: every row of the organization is deleted and its vault
					key destroyed at once. This can’t be undone, and its administrators’ cancel links stop working.
				</p>
				<form
					class="flex flex-wrap items-end gap-3"
					@submit.prevent="expedite"
				>
					<OpField
						label="Type the organization ID to confirm"
						for-id="expedite-confirm"
						class="w-full max-w-[320px]"
					>
						<OpInput
							id="expedite-confirm"
							v-model="typed"
							mono
							:placeholder="expediting.organizationId"
							autocapitalize="none"
							spellcheck="false"
						/>
					</OpField>
					<AppButton
						type="submit"
						class="!bg-app-danger hover:!bg-app-danger/90"
						:disabled="busy !== null || typed.trim() !== expediting.organizationId"
					>
						{{ busy ? 'Deleting…' : 'Delete now' }}
					</AppButton>
					<AppButton
						variant="secondary"
						@click="expediting = null"
					>
						Cancel
					</AppButton>
				</form>
			</section>

			<AppCard flush>
				<OpEmpty
					v-if="!available || rows === null || error || !rows.length"
					:icon="Trash2"
					:loading="(!available && !statusReady) || (available && rows === null && !error)"
					:title="!available ? (statusReady ? 'Deletions are not available' : 'Loading…') : error ? 'Couldn’t load the deletions' : rows === null ? 'Loading deletions…' : filter ? 'No pending deletions' : 'No deletions yet'"
					:description="!available && statusReady ? 'Self-service signup is off on this server, or your account is not a platform operator.' : error || undefined"
				/>
				<ul
					v-else
					class="divide-y divide-app-border-subtle"
				>
					<li
						v-for="d in rows"
						:key="d.id || d.organizationId"
						class="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:gap-6"
					>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<NuxtLink
									v-if="d.state !== 'done'"
									:to="orgLink(d.organizationId)"
									class="truncate text-[15px] font-medium text-app-text hover:text-app-link hover:underline"
								>
									{{ d.organizationName }}
								</NuxtLink>
								<span
									v-else
									class="truncate text-[15px] font-medium text-app-text"
								>{{ d.organizationName }}</span>
								<span class="font-mono text-xs text-app-text-3">{{ d.organizationId }}</span>
								<BillingPill v-bind="deletionStateInfo(d.state)" />
							</div>
							<p class="mt-1 text-[13px] text-app-text-3">
								Requested {{ formatDay(d.requestedAt) }} by {{ d.requestedBy || 'unknown' }}
								<template v-if="d.state === 'pending'">
									· deleted on <span class="font-medium text-app-text-2">{{ formatDay(d.deleteAfter) }}</span>
									({{ (daysUntil(d.deleteAfter) ?? 0) <= 0 ? 'today' : `in ${daysLabel(daysUntil(d.deleteAfter) ?? 0)}` }})
								</template>
								<template v-else-if="d.finishedAt">
									· {{ d.state === 'done' ? 'deleted' : 'canceled' }} {{ formatDay(d.finishedAt) }}{{ d.finishedBy ? ` by ${d.finishedBy}` : '' }}
								</template>
							</p>
							<p
								v-if="d.reason"
								class="mt-1 text-[13px] text-app-text-2"
							>
								“{{ d.reason }}”
							</p>
						</div>
						<div
							v-if="d.state !== 'done'"
							class="flex shrink-0 flex-wrap gap-2"
						>
							<AppButton
								size="sm"
								variant="secondary"
								:disabled="busy !== null"
								@click="exportOrg(d)"
							>
								<Download
									class="h-3.5 w-3.5"
									aria-hidden="true"
								/>
								Export
							</AppButton>
							<template v-if="d.state === 'pending'">
								<AppButton
									size="sm"
									variant="secondary"
									:disabled="busy !== null"
									@click="cancel(d)"
								>
									{{ busy === `cancel-${d.organizationId}` ? 'Canceling…' : 'Cancel deletion' }}
								</AppButton>
								<AppButton
									size="sm"
									variant="danger"
									class="border border-app-border-strong"
									:disabled="busy !== null"
									@click="askExpedite(d)"
								>
									Delete now
								</AppButton>
							</template>
						</div>
					</li>
				</ul>
			</AppCard>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { Download, RefreshCw, Trash2 } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import BillingPill from '~/components/billing/BillingPill.vue';
import { daysLabel, daysUntil, formatDay } from '~/utils/billing';
import { downloadJson } from '~/utils/download';
import { deletionStateInfo, exportFileName, type OrgDeletion } from '~/utils/signup';
import { orgLink } from '~/utils/usage';

useHead({ title: 'Deletions' });

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const statusStore = useStatusStore();
const { operator, signup } = useCapabilities();
const statusReady = computed(() => !!statusStore.status?.version);
const available = computed(() => operator.value && signup.value);

const filter = ref<'pending' | ''>('pending');
const rows = ref<OrgDeletion[] | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

let seq = 0;
const load = async () => {
	if (!available.value) return;
	const mine = ++seq;
	loading.value = true;
	error.value = null;
	try {
		const list = await $api.operator.deletions({ state: filter.value || undefined, limit: 200 });
		if (mine === seq) rows.value = list;
	}
	catch (e) {
		if (mine === seq) error.value = apiErrorMessage(e);
	}
	finally {
		if (mine === seq) loading.value = false;
	}
};
watch(available, ok => ok && load(), { immediate: true });
watch(filter, () => {
	rows.value = null;
	load();
});

const busy = ref<string | null>(null);

const exportOrg = async (d: OrgDeletion) => {
	busy.value = `export-${d.organizationId}`;
	try {
		downloadJson(await $api.operator.exportOrg(d.organizationId), exportFileName(d.organizationId));
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't export it: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};

const cancel = async (d: OrgDeletion) => {
	busy.value = `cancel-${d.organizationId}`;
	try {
		await $api.operator.cancelDeletion(d.organizationId);
		snackbar.add({ type: 'success', text: `${d.organizationName} won’t be deleted; it has its previous status back` });
		await load();
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't cancel it: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};

const expediting = ref<OrgDeletion | null>(null);
const typed = ref('');
const panel = ref<HTMLElement | null>(null);
const askExpedite = async (d: OrgDeletion) => {
	expediting.value = d;
	typed.value = '';
	await nextTick();
	panel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	panel.value?.querySelector<HTMLInputElement>('input')?.focus();
};
const expedite = async () => {
	const d = expediting.value;
	if (!d || busy.value || typed.value.trim() !== d.organizationId) return;
	busy.value = `expedite-${d.organizationId}`;
	try {
		await $api.operator.expediteDeletion(d.organizationId);
		snackbar.add({ type: 'success', text: `${d.organizationName} was deleted` });
		expediting.value = null;
		await load();
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't delete it: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};
</script>
