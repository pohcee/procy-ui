<template>
	<!--
		One place to run code on devices. Single lines run as commands, multi-line code
		(or a #! shebang) runs as a script — chosen automatically, with an override.
		Used by the Execute page (pick targets) and the device "Run" tab (`client-id` set).
	-->
	<div
		:class="[
			'grid grid-cols-1 items-start gap-5',
			'lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]',
		]"
	>
		<!-- Left: targets + options -->
		<aside
			aria-label="Run settings"
			class="flex min-w-0 flex-col gap-4"
		>
			<section
				v-if="!clientId"
				class="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-[18px]"
			>
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="text-[15px] font-semibold text-app-text">
						Targets
					</h2>
					<span class="text-[13px] text-app-text-3">{{ deviceCountLabel }}</span>
				</div>
				<TargetSelector
					:initial="initialClientIds?.length ? { clientIds: initialClientIds, groupIds: [], tags: null } : null"
					@update:target="target = $event"
					@update:device-count="deviceCount = $event"
				/>
			</section>

			<section class="flex flex-col gap-3.5 rounded-xl border border-app-border bg-app-surface p-[18px]">
				<h2 class="text-[15px] font-semibold text-app-text">
					Options
				</h2>
				<p
					v-if="mode === 'library'"
					class="text-[13px] text-app-text-3"
				>
					The entry sets the interpreter, working directory, timeout and sudo for each OS.
				</p>
				<CustomThemedSelect
					v-if="mode === 'code'"
					:id="`${uid}-interpreter`"
					v-model="interpreter"
					label="Interpreter"
					placeholder="Select…"
					:options="interpreterOptionsWith(interpreter)"
				/>
				<OpField
					v-if="mode === 'code'"
					label="Working directory"
					:for-id="`${uid}-cwd`"
				>
					<OpInput
						:id="`${uid}-cwd`"
						v-model="workingDirectory"
						mono
						placeholder="e.g. /var/www"
					/>
				</OpField>
				<OpField
					v-if="mode === 'code'"
					label="Timeout (seconds)"
					:for-id="`${uid}-timeout`"
				>
					<OpInput
						:id="`${uid}-timeout`"
						v-model="timeoutInSeconds"
						type="number"
						min="1"
					/>
				</OpField>
				<div class="flex flex-col">
					<OpCheckbox
						v-if="mode === 'code'"
						v-model="useSudo"
					>
						Run with sudo <span class="text-app-text-3">(Unix only)</span>
					</OpCheckbox>
					<OpCheckbox
						v-if="!clientId"
						v-model="abortOnError"
					>
						Abort on error
					</OpCheckbox>
				</div>
			</section>
		</aside>

		<!-- Right: editor + results -->
		<div class="flex min-w-0 flex-col gap-5">
			<div
				role="radiogroup"
				aria-label="What to run"
				class="inline-flex w-fit gap-1 rounded-[10px] border border-app-border bg-app-surface p-1"
			>
				<label
					v-for="option in MODE_OPTIONS"
					:key="option.value"
					:class="[
						'inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-[13px] font-medium focus-within:ring-2 focus-within:ring-app-accent',
						mode === option.value ? 'bg-app-accent text-white' : 'text-app-text-2 hover:bg-app-hover',
						isLoading ? 'cursor-not-allowed opacity-50' : '',
					]"
				>
					<input
						type="radio"
						:name="`${uid}-mode`"
						class="sr-only"
						:value="option.value"
						:checked="mode === option.value"
						:disabled="isLoading"
						@change="setMode(option.value)"
					>
					{{ option.label }}
				</label>
			</div>

			<section
				v-if="mode === 'library'"
				class="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-[18px]"
			>
				<CustomThemedSelect
					:id="`${uid}-entry`"
					v-model="entryId"
					label="Library entry"
					placeholder="Select an entry…"
					:options="entryOptions"
				/>
				<dl
					v-if="selectedEntry"
					class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]"
				>
					<dt class="text-app-text-3">
						Name
					</dt>
					<dd class="text-app-text">
						{{ selectedEntry.name }}
					</dd>
					<dt class="text-app-text-3">
						Active version
					</dt>
					<dd class="text-app-text">
						v{{ selectedEntry.activeVersion }}
					</dd>
					<dt class="text-app-text-3">
						Implemented for
					</dt>
					<dd class="text-app-text">
						{{ selectedEntry.os.map(os => LIBRARY_OS_LABELS[os]).join(', ') || 'no OS' }}
					</dd>
				</dl>
				<div class="flex flex-wrap items-center justify-end gap-2.5 border-t border-app-border-subtle pt-3">
					<span
						class="mr-auto min-w-0 text-[13px] text-app-text-2"
						aria-live="polite"
					>
						<template v-if="!canRunEntry">{{ entryDisabledReason }}</template>
						<template v-else>{{ splitPreview }}</template>
					</span>
					<button
						type="button"
						class="inline-flex h-10 items-center gap-2 rounded-[10px] bg-app-accent px-4 text-[13px] font-semibold text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
						:disabled="!canRunEntry || isLoading"
						@click="run"
					>
						<Play
							class="h-3.5 w-3.5 fill-current"
							aria-hidden="true"
						/>
						{{ runLabel }}
					</button>
				</div>
			</section>

			<RunEditor
				v-else
				v-model:code="code"
				v-model:kind="kindChoice"
				:detected-kind="detectedKind"
				@insert="openLoadModal"
				@submit="run"
			>
				<template #leading>
					<label
						:for="`${uid}-name`"
						class="sr-only"
					>Name (needed to save to the library)</label>
					<input
						:id="`${uid}-name`"
						v-model="name"
						type="text"
						autocomplete="off"
						placeholder="untitled"
						class="h-9 min-w-[120px] max-w-[260px] rounded-md [field-sizing:content] border border-transparent bg-transparent px-1.5 font-mono text-xs text-[#E6EBF2] placeholder:text-[#7D8796] hover:border-[#2E3947] focus:border-[#3A4656] focus:outline-none"
					>
				</template>
				<template #footer>
					<div class="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#222B37] bg-[#131B25] px-3.5 py-3">
						<span
							class="mr-auto min-w-0 text-xs text-[#A9B4C3]"
							aria-live="polite"
						>
							<template v-if="!canExecute">{{ disabledReason }}</template>
							<template v-else>
								Runs as a <span class="font-medium text-[#E6EBF2]">{{ effectiveKind }}</span><span class="hidden sm:inline"> · Ctrl/⌘ + Enter</span>
							</template>
						</span>
						<button
							v-if="clientId"
							type="button"
							class="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#3A4656] px-3.5 text-[13px] font-medium text-[#E6EBF2] hover:bg-[#18202A] disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="!code.trim()"
							@click="openSchedule"
						>
							<Clock
								class="h-4 w-4"
								aria-hidden="true"
							/>
							Schedule
						</button>
						<button
							type="button"
							class="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#3A4656] px-3.5 text-[13px] font-medium text-[#E6EBF2] hover:bg-[#18202A] disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="!canSave || isSaving"
							:title="!canSave ? 'Enter a name and some code to save it to the library' : undefined"
							@click="openSaveDialog"
						>
							<Save
								class="h-4 w-4"
								aria-hidden="true"
							/>
							{{ loaded ? 'Update in library' : 'Save to library' }}
						</button>
						<button
							type="button"
							class="inline-flex h-10 items-center gap-2 rounded-[10px] bg-app-accent px-4 text-[13px] font-semibold text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
							:disabled="!canExecute || isLoading"
							@click="run"
						>
							<Play
								class="h-3.5 w-3.5 fill-current"
								aria-hidden="true"
							/>
							{{ runLabel }}
						</button>
					</div>
				</template>
			</RunEditor>

			<p
				v-if="runError"
				role="alert"
				class="rounded-xl border border-app-danger/30 bg-app-danger-bg px-4 py-3 text-sm text-app-danger"
			>
				{{ runError }}
			</p>

			<div
				v-if="refusedClientIds.length && !isLoading"
				role="status"
				class="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-warn-row px-4 py-3"
			>
				<p class="min-w-0 flex-1 text-sm text-app-text-2">
					<span class="font-semibold text-app-text">{{ refusedClientIds.length === 1 ? 'A device' : `${refusedClientIds.length} devices` }} refused this as a command</span>
					because of {{ refusedClientIds.length === 1 ? 'its' : 'their' }} command allow-list. Scripts aren’t subject to that list.
				</p>
				<AppButton
					size="sm"
					@click="rerunAsScript"
				>
					Run as a script on {{ refusedClientIds.length === 1 ? 'it' : 'them' }}
				</AppButton>
			</div>

			<CommandResult
				v-if="hasRun"
				:results="results"
				:running="isLoading"
				:entry-name="ranEntryName"
				:started-at="startedAt"
			>
				<template #actions>
					<AppButton
						v-if="failedClientIds.length && !clientId"
						variant="secondary"
						size="sm"
						:disabled="isLoading"
						@click="rerunFailed"
					>
						<RotateCcw
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Re-run failed
					</AppButton>
					<AppButton
						v-if="results.length"
						variant="secondary"
						size="sm"
						@click="downloadOutput"
					>
						<Download
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Download output
					</AppButton>
				</template>
			</CommandResult>
		</div>

		<LibraryLoadModal
			v-model="isLoadModalOpen"
			title="Insert from library"
			:items="libraryItems"
			:default-os="targetOs"
			@select="loadFromLibrary"
			@delete="deleteFromLibrary"
		/>
		<OpDialog
			v-model="isSaveDialogOpen"
			:title="loaded ? 'Update library entry' : 'Save to library'"
			description="A library entry holds one version of the code per OS."
			size="sm"
			as-form
			@submit="saveToLibrary"
		>
			<CustomThemedSelect
				:id="`${uid}-save-os`"
				v-model="saveOs"
				label="Save as the version for"
				:options="LIBRARY_OS_OPTIONS"
			/>
			<p
				v-if="loaded"
				class="mt-3 text-xs text-app-text-3"
			>
				Updates “{{ loaded.entry.name }}”. The versions for other OSes stay as they are.
			</p>
			<template #footer>
				<AppButton
					variant="secondary"
					@click="isSaveDialogOpen = false"
				>
					Cancel
				</AppButton>
				<AppButton
					type="submit"
					class="ml-auto"
					:disabled="isSaving"
				>
					{{ loaded ? 'Update' : 'Save' }}
				</AppButton>
			</template>
		</OpDialog>
		<ScheduleModal
			v-if="clientId"
			ref="scheduleModal"
			:client-ids="[clientId]"
		/>
	</div>
