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
					@update:target="target = $event"
					@update:device-count="deviceCount = $event"
				/>
			</section>

			<section class="flex flex-col gap-3.5 rounded-xl border border-app-border bg-app-surface p-[18px]">
				<h2 class="text-[15px] font-semibold text-app-text">
					Options
				</h2>
				<CustomThemedSelect
					:id="`${uid}-interpreter`"
					v-model="interpreter"
					label="Interpreter"
					placeholder="Select…"
					:options="interpreterOptions"
				/>
				<OpField
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
					<OpCheckbox v-model="useSudo">
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
			<section
				aria-label="Code to run"
				class="overflow-hidden rounded-xl border border-app-border bg-[#0F151D]"
				@keydown.ctrl.enter.prevent="run"
				@keydown.meta.enter.prevent="run"
			>
				<div class="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#222B37] px-3.5 py-2">
					<div class="flex min-w-0 flex-1 items-center gap-1.5">
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
						<label
							:for="`${uid}-kind`"
							class="sr-only"
						>Run as</label>
						<select
							:id="`${uid}-kind`"
							v-model="kindChoice"
							class="h-8 shrink-0 cursor-pointer rounded-md border border-[#2E3947] bg-[#131B25] py-0 pl-2 pr-7 font-mono text-xs text-[#C2CAD6] focus:border-[#3A4656] focus:outline-none"
							title="How this runs on the device"
						>
							<option value="auto">
								Auto · {{ detectedKind }}
							</option>
							<option value="command">
								Command
							</option>
							<option value="script">
								Script
							</option>
						</select>
					</div>
					<button
						type="button"
						class="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[#9DC1FF] hover:bg-[#18202A] hover:text-[#C3D9FF]"
						@click="openLoadModal"
					>
						<FolderOpen
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Insert from library
					</button>
				</div>
				<div class="max-h-[60vh] min-h-[200px] overflow-auto sm:min-h-[260px]">
					<CommandEditor
						v-model="code"
						class="min-h-[200px] sm:min-h-[260px]"
						aria-label="Command or script"
					/>
				</div>
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
						@click="saveToLibrary"
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
			</section>

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
			@select="loadFromLibrary"
			@delete="deleteFromLibrary"
		/>
		<ScheduleModal
			v-if="clientId"
			ref="scheduleModal"
			:client-ids="[clientId]"
		/>
	</div>
</template>

<script setup lang="ts">
import { Clock, Download, FolderOpen, Play, RotateCcw, Save } from 'lucide-vue-next';
import CommandEditor from '~/components/CommandEditor.vue';
import CommandResult from '~/components/CommandResult.vue';
import LibraryLoadModal from '~/components/custom/LibraryLoadModal.vue';
import TargetSelector from '~/components/custom/TargetSelector.vue';
import ScheduleModal from '~/components/schedules/ScheduleModal.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import { useRemoteRun } from '~/composables/useRemoteRun';
import { useRunLibrary } from '~/composables/useRunLibrary';
import { detectRunKind, isCommandNotAllowed, type LibraryPickItem, type RunKind } from '~/utils/runKind';
import type { JobClientTags } from '~/types';

const props = defineProps<{
	/** Run on this one device (device page). Omit to pick targets (Execute page). */
	clientId?: string;
}>();

const snackbar = useSnackbar();
const uid = useId();
const library = useRunLibrary();
const remote = useRemoteRun();

const interpreterOptions = [
	{ value: 'default', label: '/bin/sh or shebang' },
	{ value: 'tacoscript', label: 'Tacoscript' },
];

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
const loaded = ref<{ id: string; kind: RunKind; tags: string[] } | null>(null);
const isSaving = ref(false);
const isLoadModalOpen = ref(false);
const libraryItems = ref<LibraryPickItem[]>([]);
const scheduleModal = ref<InstanceType<typeof ScheduleModal> | null>(null);

const interpreterValue = computed(() => (interpreter.value === 'default' ? '' : interpreter.value));
const detectedKind = computed(() => detectRunKind(code.value, interpreterValue.value));
const effectiveKind = computed<RunKind>(() => (kindChoice.value === 'auto' ? detectedKind.value : kindChoice.value));

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

const start = (clientIds: string[], groupIds: string[], tags: JobClientTags | null, kind: RunKind = effectiveKind.value) => {
	hasRun.value = true;
	startedAt.value = new Date();
	remote.run({
		kind,
		code: code.value,
		clientIds,
		groupIds,
		tags,
		cwd: workingDirectory.value,
		interpreter: interpreterValue.value,
		isSudo: useSudo.value,
		timeoutSec: Number(timeoutInSeconds.value),
		abortOnError: abortOnError.value,
	});
};

const run = () => {
	if (!canExecute.value || isLoading.value) return;
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
	if (!failedClientIds.value.length || !hasCode.value) return;
	start(failedClientIds.value, [], null);
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
		libraryItems.value = (await library.listAll()).map(e => ({ id: e.id, name: e.name, kind: e.kind }));
		isLoadModalOpen.value = true;
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to load the library' });
	}
};

const loadFromLibrary = async (item: LibraryPickItem) => {
	if (!item.kind) return;
	try {
		const entry = await library.load(item.id, item.kind);
		loaded.value = { id: entry.id, kind: entry.kind, tags: entry.tags };
		name.value = entry.name;
		code.value = entry.code;
		timeoutInSeconds.value = entry.timeoutSec || 300;
		workingDirectory.value = entry.cwd;
		useSudo.value = entry.isSudo;
		interpreter.value = entry.interpreter || 'default';
		// Run it the way it was saved; the user can still change this.
		kindChoice.value = entry.kind === detectRunKind(entry.code, entry.interpreter) ? 'auto' : entry.kind;
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to load ${item.name}` });
	}
};

const deleteFromLibrary = async (item: LibraryPickItem) => {
	if (!item.kind) return;
	try {
		await library.remove(item.id, item.kind);
		libraryItems.value = libraryItems.value.filter(i => !(i.id === item.id && i.kind === item.kind));
		if (loaded.value?.id === item.id && loaded.value.kind === item.kind) loaded.value = null;
		snackbar.add({ type: 'success', text: 'Removed from library' });
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to remove ${item.name}` });
	}
};

const saveToLibrary = async () => {
	if (!canSave.value) return;
	isSaving.value = true;
	try {
		const saved = await library.save({
			name: name.value.trim(),
			tags: loaded.value?.tags ?? [],
			code: code.value,
			timeoutSec: Number(timeoutInSeconds.value),
			cwd: workingDirectory.value,
			isSudo: useSudo.value,
			interpreter: interpreterValue.value,
		}, loaded.value);
		loaded.value = { ...saved, tags: loaded.value?.tags ?? [] };
		snackbar.add({ type: 'success', text: `Saved to library as a ${saved.kind}` });
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save to library' });
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
			tagsValue: loaded.value?.tags ?? [],
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
		tagsValue: loaded.value?.tags ?? [],
		timeoutInSeconds: Number(timeoutInSeconds.value),
		commandText: code.value,
	});
};

onBeforeUnmount(() => remote.disconnect());
</script>
