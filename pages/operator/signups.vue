<template>
	<new-page-wrapper>
		<AppPage
			title="Signups"
			description="Self-service signups, newest first. With approval required, a confirmed signup waits here until you approve it."
		>
			<template
				v-if="available"
				#actions
			>
				<OpSegmented
					v-model="filter"
					label="Show signups"
					size="sm"
					:options="[{ value: 'awaiting_approval', label: 'Awaiting approval' }, { value: '', label: 'All' }]"
				/>
				<AppButton
					variant="secondary"
					:disabled="loading"
					aria-label="Reload signups"
					@click="load"
				>
					<RefreshCw
						:class="['h-4 w-4', loading ? 'animate-spin' : '']"
						aria-hidden="true"
					/>
					<span class="hidden sm:inline">Reload</span>
				</AppButton>
			</template>

			<AppCard flush>
				<OpEmpty
					v-if="!available || rows === null || error || !rows.length"
					:icon="UserPlus"
					:loading="(!available && !statusReady) || (available && rows === null && !error)"
					:title="!available ? (statusReady ? 'Signups are not available' : 'Loading…') : error ? 'Couldn’t load the signups' : rows === null ? 'Loading signups…' : filter ? 'Nothing awaits approval' : 'No signups yet'"
					:description="!available && statusReady ? 'Self-service signup is off on this server, or your account is not a platform operator.' : error || undefined"
				/>
				<template v-else>
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[860px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in ['Email', 'Organization', 'Status', 'Signed up', 'From', '']"
										:key="col"
										scope="col"
										class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4 last:pr-4"
									>
										{{ col }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="r in rows"
									:key="r.id"
									class="align-top hover:bg-app-hover [&:last-child>td]:border-b-0"
								>
									<td class="border-b border-app-border-subtle py-3 pl-4 pr-3 text-[13px] font-medium text-app-text">
										{{ r.email }}
										<SignupFacts
											:row="r"
											:now="now"
										/>
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
										<NuxtLink
											v-if="r.organizationId"
											:to="orgLink(r.organizationId)"
											class="font-medium text-app-text hover:text-app-link hover:underline"
										>
											{{ r.organizationName || r.organizationId }}
										</NuxtLink>
										<template v-else>
											{{ r.organizationName }}
										</template>
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3 text-[13px]">
										<BillingPill
											:label="signupStatusInfo(r.status).label"
											:tone="signupStatusInfo(r.status).tone"
										/>
										<span
											v-if="r.decidedBy"
											class="mt-1 block text-xs text-app-text-3"
										>by {{ r.decidedBy }}{{ r.reason ? ` · ${r.reason}` : '' }}</span>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 text-[13px] text-app-text-2">
										{{ formatDay(r.createdAt) }}
										<span
											v-if="r.verifiedAt"
											class="block text-xs text-app-text-3"
										>confirmed {{ formatDay(r.verifiedAt) }}</span>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3 font-mono text-xs text-app-text-3">
										{{ r.remoteIp || '—' }}
									</td>
									<td class="border-b border-app-border-subtle py-3 pl-3 pr-4 text-right">
										<SignupActions
											:row="r"
											:busy="busy"
											:denying="denying"
											@approve="approve"
											@deny="startDeny"
											@confirm-deny="deny"
											@cancel-deny="denying = null"
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="r in rows"
							:key="r.id"
							class="flex flex-col gap-2 px-4 py-3"
						>
							<div class="flex items-center justify-between gap-3">
								<span class="min-w-0 truncate text-[15px] font-medium text-app-text">{{ r.email }}</span>
								<BillingPill
									:label="signupStatusInfo(r.status).label"
									:tone="signupStatusInfo(r.status).tone"
								/>
							</div>
							<p class="text-xs text-app-text-3">
								{{ r.organizationName }} · {{ formatDay(r.createdAt) }}
							</p>
							<SignupFacts
								:row="r"
								:now="now"
							/>
							<SignupActions
								:row="r"
								:busy="busy"
								:denying="denying"
								@approve="approve"
								@deny="startDeny"
								@confirm-deny="deny"
								@cancel-deny="denying = null"
							/>
						</li>
					</ul>
				</template>
			</AppCard>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { RefreshCw, UserPlus } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import BillingPill from '~/components/billing/BillingPill.vue';
import SignupActions from '~/components/operator/SignupActions.vue';
import SignupFacts from '~/components/signup/SignupFacts.vue';
import { formatDay } from '~/utils/billing';
import { signupStatusInfo, type SignupRow } from '~/utils/signup';
import { orgLink } from '~/utils/usage';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Signups' });

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const statusStore = useStatusStore();
const { operator, signup } = useCapabilities();
const statusReady = computed(() => !!statusStore.status?.version);
const available = computed(() => operator.value && signup.value);

const filter = ref<'awaiting_approval' | ''>('awaiting_approval');
const rows = ref<SignupRow[] | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
// "Waiting 3 h" is measured from the last load.
const now = ref(new Date());

let seq = 0;
const load = async () => {
	if (!available.value) return;
	const mine = ++seq;
	loading.value = true;
	error.value = null;
	try {
		const list = await $api.operator.signups({ status: filter.value || undefined, limit: 200 });
		if (mine === seq) {
			rows.value = list;
			now.value = new Date();
		}
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
const denying = ref<string | null>(null);

const approve = async (r: SignupRow) => {
	busy.value = r.id;
	try {
		await $api.operator.approveSignup(r.id);
		snackbar.add({ type: 'success', text: `${r.organizationName || r.email} is open; ${r.email} was emailed` });
		await load();
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't approve it: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};
const startDeny = (r: SignupRow) => {
	denying.value = r.id;
};
const deny = async (r: SignupRow, reason: string) => {
	busy.value = r.id;
	try {
		await $api.operator.denySignup(r.id, reason || undefined);
		snackbar.add({ type: 'success', text: `Signup of ${r.email} denied` });
		denying.value = null;
		await load();
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't deny it: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};
</script>