</template>

<script setup lang="ts">
import { Clock, Download, Play, RotateCcw, Save } from 'lucide-vue-next';
import RunEditor from '~/components/run/RunEditor.vue';
import CommandResult from '~/components/CommandResult.vue';
import LibraryLoadModal from '~/components/custom/LibraryLoadModal.vue';
import TargetSelector from '~/components/custom/TargetSelector.vue';
import ScheduleModal from '~/components/schedules/ScheduleModal.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import { useRemoteRun } from '~/composables/useRemoteRun';
import { LIBRARY_OS_LABELS, LIBRARY_OS_ORDER, implementationFor, isConflict, toLibraryOs, useRunLibrary, type LibraryEntry } from '~/composables/useRunLibrary';
import { detectRunKind, isCommandNotAllowed, type LibraryPickItem, type RunKind } from '~/utils/runKind';
import type { Client, JobClientTags, LibraryOS } from '~/types';

const props = defineProps<{
	/** Run on this one device (device page). Omit to pick targets (Execute page). */
	clientId?: string;
	/** Execute page: devices to start with as targets (e.g. a selection from the device list). */
	initialClientIds?: string[];
}>();

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const uid = useId();
const library = useRunLibrary();
const remote = useRemoteRun();

const name = ref('');
const code = ref('');
const workingDirectory = ref('');
const timeoutInSeconds = ref(300);
const useSudo = ref(false);
const abortOnError = ref(true);
const interpreter = ref('default');
const kindChoice = ref<'auto' | RunKind>('auto');

