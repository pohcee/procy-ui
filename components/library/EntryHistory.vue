<template>
	<OpDialog
		:model-value="modelValue"
		:title="`History of ${entry.name}`"
		description="Pick a version to see what it changed, or compare it with another one."
		size="xl"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<p
			v-if="loadError"
			class="text-sm text-app-danger"
			role="alert"
		>
			{{ loadError }}
		</p>
		<p
			v-else-if="isLoading"
			class="text-sm text-app-text-3"
			aria-live="polite"
		>
			Loading versions…
		</p>
		<div
			v-else
			class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
		>
			<ul
				class="flex max-h-[360px] flex-col gap-1 overflow-y-auto md:max-h-[60dvh]"
				aria-label="Versions, newest first"
			>
				<li
					v-for="v in versions"
					:key="v.version"
				>
					<button
						type="button"
						:aria-pressed="selected === v.version"
						:class="[
							'flex min-h-[44px] w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40',
							selected === v.version ? 'border-app-accent bg-app-hover' : 'border-app-border hover:bg-app-hover',
						]"
						@click="select(v.version)"
					>
						<span class="flex items-center gap-2">
							<span class="font-semibold text-app-text">Version {{ v.version }}</span>
							<span
								v-if="v.version === entry.activeVersion"
								class="rounded-md bg-app-chip px-1.5 py-0.5 text-[11px] text-app-text-2"
							>current</span>
						</span>
						<span class="text-xs text-app-text-3">{{ v.created_by || 'unknown' }} · <span class="font-mono">{{ formatTime(v.created_at) }}</span></span>
						<span
							v-if="v.message"
							class="text-xs text-app-text-2"
						>{{ v.message }}</span>
						<span
							v-if="v.changed?.length"
							class="text-xs text-app-text-3"
						>Changed: {{ v.changed.join(', ') }}</span>
					</button>
				</li>
			</ul>

			<div
				v-if="selected !== null"
				class="flex min-w-0 flex-col gap-3"
			>
				<div class="flex flex-wrap items-center gap-2 text-sm">
					<label
						for="libHistoryBase"
						class="text-app-text-2"
					>Version {{ selected }} compared with</label>
					<select
						id="libHistoryBase"
						v-model="base"
						class="min-h-[40px] rounded-lg border border-app-border bg-app-surface px-2 text-sm text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
					>
						<option :value="0">
							Nothing (empty)
						</option>
						<option
							v-for="v in otherVersions"
							:key="v.version"
							:value="v.version"
						>
							Version {{ v.version }}
						</option>
					</select>
				</div>

				<p
					v-if="isComparing"
					class="text-sm text-app-text-3"
					aria-live="polite"
				>
					Loading…
				</p>
				<p
					v-else-if="compareError"
					class="text-sm text-app-danger"
					role="alert"
				>
					{{ compareError }}
				</p>
				<p
					v-else-if="unavailable.length"
					class="text-sm text-app-text-3"
					role="status"
				>
					Content unavailable for version {{ unavailable.join(' and ') }}, so it can’t be compared.
				</p>
				<template v-else-if="changes">
					<p
						v-if="!changes.meta.length && !changes.os.length"
						class="text-sm text-app-text-3"
					>
						No differences between these versions.
					</p>
					<ul
						v-if="changes.meta.length"
						class="list-disc pl-5 text-sm text-app-text-2"
					>
						<li
							v-for="line in changes.meta"
							:key="line"
						>
							{{ line }}
						</li>
					</ul>
					<section
						v-for="o in changes.os"
						:key="o.os"
						:aria-label="`${LIBRARY_OS_LABELS[o.os]} changes`"
						class="flex flex-col gap-1.5"
					>
						<h4 class="text-[13px] font-semibold text-app-text">
							{{ LIBRARY_OS_LABELS[o.os] }}
							<span
								v-if="o.note"
								class="font-normal text-app-text-3"
							>({{ o.note }})</span>
						</h4>
						<p
							v-if="o.settings.length"
							class="text-xs text-app-text-3"
						>
							Settings: {{ o.settings.join('; ') }}.
						</p>
						<p
							v-if="o.tooLarge"
							class="text-xs text-app-text-3"
						>
							Too large to compare line by line; all lines of the old code are shown as removed and all lines of the new code as added.
						</p>
						<p
							v-else-if="o.lineEndingsOnly"
							class="text-xs text-app-text-3"
						>
							Only the line endings differ.
						</p>
						<pre
							v-if="o.lines.some(l => l.kind !== 'same')"
							class="max-h-[260px] overflow-auto rounded-lg border border-app-border bg-app-surface-2 py-2 font-mono text-xs text-app-text"
							tabindex="0"
						><span
							v-for="(l, i) in o.lines"
							:key="i"
							:class="['block whitespace-pre-wrap break-words px-3', LINE_CLASS[l.kind]]"
						><span
							class="select-none"
							aria-hidden="true"
						>{{ LINE_MARK[l.kind] }} </span><span
							v-if="l.kind !== 'same'"
							class="sr-only"
						>{{ l.kind === 'add' ? 'Added: ' : 'Removed: ' }}</span>{{ l.text }}</span></pre>
					</section>
				</template>
			</div>
		</div>

		<OpDialog
			v-model="confirmOpen"
			title="Restore this version?"
			size="sm"
		>
			<p class="text-sm text-app-text-2">
				This saves a new version with the content of version {{ selected }}. Nothing is lost: the current version stays in the history.
				Unsaved edits in the editor are discarded.
			</p>
			<template #footer>
				<AppButton
					variant="secondary"
					@click="confirmOpen = false"
				>
					Cancel
				</AppButton>
				<AppButton
					class="ml-auto"
					:disabled="isRestoring"
					@click="restore"
				>
					Restore version {{ selected }}
				</AppButton>
			</template>
		</OpDialog>

		<template #footer>
			<AppButton
				variant="secondary"
				@click="emit('update:modelValue', false)"
			>
				Close
			</AppButton>
			<AppButton
				v-if="canRestore"
				class="ml-auto"
				@click="confirmOpen = true"
			>
				Restore this version
			</AppButton>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import OpDialog from '~/components/operate/OpDialog.vue';
