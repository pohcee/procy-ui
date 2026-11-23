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
				<span class="font-medium text-app-text">{{ saved.by || 'Someone' }}</span> saved version
				<span class="font-medium text-app-text">{{ saved.version }}</span><template v-if="saved.at">
					on <span class="font-mono text-xs">{{ saved.at }}</span>
				</template>, after you opened this entry.
				Your changes were not saved and nothing was overwritten.
			</p>
			<p
				v-if="!diffs.length"
				class="text-sm text-app-text-3"
			>
				The code is the same on every OS; only the name, description or tags differ. Reload to see their version.
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
				<p
					v-if="diff.settings.length"
					class="text-xs text-app-text-3"
				>
					{{ diff.mine === diff.theirs ? 'The code is the same, but these settings differ' : 'These settings also differ' }}: {{ diff.settings.join(', ') }}.
				</p>
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
import type { EntryImplementation, EntryImplementations, LibraryOS } from '~/types';

const props = defineProps<{
	modelValue: boolean;
	/** Who saved the current version, and when (from the entry as it is saved now). */
	saved: { by: string; version: number; at: string };
	/** The entry as it is saved now (null if it couldn't be fetched). */
	theirs: EntryImplementations | null;
	/** What the editor holds. */
	mine: EntryImplementations;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'reload' | 'copy'): void;
}>();

const SETTINGS: [keyof EntryImplementation, string][] = [
	['interpreter', 'interpreter'],
	['is_sudo', 'sudo'],
	['cwd', 'working directory'],
	['timeout_sec', 'timeout'],
	['kind', 'run as'],
];

const diffs = computed(() => {
	const theirs = props.theirs;
	if (!theirs) return [];
	return LIBRARY_OS_ORDER
		.map((os: LibraryOS) => {
			const m = props.mine[os];
			const t = theirs[os];
			const settings = m && t ? SETTINGS.filter(([key]) => m[key] !== t[key]).map(([, label]) => label) : [];
			return { os, mine: m?.code, theirs: t?.code, settings };
		})
		.filter(d => d.mine !== d.theirs || d.settings.length);
});
</script>