const target = ref<{ clientIds: string[]; groupIds: string[]; tags: JobClientTags | null }>({ clientIds: [], groupIds: [], tags: null });
const deviceCount = ref(0);

/** The library entry currently in the editor (updates go back to it). */
const loaded = ref<{ entry: LibraryEntry; os: LibraryOS } | null>(null);
const isSaving = ref(false);
const isSaveDialogOpen = ref(false);
const saveOs = ref<LibraryOS>('linux');
const LIBRARY_OS_OPTIONS = LIBRARY_OS_ORDER.map(os => ({ value: os, label: LIBRARY_OS_LABELS[os] }));
/** The OS the library should prefer when inserting: that of the targeted device(s), when it is one OS. */
const targetOs = ref<LibraryOS | undefined>(undefined);
const isLoadModalOpen = ref(false);
const libraryItems = ref<LibraryPickItem[]>([]);
const scheduleModal = ref<InstanceType<typeof ScheduleModal> | null>(null);

const interpreterValue = computed(() => (interpreter.value === 'default' ? '' : interpreter.value));
const detectedKind = computed(() => detectRunKind(code.value, interpreterValue.value));
const effectiveKind = computed<RunKind>(() => (kindChoice.value === 'auto' ? detectedKind.value : kindChoice.value));

// --- run mode: typed code or a library entry ---------------------------------
type Mode = 'code' | 'library';
const MODE_OPTIONS: { value: Mode; label: string }[] = [
	{ value: 'code', label: 'Code' },
	{ value: 'library', label: 'Library entry' },
];
const mode = ref<Mode>('code');
const entryId = ref('');
const entries = ref<LibraryEntry[]>([]);
const ranEntryName = ref('');

