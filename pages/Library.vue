<template>
	<new-page-wrapper>
		<AppPage
			title="Script library"
			description="Saved commands and scripts you can insert on the Execute page and on devices."
		>
			<template #actions>
				<AppButton @click="itemModal?.openForCreate()">
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					New entry
				</AppButton>
			</template>

			<div class="relative w-full min-w-0 sm:max-w-sm">
				<Search
					class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-3"
					aria-hidden="true"
				/>
				<input
					id="librarySearch"
					v-model="search"
					type="search"
					aria-label="Search the library"
					placeholder="Search by name, tag or type…"
					class="h-11 w-full rounded-[10px] border border-app-border-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-text-4 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/25"
				>
			</div>

			<section
				aria-label="Saved commands and scripts"
				class="overflow-hidden rounded-xl border border-app-border bg-app-surface"
			>
				<OpEmpty
					v-if="pending && !items.length"
					loading
					title="Loading…"
				/>
				<OpEmpty
					v-else-if="loadError"
					:icon="BookOpen"
					title="Couldn’t load the library"
					:description="loadError"
				>
					<AppButton
						variant="secondary"
						@click="refresh"
					>
						Try again
					</AppButton>
				</OpEmpty>
				<OpEmpty
					v-else-if="items.length === 0"
					:icon="BookOpen"
					title="Nothing saved yet"
					description="Save commands and scripts here, or with “Save to library” on the Execute page."
				>
					<AppButton @click="itemModal?.openForCreate()">
						<Plus
							class="h-4 w-4"
							aria-hidden="true"
						/>
						New entry
					</AppButton>
				</OpEmpty>
				<OpEmpty
					v-else-if="filteredItems.length === 0"
					:icon="Search"
					title="No matches"
					:description="`Nothing matches “${search}”.`"
				/>
				<template v-else>
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full min-w-[760px] border-collapse">
							<thead>
								<tr class="bg-app-surface-2">
									<th
										v-for="col in ['Name', 'Type', 'Tags', 'Timeout', 'Updated']"
										:key="col"
										scope="col"
										class="whitespace-nowrap border-b border-app-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3 first:pl-4"
									>
										{{ col }}
									</th>
									<th
										scope="col"
										class="border-b border-app-border px-3 py-2.5 pr-4"
									>
										<span class="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="item in filteredItems"
									:key="`${item.kind}:${item.id}`"
									class="hover:bg-app-hover"
								>
									<td class="w-full max-w-0 border-b border-app-border-subtle py-3.5 pl-4 pr-3 align-middle text-[13px]">
										<div class="truncate font-medium text-app-text">
											{{ item.name }}
										</div>
										<div
											class="mt-0.5 truncate font-mono text-xs text-app-text-3"
											:title="preview(item)"
										>
											{{ preview(item) }}
										</div>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle">
										<span class="inline-flex items-center gap-1.5 rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2">
											<component
												:is="item.kind === 'script' ? FileCode2 : SquareTerminal"
												class="h-3.5 w-3.5"
												aria-hidden="true"
											/>
											{{ runKindLabel(item.kind) }}
										</span>
									</td>
									<td class="border-b border-app-border-subtle px-3 py-3.5 align-middle">
										<div
											v-if="item.tags.length"
											class="flex max-w-[16rem] flex-wrap gap-1"
										>
											<span
												v-for="tag in item.tags"
												:key="tag"
												class="whitespace-nowrap rounded-md bg-app-chip px-2 py-0.5 font-mono text-xs text-app-text-2"
											>{{ tag }}</span>
										</div>
										<span
											v-else
											class="text-[13px] text-app-text-4"
										>—</span>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle font-mono text-[13px] text-app-text-2">
										{{ item.timeoutSec }} s
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle text-[13px] text-app-text-2">
										<span class="font-mono text-xs">{{ formatDate(item.updatedAt, 'YYYY-MM-DD HH:mm') }}</span>
										<div
											v-if="item.updatedBy"
											class="text-xs text-app-text-3"
										>
											by {{ item.updatedBy }}
										</div>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle py-3.5 pl-3 pr-4 text-right align-middle">
										<AppButton
											variant="ghost"
											size="sm"
											:aria-label="`Edit ${item.name}`"
											@click="itemModal?.openForEdit(item)"
										>
											<Pencil
												class="h-4 w-4"
												aria-hidden="true"
											/>
											Edit
										</AppButton>
										<AppButton
											variant="danger"
											size="sm"
											:aria-label="`Delete ${item.name}`"
											@click="triggerDelete(item)"
										>
											<Trash2
												class="h-4 w-4"
												aria-hidden="true"
											/>
										</AppButton>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="item in filteredItems"
							:key="`${item.kind}:${item.id}`"
							class="flex flex-col gap-2 px-4 py-3.5"
						>
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<p class="min-w-0 truncate text-sm font-medium text-app-text">
										{{ item.name }}
									</p>
									<span class="shrink-0 rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2">{{ runKindLabel(item.kind) }}</span>
								</div>
								<p class="mt-0.5 truncate font-mono text-xs text-app-text-3">
									{{ preview(item) }}
								</p>
							</div>
							<div
								v-if="item.tags.length"
								class="flex flex-wrap gap-1"
							>
								<span
									v-for="tag in item.tags"
									:key="tag"
									class="rounded-md bg-app-chip px-2 py-0.5 font-mono text-xs text-app-text-2"
								>{{ tag }}</span>
							</div>
							<div class="flex items-center justify-between gap-2">
								<span class="text-xs text-app-text-3">
									<span class="font-mono">{{ item.timeoutSec }} s</span> timeout · updated {{ formatDate(item.updatedAt, 'YYYY-MM-DD') }}
								</span>
								<div class="flex gap-1">
									<AppButton
										variant="secondary"
										size="sm"
										:aria-label="`Edit ${item.name}`"
										@click="itemModal?.openForEdit(item)"
									>
										Edit
									</AppButton>
									<AppButton
										variant="danger"
										size="sm"
										:aria-label="`Delete ${item.name}`"
										@click="triggerDelete(item)"
									>
										Delete
									</AppButton>
								</div>
							</div>
						</li>
					</ul>
				</template>
			</section>
		</AppPage>
		<LibraryItemModal
			ref="itemModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			:title="`Delete ${activeItem ? runKindLabel(activeItem.kind).toLowerCase() : 'entry'}?`"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDelete"
		>
			<p class="text-sm text-app-text-2">
				“<span class="font-medium text-app-text">{{ activeItem?.name }}</span>” will be removed from the library.
			</p>
		</Modal>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { formatDate as vueuseFormatDate } from '@vueuse/core';
