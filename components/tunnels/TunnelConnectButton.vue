<template>
	<!--
		One "Connect" / "Open" action for an active tunnel, used on the Tunnels page and the
		device Tunnels tab. Follows Settings → Profile → Preferences (Secure Shell extension,
		RDP method, default RDP username and window size). SSH asks for the username first.
	-->
	<AppButton
		v-if="kind !== 'other'"
		:variant="variant"
		size="sm"
		:aria-label="`${label} ${deviceName || clientId} (${kindName}, port ${tunnel.lport})`"
		@click="onClick"
	>
		<component
			:is="icon"
			class="h-3.5 w-3.5"
			aria-hidden="true"
		/>
		{{ label }}
	</AppButton>

	<Modal
		v-model="sshOpen"
		:title="`SSH to ${deviceName || clientId}`"
		ok-text="Connect"
		cancel-text="Cancel"
		:show-cancel="true"
		@ok="connectSsh"
	>
		<form
			class="flex flex-col gap-4"
			@submit.prevent="connectSsh"
		>
			<div class="flex flex-col gap-1.5">
				<label
					:for="`${uid}-user`"
					class="text-[13px] font-medium text-app-text-2"
				>Username on the device</label>
				<input
					:id="`${uid}-user`"
					ref="userInput"
					v-model="sshUser"
					type="text"
					autocomplete="username"
					spellcheck="false"
					placeholder="e.g. root"
					class="h-11 rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 font-mono text-sm text-app-text focus:border-app-accent focus:outline-none"
				>
			</div>
			<p class="text-[13px] text-app-text-3">
				{{ prefs.useSecureShellExtension.value === 'true'
					? 'Opens the Secure Shell extension for Chrome (Settings → Profile).'
					: 'Opens your system’s SSH client via an ssh:// link. If nothing opens, run this command:' }}
			</p>
			<div class="flex items-center gap-2 rounded-[10px] bg-[#0F151D] py-1.5 pl-3 pr-1.5">
				<code class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-[#E6EBF2]">{{ command }}</code>
				<button
					type="button"
					class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#222B37] px-3 text-[13px] font-medium text-[#E6EBF2] hover:bg-[#2A3442]"
					@click="copyCommand"
				>
					<Copy
						class="h-3.5 w-3.5"
						aria-hidden="true"
					/>
					Copy
				</button>
			</div>
		</form>
	</Modal>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { Copy, ExternalLink, Monitor, SquareTerminal } from 'lucide-vue-next';
import Modal from '~/components/Modal.vue';
import { connectLabel, sshCommand, tunnelKind, useTunnelConnect, useTunnelHost } from '~/composables/useTunnelConnect';
import type { Tunnel } from '~/types';

const props = withDefaults(defineProps<{
	tunnel: Tunnel;
	deviceName?: string;
	/** The device's client id, when the tunnel object doesn't carry it. */
	clientId?: string;
	variant?: 'primary' | 'secondary';
}>(), { deviceName: '', clientId: '', variant: 'secondary' });

const emit = defineEmits<{ (e: 'connected'): void }>();

const uid = useId();
const snackbar = useSnackbar();
const { copy } = useClipboard({ legacy: true });
const { connect, prefs } = useTunnelConnect();
const host = useTunnelHost();
const statusStore = useStatusStore();

onMounted(() => {
	// The connect host can come from the server's tunnel_host setting.
	if (!statusStore.status?.version) statusStore.loadStatus();
});

const kind = computed(() => tunnelKind(props.tunnel));
const label = computed(() => connectLabel(kind.value));
const kindName = computed(() => ({ ssh: 'SSH', rdp: 'Remote Desktop', http: 'HTTP', https: 'HTTPS', vnc: 'VNC', other: '' })[kind.value]);
const icon = computed(() => (kind.value === 'http' || kind.value === 'https' ? ExternalLink : kind.value === 'ssh' ? SquareTerminal : Monitor));
const clientId = computed(() => props.clientId || props.tunnel.client_id);
const target = computed(() => ({ tunnel: props.tunnel, host: host.value, deviceName: props.deviceName, clientId: clientId.value }));

const sshOpen = ref(false);
const sshUser = ref('');
const userInput = ref<HTMLInputElement | null>(null);
const command = computed(() => sshCommand(target.value, sshUser.value.trim()));

const run = (opts: { sshUser?: string } = {}) => {
	const message = connect(target.value, opts);
	if (message) snackbar.add({ type: 'success', text: message });
	emit('connected');
};

const onClick = async () => {
	if (kind.value === 'ssh') {
		sshUser.value = prefs.sshUsernames.value[clientId.value] ?? '';
		sshOpen.value = true;
		await nextTick();
		userInput.value?.focus();
		return;
	}
	run();
};

const connectSsh = () => {
	sshOpen.value = false;
	run({ sshUser: sshUser.value });
};

const copyCommand = async () => {
	await copy(command.value);
	snackbar.add({ type: 'success', text: 'SSH command copied' });
};
</script>
