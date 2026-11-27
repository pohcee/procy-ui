<template>
	<form
		class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-xs sm:p-8"
		novalidate
		@submit.prevent="login"
	>
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-app-text">
				Sign in
			</h1>
			<p class="mt-1.5 text-sm text-app-text-3">
				Use your Procy server account.
			</p>
		</div>

		<!-- Sign in with Google ([oidc] enabled): a full-page navigation to the server, which sends the browser to Google. -->
		<div
			v-if="oidc"
			class="flex flex-col gap-3"
		>
			<a
				:href="oidcHref"
				:class="[
					'inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border bg-app-surface px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent',
					oidcRequired ? 'border-app-accent ring-2 ring-app-accent/40' : 'border-app-border-strong',
				]"
				@click="rememberLifetime"
			>
				<svg
					class="h-[18px] w-[18px] shrink-0"
					viewBox="0 0 48 48"
					aria-hidden="true"
				>
					<path
						fill="#EA4335"
						d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
					/>
					<path
						fill="#4285F4"
						d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
					/>
					<path
						fill="#FBBC05"
						d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
					/>
					<path
						fill="#34A853"
						d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
					/>
				</svg>
				{{ oidc.buttonLabel }}
			</a>
			<div
				v-if="oidcRequired"
				class="flex items-start gap-2.5 rounded-[10px] border border-app-border bg-app-blue-bg p-3 text-sm text-app-text"
				role="alert"
			>
				<Info
					class="mt-px h-[18px] w-[18px] shrink-0 text-app-blue"
					aria-hidden="true"
				/>
				<span>This account signs in with Google. Use the button above.</span>
			</div>
			<div
				class="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.06em] text-app-text-4"
				aria-hidden="true"
			>
				<span class="h-px flex-1 bg-app-border" />
				or
				<span class="h-px flex-1 bg-app-border" />
			</div>
		</div>

		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label
					for="username"
					class="text-[13px] font-medium text-app-text-2"
				>Username</label>
				<input
					id="username"
					v-model="user.username"
					name="username"
					type="text"
					autocapitalize="none"
					spellcheck="false"
					autocomplete="username"
					required
					:class="inputClass"
				>
			</div>
			<div class="flex flex-col gap-1.5">
				<label
					for="password"
					class="text-[13px] font-medium text-app-text-2"
				>Password</label>
				<input
					id="password"
					v-model="user.password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					:class="inputClass"
				>
			</div>
			<div class="flex flex-col gap-1.5">
				<label
					for="rememberMe"
					class="text-[13px] font-medium text-app-text-2"
				>Remember me for</label>
				<div class="relative">
					<select
						id="rememberMe"
						v-model="user.remember_me"
						:class="[inputClass, 'cursor-pointer appearance-none pr-10']"
					>
						<option
							v-for="option in rememberMeOptions"
							:key="option.value"
							:value="option.value"
						>
							{{ option.label }}
						</option>
					</select>
					<ChevronDown
						class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-3"
						aria-hidden="true"
					/>
				</div>
			</div>
		</div>

		<div
			v-if="errors.length > 0 && !(oidc && oidcRequired)"
			class="flex items-start gap-2.5 rounded-[10px] border border-app-border bg-app-danger-bg p-3 text-sm text-app-danger"
			role="alert"
		>
			<CircleAlert
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<span class="block first-letter:uppercase">{{ errors[0] || 'Unauthorized' }}</span>
		</div>

		<button
			type="submit"
			:disabled="loading"
			class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-wait disabled:opacity-70"
		>
			<LoaderCircle
				v-if="loading"
				class="h-4 w-4 animate-spin"
				aria-hidden="true"
			/>
			<span
				v-if="loading"
				class="sr-only"
			>Signing in…</span>
			Sign in
		</button>

		<p
			v-if="signupOpen"
			class="-mt-2 text-center text-sm text-app-text-3"
		>
			New to Procy?
			<NuxtLink
				to="/signup"
				class="font-medium text-app-accent underline-offset-2 hover:underline"
			>Create an organization</NuxtLink>
		</p>
	</form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ChevronDown, CircleAlert, Info, LoaderCircle } from 'lucide-vue-next';
import type { ILoginInput } from '~/types';
import { OIDC_LIFETIME_KEY, type OidcProvider } from '~/utils/oidc';

const props = defineProps<{
	initialUsername?: string;
	/** Sign in with Google, when the server offers it. */
	oidc?: OidcProvider | null;
	/** Where the Google button navigates (the server's login URL with `return_to`). */
	oidcHref?: string;
}>();

const store = useTokenStore();
const { $api } = useNuxtApp();

const { errors, loading, oidcRequired } = storeToRefs(store);

const user = ref<ILoginInput>({
	username: props.initialUsername || 'admin',
	password: '',
	remember_me: '3600',
});
const rememberMeOptions = [
	{ value: '3600', label: '1 hour' },
	{ value: String(3600 * 24), label: '24 hours' },
	{ value: String(3600 * 24 * 7), label: '7 days' },
	{ value: String(3600 * 24 * 14), label: '14 days' },
	{ value: String(3600 * 24 * 30), label: '30 days' },
];
const inputClass = 'h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-[15px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/25 sm:text-sm';

// Servers with self-service signup ([signup] enabled) get a link to it; others answer 404 and nothing changes.
const signupOpen = ref(false);
onMounted(async () => {
	try {
		signupOpen.value = !!(await $api.signup.config());
	}
	catch {
		signupOpen.value = false;
	}
});

// The "remember me" choice applies to a Google sign-in too: kept in this tab for /auth/oidc.
const rememberLifetime = () => {
	try {
		sessionStorage.setItem(OIDC_LIFETIME_KEY, user.value.remember_me);
	}
	catch {
		// No storage (private mode): the server's default lifetime then.
	}
};

const emit = defineEmits(['login']);
const login = async () => {
	const credentials: ILoginInput = {
		...user.value,
	};
	emit('login', credentials);
};
</script>
