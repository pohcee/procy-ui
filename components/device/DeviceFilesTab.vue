<template>
	<div class="flex flex-col gap-4">
		<AppCard
			title="Upload a file"
			description="Copy a local file to this device."
		>
			<div class="flex max-w-3xl flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<span
						id="device-file-label"
						class="text-[13px] font-medium text-app-text-2"
					>Local file</span>
					<label
						for="device-file"
						class="relative flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-app-border-strong bg-app-surface-2 px-4 py-4 text-center hover:bg-app-hover focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-app-accent"
					>
						<Upload
							class="h-5 w-5 text-app-text-3"
							aria-hidden="true"
						/>
						<span
							v-if="selectedFile"
							class="break-all font-mono text-[13px] text-app-text"
						>{{ selectedFile.name }}</span>
						<span
							v-else
							class="text-sm text-app-text-2"
						>Choose a local file to upload</span>
						<input
							id="device-file"
							ref="fileInputRef"
							type="file"
							aria-labelledby="device-file-label"
							class="sr-only"
							@change="handleFileChange"
						>
					</label>
				</div>
				<div class="flex flex-col gap-1.5">
					<label
						for="device-file-dest"
						class="text-[13px] font-medium text-app-text-2"
					>Remote path</label>
					<input
						id="device-file-dest"
						v-model="dest"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text placeholder:font-sans placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
						placeholder="/tmp/test.txt or C:\Windows\temp\test.txt"
						type="text"
						autocomplete="off"
					>
					<p class="text-xs text-app-text-3">
						Folder and file name on the device.
					</p>
				</div>

				<label class="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-app-border px-4 py-2.5">
					<span class="flex flex-col">
						<span class="text-sm font-medium text-app-text">Force overwrite</span>
						<span class="text-xs text-app-text-3">Replace the file if it already exists (optional).</span>
					</span>
					<input
						v-model="force"
						type="checkbox"
						role="switch"
						class="peer sr-only"
						value="1"
					>
					<span
						aria-hidden="true"
						class="relative h-6 w-11 flex-none rounded-full bg-app-border-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-app-accent peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-app-accent"
					/>
				</label>

				<label class="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-app-border px-4 py-2.5">
					<span class="flex flex-col">
						<span class="text-sm font-medium text-app-text">Sync</span>
						<span class="text-xs text-app-text-3">Skip the copy when the destination already matches (optional).</span>
					</span>
					<input
						v-model="sync"
						type="checkbox"
						role="switch"
						class="peer sr-only"
						value="1"
					>
					<span
						aria-hidden="true"
						class="relative h-6 w-11 flex-none rounded-full bg-app-border-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-app-accent peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-app-accent"
					/>
				</label>

				<div
					class="flex items-start gap-3 rounded-lg bg-app-blue-bg px-4 py-3 text-[13px] text-app-blue"
					role="note"
				>
					<Info
						class="mt-0.5 h-4 w-4 flex-none"
						aria-hidden="true"
					/>
					<p>
						If sync is enabled, the client looks if a file already exists on the destination. If the md5 sum of the destination equals the md5 sum of the source, and if the ownership and mode are as desired (Linux only), the copy is skipped, and the process is considered successful.
					</p>
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="device-file-mode"
						class="text-[13px] font-medium text-app-text-2"
					>Mode (optional)</label>
					<input
						id="device-file-mode"
						v-model="mode"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text placeholder:font-sans placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
						placeholder="0500"
						type="text"
						autocomplete="off"
					>
					<p class="text-xs text-app-text-3">
						Permissions of the remote file in four-digit numeric octal notation, e.g. 0500.
					</p>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<label
							for="device-file-user"
							class="text-[13px] font-medium text-app-text-2"
						>User (optional)</label>
						<input
							id="device-file-user"
							v-model="user"
							class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text placeholder:font-sans placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
							placeholder="root"
							type="text"
							autocomplete="off"
						>
					</div>

					<div class="flex flex-col gap-1.5">
						<label
							for="device-file-group"
							class="text-[13px] font-medium text-app-text-2"
						>Group (optional)</label>
						<input
							id="device-file-group"
							v-model="group"
							class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text placeholder:font-sans placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
							placeholder="root"
							type="text"
							autocomplete="off"
						>
					</div>
				</div>
				<div
					class="flex items-start gap-3 rounded-lg bg-app-blue-bg px-4 py-3 text-[13px] text-app-blue"
					role="note"
				>
					<Info
						class="mt-0.5 h-4 w-4 flex-none"
						aria-hidden="true"
					/>
					<p>
						Specify the user and group the file should belong to. If not set, the file is owned by the user and group that runs the rport client.
					</p>
				</div>

				<div class="flex justify-end border-t border-app-border-subtle pt-4">
					<AppButton
						:disabled="!selectedFile || !dest || isUploading"
						@click="upload"
					>
						<Loader2
							v-if="isUploading"
							class="h-4 w-4 animate-spin"
							aria-hidden="true"
						/>
						<Upload
							v-else
							class="h-4 w-4"
							aria-hidden="true"
						/>
						{{ isUploading ? 'Uploading…' : 'Upload' }}
					</AppButton>
				</div>
			</div>
		</AppCard>
	</div>
</template>

<script setup lang="ts">
import { Info, Loader2, Upload } from 'lucide-vue-next';

const props = defineProps({
	device: {
		type: Object,
		required: true,
	},
});

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const dest = ref('');
const force = ref(false);
const sync = ref(false);
const mode = ref('');
const user = ref('');
const group = ref('');
const isUploading = ref(false);

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	selectedFile.value = target.files?.[0] ?? null;
};

const upload = async () => {
	if (!selectedFile.value || !dest.value) return;
	isUploading.value = true;
	try {
		await $api.files.upload({
			file: selectedFile.value,
			clientIds: [props.device.id],
			dest: dest.value,
			mode: mode.value,
			user: user.value,
			group: group.value,
			force: force.value,
			sync: sync.value,
		});
		snackbar.add({ type: 'success', text: 'File upload started' });
		selectedFile.value = null;
		dest.value = '';
		if (fileInputRef.value) fileInputRef.value.value = '';
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to upload file' });
	}
	finally {
		isUploading.value = false;
	}
};
</script>
