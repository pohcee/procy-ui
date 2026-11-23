<template>
	<OpDialog
		:model-value="modelValue"
		title="Someone else saved this entry"
		size="xl"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<div class="flex flex-col gap-4">
			<p
				class="text-sm text-app-text-2"
				aria-live="polite"
			>
				<template v-if="saved">
					<span class="font-medium text-app-text">{{ saved.by }}</span> saved version
					<span class="font-medium text-app-text">{{ saved.version }}</span> on
					<span class="font-mono text-xs">{{ saved.at }}</span>, after you opened this entry.
				</template>
				<template v-else>
					The entry was saved by someone else after you opened it.
				</template>
				Your changes were not saved and nothing was overwritten.
			</p>
			<p
				v-if="!diffs.length"
				class="text-sm text-app-text-3"
			>
				The code on the OS tabs is the same; only other settings differ. Reload to see their version.
			</p>
			<section
				v-for="diff in diffs"
				:key="diff.os"
				:aria-label="`${LIBRARY_OS_LABELS[diff.os]} changes`"
				class="flex flex-col gap-2"
			>
				<h4 class="text-[13px] font-semibold text-app-text">
					{{ LIBRARY_OS_LABELS[diff.os] }}
				</h4>
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<div class="min-w-0">
						<p class="mb-1 text-xs font-medium text-app-text-3">
							Yours
						</p>
						<pre
							class="max-h-[240px] min-h-[60px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-app-border bg-app-surface-2 p-3 font-mono text-xs text-app-text"
							tabindex="0"
						>{{ diff.mine ?? '(not implemented)' }}</pre>
					</div>
					<div class="min-w-0">
						<p class="mb-1 text-xs font-medium text-app-text-3">
							Theirs
						</p>
						<pre
							class="max-h-[240px] min-h-[60px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-app-border bg-app-surface-2 p-3 font-mono text-xs text-app-text"
							tabindex="0"
						>{{ diff.theirs ?? '(not implemented)' }}</pre>
					</div>
				</div>
			</section>
		</div>
		<template #footer>
			<AppButton
				variant="secondary"
				@click="emit('copy')"
			>
				Copy my code
			</AppButton>
			<AppButton
				class="ml-auto"
				@click="emit('reload')"
			>
				Reload theirs
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';
import { LIBRARY_OS_LABELS, LIBRARY_OS_ORDER } from '~/composables/useRunLibrary';
import type { EntryImplementations, LibraryOS } from '~/types';

const props = defineProps<{
	modelValue: boolean;
	/** The server's 409 message: who saved which version, and when. */
	message: string;
	/** The entry as it is saved now (null if it couldn't be fetched). */
	theirs: EntryImplementations | null;
	/** What the editor holds. */
	mine: EntryImplementations;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'reload' | 'copy'): void;
}>();

const saved = computed(() => {
	const m = /saved by (.+?) at (\S+) \(version (\d+)\)/.exec(props.message);
	return m ? { by: m[1], at: m[2], version: m[3] } : null;
});

const diffs = computed(() => {
	const theirs = props.theirs;
	if (!theirs) return [];
	return LIBRARY_OS_ORDER
		.map((os: LibraryOS) => ({ os, mine: props.mine[os]?.code, theirs: theirs[os]?.code }))
		.filter(d => d.mine !== d.theirs);
});
</script>
