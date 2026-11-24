<template>
	<!-- Group filter for the device list: All, Favorites and every client group, with counts. -->
	<HeadlessPopover
		v-slot="{ close }"
		class="relative"
	>
		<HeadlessPopoverButton
			:class="[
				'inline-flex h-10 max-w-[240px] items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition-colors',
				modelValue === 'all'
					? 'border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover'
					: 'border-app-accent bg-app-accent/10 text-app-text hover:bg-app-accent/15',
			]"
			:aria-label="`Group: ${current?.label ?? modelValue}`"
		>
			<Star
				v-if="modelValue === 'favorites'"
				class="h-4 w-4 flex-none"
				aria-hidden="true"
			/>
			<FolderTree
				v-else
				class="h-4 w-4 flex-none text-app-text-3"
				aria-hidden="true"
			/>
			<span class="truncate">{{ modelValue === 'all' ? 'All groups' : current?.label ?? modelValue }}</span>
			<span
				v-if="current"
				class="text-xs text-app-text-3"
			>{{ current.count }}</span>
			<ChevronDown
				class="h-4 w-4 flex-none text-app-text-3"
				aria-hidden="true"
			/>
		</HeadlessPopoverButton>
		<HeadlessPopoverPanel class="absolute left-0 z-40 mt-2 w-72 rounded-xl border border-app-border bg-app-surface p-1.5 shadow-lg focus:outline-none">
			<div
				v-if="options.length > 8"
				class="px-1 pb-1.5 pt-0.5"
			>
				<label
					:for="searchId"
					class="sr-only"
				>Find a group</label>
				<input
					:id="searchId"
					v-model="search"
					type="search"
					placeholder="Find a group…"
					class="h-9 w-full rounded-lg border border-app-border-strong bg-app-surface-2 px-2.5 text-[13px] text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
				>
			</div>
			<ul
				role="list"
				class="max-h-80 overflow-y-auto"
			>
				<li
					v-for="option in shown"
					:key="option.id"
				>
					<button
						type="button"
						:aria-pressed="modelValue === option.id"
						:title="option.description || undefined"
						:class="[
							'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-app-text hover:bg-app-hover',
							option.id === 'favorites' ? 'mb-1' : '',
						]"
						@click="pick(option.id, close)"
					>
						<Check
							:class="['h-4 w-4 flex-none', modelValue === option.id ? 'text-app-accent' : 'invisible']"
							aria-hidden="true"
						/>
						<span :class="['min-w-0 flex-1 truncate', option.id === 'all' || option.id === 'favorites' ? 'font-medium' : 'font-mono']">{{ option.label }}</span>
						<span class="text-xs text-app-text-3">{{ option.count }}</span>
					</button>
				</li>
				<li
					v-if="!shown.length"
					class="px-2.5 py-2 text-[13px] text-app-text-3"
				>
					No group matches “{{ search }}”.
				</li>
			</ul>
		</HeadlessPopoverPanel>
	</HeadlessPopover>
</template>

<script setup lang="ts">
import { Check, ChevronDown, FolderTree, Star } from 'lucide-vue-next';

export interface GroupOption {
	id: string;
	label: string;
	count: number;
	description?: string;
}

const props = defineProps<{
	modelValue: string;
	options: GroupOption[];
}>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const searchId = useId();
const search = ref('');
const current = computed(() => props.options.find(o => o.id === props.modelValue));
const shown = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return props.options;
	return props.options.filter(o => o.id === 'all' || o.label.toLowerCase().includes(term) || (o.description ?? '').toLowerCase().includes(term));
});

function pick(id: string, close: () => void) {
	emit('update:modelValue', id);
	search.value = '';
	close();
}
</script>
