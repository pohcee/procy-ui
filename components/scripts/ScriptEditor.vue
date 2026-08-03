<template>
	<div class="primary relative grid grid-cols-7">
		<LoadingSpinner v-if="isLoading" />
		<div class="primary col-span-2">
			<div class="max-h-[550px] min-h-[550px] overflow-y-auto px-6 py-4">
				<div class="flex flex-col">
					<div class="relative mt-1 flex w-full flex-col">
						<input
							id="26aISgfYLo"
							v-model="scriptName"
							class="border-white text-white focus:border-white input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="text"
							autocomplete="off"
						><label
							class="order-1 flex pb-1 pl-1 text-white text-sm font-normal"
							for="26aISgfYLo"
						>Script name</label>
					</div><!----><!---->
				</div>
				<ExecutionTags v-model="tagsValue" />
				<div class="flex flex-col mt-1">
					<div class="relative mt-1 flex w-full flex-col">
						<input
							id="MGfPQ5k6k5"
							v-model="workingDirectory"
							class="border-white text-white focus:border-white input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="text"
							autocomplete="off"
						><label
							class="order-1 flex pb-1 pl-1 text-white text-sm font-normal"
							for="MGfPQ5k6k5"
						>Working Directory</label>
					</div><!----><!---->
				</div>
				<div class="mt-1 text-white">
					<CustomThemedSelect
						id="KQvbzK4XzJ"
						v-model="interpreter"
						label="Interpreter"
						placeholder="Select..."
						:options="interpreterOptions"
					/>
				</div>
				<div class="flex flex-col mt-1">
					<div class="relative mt-1 flex w-full flex-col">
						<input
							id="qNyznPOuwg"
							v-model="timeoutInSeconds"
							class="border-white text-white focus:border-white input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="number"
							autocomplete="off"
						><label
							class="order-1 flex pb-1 pl-1 text-white text-sm font-normal"
							for="qNyznPOuwg"
						>Time
							out (seconds)</label>
					</div><!----><!---->
				</div>
				<div class="mt-4 flex justify-center">
					<label
						class="relative inline-flex cursor-pointer items-center text-theme-label"
					><input
							v-model="useSudo"
							type="checkbox"
							class="peer sr-only"
							value="1"
						>
						<div
							class="after:border-secondary after:bg-secondary peer-checked:bg-secondary peer-checked:bg-opacity-30 peer-checked:after:border-secondary bg-gray-200 bg-opacity-30 peer h-6 w-11 rounded-full after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:after:trangray-x-full peer-focus:ring-0"
						/>
						<span class="ml-2 text-sm text-gray-300"> Use sudo <span class="text-xs">(Unix
							only)</span>
						</span>
					</label>
				</div><!---->
			</div>
			<div class="flex h-[55px] items-center justify-center border-t border-[#133B66]">
				<div class="grid grid-cols-3 rounded-l-md">
					<button
						:class="[' px-4 py-2 text-sm text-white rounded inline-flex items-center duration-200 focus:outline-none col-span-3 secondary',
							scriptContent.length == 0 || scriptName.length == 0 ? 'cursor-not-allowed hover:opacity-100' : 'hover:opacity-80',
						]"
						:disabled="scriptContent.length == 0 || scriptName.length == 0 || isSaving"
						type="button"
						@click="saveScript"
					>
						{{ loadedId ? 'Update' : 'Save' }}
					</button>
				</div><button
					class="hover:opacity-80 px-4 py-2 text-sm text-white rounded inline-flex items-center duration-200 focus:outline-none ml-2 bg-white bg-opacity-10"
					type="button"
					@click="openLoadModal"
				>
					Load
				</button>
			</div>
		</div>
		<div class="col-span-5">
			<div
				class="command-editor max-h-[550px] min-h-[550px] overflow-auto bg-[#224A75] text-xs text-gray-200"
			>
				<command-editor v-model="scriptContent" />
			</div>
			<div
				class="flex h-[55px] items-center justify-between border-t border-[#133B66] bg-[#224A75] p-2 shadow-md"
			>
				<div>
					<button
						:class="['px-4 py-2 text-sm text-black rounded inline-flex items-center duration-200 focus:outline-none bg-slate-100',
							scriptContent.length == 0 || scriptName.length == 0 ? 'cursor-not-allowed opacity-50 hover:opacity-100' : 'hover:opacity-80',
						]"
						:disabled="scriptContent.length == 0 || scriptName.length == 0"
						type="button"
						@click="$emit('schedule-request', buildPayload())"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24px"
							height="24px"
							viewBox="0 0 24 24"
							class="icon mr-2"
						>
							<path
								fill="currentColor"
								d="M12 20c4.4 0 8-3.6 8-8s-3.6-8-8-8s-8 3.6-8 8s3.6 8 8 8m0-18c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12S6.5 2 12 2m5 11.9l-.7 1.3l-5.3-2.9V7h1.5v4.4l4.5 2.5Z"
							/>
						</svg><span class="pr-2">Schedule</span>
					</button>
				</div>
				<div class="flex items-center">
					<div class="flex flex-col mr-6">
						<label
							class="flex cursor-pointer select-none items-center justify-start text-sm text-gray-200"
						><input
							v-model="abortOnError"
							type="checkbox"
							class="mr-2 h-[16px] w-[16px] cursor-pointer rounded border-none bg-transparent ring-2 ring-gray-300 focus:ring-gray-300 focus:ring-offset-0 text-transparent"
						>Abort
							on error</label>
					</div><span class="mr-4 text-xs text-gray-300"> (CMD +
						ENTER) </span>
					<button
						class="hover:opacity-80 px-4 py-2 text-sm text-black rounded inline-flex items-center duration-200 focus:outline-none bg-[#C6F94C]"
						type="button"
						@click="emitScriptData"
					>
						<!----><svg
							data-v-ca945699=""
							xmlns="http://www.w3.org/2000/svg"
							width="24px"
							height="24px"
							viewBox="0 0 24 24"
							class="icon mr-2"
						>
							<path
								fill="currentColor"
								d="M9.5 9.325v5.35q0 .6.525.875t1.025-.05l4.15-2.65q.475-.275.475-.85t-.475-.85L11.05 8.5q-.5-.325-1.025-.05t-.525.875ZM12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-10Zm0 8q3.325 0 5.663-2.337T20 12q0-3.325-2.337-5.663T12 4Q8.675 4 6.337 6.337T4 12q0 3.325 2.337 5.663T12 20Z"
							/>
						</svg><span class="pr-2">Execute</span>
					</button>
				</div>
			</div>
		</div>
	</div>
	<LibraryLoadModal
		v-model="isLoadModalOpen"
		title="Load a saved script"
		:items="savedScripts"
		@select="loadScript"
		@delete="deleteSavedScript"
	/>
