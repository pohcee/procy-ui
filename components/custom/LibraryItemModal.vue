<template>
	<BaseModal v-model="isOpen">
		<div
			class="relative z-20 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto rounded border border-slate-400 bg-white p-6 text-theme-inverted-lighter shadow dark:bg-slate-800"
		>
			<h3 class="mb-4 text-lg font-semibold">
				{{ isEditing ? 'Edit' : 'New' }} {{ type === 'script' ? 'script' : 'command' }}
			</h3>
			<form
				class="flex flex-col gap-4"
				@submit.prevent="save"
			>
				<div class="relative flex w-full flex-col">
					<input
						id="libItemName"
						v-model="name"
						class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
						:class="{ error: !name }"
						placeholder=" "
						type="text"
						autocomplete="off"
					>
					<label
						class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
						for="libItemName"
					>Name</label>
				</div>
				<ExecutionTags v-model="tags" />
				<div
					v-if="type === 'script'"
					class="grid grid-cols-2 gap-4"
				>
					<div class="relative flex w-full flex-col">
						<input
							id="libItemCwd"
							v-model="cwd"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="text"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="libItemCwd"
						>Working directory</label>
					</div>
					<CustomThemedSelect
						id="libItemInterpreter"
						v-model="interpreter"
						label="Interpreter"
						placeholder="Select..."
						:options="[{ value: 'default', label: '/bin/sh or shebang' }, { value: 'tacoscript', label: 'Tacoscript' }]"
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="relative flex w-full flex-col">
						<input
							id="libItemTimeout"
							v-model="timeoutSec"
							class="primary input-text focus:border-1 peer order-2 block h-10 w-full rounded bg-transparent text-theme-inverted shadow-sm focus:outline-0 focus:ring-0 sm:text-sm"
							placeholder=" "
							type="number"
							autocomplete="off"
						>
						<label
							class="order-1 flex pb-1 pl-1 text-sm font-normal text-theme-label peer-focus:text-primary"
							for="libItemTimeout"
						>Timeout (seconds)</label>
					</div>
					<label
						v-if="type === 'script'"
						class="flex cursor-pointer select-none items-center justify-start text-sm text-theme-label"
					>
						<input
							v-model="isSudo"
							type="checkbox"
							class="mr-2 h-[16px] w-[16px] cursor-pointer rounded border-none bg-transparent ring-2 ring-gray-300 focus:ring-gray-300 focus:ring-offset-0 primary-text"
						>Use sudo (Unix only)
					</label>
				</div>
				<div class="flex flex-col">
					<label class="mb-1 text-sm font-normal text-theme-label">{{ type === 'script' ? 'Script' : 'Command' }}</label>
					<div class="max-h-[260px] min-h-[180px] overflow-auto rounded border border-slate-400 bg-[#224A75] text-xs text-gray-200">
						<CommandEditor v-model="content" />
					</div>
				</div>
				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						class="bg-vtd-secondary-600 hover:bg-vtd-secondary-400 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="button"
						@click="close"
					>
						Cancel
					</button>
					<button
						class="bg-vtd-primary-500 hover:bg-vtd-primary-700 disabled:bg-gray-400 text-white cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold"
						type="submit"
						:disabled="!name || !content || isSaving"
					>
						{{ isEditing ? 'Update' : 'Create' }}
					</button>
				</div>
			</form>
		</div>
	</BaseModal>
</template>

<script setup lang="ts">
import { BaseModal } from '~/components/ui/base-modal';
import ExecutionTags from '~/components/custom/ExecutionTags.vue';
import CommandEditor from '~/components/CommandEditor.vue';
import type { Command, Script, CommandPayload, ScriptPayload } from '~/types';

const props = defineProps({
	type: {
		type: String as () => 'command' | 'script',
		required: true,
	},
});
const emit = defineEmits(['saved']);

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const isOpen = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const name = ref('');
const tags = ref<string[]>([]);
const cwd = ref('');
const interpreter = ref('default');
const isSudo = ref(false);
const timeoutSec = ref(300);
const content = ref('');

const reset = () => {
	name.value = '';
	tags.value = [];
	cwd.value = '';
	interpreter.value = 'default';
	isSudo.value = false;
	timeoutSec.value = 300;
	content.value = '';
	editingId.value = null;
};

const openForCreate = () => {
	reset();
	isEditing.value = false;
	isOpen.value = true;
};

const openForEdit = (item: Command | Script) => {
	reset();
	isEditing.value = true;
	editingId.value = item.id;
	name.value = item.name;
	tags.value = item.tags ?? [];
	timeoutSec.value = item.timeout_sec;
	if (props.type === 'script') {
		const script = item as Script;
		cwd.value = script.cwd ?? '';
		interpreter.value = script.interpreter || 'default';
		isSudo.value = script.is_sudo;
		content.value = script.script;
	}
	else {
		content.value = (item as Command).cmd;
	}
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const save = async () => {
	if (!name.value || !content.value) return;
	isSaving.value = true;
	try {
		if (props.type === 'script') {
			const payload: ScriptPayload = {
				name: name.value,
				tags: tags.value,
				timeout_sec: Number(timeoutSec.value),
				script: content.value,
				cwd: cwd.value,
				is_sudo: isSudo.value,
				interpreter: interpreter.value === 'default' ? '' : interpreter.value,
			};
			if (editingId.value) {
				await $api.library.updateScript(editingId.value, payload);
			}
			else {
				await $api.library.createScript(payload);
			}
		}
		else {
			const payload: CommandPayload = {
				name: name.value,
				tags: tags.value,
				timeout_sec: Number(timeoutSec.value),
				cmd: content.value,
			};
			if (editingId.value) {
				await $api.library.updateCommand(editingId.value, payload);
			}
			else {
				await $api.library.createCommand(payload);
			}
		}
		snackbar.add({ type: 'success', text: `${props.type === 'script' ? 'Script' : 'Command'} ${isEditing.value ? 'updated' : 'created'}` });
		emit('saved');
		close();
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to save ${props.type}` });
	}
	finally {
		isSaving.value = false;
	}
};

defineExpose({ openForCreate, openForEdit });
</script>
