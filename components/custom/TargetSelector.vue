<template>
	<div class="flex h-full flex-col text-white">
		<div class="flex gap-4 border-b border-[#133B66] pb-2">
			<button
				v-for="option in modeOptions"
				:key="option.value"
				type="button"
				class="text-sm"
				:class="mode === option.value ? 'font-semibold primary-text' : 'text-gray-300'"
				@click="mode = option.value"
			>
				{{ option.label }}
			</button>
		</div>
		<div
			v-if="mode === 'clients'"
			class="mt-2 flex flex-1 flex-col overflow-hidden"
		>
			<input
				v-model="clientSearch"
				type="text"
				placeholder="Search clients..."
				class="mb-2 h-9 w-full rounded border-none bg-white bg-opacity-10 px-2 text-sm text-white placeholder-gray-400 focus:outline-none"
			>
			<div class="min-h-[160px] flex-1 overflow-y-auto rounded bg-white bg-opacity-5">
				<label
					v-for="client in filteredClients"
					:key="client.id"
					class="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-white hover:bg-opacity-10"
				>
					<input
						type="checkbox"
						:checked="selectedClientIds.includes(client.id)"
						class="h-[14px] w-[14px] rounded"
						@change="toggleClient(client.id)"
					>
					{{ client.name || client.id }}
				</label>
				<p
					v-if="filteredClients.length === 0"
					class="p-2 text-xs text-gray-400"
				>
					No clients found
				</p>
			</div>
			<p class="mt-1 text-xs text-gray-400">
				{{ selectedClientIds.length }} client(s) selected
			</p>
		</div>
		<div
			v-else-if="mode === 'groups'"
			class="mt-2 flex flex-1 flex-col overflow-hidden"
		>
			<div class="min-h-[160px] flex-1 overflow-y-auto rounded bg-white bg-opacity-5">
				<label
					v-for="group in groups"
					:key="group.id"
					class="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-white hover:bg-opacity-10"
				>
					<input
						type="checkbox"
						:checked="selectedGroupIds.includes(group.id)"
						class="h-[14px] w-[14px] rounded"
						@change="toggleGroup(group.id)"
					>
					{{ group.id }} <span class="text-gray-400">({{ group.num_clients }} clients)</span>
				</label>
				<p
					v-if="groups.length === 0"
					class="p-2 text-xs text-gray-400"
				>
					No groups defined
				</p>
			</div>
		</div>
		<div
			v-else
			class="mt-2 flex flex-1 flex-col overflow-hidden"
		>
			<ExecutionTags
				v-model="tagsValue"
				:available-tags="allTags"
			/>
			<div class="mt-2 flex items-center gap-3 text-sm">
				<span>Match</span>
				<label class="flex items-center gap-1">
					<input
						v-model="tagsOperator"
						type="radio"
						value="AND"
					>All tags
				</label>
				<label class="flex items-center gap-1">
					<input
						v-model="tagsOperator"
						type="radio"
						value="OR"
					>Any tag
				</label>
			</div>
			<p class="mt-3 text-xs text-gray-400">
				{{ tagsValue.length > 0 ? `${matchingClients.length} matching host(s)` : 'Enter a tag to see which hosts match' }}
			</p>
			<div
				v-if="tagsValue.length > 0"
				class="mt-1 min-h-[120px] flex-1 overflow-y-auto rounded bg-white bg-opacity-5"
			>
				<div
					v-for="client in matchingClients"
					:key="client.id"
					class="px-2 py-1.5 text-sm"
				>
					{{ client.name || client.id }}
				</div>
				<p
					v-if="matchingClients.length === 0"
					class="p-2 text-xs text-gray-400"
				>
					No hosts match these tags
				</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import ExecutionTags from '~/components/custom/ExecutionTags.vue';
import type { Client, ClientGroup, JobClientTags } from '~/types';

const props = defineProps({
	initial: {
		type: Object as () => { clientIds: string[]; groupIds: string[]; tags: JobClientTags | null } | null,
		default: null,
	},
});
const emit = defineEmits(['update:target']);

const { $api } = useNuxtApp();

const modeOptions: { value: 'clients' | 'groups' | 'tags'; label: string }[] = [
	{ value: 'clients', label: 'Individual clients' },
	{ value: 'groups', label: 'Client groups' },
	{ value: 'tags', label: 'Clients by tags' },
];
const initialMode = (): 'clients' | 'groups' | 'tags' => {
	if (props.initial?.groupIds?.length) return 'groups';
	if (props.initial?.tags) return 'tags';
	return 'clients';
};
const mode = ref<'clients' | 'groups' | 'tags'>(initialMode());

const clients = ref<Client[]>([]);
const groups = ref<ClientGroup[]>([]);
const clientSearch = ref('');
const selectedClientIds = ref<string[]>(props.initial?.clientIds ?? []);
const selectedGroupIds = ref<string[]>(props.initial?.groupIds ?? []);
const tagsValue = ref<string[]>(props.initial?.tags?.tags ?? []);
const tagsOperator = ref<'AND' | 'OR'>(props.initial?.tags?.operator ?? 'AND');

onMounted(async () => {
	const [clientsResponse, groupsResponse] = await Promise.all([
		$api.clients.listClients(),
		$api.groups.listGroups(),
	]);
	clients.value = clientsResponse.data;
	groups.value = groupsResponse.data;
});

const filteredClients = computed(() => {
	if (!clientSearch.value) return clients.value;
	const term = clientSearch.value.toLowerCase();
	return clients.value.filter(client => (client.name ?? client.id).toLowerCase().includes(term));
});

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

const toggleClient = (id: string) => {
	const index = selectedClientIds.value.indexOf(id);
	if (index === -1) selectedClientIds.value.push(id);
	else selectedClientIds.value.splice(index, 1);
};
const toggleGroup = (id: string) => {
	const index = selectedGroupIds.value.indexOf(id);
	if (index === -1) selectedGroupIds.value.push(id);
	else selectedGroupIds.value.splice(index, 1);
};

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

watch(target, value => emit('update:target', value), { immediate: true, deep: true });

defineExpose({ target });
</script>
