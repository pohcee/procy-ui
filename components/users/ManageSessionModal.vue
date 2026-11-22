<template>
	<Modal
		v-model="isOpen"
		:title="username ? `Sessions · ${username}` : 'Manage sessions'"
		ok-text="Close"
		cancel-text="Cancel"
		:show-cancel="true"
		@ok="close"
	>
		<div
			v-if="userSessions?.length === 0"
			class="flex flex-col items-center gap-2 py-8 text-center"
		>
			<MonitorSmartphone
				class="h-8 w-8 text-app-text-4"
				aria-hidden="true"
			/>
			<p class="text-sm text-app-text-2">
				User <span class="font-semibold text-app-text">{{ username }}</span> has no active sessions.
			</p>
		</div>
		<div
			v-else
			class="flex flex-col gap-4"
		>
			<div class="flex items-start gap-3 rounded-[10px] border border-app-border bg-app-danger-bg p-3.5 text-[13px] text-app-text-2">
				<TriangleAlert
					class="mt-px h-[18px] w-[18px] shrink-0 text-app-danger"
					aria-hidden="true"
				/>
				Removing a session forces the user to sign in again immediately.
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-[13px] text-app-text-3">
					{{ userSessions.length }} active session{{ userSessions.length === 1 ? '' : 's' }}
				</p>
				<AppButton
					variant="secondary"
					size="sm"
					class="!text-app-danger"
					@click="removeAllSessions"
				>
					<Trash2
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Remove all sessions
				</AppButton>
			</div>
			<ul class="flex flex-col gap-3">
				<li
					v-for="session in userSessions"
					:key="session.session_id"
					class="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface-2 p-4 sm:flex-row sm:items-start"
				>
					<dl class="grid min-w-0 flex-1 grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
						<dt class="text-app-text-3">
							IP address
						</dt>
						<dd class="font-mono text-app-text">
							{{ session.ip_address }}
						</dd>
						<dt class="text-app-text-3">
							Last access
						</dt>
						<dd class="text-app-text">
							{{ session.last_access_at }}
						</dd>
						<dt class="text-app-text-3">
							Expires
						</dt>
						<dd class="text-app-text">
							{{ session.expires_at }}
						</dd>
						<dt class="text-app-text-3">
							User agent
						</dt>
						<dd class="break-words text-app-text-2">
							{{ session.user_agent }}
						</dd>
					</dl>
					<AppButton
						variant="secondary"
						size="sm"
						class="shrink-0 self-start !text-app-danger"
						@click="removeSession(session.session_id)"
					>
						Remove
					</AppButton>
				</li>
			</ul>
		</div>
	</Modal>
</template>

<script setup lang="ts">
import { MonitorSmartphone, Trash2, TriangleAlert } from 'lucide-vue-next';
import type { UserSession } from '~/types';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const isOpen = ref(false);

const props = defineProps({
	username: {
		type: String,
		default: '',
	},
	userSessions: {
		type: Array<UserSession>,
		default: () => [],
	},
});

const emit = defineEmits(['sessions-changed']);

const open = () => {
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const removeSession = async (sessionId: number) => {
	try {
		await $api.users.deleteSessionForUser(props.username, sessionId);
		snackbar.add({ type: 'success', text: 'Session removed' });
		emit('sessions-changed');
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to remove session' });
	}
};

const removeAllSessions = async () => {
	try {
		await $api.users.deleteSessions(props.username);
		snackbar.add({ type: 'success', text: 'All sessions removed' });
		emit('sessions-changed');
	}
	catch {
		snackbar.add({ type: 'error', text: 'Failed to remove sessions' });
	}
};

defineExpose({ open, close });
</script>
