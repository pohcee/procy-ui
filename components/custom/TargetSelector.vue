<template>
	<!--
		Pick the devices a job runs on: individual devices, client groups, or devices by tags
		(the server accepts one targeting mode at a time). Selected items show as removable chips;
		the field below searches and adds more.
	-->
	<div class="flex flex-col gap-3">
		<OpSegmented
			v-model="mode"
			:options="modeOptions"
			label="Target by"
			size="sm"
			block
		/>

		<div
			v-if="chips.length"
			class="flex flex-wrap gap-1.5"
			aria-label="Selected targets"
			role="list"
		>
			<span
				v-for="chip in chips"
				:key="chip.key"
				role="listitem"
				class="inline-flex h-[30px] max-w-full items-center gap-1 rounded-lg bg-app-chip pl-2.5 pr-1 font-mono text-xs text-app-text"
			>
				<span
					v-if="chip.online !== undefined"
					:class="['h-1.5 w-1.5 shrink-0 rounded-full', chip.online ? 'bg-[#22C55E]' : 'bg-app-text-4']"
					aria-hidden="true"
				/>
				<span class="truncate">{{ chip.label }}</span>
				<button
					type="button"
					class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-app-text-2 hover:bg-app-hover hover:text-app-text"
					:aria-label="`Remove ${chip.label}`"
					@click="chip.remove()"
				>
					<X
						class="h-3.5 w-3.5"
						aria-hidden="true"
					/>
				</button>
			</span>
		</div>

		<div
			ref="fieldRoot"
			class="relative flex flex-col gap-1.5"
		>
			<label
				:for="inputId"
				class="text-[13px] font-medium text-app-text-2"
			>{{ addLabel }}</label>
			<input
				:id="inputId"
				v-model="query"
				type="text"
				role="combobox"
				autocomplete="off"
				:aria-expanded="isOpen"
				:aria-controls="listId"
				:placeholder="addPlaceholder"
				class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface-2 px-3 text-sm text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
				@focus="isOpen = true"
				@click="isOpen = true"
				@keydown.down.prevent="move(1)"
				@keydown.up.prevent="move(-1)"
				@keydown.enter.prevent="commit"
				@keydown.esc="isOpen = false"
				@keydown.backspace="removeLastOnEmpty"
			>
			<ul
				v-if="isOpen && (suggestions.length || mode === 'tags' && query.trim())"
				:id="listId"
				role="listbox"
				class="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-[10px] border border-app-border bg-app-surface p-1 shadow-lg"
			>
				<li
					v-for="(item, index) in suggestions"
					:key="item.value"
					role="option"
					:aria-selected="index === activeIndex"
					:class="[
						'flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm',
						index === activeIndex ? 'bg-app-hover' : '',
					]"
					@mousedown.prevent="add(item.value)"
					@mouseenter="activeIndex = index"
				>
					<span
						v-if="item.online !== undefined"
						:class="['h-2 w-2 shrink-0 rounded-full', item.online ? 'bg-[#22C55E]' : 'bg-app-text-4']"
						aria-hidden="true"
					/>
					<span class="min-w-0 flex-1 truncate font-mono text-[13px] text-app-text">{{ item.label }}</span>
					<span
						v-if="item.meta"
						class="shrink-0 text-xs text-app-text-3"
					>{{ item.meta }}</span>
				</li>
				<li
					v-if="mode === 'tags' && query.trim() && !suggestions.some(s => s.value === query.trim())"
					role="option"
					:aria-selected="suggestions.length === 0"
					class="flex min-h-[40px] cursor-pointer items-center rounded-lg px-2.5 text-sm text-app-text-2 hover:bg-app-hover"
					@mousedown.prevent="add(query.trim())"
				>
					Add tag “<span class="font-mono text-app-text">{{ query.trim() }}</span>”
				</li>
			</ul>
			<p
				v-if="isOpen && mode !== 'tags' && query && suggestions.length === 0"
				class="text-xs text-app-text-3"
			>
				{{ mode === 'clients' ? 'No devices match' : 'No groups match' }} “{{ query }}”.
			</p>
		</div>

		<div
			v-if="mode === 'tags'"
			class="flex flex-col gap-2"
		>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-app-text-2">
				<span>Match</span>
				<OpSegmented
					v-model="tagsOperator"
					:options="[{ value: 'AND', label: 'All tags' }, { value: 'OR', label: 'Any tag' }]"
					label="Match"
					size="sm"
				/>
			</div>
			<p class="text-xs text-app-text-3">
				<template v-if="tagsValue.length">
					{{ matchingClients.length }} matching device{{ matchingClients.length === 1 ? '' : 's' }}<span
						v-if="matchingClients.length"
						class="font-mono text-app-text-2"
					>: {{ matchPreview }}</span>
				</template>
				<template v-else>
					Add a tag to see which devices match.
				</template>
			</p>
		</div>
		<p
			v-else-if="mode === 'groups' && groups.length === 0 && loaded"
			class="text-xs text-app-text-3"
		>
			No client groups defined yet.
		</p>
	</div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import type { Client, ClientGroup, JobClientTags } from '~/types';

