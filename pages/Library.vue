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

			<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
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
				<OpCheckbox v-model="showDeleted">
					Show deleted
				</OpCheckbox>
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
					:title="showDeleted ? 'No deleted entries' : 'Nothing saved yet'"
					:description="showDeleted ? 'Deleted entries show up here so you can undelete them.' : 'Save commands and scripts here, or with “Save to library” on the Execute page.'"
				>
					<AppButton
						v-if="!showDeleted"
						@click="itemModal?.openForCreate()"
					>
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
										v-for="col in ['Name', 'OS', 'Tags', 'Version', 'Updated']"
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
									:key="item.id"
									class="hover:bg-app-hover"
								>
									<td class="w-full max-w-0 border-b border-app-border-subtle py-3.5 pl-4 pr-3 align-middle text-[13px]">
										<div class="flex items-center gap-2">
											<span class="truncate font-medium text-app-text">{{ item.name }}</span>
											<span
												v-if="item.builtinKey"
												class="shrink-0 rounded-md bg-app-blue-bg px-2 py-0.5 text-xs font-medium text-app-blue"
											>Built-in</span>
											<span
												v-if="showDeleted"
												class="shrink-0 rounded-md bg-app-warn-bg px-2 py-0.5 text-xs font-medium text-app-warn"
											>Deleted</span>
										</div>
										<div
											v-if="item.description"
											class="mt-0.5 truncate text-xs text-app-text-3"
											:title="item.description"
										>
											{{ item.description }}
										</div>
									</td>
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle">
										<span
											v-for="os in item.os"
											:key="os"
											class="mr-1 inline-flex items-center rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
										>{{ LIBRARY_OS_LABELS[os] }}</span>
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
									<td class="whitespace-nowrap border-b border-app-border-subtle px-3 py-3.5 align-middle font-mono text-xs text-app-text-2">
										v{{ item.activeVersion }}
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
											v-if="showDeleted"
											variant="secondary"
											size="sm"
											:aria-label="`Undelete ${item.name}`"
											@click="undelete(item)"
										>
											<Undo2
												class="h-4 w-4"
												aria-hidden="true"
											/>
											Undelete
										</AppButton>
										<template v-else>
											<AppButton
												variant="ghost"
												size="sm"
												:aria-label="`${item.builtinKey ? 'View' : 'Edit'} ${item.name}`"
												@click="itemModal?.openForEdit(item)"
											>
												<Pencil
													class="h-4 w-4"
													aria-hidden="true"
												/>
												{{ item.builtinKey ? 'View' : 'Edit' }}
											</AppButton>
											<AppButton
												v-if="!item.builtinKey"
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
										</template>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<ul class="divide-y divide-app-border-subtle md:hidden">
						<li
							v-for="item in filteredItems"
							:key="item.id"
							class="flex flex-col gap-2 px-4 py-3.5"
						>
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<p class="min-w-0 truncate text-sm font-medium text-app-text">
										{{ item.name }}
									</p>
									<span
										v-for="os in item.os"
										:key="os"
										class="shrink-0 rounded-md bg-app-chip px-2 py-0.5 text-xs font-medium text-app-text-2"
									>{{ LIBRARY_OS_LABELS[os] }}</span>
									<span
										v-if="item.builtinKey"
										class="shrink-0 rounded-md bg-app-blue-bg px-2 py-0.5 text-xs font-medium text-app-blue"
									>Built-in</span>
								</div>
								<p
									v-if="item.description"
									class="mt-0.5 truncate text-xs text-app-text-3"
								>
									{{ item.description }}
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
									v{{ item.activeVersion }} · Updated {{ formatDate(item.updatedAt, 'YYYY-MM-DD') }}
								</span>
								<div class="flex gap-1">
									<AppButton
										v-if="showDeleted"
										variant="secondary"
										size="sm"
										:aria-label="`Undelete ${item.name}`"
										@click="undelete(item)"
									>
										Undelete
									</AppButton>
									<template v-else>
										<AppButton
											variant="secondary"
											size="sm"
											:aria-label="`${item.builtinKey ? 'View' : 'Edit'} ${item.name}`"
											@click="itemModal?.openForEdit(item)"
										>
											{{ item.builtinKey ? 'View' : 'Edit' }}
										</AppButton>
										<AppButton
											v-if="!item.builtinKey"
											variant="danger"
											size="sm"
											:aria-label="`Delete ${item.name}`"
											@click="triggerDelete(item)"
										>
											Delete
										</AppButton>
									</template>
								</div>
							</div>
						</li>
					</ul>
				</template>
			</section>
		</AppPage>
		<EntryEditorModal
			ref="itemModal"
			@saved="refresh"
		/>
		<Modal
			v-model="deleteConfirmOpen"
			:title="'Delete entry?'"
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
import { BookOpen, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-vue-next';
import EntryEditorModal from '~/components/library/EntryEditorModal.vue';
import OpCheckbox from '~/components/operate/OpCheckbox.vue';
import OpEmpty from '~/components/operate/OpEmpty.vue';
import { apiErrorMessage } from '~/utils/apiError';
import { LIBRARY_OS_LABELS, isConflict, useRunLibrary, type LibraryEntry } from '~/composables/useRunLibrary';

const snackbar = useSnackbar();
const library = useRunLibrary();

const search = ref('');
const showDeleted = ref(false);
const itemModal = ref<InstanceType<typeof EntryEditorModal> | null>(null);
const deleteConfirmOpen = ref(false);
const activeItem = ref<LibraryEntry | null>(null);

const items = ref<LibraryEntry[]>([]);
const pending = ref(false);
const loadError = ref('');

const refresh = async () => {
	pending.value = true;
	loadError.value = '';
	try {
		items.value = await library.listAll(showDeleted.value);
	}
	catch {
		loadError.value = 'The server didn’t return the saved commands and scripts.';
	}
	finally {
		pending.value = false;
	}
};
onMounted(refresh);
watch(showDeleted, refresh);

const filteredItems = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return items.value;
	return items.value.filter(item => item.name.toLowerCase().includes(term)
		|| item.os.some(os => LIBRARY_OS_LABELS[os].toLowerCase().includes(term))
		|| item.tags.some(tag => tag.toLowerCase().includes(term)));
});

const formatDate = (value: Date | string | undefined, format: string) => {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '—' : vueuseFormatDate(date, format);
};

const undelete = async (item: LibraryEntry) => {
	try {
		await library.undelete(item.id);
		snackbar.add({ type: 'success', text: `Restored ${item.name}` });
		await refresh();
	}
	catch (e) {
		snackbar.add({ type: 'error', text: apiErrorMessage(e) });
	}
};

const triggerDelete = (item: LibraryEntry) => {
	activeItem.value = item;
	deleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
	if (!activeItem.value) return;
	try {
		await library.remove(activeItem.value.id);
		snackbar.add({ type: 'success', text: 'Deleted from library' });
		deleteConfirmOpen.value = false;
		await refresh();
	}
	catch (e) {
		const item = activeItem.value;
		if (isConflict(e)) {
			// Used by schedules: name them.
			deleteConfirmOpen.value = false;
			const schedules = await library.usedBy(item.id).catch(() => []);
			const names = schedules.map(s => s.name).join(', ');
			snackbar.add({ type: 'error', text: names ? `${item.name} is used by schedules: ${names}. Remove it from them first.` : apiErrorMessage(e) });
			return;
		}
		snackbar.add({ type: 'error', text: `Failed to delete ${item.name}` });
	}
};
</script>
