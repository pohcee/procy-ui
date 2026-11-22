<template>
	<form
		class="flex w-full flex-col gap-6 rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8"
		novalidate
		@submit.prevent="verifyTwoFa"
	>
		<div>
			<span
				class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-app-blue-bg text-app-blue"
				aria-hidden="true"
			>
				<ShieldCheck class="h-6 w-6" />
			</span>
			<h1 class="text-2xl font-bold tracking-tight text-app-text">
				Verify it’s you
			</h1>
			<p class="mt-1.5 text-sm text-app-text-3">
				<template v-if="sendTo">
					We’ve sent a verification code to <span class="font-medium text-app-text">{{ sendTo }}</span>. Enter it below.
				</template>
				<template v-else>
					Enter the code from your authenticator app.
				</template>
			</p>
		</div>

		<div class="flex flex-col gap-1.5">
			<label
				for="code"
				class="text-[13px] font-medium text-app-text-2"
			>Verification code</label>
			<input
				id="code"
				v-model="code"
				type="text"
				inputmode="numeric"
				autocomplete="one-time-code"
				class="h-12 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 font-mono text-lg tracking-[0.3em] text-app-text focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
			>
		</div>

		<div
			v-if="attempted && errors.length > 0"
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
				>Verifying…</span>
				Verify
			</button>
			<div class="flex items-center justify-between gap-2">
				<button
					type="button"
					class="inline-flex h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-app-text-2 transition-colors hover:bg-app-hover hover:text-app-text"
					@click="handleCancel"
				>
					<ArrowLeft
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Back to sign in
				</button>
				<button
					type="button"
					:disabled="loading"
					class="inline-flex h-11 items-center rounded-[10px] px-3 text-sm font-medium text-app-link transition-colors hover:bg-app-hover disabled:pointer-events-none disabled:opacity-50"
					@click="handleResend"
				>
					Resend code
				</button>
			</div>
		</div>
	</form>
</template>

<script setup lang="ts">
import { ArrowLeft, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-vue-next';

const store = useTokenStore();
const { errors, loading } = storeToRefs(store);
defineProps({
	sendTo: {
		type: String,
		default: '',
	},
});
const code = ref('');
// Only surface store errors caused by a verification attempt made on this screen.
const attempted = ref(false);
const emit = defineEmits(['code', 'resend', 'cancel']);
const verifyTwoFa = async () => {
	attempted.value = true;
	emit('code', code.value);
};
const handleResend = () => {
	code.value = '';
	emit('resend');
};
const handleCancel = () => {
	code.value = '';
	emit('cancel');
};
</script>
