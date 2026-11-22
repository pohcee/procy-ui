<template>
	<form
		class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8"
		novalidate
		@submit.prevent="login"
	>
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-app-text">
				Sign in
			</h1>
			<p class="mt-1.5 text-sm text-app-text-3">
				Use your OpenRPort2 server account.
			</p>
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
			v-if="errors.length > 0"
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
	</form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ChevronDown, CircleAlert, LoaderCircle } from 'lucide-vue-next';
import type { ILoginInput } from '~/types';

const store = useTokenStore();

const { errors, loading } = storeToRefs(store);
const user = ref<ILoginInput>({
	username: 'admin',
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
const inputClass = 'h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-[15px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25 sm:text-sm';

const emit = defineEmits(['login']);
const login = async () => {
	const credentials: ILoginInput = {
		...user.value,
	};
	emit('login', credentials);
};
</script>
