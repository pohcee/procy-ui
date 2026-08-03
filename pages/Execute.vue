<template>
	<new-page-wrapper>
		<div class="mx-auto h-screen max-h-screen max-w-7xl overflow-y-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
			<div class="relative z-20 flex h-16 items-center justify-between">
				<div>
					<h3 class="text-3xl leading-6 text-gray-800 dark:text-white">
						Execute
					</h3>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Run a command or script on multiple clients at once.
					</p>
				</div>
			</div>
			<div class="rounded-lg bg-white shadow dark:bg-gray-900">
				<div class="grid grid-cols-1 items-stretch gap-6 p-6 lg:grid-cols-2">
					<div class="flex flex-col">
						<h4 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
							1. Select target clients
						</h4>
						<div class="flex-1 rounded bg-[#1c3f68] p-4">
							<TargetSelector @update:target="target = $event" />
						</div>
					</div>
					<div class="flex flex-col">
						<h4 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
							2. What to run
						</h4>
						<div class="flex flex-1 flex-col gap-3 rounded border border-gray-200 p-4 dark:border-gray-700">
							<div class="relative flex w-full flex-col">
								<input
									id="taskName"
									v-model="name"
									class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
									placeholder=" "
									type="text"
									autocomplete="off"
								>
								<label
									class="order-1 flex gap-1 pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
									for="taskName"
								>Name <span class="text-xs text-gray-500">(optional, needed to save to library)</span></label>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="relative flex w-full flex-col">
									<input
										id="taskCwd"
										v-model="workingDirectory"
										class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
										placeholder=" "
										type="text"
										autocomplete="off"
									>
									<label
										class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
										for="taskCwd"
									>Working directory</label>
								</div>
								<div class="relative flex w-full flex-col">
									<input
										id="taskTimeout"
										v-model="timeoutInSeconds"
										class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
										placeholder=" "
										type="number"
										autocomplete="off"
									>
									<label
										class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
										for="taskTimeout"
									>Timeout (seconds)</label>
								</div>
							</div>
							<CustomThemedSelect
								id="taskInterpreter"
								v-model="interpreter"
								label="Interpreter"
								placeholder="Select..."
								:options="[{ value: 'default', label: '/bin/sh or shebang' }, { value: 'tacoscript', label: 'Tacoscript' }]"
							/>
							<div class="flex items-center gap-4">
								<label class="flex cursor-pointer select-none items-center gap-2 text-sm text-theme-label">
									<input
										v-model="useSudo"
										type="checkbox"
										class="h-[16px] w-[16px] rounded"
									>Use sudo (Unix only)
								</label>
								<label class="flex cursor-pointer select-none items-center gap-2 text-sm text-theme-label">
									<input
										v-model="abortOnError"
										type="checkbox"
										class="h-[16px] w-[16px] rounded"
									>Abort on error
								</label>
							</div>
							<div class="min-h-[220px] flex-1 overflow-auto rounded border border-gray-300 bg-[#224A75] text-xs text-gray-200 dark:border-gray-700">
								<CommandEditor v-model="scriptContent" />
							</div>
						</div>
					</div>
				</div>
				<div class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
					<span class="mr-auto text-xs text-gray-500">
						{{ targetCount }} target(s) selected
						<template v-if="!canExecute">
							&middot; {{ disabledReason }}
						</template>
					</span>
					<button
						class="hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
						type="button"
						@click="openLoadModal"
					>
						<FolderOpen class="h-4 w-4" />
						Load
					</button>
					<button
						class="hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
						type="button"
						:disabled="!canSave"
						:title="!canSave ? 'Enter a name and a command/script to save it to the library' : ''"
						@click="saveToLibrary"
					>
						<Save class="h-4 w-4" />
						{{ loadedId ? 'Update in library' : 'Save to library' }}
					</button>
					<button
						class="bg-vtd-primary-500 hover:bg-vtd-primary-700 disabled:bg-gray-400 text-white inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed"
						type="button"
						:disabled="!canExecute"
						@click="run"
					>
						<Play class="h-4 w-4" />
						Execute
					</button>
				</div>
			</div>
			<div
				v-if="results.length > 0"
				class="mt-6 rounded-lg bg-white shadow dark:bg-gray-900"
			>
				<h4 class="border-b border-gray-200 p-4 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
					Results ({{ results.length }})
				</h4>
				<div class="divide-y divide-gray-200 dark:divide-gray-700">
					<div
						v-for="result in results"
						:key="result.jid"
						class="p-4"
					>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ result.client_name || result.client_id }}</span>
							<span
								class="rounded px-2 py-0.5 text-xs font-medium"
								:class="result.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
							>{{ result.status ?? 'running' }}</span>
						</div>
						<pre
							v-if="result.result?.stdout"
							class="mt-2 overflow-auto rounded bg-gray-950 p-2 text-xs text-gray-100"
						>{{ result.result.stdout }}</pre>
						<pre
							v-if="result.result?.stderr"
							class="mt-2 overflow-auto rounded bg-red-950 p-2 text-xs text-red-100"
						>{{ result.result.stderr }}</pre>
						<p
							v-if="result.error"
							class="mt-2 text-xs text-red-600"
						>
							{{ result.error }}
						</p>
					</div>
				</div>
			</div>
		</div>
		<LibraryLoadModal
			v-model="isLoadModalOpen"
			title="Load from library"
			:items="savedScripts"
			@select="loadFromLibrary"
			@delete="deleteSavedScript"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { FolderOpen, Play, Save } from 'lucide-vue-next';
