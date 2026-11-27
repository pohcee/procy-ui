<template>
	<!-- Sign-in step when the password has expired (e.g. a generated one-time password): choose a new one. -->
	<form
		class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-xs sm:p-8"
		novalidate
		@submit.prevent="submit"
	>
		<div>
			<span
				class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-app-blue-bg text-app-blue"
				aria-hidden="true"
			>
				<KeyRound class="h-6 w-6" />
			</span>
			<h1 class="text-2xl font-bold tracking-tight text-app-text">
				Choose a new password
			</h1>
			<p class="mt-1.5 text-sm text-app-text-3">
				The password of <span class="font-medium text-app-text">{{ username }}</span> has expired or was a one-time password. Set your own to continue.
			</p>
		</div>

		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label
					for="new-password"
					class="text-[13px] font-medium text-app-text-2"
				>New password</label>
				<input
					id="new-password"
					v-model="password"
					type="password"
					autocomplete="new-password"
					required
					:class="inputClass"
				>
			</div>
			<div class="flex flex-col gap-1.5">
				<label
					for="new-password-confirm"
					class="text-[13px] font-medium text-app-text-2"
				>Confirm new password</label>
				<input
					id="new-password-confirm"
					v-model="confirm"
					type="password"
					autocomplete="new-password"
					required
					:class="[inputClass, mismatch ? '!border-app-danger' : '']"
					:aria-invalid="mismatch || undefined"
				>
				<span
					v-if="mismatch"
					class="text-[13px] text-app-danger"
					role="alert"
				>Passwords do not match</span>
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
			<span class="block first-letter:uppercase">{{ errors[0] }}</span>
		</div>

		<div class="flex flex-col gap-3">
			<button
				type="submit"
				:disabled="loading || !password || password !== confirm"
				class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
			>
				<LoaderCircle
					v-if="loading"
					class="h-4 w-4 animate-spin"
					aria-hidden="true"
				/>
				Set password and sign in
			</button>
			<button
				type="button"
				class="inline-flex h-11 w-full items-center justify-center rounded-[10px] text-sm font-medium text-app-text-2 hover:bg-app-hover hover:text-app-text"
				@click="emit('cancel')"
			>
				Back to sign in
			</button>
		</div>
	</form>
</template>

<script setup lang="ts">
import { CircleAlert, KeyRound, LoaderCircle } from 'lucide-vue-next';

defineProps<{
	username: string;
	loading?: boolean;
	errors: string[];
}>();
const emit = defineEmits<{
	(e: 'submit', password: string): void;
	(e: 'cancel'): void;
}>();

const password = ref('');
const confirm = ref('');
const mismatch = computed(() => !!confirm.value && password.value !== confirm.value);
const inputClass = 'h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-[15px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/25 sm:text-sm';

const submit = () => {
	if (password.value && password.value === confirm.value) emit('submit', password.value);
};
</script>
