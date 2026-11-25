import {
	apiErrorCode, billingBanners, ERR_BILLING_READ_ONLY, ERR_TRANSFER_LIMIT,
	type BillingAccount, type BillingBanner, type BillingPayment,
} from '~/utils/billing';

/**
 * Billing refusals seen in this session (set by the API plugin for every response): a read-only organization or
 * the transfer limit. Everyone sees the banner they cause, administrators or not.
 */
export const billingRefusals = reactive({
	readOnly: false,
	transferLimit: false,
	/** The latest refusal (for a toast); `at` tells repeated ones apart. */
	last: null as { code: string; at: number } | null,
});

/** Records a billing refusal from an API error response. Returns whether it was one. */
export const noteBillingRefusal = (status: number | undefined, data: unknown): boolean => {
	if (status !== 403) return false;
	const code = apiErrorCode({ data });
	if (code === ERR_BILLING_READ_ONLY) billingRefusals.readOnly = true;
	else if (code === ERR_TRANSFER_LIMIT) billingRefusals.transferLimit = true;
	else return false;
	billingRefusals.last = { code, at: Date.now() };
	return true;
};

// One copy per session, shared by the banners and the Billing page.
const account = ref<BillingAccount | null>(null);
const payment = ref<BillingPayment | null>(null);
/** null: not known yet; false: the server has no payment provider (payment routes answer 404). */
const hasProvider = ref<boolean | null>(null);
const loaded = ref(false);
const accountError = ref<string | null>(null);
let pending: Promise<void> | null = null;

const DISMISS_KEY = 'billing_banners_dismissed';
const readDismissed = (): string[] => {
	try {
		const v = JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]');
		return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
	}
	catch {
		return [];
	}
};
const dismissed = ref<string[]>(import.meta.client ? readDismissed() : []);

/**
 * The organization's billing for its Administrators (capability `billing`, not for platform operators): the
 * account and payment state behind the app-wide banners, and the provider's portal and checkout.
 */
export const useBilling = () => {
	const { $api } = useNuxtApp();
	const { billing, operator } = useCapabilities();
	const { isAdmin } = useIsAdmin();

	/** Whether this user sees the organization's billing. */
	const available = computed(() => billing.value && !operator.value && isAdmin.value);

	const load = () => {
		pending ??= (async () => {
			const [a, p] = await Promise.allSettled([$api.billing.account(), $api.billing.payment()]);
			account.value = a.status === 'fulfilled' ? a.value : null;
			accountError.value = a.status === 'rejected' ? apiErrorMessage(a.reason) : null;
			payment.value = p.status === 'fulfilled' ? p.value : null;
			hasProvider.value = p.status === 'fulfilled' ? true : httpStatusOf(p.reason) === 404 ? false : hasProvider.value;
			loaded.value = true;
		})().finally(() => {
			pending = null;
		});
		return pending;
	};
	const reload = () => (available.value ? load() : Promise.resolve());

	const banners = computed<BillingBanner[]>(() => {
		if (!billing.value || operator.value) return [];
		return billingBanners({
			account: available.value ? account.value : null,
			payment: available.value ? payment.value : null,
			isAdmin: available.value,
			sawReadOnly: billingRefusals.readOnly,
			sawTransferLimit: billingRefusals.transferLimit,
			hasProvider: hasProvider.value === true,
		}).filter(b => !b.dismissible || !dismissed.value.includes(`${b.id}:${account.value?.organization ?? ''}`));
	});

	const dismiss = (b: BillingBanner) => {
		dismissed.value = [...dismissed.value, `${b.id}:${account.value?.organization ?? ''}`];
		try {
			sessionStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed.value));
		}
		catch {
			// not remembered
		}
	};

	/** Opens the provider's customer portal (payment methods, invoices, cancellation). */
	const openPortal = async () => {
		const url = await $api.billing.portal();
		if (!/^https:\/\//i.test(url)) throw new Error('The payment provider returned no portal link.');
		window.location.assign(url);
	};

	/**
	 * Buys a plan: the provider's checkout, or with a live subscription the plan changes at once (then the account
	 * is reloaded and `true` returned).
	 */
	const checkout = async (plan: string): Promise<boolean> => {
		const { url, planChanged } = await $api.billing.checkout(plan);
		if (planChanged) {
			await load();
			return true;
		}
		if (!/^https:\/\//i.test(url)) throw new Error('The payment provider returned no checkout link.');
		window.location.assign(url);
		return false;
	};

	return { available, account, accountError, payment, hasProvider, loaded, load, reload, banners, dismiss, openPortal, checkout };
};
