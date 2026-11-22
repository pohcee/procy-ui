<template>
	<!--
		New-tunnel form (state + submit live in useTunnelForm). Renders its own card with a
		"New tunnel" header and Cancel button; pass `embedded` to render just the fields
		inside a card the parent provides (Tunnels page).
	-->
	<component
		:is="embedded ? 'div' : 'section'"
		:class="embedded ? '' : 'rounded-xl border border-app-border bg-app-surface p-5'"
		:aria-label="embedded ? undefined : 'New tunnel'"
	>
		<TunnelFormHeader
			v-if="!embedded"
			class="mb-4"
			@cancel="onCancel"
		/>
		<form
			class="flex flex-col gap-4"
			@submit="onSubmit"
		>
			<!-- 1. Service -->
			<fieldset class="flex min-w-0 flex-col gap-1.5">
				<legend class="mb-1.5 text-[13px] font-medium text-app-text-2">
					Service
				</legend>
				<div class="grid grid-cols-2 gap-2">
					<label
						v-for="option in serviceCards"
						:key="option.id"
						:class="[
							'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 text-sm text-app-text transition-colors',
							formState.service === option.id
								? 'border-app-accent bg-app-accent/5 shadow-[inset_0_0_0_1px_rgb(var(--app-accent))]'
								: 'border-app-border-strong hover:bg-app-hover',
						]"
					>
						<input
							v-model="formState.service"
							type="radio"
							:name="`${uid}-service`"
							:value="option.id"
							class="h-4 w-4 shrink-0 accent-app-accent"
						>
						<span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
						<span
							v-if="option.ports"
							class="shrink-0 font-mono text-xs text-app-text-3"
						>{{ option.ports }}</span>
					</label>
				</div>
			</fieldset>

			<div
				v-if="formState.service === 'forwarding'"
				class="flex flex-col gap-4"
			>
				<CustomThemedSelect
					:id="`${uid}-fwd-service`"
					v-model="formState.forwardingService"
					label="Forwarded service"
					placeholder="Select…"
					:options="forwardingServiceOptions"
				/>
				<OpField
					label="Destination IP / hostname"
					:for-id="`${uid}-fwd-dest`"
					:error="forwardingError ? 'Invalid IP or hostname' : null"
					help="A host reachable from the device."
				>
					<OpInput
						:id="`${uid}-fwd-dest`"
						v-model="formState.forwardDestination"
						mono
						:invalid="forwardingError"
						placeholder="e.g. 192.168.1.20"
					/>
				</OpField>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<OpField
					label="Device port"
					:for-id="`${uid}-port`"
				>
					<OpInput
						:id="`${uid}-port`"
						v-model="formState.port"
						type="number"
						mono
					/>
				</OpField>
				<CustomThemedSelect
					v-if="formState.service === 'other'"
					:id="`${uid}-protocol`"
					v-model="formState.protocol"
					label="Protocol"
					placeholder="Select…"
					:options="protocolOptions"
				/>
			</div>

			<!-- Service extras -->
			<OpCheckbox v-if="formState.service === 'rdp'">
				Enable RDP via browser
			</OpCheckbox>
			<div
				v-if="formState.service === 'vnc'"
				class="flex flex-col gap-1"
			>
				<OpCheckbox>Enable NoVNC (VNC via browser)</OpCheckbox>
			</div>
			<div
				v-if="formState.service === 'http' || formState.service === 'https'"
				class="flex flex-col gap-3"
			>
				<OpCheckbox v-model="formState.http_proxy">
					Open in browser via built-in HTTP proxy
				</OpCheckbox>
				<div
					v-if="formState.http_proxy"
					class="flex flex-col gap-3 rounded-[10px] border border-app-border-subtle bg-app-surface-2 p-3"
				>
					<OpField
						label="Overwrite Host header to"
						:for-id="`${uid}-host-header`"
					>
						<OpInput
							:id="`${uid}-host-header`"
							v-model="formState.host_header"
							mono
						/>
					</OpField>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<OpField
							label="Require username"
							:for-id="`${uid}-auth-user`"
						>
							<OpInput
								:id="`${uid}-auth-user`"
								v-model="formState.auth_user"
							/>
						</OpField>
						<OpField
							label="Require password"
							:for-id="`${uid}-auth-pass`"
						>
							<OpInput
								:id="`${uid}-auth-pass`"
								v-model="formState.auth_password"
								type="password"
							/>
						</OpField>
					</div>
				</div>
			</div>

			<!-- 2. Public (server) port -->
			<fieldset class="flex min-w-0 flex-col gap-1.5">
				<legend class="mb-1.5 text-[13px] font-medium text-app-text-2">
					Server port
				</legend>
				<OpSegmented
					v-model="lportMode"
					:options="lportRandomOptions"
					label="Server port"
					block
				/>
				<OpField
					v-if="formState.lport_random === 'specify'"
					:for-id="`${uid}-lport`"
					:error="lportError ? lportErrorMessage : null"
					help="Allowed server ports: 20000–30000 (1–1024 excluded)."
				>
					<OpInput
						:id="`${uid}-lport`"
						v-model="formState.lport"
						type="number"
						mono
						aria-label="Server port"
						:invalid="lportError"
					/>
				</OpField>
			</fieldset>

			<!-- 3. ACL -->
			<div class="flex flex-col gap-2">
				<CustomThemedSelect
					:id="`${uid}-acl-model`"
					v-model="formState.acl_model"
					label="Allowed from"
					placeholder="Select…"
					:options="aclModelOptions"
				/>
				<OpField
					v-if="formState.acl_model !== 'anyone'"
					:for-id="`${uid}-acl`"
					:help="formState.acl_model === 'current'
						? 'Defaults to your current IP address.'
						: 'Comma-separate IPs or CIDR ranges, e.g. 198.51.100.0/24.'"
				>
					<OpInput
						:id="`${uid}-acl`"
						v-model="formState.acl"
						mono
						aria-label="Allowed IP addresses"
						:readonly="formState.acl_model === 'current'"
						:aria-describedby="`${uid}-acl-help`"
					/>
				</OpField>
				<div
					v-else
					class="flex flex-col gap-1.5 rounded-[10px] border border-app-warn/40 bg-app-warn-bg p-3"
				>
					<p class="flex items-start gap-2 text-[13px] font-medium text-app-warn">
						<TriangleAlert
							class="mt-0.5 h-4 w-4 shrink-0"
							aria-hidden="true"
						/>
						Anyone on the internet who finds this port can reach the device.
					</p>
					<OpCheckbox v-model="formState.acl_risk">
						I am aware of the risk
					</OpCheckbox>
					<p
						v-if="!formState.acl_risk"
						class="text-xs font-medium text-app-danger"
					>
						Please confirm you are aware of the risk.
					</p>
				</div>
			</div>

			<!-- 4. Closing -->
			<fieldset class="flex min-w-0 flex-col gap-2">
				<legend class="mb-1.5 text-[13px] font-medium text-app-text-2">
					Close automatically
				</legend>
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<OpCheckbox v-model="formState.skip_idle_timeout">
						After inactivity of
					</OpCheckbox>
					<div class="flex items-center gap-2">
						<OpInput
							v-model="formState.idle_timeout_minutes"
							type="number"
							class="!w-20"
							aria-label="Idle minutes"
							:readonly="!formState.skip_idle_timeout"
						/>
						<span class="text-sm text-app-text-3">min</span>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<OpCheckbox v-model="formState.autoclose_enable">
						Destroy after
					</OpCheckbox>
					<div class="flex items-center gap-2">
						<OpInput
							v-model="formState.autoclose_hour"
							type="number"
							class="!w-16"
							aria-label="Hours"
							:readonly="!formState.autoclose_enable"
						/>
						<span class="text-sm text-app-text-3">h</span>
						<OpInput
							v-model="formState.autoclose_minute"
							type="number"
							class="!w-16"
							aria-label="Minutes"
							:readonly="!formState.autoclose_enable"
						/>
						<span class="text-sm text-app-text-3">min</span>
					</div>
				</div>
			</fieldset>

			<!-- Library -->
			<div class="flex flex-col gap-2">
				<OpCheckbox v-model="formState.storeInLibrary">
					Store in library for later re-use
				</OpCheckbox>
				<OpField
					v-if="formState.storeInLibrary"
					:for-id="`${uid}-name`"
					:error="formState.name?.length === 0 ? 'Name or hint is required' : null"
				>
					<OpInput
						:id="`${uid}-name`"
						v-model="formState.name"
						aria-label="Name or hint"
						placeholder="Name or hint"
						:invalid="formState.name?.length === 0"
					/>
				</OpField>
			</div>

			<p
				v-if="submitFailed"
				role="alert"
				class="rounded-[10px] border border-app-danger/30 bg-app-danger-bg px-3 py-2.5 text-[13px] text-app-danger"
			>
				The server did not create the tunnel. Check that the device port is listening and that no tunnel to it exists yet.
			</p>
			<AppButton
				type="submit"
				class="relative w-full"
				:disabled="isLoading"
			>
				<Loader2
					v-if="isLoading"
					class="h-4 w-4 animate-spin"
					aria-hidden="true"
				/>
				Create tunnel
			</AppButton>
		</form>
	</component>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { Loader2, TriangleAlert } from 'lucide-vue-next';