const entryOptions = computed(() => entries.value.map(e => ({ value: e.id, label: e.name })));
const selectedEntry = computed(() => entries.value.find(e => e.id === entryId.value) ?? null);

const MAX_DEVICE_LOOKUPS = 200;
const TAG_LIST_LIMIT = 500;
/** Devices looked up one by one (the list API pages at 20), by id. */
const devicesById = ref(new Map<string, Client>());
/** Devices that can match a tag filter (first TAG_LIST_LIMIT). */
const taggable = ref<Client[]>([]);
const taggableCapped = ref(false);
const groupMembers = ref(new Map<string, string[]>());
const lookupCapped = ref(false);

const setMode = async (value: Mode) => {
	mode.value = value;
	if (value !== 'library') return;
	try {
		if (!entries.value.length) entries.value = await library.listAll();
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to load the library' });
	}
};

/** Fetches what the preview needs for the current targets (devices by id, tag matches, group members). */
const loadTargets = async () => {
	try {
		if (props.clientId) {
			if (!devicesById.value.has(props.clientId)) {
				devicesById.value.set(props.clientId, (await $api.clients.show(props.clientId)).data);
			}
			return;
		}
		const t = target.value;
		if (t.tags && !taggable.value.length) {
			const res = await $api.clients.listForTargeting(TAG_LIST_LIMIT);
			taggable.value = res.data;
			taggableCapped.value = res.data.length >= TAG_LIST_LIMIT;
		}
		const wanted = new Set(t.clientIds);
		if (t.groupIds.length) {
			const missing = t.groupIds.filter(id => !groupMembers.value.has(id));
			if (missing.length) {
				const res = await $api.groups.listWithMembers(TAG_LIST_LIMIT);
				res.data.forEach(g => groupMembers.value.set(g.id, g.client_ids ?? g.clients_ids ?? []));
			}
			t.groupIds.forEach(id => groupMembers.value.get(id)?.forEach(m => wanted.add(m)));
		}
		const todo = [...wanted].filter(id => !devicesById.value.has(id));
		lookupCapped.value = wanted.size > MAX_DEVICE_LOOKUPS;
		await Promise.all(todo.slice(0, MAX_DEVICE_LOOKUPS).map(async (id) => {
			try {
				devicesById.value.set(id, (await $api.clients.show(id)).data);
			}
			catch { /* a device we can't read just isn't counted */ }
		}));
	}
	catch {
		// The preview is informational; the run itself still works.
	}
};
watch([mode, target, () => props.clientId], () => {
	if (mode.value === 'library') loadTargets();
}, { deep: true });

