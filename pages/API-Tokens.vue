<template>
	<SettingsLayout
		heading="API tokens"
		description="Personal tokens for scripts and integrations that call the API as you."
	>
		<template #actions>
			<AppButton @click="tokenModal?.openForCreate()">
				<Plus
					class="h-4 w-4"
					aria-hidden="true"
				/>
				Add API token
			</AppButton>
		</template>

		<AppCard flush>
			<div
				v-if="pending && !tokens"
				class="px-4 py-10 text-center text-sm text-app-text-3"
			>
				Loading API tokens…
			</div>
			<div
				v-else-if="!tokens?.data?.length"
				class="flex flex-col items-center gap-2 px-4 py-12 text-center"
			>
				<KeySquare
					class="h-8 w-8 text-app-text-4"
					aria-hidden="true"
				/>
				<p class="text-sm font-medium text-app-text">
					No API tokens yet
				</p>
				<p class="text-[13px] text-app-text-3">
					Create a token to use the API from scripts. It is shown only once.
				</p>
			</div>
			<template v-else>
				<div class="hidden overflow-x-auto md:block">
					<table class="st-table">
						<thead>
							<tr>
								<th scope="col">
									Name
								</th>
								<th scope="col">
									Prefix
								</th>
								<th scope="col">
									Scope
								</th>
								<th scope="col">
									Created
								</th>
								<th scope="col">
									Expires
								</th>
								<th
									scope="col"
									class="w-14"
								>
									<span class="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="token in tokens.data"
								:key="token.prefix"
							>
								<td class="font-medium">
									{{ token.name }}
								</td>
								<td>
									<div class="flex items-center gap-1">
										<span class="font-mono text-[13px] text-app-text-2">{{ token.prefix }}</span>
										<button
											type="button"
											:aria-label="`Copy token prefix ${token.prefix}`"
											:title="lastCopiedPrefix === token.prefix ? 'It’s in your clipboard' : 'Copy to clipboard'"
											class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
											@click="copyToClipboard(token)"
										>
											<Check
												v-if="lastCopiedPrefix === token.prefix"
												class="h-4 w-4 text-app-ok"
												aria-hidden="true"
											/>
											<Copy
												v-else
												class="h-4 w-4"
												aria-hidden="true"
											/>
										</button>
									</div>
								</td>
								<td>
									<span class="st-chip font-mono">{{ token.scope }}</span>
								</td>
								<td class="whitespace-nowrap text-app-text-2">
									{{ formatUtc(token.created_at) }}
								</td>
								<td class="whitespace-nowrap">
									<TokenExpiry :value="token.expires_at" />
								</td>
								<td class="text-right">
									<SettingsRowActions
										:items="rowActions(token)"
										:label="`Actions for ${token.name}`"
									/>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<ul class="divide-y divide-app-border-subtle md:hidden">
					<li
						v-for="token in tokens.data"
						:key="token.prefix"
						class="flex items-start gap-3 px-4 py-3"
					>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="truncate text-[15px] font-medium text-app-text">
									{{ token.name }}
								</p>
								<span class="st-chip font-mono">{{ token.scope }}</span>
							</div>
							<div class="mt-1 flex items-center gap-1">
								<span class="font-mono text-[13px] text-app-text-2">{{ token.prefix }}</span>
								<button
									type="button"
									:aria-label="`Copy token prefix ${token.prefix}`"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-3 hover:bg-app-hover hover:text-app-text"
									@click="copyToClipboard(token)"
								>
									<Check
										v-if="lastCopiedPrefix === token.prefix"
										class="h-4 w-4 text-app-ok"
										aria-hidden="true"
									/>
									<Copy
										v-else
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
							</div>
							<dl class="mt-1 grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
								<dt class="text-app-text-3">
									Created
								</dt>
								<dd class="text-app-text-2">
									{{ formatUtc(token.created_at) }}
								</dd>
								<dt class="text-app-text-3">
									Expires
								</dt>
								<dd>
									<TokenExpiry :value="token.expires_at" />
								</dd>
							</dl>
						</div>
						<SettingsRowActions
							:items="rowActions(token)"
							:label="`Actions for ${token.name}`"
						/>
					</li>
				</ul>

				<SettingsPagination
					:page="0"
					:current-page-item-count="tokens.data.length"
					:total-items="tokens.data.length"
				/>
			</template>
		</AppCard>

		<ApiTokenModal
			ref="tokenModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			title="Revoke API token?"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<p class="text-sm text-app-text-2">
				Do you want to delete the token <span class="font-semibold text-app-text">{{ activeToken?.name }}</span>
				(<span class="font-mono">{{ activeToken?.prefix }}</span>)? Anything using it stops working immediately.
			</p>
		</Modal>
	</SettingsLayout>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { Check, Copy, KeySquare, Pencil, Plus, Trash2 } from 'lucide-vue-next';
import type { PropType } from 'vue';
import type { APIToken } from '~/types';
import ApiTokenModal from '~/components/custom/ApiTokenModal.vue';

const { $api } = useNuxtApp();
const snackbar = useSnackbar();

const { data: tokens, refresh, pending } = useLazyAsyncData('api-tokens', () => $api.profile.apiTokens());
const { copy, isSupported } = useClipboard();
const lastCopiedPrefix = ref<string | null>(null);

const tokenModal = ref<InstanceType<typeof ApiTokenModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeToken = ref<APIToken | null>(null);

// Format as 'YYYY-MM-DD HH:mm UTC' in actual UTC (useDateFormat has no timezone option and would format in local time).
const formatUtc = (value: Date | string | null | undefined): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

const copyToClipboard = (token: APIToken) => {
	if (!isSupported) {
		snackbar.add({ type: 'error', text: 'Clipboard is not supported in your browser' });
		return;
	}
	copy(token.prefix);
	lastCopiedPrefix.value = token.prefix;
	setTimeout(() => {
		lastCopiedPrefix.value = null;
	}, 1000);
};

const triggerDelete = (token: APIToken) => {
	activeToken.value = token;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeToken.value) return;
	await $api.profile.delete(activeToken.value.prefix);
	snackbar.add({ type: 'success', text: 'Token deleted' });
	deleteConfirmOpen.value = false;
	await refresh();
};

const rowActions = (token: APIToken) => [
	{ label: 'Edit', icon: Pencil, action: () => tokenModal.value?.openForEdit(token) },
	{ label: 'Delete', icon: Trash2, danger: true, action: () => triggerDelete(token) },
];

// Expiry cell: "Never" when unset, status dot + text when expired.
const TokenExpiry = defineComponent({
	props: { value: { type: [String, Date] as PropType<string | Date | null | undefined>, default: null } },
	setup(props) {
		return () => {
			if (!props.value) return h('span', { class: 'text-app-text-3' }, 'Never');
			const expired = new Date(props.value).getTime() < Date.now();
			if (!expired) return h('span', { class: 'text-app-text-2' }, formatUtc(props.value));
			return h('span', { class: 'inline-flex items-center gap-1.5 text-app-danger' }, [
				h('span', { 'class': 'h-2 w-2 rounded-full bg-current', 'aria-hidden': 'true' }),
				`Expired ${formatUtc(props.value)}`,
			]);
		};
	},
});
</script>
