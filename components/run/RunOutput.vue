<template>
	<!--
		Output of one device job: error line, stdout and stderr in monospace, each with a copy
		button; long output wraps and scrolls inside a capped height.
	-->
	<div class="flex min-w-0 flex-col gap-2">
		<p
			v-if="error || meta"
			class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]"
		>
			<span
				v-if="error"
				class="font-medium text-app-danger"
			>{{ error }}</span>
			<span
				v-if="meta"
				class="font-mono text-xs text-app-text-3"
			>{{ meta }}</span>
		</p>
		<p
			v-if="loading"
			class="flex items-center gap-2 text-[13px] text-app-text-3"
		>
			<Loader2
				class="h-4 w-4 animate-spin"
				aria-hidden="true"
			/>
			Loading output…
		</p>
		<template
			v-for="block in blocks"
			:key="block.key"
		>
			<div class="min-w-0">
				<div class="mb-1 flex items-center justify-between gap-2">
					<span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-app-text-3">{{ block.label }}</span>
					<button
						type="button"
						class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-app-text-2 hover:bg-app-hover hover:text-app-text"
						:aria-label="`Copy ${block.label}`"
						@click="copyBlock(block)"
					>
						<component
							:is="copied === block.key ? Check : Copy"
							class="h-3.5 w-3.5"
							aria-hidden="true"
						/>
						{{ copied === block.key ? 'Copied' : 'Copy' }}
					</button>
				</div>
				<pre
					:class="[
						'max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-app-border-subtle bg-app-bg p-3 font-mono text-xs leading-5',
						block.key === 'stderr' ? 'text-app-danger' : 'text-app-text',
					]"
				>{{ block.text }}</pre>
			</div>
		</template>
		<p
			v-if="!loading && !blocks.length"
			class="text-[13px] text-app-text-3"
		>
			{{ emptyText }}
		</p>
	</div>
</template>

<script setup lang="ts">
import { Check, Copy, Loader2 } from 'lucide-vue-next';
import { useClipboard } from '@vueuse/core';

const props = withDefaults(defineProps<{
	stdout?: string;
	stderr?: string;
	error?: string;
	/** A small line next to the error, e.g. "exit 1 · PID 1234". */
	meta?: string;
	loading?: boolean;
	emptyText?: string;
}>(), {
	stdout: '',
	stderr: '',
	error: '',
	meta: '',
	loading: false,
	emptyText: 'No output.',
});

const { copy } = useClipboard({ legacy: true });
const copied = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

const blocks = computed(() => [
	{ key: 'stdout', label: 'Output', text: props.stdout },
	{ key: 'stderr', label: 'Errors (stderr)', text: props.stderr },
].filter(b => b.text));

const copyBlock = async (block: { key: string; text: string }) => {
	await copy(block.text);
	copied.value = block.key;
	clearTimeout(timer);
	timer = setTimeout(() => {
		copied.value = null;
	}, 1500);
};

onBeforeUnmount(() => clearTimeout(timer));
</script>