import { LIBRARY_OS_LABELS, LIBRARY_OS_ORDER, type LibraryEntry } from '~/composables/useRunLibrary';
import type { EntryContent, EntryImplementation, EntryVersion, LibraryOS } from '~/types';
import { apiErrorMessage } from '~/utils/apiError';
import { lineDiffInfo, type DiffLine } from '~/utils/lineDiff';

const props = defineProps<{
	modelValue: boolean;
	entry: Pick<LibraryEntry, 'id' | 'name' | 'activeVersion' | 'builtinKey'>;
	/** Restores a version (the editor does the call, so conflicts get its handling); resolves true on success. */
	onRestore: (version: number) => Promise<boolean>;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
}>();

const { $api } = useNuxtApp();

const LINE_CLASS: Record<DiffLine['kind'], string> = {
	same: 'text-app-text-3',
	add: 'bg-green-500/15 text-app-text',
	del: 'bg-red-500/15 text-app-text',
};
const LINE_MARK: Record<DiffLine['kind'], string> = { same: ' ', add: '+', del: '-' };

const SETTINGS: [keyof EntryImplementation, string][] = [
	['interpreter', 'interpreter'],
	['is_sudo', 'sudo'],
	['cwd', 'working directory'],
	['timeout_sec', 'timeout'],
	['kind', 'run as'],
];

const versions = ref<EntryVersion[]>([]);
const isLoading = ref(false);
const loadError = ref('');
const selected = ref<number | null>(null);
const base = ref(0);
const contents = new Map<number, EntryContent>();
const isComparing = ref(false);
const compareError = ref('');
const from = ref<EntryContent | null | undefined>(null);
const to = ref<EntryContent | null | undefined>(null);
const confirmOpen = ref(false);
const isRestoring = ref(false);

const otherVersions = computed(() => versions.value.filter(v => v.version !== selected.value));
const canRestore = computed(() => !props.entry.builtinKey && selected.value !== null && selected.value !== props.entry.activeVersion);

const formatTime = (iso: string) => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

