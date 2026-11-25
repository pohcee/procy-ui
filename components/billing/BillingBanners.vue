<template>
	<!--
		App-wide billing banners above every page (capability `billing` only): read-only, a failed payment, the
		transfer cap, the soft cap, a trial or complimentary period ending. Standalone servers render nothing.
	-->
	<div
		v-if="banners.length"
		class="flex shrink-0 flex-col gap-px border-b border-app-border bg-app-border"
		data-testid="billing-banners"
	>
		<div
			v-for="b in banners"
			:key="b.id"
			:role="b.tone === 'danger' ? 'alert' : 'status'"
			:class="['flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-2.5 text-[13px] sm:px-6 lg:px-8', toneClass[b.tone]]"
		>
			<component
				:is="toneIcon[b.tone]"
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<p class="min-w-0 flex-1 basis-64 leading-5">
				<span class="font-semibold">{{ b.title }}.</span>
				{{ ' ' }}<span class="text-app-text-2">{{ b.text }}</span>
			</p>
			<div class="flex shrink-0 items-center gap-1.5">
				<button
					v-if="b.action && b.action.kind !== 'billing'"
					type="button"
					:disabled="busy"
					class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-current/30 bg-app-surface px-3 text-[13px] font-semibold text-app-text hover:bg-app-hover disabled:opacity-50"
					@click="act(b)"
				>
					{{ busy ? 'Opening…' : b.action.label }}
					<ExternalLink
						class="h-3.5 w-3.5 opacity-60"
						aria-hidden="true"
					/>
				</button>
				<NuxtLink
					v-else-if="b.action && route.path.toLowerCase() !== '/billing'"
					to="/billing"
					class="inline-flex h-8 items-center rounded-lg border border-current/30 bg-app-surface px-3 text-[13px] font-semibold text-app-text hover:bg-app-hover"
				>
					{{ b.action.label }}
				</NuxtLink>
				<button
					v-if="b.dismissible"
					type="button"
					:aria-label="`Hide “${b.title}” for this session`"
					class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-app-text-3 hover:bg-black/5 hover:text-app-text dark:hover:bg-white/5"
					@click="dismiss(b)"
				>
					<X
						class="h-4 w-4"
						aria-hidden="true"
					/>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { AlertTriangle, ExternalLink, Info, OctagonAlert, X } from 'lucide-vue-next';
import { billingErrorMessage, type BillingBanner } from '~/utils/billing';
import { billingRefusals } from '~/composables/useBilling';

const route = useRoute();
const snackbar = useSnackbar();
const { available, account, banners, dismiss, load, openPortal, checkout } = useBilling();

watch(available, ok => ok && load(), { immediate: true });

// A refusal anywhere in the app: a toast with the explanation (at most one per kind every few seconds), and the
// account reloaded so the banner says why.
let lastToast: { code: string; at: number } | null = null;
watch(() => billingRefusals.last, (r) => {
	if (!r) return;
	if (!lastToast || lastToast.code !== r.code || r.at - lastToast.at > 8000) {
		snackbar.add({ type: 'error', text: billingErrorMessage(r.code) ?? '' });
		lastToast = r;
	}
	if (available.value) load();
});

const busy = ref(false);
const act = async (b: BillingBanner) => {
	if (busy.value || !b.action) return;
	busy.value = true;
	try {
		if (b.action.kind === 'portal') await openPortal();
		else if (b.action.kind === 'checkout' && account.value) await checkout(account.value.plan);
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't open the payment page: ${apiErrorMessage(e)}` });
	}
	finally {
		busy.value = false;
	}
};

const toneClass: Record<BillingBanner['tone'], string> = {
	danger: 'bg-app-danger-bg text-app-danger',
	warn: 'bg-app-warn-bg text-app-warn',
	info: 'bg-app-blue-bg text-app-blue',
};
const toneIcon = { danger: OctagonAlert, warn: AlertTriangle, info: Info };
</script>