</template>

<script setup lang="ts">
import ExecutionTags from '~/components/custom/ExecutionTags.vue';
import LoadingSpinner from '~/components/custom/loading-spinner/LoadingSpinner.vue';
import LibraryLoadModal from '~/components/custom/LibraryLoadModal.vue';
import type { ScriptPayload } from '~/types';

const emit = defineEmits(['script-data', 'schedule-request']);
defineProps({
	isLoading: {
		type: Boolean,
		default: false,
	},
});

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const tagsValue = ref<string[]>([]);
const scriptName = ref<string>('');
const timeoutInSeconds = ref<number>(300);
const scriptContent = ref<string>('');
const workingDirectory = ref<string>('');
const useSudo = ref<boolean>(false);
const abortOnError = ref<boolean>(true);
const DEFAULT_INTERPRETER = 'default';
const interpreter = ref<string>(DEFAULT_INTERPRETER);
const interpreterOptions = [
	{ value: DEFAULT_INTERPRETER, label: '/bin/sh or shebang' },
	{ value: 'tacoscript', label: 'Tacoscript (Experimental)' },
];

const isSaving = ref(false);
const loadedId = ref<string | null>(null);
const isLoadModalOpen = ref(false);
const savedScripts = ref<{ id: string; name: string }[]>([]);

const resolveInterpreter = () => (interpreter.value === DEFAULT_INTERPRETER ? '' : interpreter.value);

const buildPayload = () => ({
	scriptName: scriptName.value,
	tagsValue: tagsValue.value,
	workingDirectory: workingDirectory.value,
	timeoutInSeconds: timeoutInSeconds.value,
	scriptContent: scriptContent.value,
	useSudo: useSudo.value,
	abortOnError: abortOnError.value,
	interpreter: resolveInterpreter(),
});

const openLoadModal = async () => {
	const response = await $api.library.listScript();
	savedScripts.value = response.data.map(script => ({ id: script.id, name: script.name }));
	isLoadModalOpen.value = true;
};

const loadScript = async (id: string) => {
	const { data: script } = await $api.library.showScript(id);
	loadedId.value = script.id;
	scriptName.value = script.name;
	tagsValue.value = script.tags ?? [];
	workingDirectory.value = script.cwd ?? '';
	timeoutInSeconds.value = script.timeout_sec;
	scriptContent.value = script.script;
	useSudo.value = script.is_sudo;
	interpreter.value = script.interpreter || DEFAULT_INTERPRETER;
};

const deleteSavedScript = async (id: string) => {
	await $api.library.deleteScript(id);
	savedScripts.value = savedScripts.value.filter(script => script.id !== id);
	if (loadedId.value === id) {
		loadedId.value = null;
	}
	snackbar.add({ type: 'success', text: 'Script removed from library' });
};

const saveScript = async () => {
	isSaving.value = true;
	const payload: ScriptPayload = {
		name: scriptName.value,
		tags: tagsValue.value,
		timeout_sec: Number(timeoutInSeconds.value),
		script: scriptContent.value,
		cwd: workingDirectory.value,
		is_sudo: useSudo.value,
		interpreter: resolveInterpreter(),
	};
	try {
		if (loadedId.value) {
			await $api.library.updateScript(loadedId.value, payload);
		}
		else {
			const { data } = await $api.library.createScript(payload);
			loadedId.value = data.id;
		}
		snackbar.add({ type: 'success', text: 'Script saved to library' });
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to save script' });
	}
	finally {
		isSaving.value = false;
	}
};

const emitScriptData = () => {
	emit('script-data', buildPayload());
};
</script>