import CommandEditor from '~/components/CommandEditor.vue';
import LibraryLoadModal from '~/components/custom/LibraryLoadModal.vue';
import TargetSelector from '~/components/custom/TargetSelector.vue';
import { useScriptExecution } from '~/composables/useScriptExecution';
import type { JobClientTags } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const name = ref('');
const scriptContent = ref('');
const workingDirectory = ref('');
const timeoutInSeconds = ref(300);
const useSudo = ref(false);
const abortOnError = ref(true);
const interpreter = ref('default');
const target = ref<{ clientIds: string[]; groupIds: string[]; tags: JobClientTags | null }>({ clientIds: [], groupIds: [], tags: null });

const loadedId = ref<string | null>(null);
const isLoadModalOpen = ref(false);
const savedScripts = ref<{ id: string; name: string }[]>([]);

const { executeScript, results } = useScriptExecution();

const targetCount = computed(() => target.value.clientIds.length + target.value.groupIds.length + (target.value.tags ? target.value.tags.tags.length : 0));
const canExecute = computed(() => scriptContent.value.length > 0 && targetCount.value > 0);
const canSave = computed(() => scriptContent.value.length > 0 && name.value.length > 0);
const disabledReason = computed(() => {
	if (scriptContent.value.length === 0 && targetCount.value === 0) return 'enter a command/script and select at least one target';
	if (scriptContent.value.length === 0) return 'enter a command or script to run';
	return 'select at least one target';
});

const run = () => {
	if (!canExecute.value) return;
	executeScript(
		scriptContent.value,
		target.value.clientIds,
		target.value.groupIds,
		workingDirectory.value,
		true,
		useSudo.value,
		Number(timeoutInSeconds.value),
		interpreter.value === 'default' ? '' : interpreter.value,
		target.value.tags,
		abortOnError.value,
	);
};

const openLoadModal = async () => {
	const response = await $api.library.listScript();
	savedScripts.value = response.data.map(script => ({ id: script.id, name: script.name }));
	isLoadModalOpen.value = true;
};

const loadFromLibrary = async (id: string) => {
	const { data: script } = await $api.library.showScript(id);
	loadedId.value = script.id;
	name.value = script.name;
	workingDirectory.value = script.cwd ?? '';
	timeoutInSeconds.value = script.timeout_sec;
	scriptContent.value = script.script;
	useSudo.value = script.is_sudo;
	interpreter.value = script.interpreter || 'default';
};

const deleteSavedScript = async (id: string) => {
	await $api.library.deleteScript(id);
	savedScripts.value = savedScripts.value.filter(script => script.id !== id);
	if (loadedId.value === id) {
		loadedId.value = null;
	}
	snackbar.add({ type: 'success', text: 'Removed from library' });
};

const saveToLibrary = async () => {
	if (!canSave.value) return;
	const payload = {
		name: name.value,
		tags: [],
		timeout_sec: Number(timeoutInSeconds.value),
		script: scriptContent.value,
		cwd: workingDirectory.value,
		is_sudo: useSudo.value,
		interpreter: interpreter.value === 'default' ? '' : interpreter.value,
	};
	try {
		if (loadedId.value) {
			await $api.library.updateScript(loadedId.value, payload);
		}
		else {
			const { data } = await $api.library.createScript(payload);
			loadedId.value = data.id;
		}
		snackbar.add({ type: 'success', text: 'Saved to library' });
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save to library' });
	}
};
</script>