type Mode = 'clients' | 'groups' | 'tags';

const props = defineProps({
	initial: {
		type: Object as () => { clientIds: string[]; groupIds: string[]; tags: JobClientTags | null } | null,
		default: null,
	},
});
const emit = defineEmits<{
	(e: 'update:target', value: { clientIds: string[]; groupIds: string[]; tags: JobClientTags | null }): void;
	(e: 'update:deviceCount', value: number): void;
}>();

const { $api } = useNuxtApp();

const modeOptions: { value: Mode; label: string }[] = [
	{ value: 'clients', label: 'Devices' },
	{ value: 'groups', label: 'Groups' },
	{ value: 'tags', label: 'Tags' },
];
const initialMode = (): Mode => {
	if (props.initial?.groupIds?.length) return 'groups';
	if (props.initial?.tags) return 'tags';
	return 'clients';
};
const mode = ref<Mode>(initialMode());

const clients = ref<Client[]>([]);
const groups = ref<ClientGroup[]>([]);
const loaded = ref(false);
const selectedClientIds = ref<string[]>([...(props.initial?.clientIds ?? [])]);
const selectedGroupIds = ref<string[]>([...(props.initial?.groupIds ?? [])]);
const tagsValue = ref<string[]>([...(props.initial?.tags?.tags ?? [])]);
const tagsOperator = ref<'AND' | 'OR'>(props.initial?.tags?.operator ?? 'AND');

const inputId = useId();
const listId = useId();
const query = ref('');
const isOpen = ref(false);
const activeIndex = ref(0);
const fieldRoot = ref<HTMLElement | null>(null);
onClickOutside(fieldRoot, () => {
	isOpen.value = false;
});

onMounted(async () => {
	const [clientsResponse, groupsResponse] = await Promise.all([
		$api.clients.listClients(),
		$api.groups.listGroups(),
	]);
	clients.value = clientsResponse.data;
	groups.value = groupsResponse.data;
	loaded.value = true;
	// Preselected devices beyond the first page of the list: look up their names for the chips.
	const known = new Set(clients.value.map(c => c.id));
	const missing = selectedClientIds.value.filter(id => !known.has(id));
	if (missing.length) {
		try {
			const extra = await $api.clients.getClientsName(missing.slice(0, 500));
			clients.value = [...clients.value, ...(extra.data ?? [])];
		}
		catch (e) {
			console.error('Error looking up preselected devices:', e);
		}
	}
});

const isOnline = (client: Client) => client.connection_state === 'connected' || !client.disconnected_at;
const clientLabel = (id: string) => {
	const client = clients.value.find(c => c.id === id);
	return client?.name || client?.hostname || id;
};

const allTags = computed(() => {
	const tags = new Set<string>();
	clients.value.forEach(client => (client.tags ?? []).forEach((tag: string) => tags.add(tag)));
	return [...tags].sort((a, b) => a.localeCompare(b));
});

const matchingClients = computed(() => {
	if (tagsValue.value.length === 0) return [];
	return clients.value.filter((client) => {
		const clientTags: string[] = client.tags ?? [];
		return tagsOperator.value === 'AND'
			? tagsValue.value.every(tag => clientTags.includes(tag))
			: tagsValue.value.some(tag => clientTags.includes(tag));
	});
});

const matchPreview = computed(() => {
	const names = matchingClients.value.slice(0, 6).map(c => c.name || c.id).join(', ');
	const more = matchingClients.value.length - 6;
	return more > 0 ? `${names} and ${more} more` : names;
});

const addLabel = computed(() => ({ clients: 'Add devices', groups: 'Add groups', tags: 'Add tags' })[mode.value]);
const addPlaceholder = computed(() => ({
	clients: 'Search by name or ID…',
	groups: 'Search groups…',
	tags: 'e.g. production',
})[mode.value]);

