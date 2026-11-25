<template>
	<new-page-wrapper>
		<AppPage>
			<template #header>
				<div class="min-w-0">
					<NuxtLink
						to="/operator/organizations"
						class="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-app-text-3 hover:text-app-text"
					>
						<ChevronLeft
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Organizations
					</NuxtLink>
					<div class="flex flex-wrap items-center gap-2.5">
						<h1 class="truncate text-2xl font-bold tracking-tight text-app-text sm:text-[28px] sm:leading-tight">
							{{ org?.name || id }}
						</h1>
						<OrgStatusPill
							v-if="org"
							:status="org.status"
						/>
					</div>
					<p class="mt-1 text-[13px] text-app-text-3">
						<span class="font-mono">{{ id }}</span>
						<template v-if="org?.created_at">
							· created {{ shortDate(org.created_at) }}
						</template>
					</p>
				</div>
			</template>

			<div
				v-if="loadError"
				role="alert"
				class="rounded-xl bg-app-danger-bg p-4 text-sm text-app-danger"
			>
				{{ loadError }}
			</div>

			<div
				v-if="org?.status === 'suspended'"
				class="flex items-start gap-2.5 rounded-xl border border-app-border bg-app-danger-bg p-4 text-sm text-app-danger"
			>
				<CirclePause
					class="mt-px h-[18px] w-[18px] shrink-0"
					aria-hidden="true"
				/>
				<span>Suspended: its users can't sign in and its sessions and API tokens don't work.</span>
			</div>

			<template v-if="org">
				<OrgTabs
					:id="id"
					:current="tab"
					:tabs="tabs"
				/>
				<div
					id="org-tab-panel"
					role="tabpanel"
					:aria-labelledby="`org-tab-${tab}`"
					class="flex flex-col gap-5"
				>
					<OrgOverviewTab
						v-if="tab === 'overview'"
						:org="org"
					/>
					<OrgDevicesTab
						v-else-if="tab === 'devices'"
						:id="id"
					/>
					<OrgMembersTab
						v-else-if="tab === 'members'"
						:org="org"
						:refresh-key="membersKey"
						@admin="adminOrg = org"
					/>
					<template v-else-if="tab === 'billing'">
						<OrgBilling
							v-if="billing"
							:id="id"
						/>
						<AppCard
							v-else
							flush
						>
							<OpEmpty
								:icon="CreditCard"
								title="Billing is not enabled on this server"
								description="Plans, billing status and periods are unavailable. Turn on [billing] in the server configuration to assign plans and limits."
							/>
						</AppCard>
					</template>
					<OrgActivityTab
						v-else-if="tab === 'activity'"
						:id="id"
					/>
					<OrgSettingsTab
						v-else-if="tab === 'settings'"
						:org="org"
						@limit="limitOrg = org"
						@status="statusOrg = org"
						@changed="org = $event"
					/>
				</div>
			</template>
			<OpEmpty
				v-else-if="!loadError"
				loading
				title="Loading the organization…"
			/>
		</AppPage>

		<OrgLimitDialog
			:org="limitOrg"
			@close="limitOrg = null"
			@saved="onSaved($event, 'Device limit saved'); limitOrg = null"
		/>
		<OrgStatusDialog
			:org="statusOrg"
			@close="statusOrg = null"
			@saved="onSaved($event, $event.status === 'suspended' ? 'Organization suspended' : 'Organization reactivated'); statusOrg = null"
		/>
		<OrgAdminDialog
			:org="adminOrg"
			@close="adminOrg = null"
			@created="onAdminCreated"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { ChevronLeft, CirclePause, CreditCard } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import OrgActivityTab from '~/components/operator/console/OrgActivityTab.vue';
import OrgDevicesTab from '~/components/operator/console/OrgDevicesTab.vue';
import OrgMembersTab from '~/components/operator/console/OrgMembersTab.vue';
import OrgOverviewTab from '~/components/operator/console/OrgOverviewTab.vue';
import OrgSettingsTab from '~/components/operator/console/OrgSettingsTab.vue';
import OrgTabs from '~/components/operator/console/OrgTabs.vue';
import OrgAdminDialog from '~/components/operator/OrgAdminDialog.vue';
import OrgBilling from '~/components/operator/OrgBilling.vue';
import OrgLimitDialog from '~/components/operator/OrgLimitDialog.vue';
import OrgStatusDialog from '~/components/operator/OrgStatusDialog.vue';
import OrgStatusPill from '~/components/operator/OrgStatusPill.vue';
import type { Organization } from '~/repository/modules/operator';
import { ORG_TABS, ORG_TAB_LABELS, orgTab, shortDate } from '~/utils/operatorConsole';

definePageMeta({ layout: 'operator' });

const { $api } = useNuxtApp();
const route = useRoute();
const snackbar = useSnackbar();
const { billing } = useCapabilities();

const id = computed(() => String(route.params.id ?? ''));
const tab = computed(() => orgTab(route.query.tab));
const tabs = ORG_TABS.map(value => ({ value, label: ORG_TAB_LABELS[value] }));

const org = ref<Organization | null>(null);
const loadError = ref<string | null>(null);

useHead({ title: () => org.value?.name || id.value });

let seq = 0;
const load = async () => {
	const mine = ++seq;
	org.value = null;
	loadError.value = null;
	try {
		const o = await $api.operator.get(id.value);
		if (mine === seq) org.value = o;
	}
	catch (e) {
		if (mine !== seq) return;
		loadError.value = httpStatusOf(e) === 404 ? `There is no organization “${id.value}”.` : `Couldn't load the organization: ${apiErrorMessage(e)}`;
	}
};
watch(id, load, { immediate: true });

// ---- dialogs ----
const limitOrg = ref<Organization | null>(null);
const statusOrg = ref<Organization | null>(null);
const adminOrg = ref<Organization | null>(null);
const membersKey = ref(0);

const onSaved = (saved: Organization, text: string) => {
	// Keep the counts when the response leaves them out.
	org.value = { ...(org.value ?? saved), ...saved };
	snackbar.add({ type: 'success', text });
};
const onAdminCreated = () => {
	if (org.value) org.value = { ...org.value, user_count: (org.value.user_count ?? 0) + 1 };
	membersKey.value++;
};
</script>
