<template>
	<Modal
		v-model="internalIsOpen"
		title="Tags & Labels"
		ok-text="Close"
		cancel-text="Cancel"
		:show-cancel="true"
		@close="close"
		@ok="save"
	>
		<div class="relative w-full">
			<div
				v-if="isLoading"
				class="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-app-surface/70"
				role="status"
			>
				<Loader2
					class="h-8 w-8 animate-spin text-app-accent"
					aria-hidden="true"
				/>
				<span class="sr-only">Saving…</span>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<section aria-labelledby="tld-tags-heading">
					<div class="mb-2 flex items-center justify-between gap-3">
						<h3
							id="tld-tags-heading"
							class="flex items-center gap-2 text-[13px] font-semibold text-app-text-3"
						>
							<Tag
								class="h-4 w-4"
								aria-hidden="true"
							/>
							Tags
						</h3>
						<button
							type="button"
							class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-app-border-strong px-2.5 text-xs font-medium text-app-text-2 hover:bg-app-hover"
							@click="addTag"
						>
							<Plus
								class="h-3.5 w-3.5"
								aria-hidden="true"
							/>
							Add tag
						</button>
					</div>
					<ul class="flex flex-col">
						<li
							v-for="(tag, index) in modelValueClient?.tags"
							:key="index"
							class="flex min-h-11 items-center justify-between gap-2 border-t border-app-border-subtle py-1"
						>
							<span class="truncate rounded-md bg-app-chip px-2 py-1 text-xs font-medium text-app-text-2">{{ tag }}</span>
							<span class="flex flex-none items-center">
								<button
									type="button"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
									:aria-label="`Edit tag ${tag}`"
									@click="editTag(tag)"
								>
									<Pencil
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
								<button
									type="button"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-danger-bg hover:text-app-danger"
									:aria-label="`Delete tag ${tag}`"
									@click="deleteTag(tag)"
								>
									<Trash2
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
							</span>
						</li>
						<li
							v-if="!modelValueClient?.tags?.length"
							class="border-t border-app-border-subtle py-3 text-xs text-app-text-3"
						>
							No tags set
						</li>
					</ul>
				</section>
				<section aria-labelledby="tld-labels-heading">
					<div class="mb-2 flex items-center justify-between gap-3">
						<h3
							id="tld-labels-heading"
							class="flex items-center gap-2 text-[13px] font-semibold text-app-text-3"
						>
							<Tags
								class="h-4 w-4"
								aria-hidden="true"
							/>
							Labels
						</h3>
						<button
							type="button"
							class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-app-border-strong px-2.5 text-xs font-medium text-app-text-2 hover:bg-app-hover"
							@click="addLabel"
						>
							<Plus
								class="h-3.5 w-3.5"
								aria-hidden="true"
							/>
							Add label
						</button>
					</div>
					<ul class="flex flex-col">
						<li
							v-for="[key, value] in Object.entries(modelValueClient?.labels ?? {})"
							:key="key"
							class="flex min-h-11 items-center justify-between gap-2 border-t border-app-border-subtle py-1"
						>
							<span class="inline-flex min-w-0 items-center overflow-hidden rounded-md border border-app-border-strong text-xs font-medium text-app-text-2">
								<span class="truncate bg-app-chip px-2 py-1">{{ key }}</span>
								<span class="truncate px-2 py-1">{{ value }}</span>
							</span>
							<span class="flex flex-none items-center">
								<button
									type="button"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
									:aria-label="`Edit label ${key}`"
									@click="editLabel(key, value)"
								>
									<Pencil
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
								<button
									type="button"
									class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-danger-bg hover:text-app-danger"
									:aria-label="`Delete label ${key}`"
									@click="deleteLabel(key)"
								>
									<Trash2
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</button>
							</span>
						</li>
						<li
							v-if="!modelValueClient?.labels || Object.keys(modelValueClient.labels).length === 0"
							class="border-t border-app-border-subtle py-3 text-xs text-app-text-3"
						>
							No labels set
						</li>
					</ul>
				</section>
			</div>
			<form
				v-if="mode"
				class="mt-6 flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface-2 p-4 sm:flex-row sm:items-end"
				@submit.prevent
			>
				<div
					v-if="mode === 'label'"
					class="flex w-full flex-col gap-1.5 sm:w-2/5"
				>
					<label
						for="tld-label-key"
						class="text-[13px] font-medium text-app-text-2"
					>Label key</label>
					<input
						id="tld-label-key"
						v-model="currentLabelKey"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/30"
						type="text"
						autocomplete="off"
					>
				</div>
				<div
					v-if="mode === 'tag'"
					class="flex w-full flex-col gap-1.5"
				>
					<label
						for="tld-tag-name"
						class="text-[13px] font-medium text-app-text-2"
					>Tag name</label>
					<input
						id="tld-tag-name"
						v-model="currentTag"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/30"
						type="text"
						autocomplete="off"
					>
				</div>
				<div
					v-if="mode === 'label'"
					class="flex w-full flex-col gap-1.5 sm:w-3/5"
				>
					<label
						for="tld-label-value"
						class="text-[13px] font-medium text-app-text-2"
					>Label value</label>
					<input
						id="tld-label-value"
						v-model="currentLabelValue"
						class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface px-3 font-mono text-[13px] text-app-text focus:border-app-accent focus:outline-hidden focus:ring-2 focus:ring-app-accent/30"
						type="text"
						autocomplete="off"
					>
				</div>
				<AppButton
					type="submit"
					:disabled="isLoading"
					@click="handleSubmit"
				>
					<LoadingSpinner v-if="isLoading" />
					{{ modeActionText }}
				</AppButton>
			</form>
		</div>
	</Modal>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { Loader2, Pencil, Plus, Tag, Tags, Trash2 } from 'lucide-vue-next';
