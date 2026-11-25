<template>
	<!-- A generated password shown only once (new administrator, invited new account): warning, copy button. -->
	<div class="flex flex-col gap-4">
		<div
			role="alert"
			class="flex items-start gap-2.5 rounded-[10px] border border-app-warn/30 bg-app-warn-bg p-3 text-[13px] text-app-warn"
		>
			<TriangleAlert
				class="mt-px h-[18px] w-[18px] shrink-0"
				aria-hidden="true"
			/>
			<span>
				<span class="font-semibold">Copy the password now: it is shown only this once.</span>
				{{ lostHint }} Send it over a trusted channel.
			</span>
		</div>
		<dl class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-sm">
			<template v-if="organization">
				<dt class="text-app-text-3">
					Organization
				</dt>
				<dd class="font-mono text-app-text">
					{{ organization }}
				</dd>
			</template>
			<dt class="text-app-text-3">
				Username
			</dt>
			<dd class="break-all font-mono text-app-text">
				{{ username }}
			</dd>
			<dt class="text-app-text-3">
				Password
			</dt>
			<dd class="flex min-w-0 items-center gap-1.5">
				<code
					class="min-w-0 flex-1 select-all break-all rounded-lg border border-app-border-strong bg-app-surface-2 px-3 py-2 font-mono text-[13px] text-app-text"
					data-testid="one-time-password"
				>{{ password }}</code>
				<button
					type="button"
					:aria-label="copied ? 'Password copied' : 'Copy password'"
					:title="copied ? 'It’s in your clipboard' : 'Copy to clipboard'"
					class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-app-border-strong text-app-text-2 hover:bg-app-hover hover:text-app-text"
					@click="copyPassword"
				>
					<Check
						v-if="copied"
						class="h-4 w-4 text-app-ok"
						aria-hidden="true"
					/>
					<Copy
						v-else
						class="h-4 w-4"
						aria-hidden="true"
					/>
				</button>
			</dd>
		</dl>
		<p class="text-[13px] text-app-text-3">
			They must set a new password when they first sign in.
		</p>
	</div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { Check, Copy, TriangleAlert } from 'lucide-vue-next';

const props = defineProps<{
	username: string;
	password: string;
	organization?: string;
	/** What to do if it's lost. */
	lostHint: string;
}>();
const copied = defineModel<boolean>('copied', { default: false });

const snackbar = useSnackbar();
const { copy, isSupported } = useClipboard({ legacy: true });

const copyPassword = async () => {
	if (!isSupported.value) {
		snackbar.add({ type: 'error', text: 'Clipboard is not available; select the password and copy it.' });
		return;
	}
	await copy(props.password);
	copied.value = true;
};
</script>