interface Suggestion { value: string; label: string; meta?: string; online?: boolean }
const suggestions = computed<Suggestion[]>(() => {
	const term = query.value.trim().toLowerCase();
	if (mode.value === 'clients') {
		return clients.value
			.filter(client => !selectedClientIds.value.includes(client.id))
			.filter(client => !term || [client.name, client.id, client.hostname].some(v => (v ?? '').toLowerCase().includes(term)))
			.slice(0, 50)
			.map(client => ({ value: client.id, label: client.name || client.hostname || client.id, online: isOnline(client) }));
	}
	if (mode.value === 'groups') {
		return groups.value
			.filter(group => !selectedGroupIds.value.includes(group.id))
			.filter(group => !term || group.id.toLowerCase().includes(term) || (group.description ?? '').toLowerCase().includes(term))
			.slice(0, 50)
			.map(group => ({ value: group.id, label: group.id, meta: `${group.num_clients ?? 0} device${group.num_clients === 1 ? '' : 's'}` }));
	}
	return allTags.value
		.filter(tag => !tagsValue.value.includes(tag) && (!term || tag.toLowerCase().includes(term)))
		.slice(0, 50)
		.map(tag => ({ value: tag, label: tag }));
});

watch([query, mode], () => {
	activeIndex.value = 0;
});
watch(mode, () => {
	query.value = '';
});

const move = (delta: number) => {
	isOpen.value = true;
	const total = suggestions.value.length;
	if (!total) return;
	activeIndex.value = (activeIndex.value + delta + total) % total;
};

const add = (value: string) => {
	if (!value) return;
	if (mode.value === 'clients' && !selectedClientIds.value.includes(value)) selectedClientIds.value.push(value);
	if (mode.value === 'groups' && !selectedGroupIds.value.includes(value)) selectedGroupIds.value.push(value);
	if (mode.value === 'tags' && !tagsValue.value.includes(value)) tagsValue.value.push(value);
	query.value = '';
};

const commit = () => {
	const pick = suggestions.value[activeIndex.value];
	if (pick) add(pick.value);
	else if (mode.value === 'tags' && query.value.trim()) add(query.value.trim());
};

const removeLastOnEmpty = () => {
	if (query.value) return;
	if (mode.value === 'clients') selectedClientIds.value.pop();
	else if (mode.value === 'groups') selectedGroupIds.value.pop();
	else tagsValue.value.pop();
};

const removeFrom = (list: Ref<string[]>, value: string) => {
	list.value = list.value.filter(item => item !== value);
};

const chips = computed(() => {
	if (mode.value === 'clients') {
		return selectedClientIds.value.map((id) => {
			const client = clients.value.find(c => c.id === id);
			return { key: `c-${id}`, label: clientLabel(id), online: client ? isOnline(client) : undefined, remove: () => removeFrom(selectedClientIds, id) };
		});
	}
	if (mode.value === 'groups') {
		return selectedGroupIds.value.map(id => ({ key: `g-${id}`, label: `group:${id}`, online: undefined, remove: () => removeFrom(selectedGroupIds, id) }));
	}
	return tagsValue.value.map(tag => ({ key: `t-${tag}`, label: `tag:${tag}`, online: undefined, remove: () => removeFrom(tagsValue, tag) }));
});

const target = computed(() => {
	if (mode.value === 'clients') {
		return { clientIds: selectedClientIds.value, groupIds: [], tags: null as JobClientTags | null };
	}
	if (mode.value === 'groups') {
		return { clientIds: [], groupIds: selectedGroupIds.value, tags: null as JobClientTags | null };
	}
	return {
		clientIds: [],
		groupIds: [],
		tags: tagsValue.value.length ? { tags: tagsValue.value, operator: tagsOperator.value } : null,
	};
});

const deviceCount = computed(() => {
	if (mode.value === 'clients') return selectedClientIds.value.length;
	if (mode.value === 'groups') {
		return groups.value
			.filter(group => selectedGroupIds.value.includes(group.id))
			.reduce((sum, group) => sum + (group.num_clients ?? 0), 0);
	}
	return matchingClients.value.length;
});

watch(target, value => emit('update:target', value), { immediate: true, deep: true });
watch(deviceCount, value => emit('update:deviceCount', value), { immediate: true });

defineExpose({ target, deviceCount });
</script>