/** null for version 0 (nothing), undefined when the server sent no content for that version. */
const content = async (version: number): Promise<EntryContent | null | undefined> => {
	if (version === 0) return null;
	const cached = contents.get(version);
	if (cached) return cached;
	const { data } = await $api.library.getVersion(props.entry.id, version);
	if (!data.content) return undefined;
	contents.set(version, data.content);
	return data.content;
};

/** The one before the selected version in the list (the list is newest first), or 0 for the first. */
const previousOf = (version: number) => versions.value.find(v => v.version < version)?.version ?? 0;

let token = 0;
const compare = async () => {
	if (selected.value === null) return;
	const mine = ++token;
	isComparing.value = true;
	compareError.value = '';
	try {
		const [a, b] = await Promise.all([content(base.value), content(selected.value)]);
		if (mine !== token) return;
		from.value = a;
		to.value = b;
	}
	catch (e) {
		if (mine !== token) return;
		from.value = null;
		to.value = null;
		compareError.value = `Couldn’t load the versions: ${apiErrorMessage(e)}`;
	}
	finally {
		if (mine === token) isComparing.value = false;
	}
};

const select = (version: number) => {
	selected.value = version;
	base.value = previousOf(version);
};

watch([selected, base], compare);

const load = async () => {
	isLoading.value = true;
	loadError.value = '';
	selected.value = null;
	contents.clear();
	try {
		const { data } = await $api.library.listVersions(props.entry.id);
		versions.value = [...(data ?? [])].sort((a, b) => b.version - a.version);
		const [latest] = versions.value;
		if (latest) select(latest.version);
	}
	catch (e) {
		loadError.value = `Couldn’t load the history: ${apiErrorMessage(e)}`;
	}
	finally {
		isLoading.value = false;
	}
};

watch(() => props.modelValue, (open) => {
	if (open) load();
	else confirmOpen.value = false;
}, { immediate: true });

const describe = (v: unknown) => (v === '' || v === undefined ? '(none)' : String(v));

const unavailable = computed(() => {
	if (selected.value === null || isComparing.value || compareError.value) return [];
	return [
		from.value === undefined ? base.value : null,
		to.value === undefined ? selected.value : null,
	].filter((v): v is number => v !== null);
});

const changes = computed(() => {
	if (!to.value || from.value === undefined) return null;
	const a = from.value;
	const b = to.value;
	const meta: string[] = [];
	if ((a?.name ?? '') !== b.name) meta.push(`Name: ${describe(a?.name)} → ${describe(b.name)}`);
	if ((a?.description ?? '') !== b.description) meta.push(`Description: ${describe(a?.description)} → ${describe(b.description)}`);
	const tagsA = a?.tags ?? [];
	if (tagsA.join('\n') !== b.tags.join('\n')) {
		const added = b.tags.filter(t => !tagsA.includes(t));
		const removed = tagsA.filter(t => !b.tags.includes(t));
		meta.push(`Tags: ${[...added.map(t => `added ${t}`), ...removed.map(t => `removed ${t}`)].join(', ') || 'reordered'}`);
	}
	const os = LIBRARY_OS_ORDER.flatMap((key: LibraryOS) => {
		const ia = a?.implementations[key];
		const ib = b.implementations[key];
		if (!ia && !ib) return [];
		const settings = ia && ib
			? SETTINGS.filter(([k]) => ia[k] !== ib[k]).map(([k, label]) => `${label} ${describe(ia[k])} → ${describe(ib[k])}`)
			: [];
		const { lines, tooLarge } = lineDiffInfo(ia?.code ?? '', ib?.code ?? '');
		const lineEndingsOnly = !tooLarge && !!ia && !!ib && ia.code !== ib.code && lines.every(l => l.kind === 'same');
		if (ia && ib && !settings.length && !tooLarge && !lineEndingsOnly && ia.code === ib.code) return [];
		return [{ os: key, settings, lines, tooLarge, lineEndingsOnly, note: !ia ? 'added' : !ib ? 'removed' : '' }];
	});
	return { meta, os };
});

const restore = async () => {
	if (selected.value === null) return;
	isRestoring.value = true;
	try {
		const ok = await props.onRestore(selected.value);
		confirmOpen.value = false;
		if (ok) emit('update:modelValue', false);
	}
	finally {
		isRestoring.value = false;
	}
};
</script>