/** The targeted devices, as far as they could be looked up. */
const resolvedClients = computed<Client[]>(() => {
	if (props.clientId) return [devicesById.value.get(props.clientId)].filter((c): c is Client => !!c);
	const t = target.value;
	const ids = new Set(t.clientIds);
	t.groupIds.forEach(id => groupMembers.value.get(id)?.forEach(m => ids.add(m)));
	const found = new Map<string, Client>();
	ids.forEach((id) => {
		const c = devicesById.value.get(id);
		if (c) found.set(id, c);
	});
	if (t.tags && t.tags.tags.length) {
		const own = (c: Client) => (c.tags ?? []) as string[];
		taggable.value.filter(c => (t.tags!.operator === 'AND' ? t.tags!.tags.every(x => own(c).includes(x)) : t.tags!.tags.some(x => own(c).includes(x))))
			.forEach(c => found.set(c.id, c));
	}
	return [...found.values()];
});

/** "3 Linux · 1 Windows · 1 macOS skipped": how the targets split by the entry's implementations. */
const splitPreview = computed(() => {
	const entry = selectedEntry.value;
	if (!entry) return '';
	const counts = new Map<string, number>();
	resolvedClients.value.forEach((c) => {
		const os = toLibraryOs(c.os_kernel);
		const key = os ?? 'other';
		counts.set(key, (counts.get(key) ?? 0) + 1);
	});
	const parts: string[] = [];
	[...LIBRARY_OS_ORDER, 'other'].forEach((key) => {
		const n = counts.get(key);
		if (!n) return;
		const label = key === 'other' ? 'other OS' : LIBRARY_OS_LABELS[key as LibraryOS];
		parts.push(`${n} ${label}${key === 'other' || !entry.os.includes(key as LibraryOS) ? ' skipped' : ''}`);
	});
	let text = parts.join(' · ') || 'Checking devices…';
	if (lookupCapped.value) text += ` (first ${MAX_DEVICE_LOOKUPS} devices)`;
	if (taggableCapped.value && target.value.tags) text += ` (tags matched in the first ${TAG_LIST_LIMIT} devices)`;
	return text;
});

/** Single device (Run tab): the entry has nothing for its OS, so the run would be skipped. */
const singleDeviceBlocked = computed(() => {
	if (!props.clientId || !selectedEntry.value) return '';
	const device = resolvedClients.value[0];
	if (!device) return '';
	const os = toLibraryOs(device.os_kernel);
	if (os && selectedEntry.value.os.includes(os)) return '';
	return `This entry has no ${os ? LIBRARY_OS_LABELS[os] : (device.os_kernel || 'matching')} implementation; the device would be skipped.`;
});

// --- running -------------------------------------------------------------
const hasRun = ref(false);
const startedAt = ref<Date | null>(null);
const results = computed(() => remote.results.value);
const isLoading = computed(() => remote.isLoading.value);

// Request-level errors arrive on the socket as `{ errors: [...] }` instead of a job.
const runError = computed(() => {
	if (!hasRun.value) return null;
	const rejected = (results.value as unknown as { errors?: { title?: string; detail?: string }[] }[])
		.flatMap(r => r.errors ?? [])
		.map(e => e.detail || e.title)
		.filter(Boolean);
	if (rejected.length) return `The server rejected the request: ${rejected.join('; ')}`;
	return remote.error.value;
});

const targetCount = computed(() => (props.clientId
	? 1
	: target.value.clientIds.length + target.value.groupIds.length + (target.value.tags ? target.value.tags.tags.length : 0)));
const hasCode = computed(() => code.value.trim().length > 0);
const canExecute = computed(() => hasCode.value && targetCount.value > 0);
const canRunEntry = computed(() => !!selectedEntry.value && targetCount.value > 0 && !singleDeviceBlocked.value);
const entryDisabledReason = computed(() => {
	if (!selectedEntry.value && targetCount.value === 0) return 'Pick an entry and at least one target';
	if (!selectedEntry.value) return 'Pick a library entry to run';
	if (singleDeviceBlocked.value) return singleDeviceBlocked.value;
	return 'Pick at least one target';
});
const canSave = computed(() => hasCode.value && name.value.trim().length > 0);
const disabledReason = computed(() => {
	if (!hasCode.value && targetCount.value === 0) return 'Enter a command or script and pick at least one target';
	if (!hasCode.value) return 'Enter a command or script to run';
	return 'Pick at least one target';
});
const plural = (n: number) => `${n} device${n === 1 ? '' : 's'}`;
const deviceCountLabel = computed(() => (targetCount.value === 0 ? 'None selected' : plural(deviceCount.value)));
const runLabel = computed(() => {
	if (props.clientId) return 'Run';
	return targetCount.value > 0 && deviceCount.value > 0 ? `Run on ${plural(deviceCount.value)}` : 'Run';
});

