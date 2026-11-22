<template>
	<Modal
		v-model="isOpen"
		title="Install client"
		ok-text="Close"
		cancel-text="Cancel"
		:show-cancel="true"
		@close="close"
		@ok="close"
	>
		<div
			v-if="isLoading"
			class="flex min-h-[200px] items-center justify-center"
			role="status"
		>
			<Loader2
				class="h-8 w-8 animate-spin text-app-accent"
				aria-hidden="true"
			/>
			<span class="sr-only">Loading installer…</span>
		</div>
		<div
			v-else
			class="flex flex-col gap-5"
		>
			<dl class="grid grid-cols-1 gap-2 rounded-lg border border-app-border bg-app-surface-2 p-3 sm:grid-cols-2">
				<div class="flex min-w-0 items-center gap-2">
					<dt class="text-[13px] text-app-text-3">
						ID
					</dt>
					<dd class="min-w-0 truncate font-mono text-[13px] text-app-text">
						{{ client?.id }}
					</dd>
					<button
						type="button"
						class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
						aria-label="Copy client ID"
						@click="copyValue(client?.id)"
					>
						<Copy
							class="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
				</div>
				<div class="flex min-w-0 items-center gap-2 sm:justify-end">
					<dt class="text-[13px] text-app-text-3">
						Password
					</dt>
					<dd class="min-w-0 truncate font-mono text-[13px] text-app-text">
						{{ client?.password }}
					</dd>
					<button
						type="button"
						class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
						aria-label="Copy client password"
						@click="copyValue(client?.password)"
					>
						<Copy
							class="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
				</div>
			</dl>
			<div class="flex flex-col gap-1.5">
				<p class="text-[13px] font-medium text-app-text-2">
					How does the client connect?
				</p>
				<CustomThemedSelect
					v-model="selectedConnectUrl"
					label="Connect URL"
					placeholder="Select..."
					:options="connectUrlOptions"
				/>
			</div>
			<fieldset class="flex flex-col gap-1">
				<legend class="mb-1 text-[13px] font-medium text-app-text-2">
					Installer options
				</legend>
				<label
					v-for="option in INSTALLER_OPTIONS"
					:key="option.id"
					class="flex min-h-9 cursor-pointer select-none items-center gap-2.5 text-sm text-app-text"
				>
					<input
						v-model="selectedOptions[option.id]"
						type="checkbox"
						class="h-[18px] w-[18px] flex-none cursor-pointer rounded border-app-border-strong accent-app-accent"
					>
					<span v-if="option.id !== 'tacoscript'">{{ option.label }}</span>
					<span v-else>Install Tacoscript along with the RPort client</span>
				</label>
				<p class="mt-1 text-xs text-app-text-3">
					The pairing service is free and secure. No data is stored.
				</p>
			</fieldset>
			<ClientsInstallationCommand
				:linux-code="linuxCode"
				:windows-code="windowsCode"
				:disabled="false"
			/>
		</div>
	</Modal>
</template>

<script setup lang="ts">
import { Copy, Loader2 } from 'lucide-vue-next';
import { useClipboard } from '@vueuse/core';
import type { ClientAuth, INstallerOptionId, ServerStatus } from '~/types';
import { INSTALLER_OPTIONS } from '~/constants';
import Modal from '~/components/Modal.vue';
import { useInstaller } from '~/composables/useInstaller';

const isOpen = ref(false);
const client = ref<Partial<ClientAuth> | null>(null);
const status = ref<ServerStatus | null>(null);
const selectedConnectUrl = ref('');

const { isLoading, installers, fetchInstaller } = useInstaller();
const { copy } = useClipboard({ legacy: true });
const snackbar = useSnackbar();

const copyValue = async (value?: string) => {
	if (!value) return;
	await copy(value);
	snackbar.add({ type: 'success', text: 'Copied to clipboard' });
};

const selectedOptions = ref<Partial<Record<INstallerOptionId, boolean>>>({});
const connectUrlOptions = computed(() => (status.value?.connect_url ?? []).map((connect: string) => ({ value: connect, label: connect })));
const emit = defineEmits(['close', 'save']);

const close = () => {
	emit('close');
	isOpen.value = false;
	client.value = null;
	status.value = null;
	selectedConnectUrl.value = '';
};
const open = async (clientAccess: Partial<ClientAuth> | undefined, statusServer: ServerStatus) => {
	isOpen.value = true;
	client.value = clientAccess ?? null;
	status.value = statusServer;
	if (statusServer.connect_url?.length > 0) {
		selectedConnectUrl.value = statusServer.connect_url[0];
		await updateInstaller();
	}
};

const generateCommand = (platform: 'linux' | 'windows') => {
	return computed(() =>
		Object.entries(selectedOptions.value)
			.filter(([id, isSelected]) => {
				if (!isSelected) return false;
				const option = INSTALLER_OPTIONS.find(opt => opt.id === id);
				return platform === 'windows'
					? option?.platformSupport === 'all'
					: true;
			})
			.map(([id]) => {
				const option = INSTALLER_OPTIONS.find(opt => opt.id === id);
				return `-${option?.flag}`;
			})
			.join(' '),
	);
};

const linuxCommand = generateCommand('linux');

const windowsCommand = generateCommand('windows');

const linuxCode = computed(() => `${installers.linux} ${linuxCommand.value}`);
const windowsCode = computed(() => `${installers.windows} ${windowsCommand.value}`);
function initializeOptions() {
	INSTALLER_OPTIONS.forEach((option) => {
		selectedOptions.value[option.id] = true;
	});
}

async function updateInstaller() {
	if (!client.value?.id || !selectedConnectUrl.value || !status.value?.fingerprint) {
		return;
	}

	await fetchInstaller({
		client_id: client.value.id,
		connect_url: selectedConnectUrl.value,
		fingerprint: status.value.fingerprint,
		password: client.value.password ?? '',
	}, status.value.pairing_url);
}

onMounted(() => {
	initializeOptions();
});

watch(() => selectedConnectUrl.value, updateInstaller);

onUnmounted(() => {
	client.value = null;
	status.value = null;
	selectedConnectUrl.value = '';
});
defineExpose({ open, close });
</script>