import { BookOpen, FileCode2, Pencil, Plus, Search, SquareTerminal, Trash2 } from 'lucide-vue-next';
import LibraryItemModal from '~/components/custom/LibraryItemModal.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import { useRunLibrary, type LibraryEntry } from '~/composables/useRunLibrary';
import { runKindLabel } from '~/utils/runKind';

const snackbar = useSnackbar();
const library = useRunLibrary();

const search = ref('');
const itemModal = ref<InstanceType<typeof LibraryItemModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeItem = ref<LibraryEntry | null>(null);

const items = ref<LibraryEntry[]>([]);
const pending = ref(false);
const loadError = ref('');

const refresh = async () => {
	pending.value = true;
	loadError.value = '';
	try {
		items.value = await library.listAll();
	}
	catch {
		loadError.value = 'The server didn’t return the saved commands and scripts.';
	}
	finally {
		pending.value = false;
	}
};
onMounted(refresh);

const filteredItems = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return items.value;
	return items.value.filter(item => item.name.toLowerCase().includes(term)
		|| item.kind.includes(term)
		|| item.tags.some(tag => tag.toLowerCase().includes(term)));
});

const preview = (item: LibraryEntry) => item.code.split('\n').find(line => line.trim() && !line.startsWith('#!')) ?? item.code.split('\n')[0] ?? '';

const formatDate = (value: Date | string | undefined, format: string) => {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '—' : vueuseFormatDate(date, format);
};

const triggerDelete = (item: LibraryEntry) => {
	activeItem.value = item;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeItem.value) return;
	try {
		await library.remove(activeItem.value.id, activeItem.value.kind);
		snackbar.add({ type: 'success', text: 'Deleted from library' });
		deleteConfirmOpen.value = false;
		await refresh();
	}
	catch {
		snackbar.add({ type: 'error', text: `Failed to delete ${activeItem.value.name}` });
	}
};
</script>