// What the last run was started with, so "Re-run failed" repeats it even if the form changed since.
type LastRun =
	| { mode: 'library'; entryId: string; entryName: string; abortOnError: boolean }
	| { mode: 'code'; kind: RunKind; code: string; cwd: string; interpreter: string; isSudo: boolean; timeoutSec: number; abortOnError: boolean };
const lastRun = ref<LastRun | null>(null);

const execute = (spec: LastRun, clientIds: string[], groupIds: string[], tags: JobClientTags | null) => {
	hasRun.value = true;
	startedAt.value = new Date();
	lastRun.value = spec;
	if (spec.mode === 'library') {
		ranEntryName.value = spec.entryName;
		remote.runEntry({
			entryId: spec.entryId,
			clientIds,
			groupIds,
			tags,
			abortOnError: spec.abortOnError,
		});
		return;
	}
	remote.run({
		kind: spec.kind,
		code: spec.code,
		clientIds,
		groupIds,
		tags,
		cwd: spec.cwd,
		interpreter: spec.interpreter,
		isSudo: spec.isSudo,
		timeoutSec: spec.timeoutSec,
		abortOnError: spec.abortOnError,
	});
};

const start = (clientIds: string[], groupIds: string[], tags: JobClientTags | null, kind: RunKind = effectiveKind.value) => {
	execute({
		mode: 'code',
		kind,
		code: code.value,
		cwd: workingDirectory.value,
		interpreter: interpreterValue.value,
		isSudo: useSudo.value,
		timeoutSec: Number(timeoutInSeconds.value),
		abortOnError: abortOnError.value,
	}, clientIds, groupIds, tags);
};

const startEntry = (clientIds: string[], groupIds: string[], tags: JobClientTags | null) => {
	if (!selectedEntry.value) return;
	execute({
		mode: 'library',
		entryId: selectedEntry.value.id,
		entryName: selectedEntry.value.name,
		abortOnError: abortOnError.value,
	}, clientIds, groupIds, tags);
};

const run = () => {
	if (isLoading.value) return;
	if (mode.value === 'library') {
		if (!canRunEntry.value) return;
		if (props.clientId) startEntry([props.clientId], [], null);
		else startEntry(target.value.clientIds, target.value.groupIds, target.value.tags);
		return;
	}
	if (!canExecute.value) return;
	if (props.clientId) start([props.clientId], [], null);
	else start(target.value.clientIds, target.value.groupIds, target.value.tags);
};

const latestByJob = computed(() => {
	const map = new Map<string, (typeof results.value)[number]>();
	results.value.forEach(result => map.set(result.jid || result.client_id, result));
	return [...map.values()];
});
const failedClientIds = computed(() => [...new Set(latestByJob.value.filter(r => r.status === 'failed').map(r => r.client_id))]);

// Devices that rejected the last run because of their [remote-commands] allow/deny filters.
const refusedClientIds = computed(() => (remote.lastKind.value === 'command'
	? [...new Set(latestByJob.value.filter(r => isCommandNotAllowed(r.error)).map(r => r.client_id))]
	: []));

const rerunAsScript = () => {
	if (!refusedClientIds.value.length) return;
	start(refusedClientIds.value, [], null, 'script');
};

const rerunFailed = () => {
	if (!failedClientIds.value.length) return;
	if (!lastRun.value) return;
	execute(lastRun.value, failedClientIds.value, [], null);
};