import { TUNNEL_OPTIONS } from '~/constants';
import TunnelFormHeader from '~/components/tunnels/TunnelFormHeader.vue';
import OpField from '~/components/operate/OpField.vue';
import OpInput from '~/components/operate/OpInput.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import { useTunnelForm } from '~/composables/tunnels/useTunnelForm';
import type { Client } from '~/types';

const tunnelStore = useTunnelStore();

const props = defineProps({
	device: {
		type: Object as PropType<Client>,
		required: true,
	},
	embedded: {
		type: Boolean,
		default: false,
	},
});
const emit = defineEmits<{ (e: 'cancel'): void }>();

const uid = useId();

const {
	formState,
	lportError,
	lportErrorMessage,
	forwardingError,
	isLoading,
	handleSubmit,
} = useTunnelForm(props.device);

const SHORT_LABELS: Record<string, string> = {
	ssh: 'SSH',
	rdp: 'RDP',
	vnc: 'VNC',
	realvnc: 'RealVNC',
	http: 'HTTP',
	https: 'HTTPS',
	other: 'Other',
	forwarding: 'Forwarding',
};
const serviceCards = computed(() => TUNNEL_OPTIONS.map(option => ({
	id: option.id,
	label: SHORT_LABELS[option.id] ?? option.label,
	ports: option.id === 'other' || option.id === 'realvnc' ? '' : option.ports,
})));
const forwardingServiceOptions = computed(() => TUNNEL_OPTIONS
	.filter(option => option.id !== 'forwarding')
	.map(option => ({ value: option.id, label: option.label })));
const protocolOptions = [
	{ value: 'tcp', label: 'TCP' },
	{ value: 'udp', label: 'UDP' },
	{ value: 'tcp+udp', label: 'TCP + UDP' },
];
const lportRandomOptions = [
	{ value: 'random' as const, label: 'Random free port' },
	{ value: 'specify' as const, label: 'Specific port' },
];
const lportMode = computed({
	get: () => formState.lport_random ?? 'random',
	set: (value: 'random' | 'specify') => {
		formState.lport_random = value;
	},
});
const aclModelOptions = [
	{ value: 'current', label: 'Only my current IP address' },
	{ value: 'specific', label: 'Specific network range' },
	{ value: 'anyone', label: 'No restrictions (anyone can access)' },
];

// useTunnelForm closes the store's "adding" flag only on success; if it is still open
// after submitting, the server rejected the request.
const submitFailed = ref(false);
const onSubmit = async (e: Event) => {
	submitFailed.value = false;
	if (!tunnelStore.isAddingTunnel) tunnelStore.openAddTunel();
	await handleSubmit(e);
	submitFailed.value = tunnelStore.isAddingTunnel;
};

const onCancel = () => {
	emit('cancel');
	tunnelStore.closeAddTunnel();
};
</script>