import type { Client } from '~/types';
import LoadingSpinner from '~/components/custom/loading-spinner/LoadingSpinner.vue';

const { $api } = useNuxtApp();
const props = defineProps({
	modelValue: Boolean,
	modelValueClient: Object as PropType<Client>,
});
const emit = defineEmits(['update:modelValue', 'update:modelValueClient', 'save']);
const internalIsOpen = ref(props.modelValue);
const internalClient = ref(props.modelValueClient);
const isLoading = ref(false);

const mode = ref<'tag' | 'label' | null>(null);
const action = ref<'create' | 'edit' | null>(null);

const currentTag = ref('');
const originalTag = ref('');
const currentLabelKey = ref('');
const currentLabelValue = ref('');
const originalLabelKey = ref('');

const modeActionText = computed(() => (action.value === 'create' ? 'Add' : 'Save'));

const editTag = (tag: string) => {
	originalTag.value = tag;
	currentTag.value = tag;
	mode.value = 'tag';
	action.value = 'edit';
};

const addTag = () => {
	currentTag.value = '';
	mode.value = 'tag';
	action.value = 'create';
};

const deleteTag = async (tag: string) => {
	const tags = internalClient.value?.tags;
	if (!tags) return;
	const index = tags.indexOf(tag);
	if (index === -1) return;

	isLoading.value = true;
	try {
		tags.splice(index, 1);
		await updateClientData();
	}
	finally {
		isLoading.value = false;
	}
};

const addLabel = () => {
	currentLabelKey.value = '';
	currentLabelValue.value = '';
	mode.value = 'label';
	action.value = 'create';
};

const editLabel = (key: string, value: string) => {
	originalLabelKey.value = key;
	currentLabelKey.value = key;
	currentLabelValue.value = value;
	mode.value = 'label';
	action.value = 'edit';
};

const deleteLabel = async (key: string) => {
	const labels = internalClient.value?.labels;
	if (!internalClient.value || !labels?.[key]) return;
	isLoading.value = true;
	try {
		internalClient.value.labels = Object.fromEntries(Object.entries(labels).filter(([k]) => k !== key));
		await updateClientData();
	}
	finally {
		isLoading.value = false;
	}
};

const handleSubmit = async () => {
	if (mode.value === 'tag') {
		await handleTagAction();
	}
	else if (mode.value === 'label') {
		await handleLabelAction();
	}
};

const handleTagAction = async () => {
	if (!currentTag.value) return;
	isLoading.value = true;
	try {
		if (action.value === 'create') {
			internalClient.value?.tags.push(currentTag.value);
		}
		else if (action.value === 'edit') {
			if (!internalClient.value) return;
			const index = internalClient.value.tags.indexOf(originalTag.value);
			if (index !== -1) internalClient.value.tags[index] = currentTag.value;
		}
		await updateClientData();
		resetTagForm();
	}
	finally {
		isLoading.value = false;
	}
};

const handleLabelAction = async () => {
	if (!currentLabelKey.value || !currentLabelValue.value) return;

	isLoading.value = true;
	try {
		// Check if key has changed
		if (!internalClient.value) return;
		let labels = { ...internalClient.value.labels };
		if (originalLabelKey.value && currentLabelKey.value !== originalLabelKey.value) {
			const originalKey = originalLabelKey.value;
			labels = Object.fromEntries(Object.entries(labels).filter(([k]) => k !== originalKey));
		}
		labels[currentLabelKey.value] = currentLabelValue.value;
		internalClient.value.labels = labels;
		await updateClientData();
		resetLabelForm();
	}
	finally {
		isLoading.value = false;
	}
};

const resetTagForm = () => {
	currentTag.value = '';
	originalTag.value = '';
	mode.value = null;
	action.value = null;
};

const resetLabelForm = () => {
	currentLabelKey.value = '';
	currentLabelValue.value = '';
	originalLabelKey.value = '';
	mode.value = null;
	action.value = null;
};
const updateClientData = async () => {
	try {
		await $api.clients.updateTagsLabel(internalClient.value as Client);
	}
	catch (e) {
		console.error(e);
	}
};

watch(() => props.modelValue, (newValue) => {
	internalIsOpen.value = newValue;
});

watch(() => props.modelValueClient, (newValue) => {
	internalClient.value = newValue;
});

watch(internalIsOpen, (newValue) => {
	emit('update:modelValue', newValue);
});
watch(internalClient, (newClient) => {
	emit('update:modelValueClient', newClient);
});
const save = () => {
	internalIsOpen.value = false;
};
const close = () => {
	internalIsOpen.value = false;
};
</script>

<style scoped>

</style>
