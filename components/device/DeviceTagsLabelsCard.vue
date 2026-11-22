<template>
	<AppCard title="Tags & labels">
		<template #actions>
			<AppButton
				variant="secondary"
				size="sm"
				@click="openTagsLabel"
			>
				<Pencil
					class="h-3.5 w-3.5"
					aria-hidden="true"
				/>
				Edit
			</AppButton>
		</template>
		<div
			v-if="tags.length || labels.length"
			class="flex flex-wrap gap-1.5"
		>
			<span
				v-for="(tag, index) in tags"
				:key="index"
				class="inline-flex items-center gap-1 rounded-md border border-app-border-strong bg-app-surface px-2 py-[3px] text-xs font-medium text-app-text-2"
			>
				<Tag
					class="h-3 w-3 text-app-text-3"
					aria-hidden="true"
				/>
				{{ tag }}
			</span>
			<span
				v-for="label in labels"
				:key="label[0]"
				class="inline-flex overflow-hidden rounded-md border border-app-border-strong text-xs font-medium"
			>
				<span class="bg-app-chip px-2 py-[3px] font-mono text-app-text-2">{{ label[0] }}</span>
				<span class="bg-app-surface px-2 py-[3px] font-mono text-app-text">{{ label[1] }}</span>
			</span>
		</div>
		<p
			v-else
			class="text-[13px] text-app-text-3"
		>
			No tags or labels yet.
		</p>
		<TagsLabelDialog
			v-model="isModalOpen"
			:model-value-client="client"
		/>
	</AppCard>
</template>

<script setup>
import { Pencil, Tag } from 'lucide-vue-next';
import TagsLabelDialog from '~/components/device/TagsLabelDialog.vue';

const props = defineProps({
	client: {
		type: Object,
		default: () => ({}),
	},
});
const isModalOpen = ref(false);
// Follows the prop, so the card updates when the device loads or is replaced in the store.
const internalClient = computed(() => props.client);
const labels = computed(() => {
	const l = internalClient.value?.labels;
	if (!l) return [];
	return Object.keys(l).map(key => [key, l[key]]);
});

const tags = computed(() => {
	const t = internalClient.value?.tags;
	if (!t) return [];
	return t;
});
const openTagsLabel = () => {
	isModalOpen.value = true;
};
</script>
