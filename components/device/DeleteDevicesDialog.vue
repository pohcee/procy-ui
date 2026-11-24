<template>
	<!--
		Confirms and runs deleting one or more devices. The server only deletes offline
		devices; a deleted device comes back when its client connects again, unless its
		client credentials are revoked as well (optional, when the server allows it).
	-->
	<OpDialog
		:model-value="modelValue"
		:title="title"
		size="md"
		@update:model-value="close"
	>
		<div class="flex flex-col gap-3.5 text-sm text-app-text-2">
			<p v-if="deletable.length">
				{{ deletable.length === 1 ? 'This removes the device' : `This removes ${deletable.length} devices` }}
				and {{ deletable.length === 1 ? 'its' : 'their' }} details from this server.
			</p>
			<ul
				v-if="deletable.length"
				class="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto"
				aria-label="Devices to delete"
			>
				<li
					v-for="d in deletable"
					:key="d.id"
					class="rounded-md bg-app-chip px-2 py-[3px] font-mono text-xs text-app-text"
				>
					{{ d.name || d.id }}
				</li>
			</ul>
			<p
				v-if="online.length"
				class="rounded-lg bg-app-warn-bg px-3 py-2 text-[13px] text-app-warn"
			>
				<template v-if="deletable.length">
					{{ online.length === 1 ? '1 selected device is' : `${online.length} selected devices are` }} online and will be kept.
				</template>
				<template v-else>
					{{ online.length === 1 ? 'This device is' : 'These devices are' }} online. Only offline devices can be deleted: stop or uninstall the client first.
				</template>
			</p>
			<template v-if="deletable.length">
				<OpCheckbox
					v-if="canRevoke"
					v-model="revoke"
				>
					Also revoke {{ credentialIds.length === 1 ? 'its client credentials' : 'their client credentials' }}
					<span class="font-mono text-xs">({{ credentialIds.join(', ') }})</span>
					so {{ deletable.length === 1 ? 'it' : 'they' }} can't connect again
				</OpCheckbox>
				<p
					v-if="canRevoke && revoke"
					class="text-[13px] text-app-text-3"
				>
					Credentials still used by other devices are kept.
				</p>
				<p
					v-if="!canRevoke || !revoke"
					class="text-[13px] text-app-text-3"
				>
					If {{ deletable.length === 1 ? 'the client connects' : 'a client connects' }} again, the device reappears in the list.
				</p>
			</template>
		</div>
		<template #footer>
			<div class="ml-auto flex gap-2.5">
				<AppButton
					variant="secondary"
					size="sm"
					:disabled="busy"
					@click="close"
				>
					{{ deletable.length ? 'Cancel' : 'Close' }}
				</AppButton>
				<AppButton
					v-if="deletable.length"
					variant="danger"
					size="sm"
					:disabled="busy"
					@click="run"
				>
					<Trash2
						class="h-4 w-4"
						aria-hidden="true"
					/>
					{{ busy ? 'Deleting…' : deletable.length === 1 ? 'Delete device' : `Delete ${deletable.length} devices` }}
				</AppButton>
			</div>
		</template>
	</OpDialog>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import OpDialog from '~/components/operate/OpDialog.vue';
import { apiErrorMessage } from '~/utils/apiError';
import { credentialIdsOf, deletionSummary, splitForDeletion, type DeletionResult } from '~/utils/deviceDelete';
import type { Client } from '~/types';

const props = defineProps<{
	modelValue: boolean;
	devices: Client[];
}>();
const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	/** IDs of the devices that were deleted. */
	(e: 'deleted', ids: string[]): void;
}>();

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const statusStore = useStatusStore();

const busy = ref(false);
const revoke = ref(false);

const split = computed(() => splitForDeletion(props.devices));
const deletable = computed(() => split.value.deletable);
const online = computed(() => split.value.online);
const credentialIds = computed(() => credentialIdsOf(deletable.value));
/** Revoking needs writable client credentials on the server (and admin rights, checked by the server). */
const canRevoke = computed(() => credentialIds.value.length > 0
	&& statusStore.status?.clients_auth_mode === 'Read Write');

const title = computed(() => {
	const n = props.devices.length;
	if (!deletable.value.length) return n === 1 ? `Can't delete ${props.devices[0]?.name || props.devices[0]?.id}` : 'Can\'t delete these devices';
	if (n === 1) return `Delete ${props.devices[0]?.name || props.devices[0]?.id}?`;
	return `Delete ${n} devices?`;
});

watch(() => props.modelValue, (open) => {
	if (!open) return;
	revoke.value = false;
	if (!statusStore.status) statusStore.loadStatus().catch(() => {});
});

function close() {
	if (busy.value) return;
	emit('update:modelValue', false);
}

async function run() {
	busy.value = true;
	const result: DeletionResult = { deleted: [], failed: [], revoked: [], credentialsKept: [] };
	const errors: string[] = [];
	for (const device of deletable.value) {
		try {
			await $api.clients.delete(device.id);
			result.deleted.push(device.id);
		}
		catch (e) {
			result.failed.push(device.id);
			errors.push(`${device.name || device.id}: ${apiErrorMessage(e)}`);
		}
	}
	if (revoke.value && canRevoke.value) {
		const deletedSet = new Set(result.deleted);
		const ids = credentialIdsOf(deletable.value.filter(d => deletedSet.has(d.id)));
		for (const id of ids) {
			try {
				// Without force the server refuses credentials other devices still use.
				await $api.clientAuth.delete(id, false);
				result.revoked.push(id);
			}
			catch {
				result.credentialsKept.push(id);
			}
		}
	}
	busy.value = false;
	if (errors.length) console.error('Device deletion errors:', errors);
	const summary = deletionSummary(result);
	snackbar.add({ type: summary.type, text: errors.length === 1 && !result.deleted.length ? `${summary.text}: ${errors[0]}` : summary.text });
	if (result.deleted.length) emit('deleted', result.deleted);
	emit('update:modelValue', false);
}
</script>
