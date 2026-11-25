<template>
	<!-- The captcha the server asks for (Turnstile or hCaptcha), loaded from the provider's official script URL. -->
	<div class="flex flex-col gap-1.5">
		<div
			ref="host"
			class="min-h-[65px]"
		/>
		<p
			v-if="failed"
			class="text-[13px] text-app-danger"
			role="alert"
		>
			The verification widget couldn’t load (a content blocker or the network may be stopping it). Allow
			{{ providerHost }} and reload the page.
		</p>
	</div>
</template>

<script setup lang="ts">
import { CAPTCHA_SCRIPTS, type CaptchaProvider } from '~/utils/signup';

interface CaptchaApi {
	render: (el: HTMLElement, opts: Record<string, unknown>) => string | number;
	reset: (id?: string | number) => void;
	remove?: (id?: string | number) => void;
}

const props = defineProps<{ provider: CaptchaProvider; siteKey: string }>();
const emit = defineEmits<{ (e: 'token', token: string): void }>();

const host = ref<HTMLElement | null>(null);
const failed = ref(false);
let widgetId: string | number | undefined;
const providerHost = computed(() => new URL(CAPTCHA_SCRIPTS[props.provider]).host);

const api = (): CaptchaApi | undefined =>
	(window as unknown as Record<string, CaptchaApi | undefined>)[props.provider === 'turnstile' ? 'turnstile' : 'hcaptcha'];

// One script per page, shared by remounts.
const loads = new Map<CaptchaProvider, Promise<void>>();
const loadScript = (provider: CaptchaProvider): Promise<void> => {
	const known = loads.get(provider);
	if (known) return known;
	const p = new Promise<void>((resolve, reject) => {
		const s = document.createElement('script');
		s.src = CAPTCHA_SCRIPTS[provider];
		s.async = true;
		s.defer = true;
		s.onload = () => resolve();
		s.onerror = () => {
			loads.delete(provider);
			s.remove();
			reject(new Error('captcha script failed to load'));
		};
		document.head.appendChild(s);
	});
	loads.set(provider, p);
	return p;
};

const dark = () => document.documentElement.classList.contains('dark');

onMounted(async () => {
	try {
		await loadScript(props.provider);
		const captcha = api();
		if (!captcha || !host.value) throw new Error('captcha unavailable');
		widgetId = captcha.render(host.value, {
			'sitekey': props.siteKey,
			'theme': dark() ? 'dark' : 'light',
			'callback': (token: string) => emit('token', token),
			'expired-callback': () => emit('token', ''),
			'error-callback': () => emit('token', ''),
		});
	}
	catch {
		failed.value = true;
	}
});

onBeforeUnmount(() => {
	api()?.remove?.(widgetId);
});

/** A token is good for one request: get a fresh one after a refused signup. */
const reset = () => {
	emit('token', '');
	api()?.reset(widgetId);
};
defineExpose({ reset });
</script>
