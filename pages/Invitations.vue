<template>
	<new-page-wrapper>
		<AppPage
			title="Invitations"
			description="Organizations that invited your account. Accepting makes you a member with the groups of the invitation; your password and two-factor settings stay the same."
		>
			<AppCard
				v-if="!available || invitations === null"
				flush
			>
				<OpEmpty
					:icon="MailPlus"
					:loading="!statusReady || (available && invitations === null && !failed)"
					:title="!statusReady ? 'Loading…' : !available ? 'No invitations on this server' : failed ? 'Couldn’t load your invitations' : 'Loading…'"
					:description="statusReady && !available ? 'This server has one organization per account.' : undefined"
				>
					<AppButton
						v-if="failed"
						variant="secondary"
						@click="retry"
					>
						Try again
					</AppButton>
				</OpEmpty>
			</AppCard>

			<template v-else>
				<!-- With signup on, accepting needs a confirmed email address. -->
				<EmailConfirmCard
					v-if="signup && (unconfirmed || invitations.length)"
					compact
				/>
				<!-- Accepted on this page: offer to switch there. -->
				<div
					v-for="org in accepted"
					:key="`ok-${org.id}`"
					class="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-ok-bg px-4 py-3 text-sm text-app-ok"
					role="status"
				>
					<CircleCheck
						class="h-[18px] w-[18px] shrink-0"
						aria-hidden="true"
					/>
					<span class="min-w-0 flex-1">You are now a member of <span class="font-semibold">{{ org.name }}</span>. It’s in your organization menu.</span>
					<AppButton
						size="sm"
						variant="secondary"
						:disabled="switching"
						@click="switchTo(org.id)"
					>
						Switch to {{ org.name }}
					</AppButton>
				</div>

				<AppCard flush>
					<OpEmpty
						v-if="!invitations.length"
						:icon="MailPlus"
						title="No pending invitations"
						description="When an administrator of another organization invites you, it shows up here."
					/>
					<ul
						v-else
						class="divide-y divide-app-border-subtle"
					>
						<li
							v-for="inv in invitations"
							:key="inv.id"
							class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
						>
							<span
								class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-blue-bg text-app-blue"
								aria-hidden="true"
							>
								<Building2 class="h-5 w-5" />
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-[15px] font-semibold text-app-text">
									{{ inv.name }}
								</p>
								<p class="mt-0.5 text-[13px] text-app-text-3">
									<span
										v-if="inv.name !== inv.id"
										class="font-mono"
									>{{ inv.id }} · </span>
									{{ invitedLine(inv) }}
								</p>
							</div>
							<div class="flex shrink-0 gap-2">
								<AppButton
									variant="secondary"
									:disabled="!!busy"
									@click="decline(inv)"
								>
									{{ busy === `decline-${inv.id}` ? 'Declining…' : 'Decline' }}
								</AppButton>
								<AppButton
									:disabled="!!busy"
									@click="accept(inv)"
								>
									{{ busy === `accept-${inv.id}` ? 'Accepting…' : 'Accept' }}
								</AppButton>
							</div>
						</li>
					</ul>
				</AppCard>
			</template>
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { Building2, CircleCheck, MailPlus } from 'lucide-vue-next';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import EmailConfirmCard from '~/components/account/EmailConfirmCard.vue';
import type { MyInvitation } from '~/utils/membership';
import { isUnconfirmedEmailError } from '~/utils/signup';

useHead({ title: 'Invitations' });

const statusStore = useStatusStore();
const statusReady = computed(() => !!statusStore.status?.version);
const snackbar = useSnackbar();
const { invitations, failed, available, reload, accept: acceptInv, decline: declineInv } = useInvitations();
const { switching, switchTo: switchOrg } = useMembership();
const { signup } = useCapabilities();
/** An acceptance was refused because the account's email isn't confirmed. */
const unconfirmed = ref(false);

const retry = () => reload();

const busy = ref<string | null>(null);
const accepted = ref<MyInvitation[]>([]);

const accept = async (inv: MyInvitation) => {
	busy.value = `accept-${inv.id}`;
	try {
		await acceptInv(inv.id);
		accepted.value = [...accepted.value, inv];
	}
	catch (e) {
		if (isUnconfirmedEmailError(apiErrorTitle(e))) {
			unconfirmed.value = true;
			snackbar.add({ type: 'error', text: 'Confirm your email address first: use the button above, then open the link we email you.' });
		}
		else snackbar.add({ type: 'error', text: `Couldn't accept the invitation: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};

const decline = async (inv: MyInvitation) => {
	busy.value = `decline-${inv.id}`;
	try {
		await declineInv(inv.id);
		snackbar.add({ type: 'success', text: `Declined the invitation of ${inv.name}` });
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't decline the invitation: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = null;
	}
};

const switchTo = async (id: string) => {
	try {
		await switchOrg(id);
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't switch the organization: ${apiErrorMessage(e)}` });
	}
};

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const formatDate = (value: string) => {
	if (!value) return '';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
};
/** "Invited by x on <date>", with whichever parts are known. */
const invitedLine = (inv: { invitedBy: string; createdAt: string }) => {
	const date = formatDate(inv.createdAt);
	if (inv.invitedBy) return `Invited by ${inv.invitedBy}${date ? ` on ${date}` : ''}`;
	return date ? `Invited ${date}` : '';
};
</script>