const downloadOutput = () => {
	const text = latestByJob.value.map((r) => {
		const lines = [`# ${r.client_name || r.client_id} (${r.status ?? 'running'})`];
		if (r.error) lines.push(`error: ${r.error}`);
		if (r.result?.stdout) lines.push(r.result.stdout);
		if (r.result?.stderr) lines.push('--- stderr ---', r.result.stderr);
		return lines.join('\n');
	}).join('\n\n');
	const blob = new Blob([text], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${name.value || 'run'}-output.txt`;
	link.click();
	URL.revokeObjectURL(url);
};

// --- library ---------------------------------------------------------------
const openLoadModal = async () => {
	try {
		const [items, os] = await Promise.all([
			library.listAll(),
			props.clientId
				? library.targetOs({ clientIds: [props.clientId] })
				: library.targetOs(target.value),
		]);
		libraryItems.value = items.map(e => ({ id: e.id, name: e.name, os: e.os }));
		targetOs.value = os;
		isLoadModalOpen.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to load the library' });
	}
};

const loadFromLibrary = async (item: LibraryPickItem, os?: LibraryOS) => {
	try {
		const entry = await library.load(item.id);
		const picked = implementationFor(entry, os);
		if (!picked) {
			snackbar.add({ type: 'error', text: `${item.name} has no implementation to insert` });
			return;
		}
		const impl = picked.implementation;
		loaded.value = { entry, os: picked.os };
		name.value = entry.name;
		code.value = impl.code;
		timeoutInSeconds.value = impl.timeout_sec || 300;
		workingDirectory.value = impl.cwd;
		useSudo.value = impl.is_sudo;
		interpreter.value = normalizeInterpreter(impl.interpreter) || 'default';
		kindChoice.value = impl.kind;
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to load ${item.name}` });
	}
};

const deleteFromLibrary = async (item: LibraryPickItem) => {
	try {
		await library.remove(item.id);
		libraryItems.value = libraryItems.value.filter(i => i.id !== item.id);
		if (loaded.value?.entry.id === item.id) loaded.value = null;
		snackbar.add({ type: 'success', text: 'Removed from library' });
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to remove ${item.name}` });
	}
};

const openSaveDialog = () => {
	if (!canSave.value) return;
	saveOs.value = loaded.value?.os ?? 'linux';
	isSaveDialogOpen.value = true;
};

const saveToLibrary = async () => {
	if (!canSave.value) return;
	const hadLoaded = !!loaded.value;
	isSaving.value = true;
	try {
		const saved = await library.save({
			name: name.value.trim(),
			tags: loaded.value?.entry.tags ?? [],
			os: saveOs.value,
			kind: kindChoice.value,
			code: code.value,
			timeoutSec: Number(timeoutInSeconds.value),
			cwd: workingDirectory.value,
			isSudo: useSudo.value,
			interpreter: interpreterValue.value,
		}, loaded.value?.entry);
		loaded.value = { entry: saved, os: saveOs.value };
		isSaveDialogOpen.value = false;
		snackbar.add({ type: 'success', text: `Saved to library for ${LIBRARY_OS_LABELS[saveOs.value]}` });
	}
	catch (e) {
		isSaveDialogOpen.value = false;
		snackbar.add({
			type: 'error',
			text: isConflict(e)
				? (hadLoaded
						? 'Someone else saved this library entry (or took its name) since you loaded it. Insert it again from the library to see their version, then re-apply your changes.'
						: 'A library entry with this name already exists. Pick another name.')
				: 'Failed to save to library',
		});
	}
	finally {
		isSaving.value = false;
	}
};

// --- scheduling (device page) ----------------------------------------------
const openSchedule = () => {
	if (effectiveKind.value === 'script') {
		scheduleModal.value?.openForScript({
			scriptName: name.value,
			tagsValue: loaded.value?.entry.tags ?? [],
			workingDirectory: workingDirectory.value,
			timeoutInSeconds: Number(timeoutInSeconds.value),
			scriptContent: code.value,
			useSudo: useSudo.value,
			abortOnError: abortOnError.value,
			interpreter: interpreterValue.value,
		});
		return;
	}
	scheduleModal.value?.openForCommand({
		commandName: name.value,
		tagsValue: loaded.value?.entry.tags ?? [],
		timeoutInSeconds: Number(timeoutInSeconds.value),
		commandText: code.value,
	});
};

onBeforeUnmount(() => remote.disconnect());
</script>
