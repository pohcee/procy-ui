<template>
	<new-page-wrapper>
		<AppPage
			title="Devices"
			description="Every client connected to this server. Select one to inspect it, run commands or open tunnels."
		>
			<template #actions>
				<AppButton
					variant="secondary"
					@click="openAddClientModal"
				>
					<Plus
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Add device
				</AppButton>
				<AppButton to="/execute">
					<Terminal
						class="h-4 w-4"
						aria-hidden="true"
					/>
					Run command
				</AppButton>
			</template>

			<NoClients v-if="loaded && totalCount === 0 && !loadError" />

			<template v-else>
				<!-- Summary tiles (tablet/desktop) -->
				<div class="hidden gap-4 md:grid md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
					<div class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
						<div class="text-[13px] font-medium text-app-text-3">
							Total devices
						</div>
						<div class="mt-1.5 text-[28px] font-bold tracking-tight text-app-text">
							{{ loaded ? stats.total : '–' }}
						</div>
					</div>
					<div class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
						<div class="flex items-center gap-2 text-[13px] font-medium text-app-text-3">
							<span
								class="h-2 w-2 rounded-full bg-[#22C55E]"
								aria-hidden="true"
							/>Online
						</div>
						<div class="mt-1.5 text-[28px] font-bold tracking-tight text-app-text">
							{{ loaded ? stats.online : '–' }}
						</div>
					</div>
					<div class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4">
						<div class="flex items-center gap-2 text-[13px] font-medium text-app-text-3">
							<span
								class="h-2 w-2 rounded-full border-2 border-app-text-4"
								aria-hidden="true"
							/>Offline
						</div>
						<div class="mt-1.5 text-[28px] font-bold tracking-tight text-app-text">
							{{ loaded ? stats.offline : '–' }}
						</div>
					</div>
					<div
						v-if="stats.reportingUpdates"
						class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4"
					>
						<div class="text-[13px] font-medium text-app-text-3">
							Security updates pending
						</div>
						<div :class="['mt-1.5 text-[28px] font-bold tracking-tight', stats.security ? 'text-app-warn' : 'text-app-text']">
							{{ stats.security }}
						</div>
					</div>
					<button
						v-if="newest"
						type="button"
						class="rounded-xl border border-app-border bg-app-surface px-[18px] py-4 text-left hover:bg-app-hover"
						:title="`Show devices whose client is older than ${newest}`"
						@click="filters.version = 'outdated'"
					>
						<div class="text-[13px] font-medium text-app-text-3">
							Outdated clients
						</div>
						<div :class="['mt-1.5 text-[28px] font-bold tracking-tight', stats.outdated ? 'text-app-warn' : 'text-app-text']">
							{{ stats.outdated }}
						</div>
						<div class="mt-0.5 text-xs text-app-text-3">
							newest is <span class="font-mono">{{ newest }}</span>
						</div>
					</button>
				</div>

				<!-- Device list card -->
				<section
					aria-label="Device list"
					class="rounded-xl border border-app-border bg-app-surface"
				>
					<!-- Toolbar -->
					<div class="flex flex-wrap items-center gap-2.5 border-b border-app-border px-4 py-3.5">
						<div class="flex h-10 min-w-0 flex-1 basis-full items-center gap-2 rounded-[10px] border border-app-border-strong bg-app-surface px-3 sm:flex-none sm:basis-[200px] xl:basis-[220px] 2xl:basis-[280px]">
							<Search
								class="h-4 w-4 flex-none text-app-text-3"
								aria-hidden="true"
							/>
							<label
								for="device-filter"
								class="sr-only"
							>Search by name, ID, IP, group, tag, OS or client version</label>
							<input
								id="device-filter"
								v-model="filters.q"
								type="search"
								placeholder="Search name, ID, IP, tag…"
								class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-app-text outline-none placeholder:text-app-text-4 focus:ring-0"
							>
						</div>
						<DeviceGroupPicker
							v-model="filters.group"
							:options="groupOptions"
						/>
						<OpSegmented
							v-model="filters.status"
							:options="statusOptions"
							label="Filter by status"
							size="sm"
						/>
						<button
							type="button"
							:aria-expanded="panelOpen"
							aria-controls="device-filter-panel"
							:class="[
								'inline-flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition-colors',
								panelOpen || panelCount
									? 'border-app-accent bg-app-accent/10 text-app-text hover:bg-app-accent/15'
									: 'border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover',
							]"
							@click="panelOpen = !panelOpen"
						>
							<SlidersHorizontal
								class="h-4 w-4"
								aria-hidden="true"
							/>
							Filters
							<span
								v-if="panelCount"
								class="rounded-md bg-app-accent px-1.5 text-xs font-semibold text-white"
							>{{ panelCount }}</span>
							<ChevronDown
								:class="['h-4 w-4 text-app-text-3 transition-transform', panelOpen ? 'rotate-180' : '']"
								aria-hidden="true"
							/>
						</button>
						<div class="ml-auto flex items-center gap-2.5">
							<button
								type="button"
								aria-label="Reload the device list (filters are kept)"
								title="Reload the device list (filters are kept)"
								class="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover"
								@click="refresh"
							>
								<RefreshCw
									:class="['h-4 w-4', loading ? 'animate-spin' : '']"
									aria-hidden="true"
								/>
							</button>
							<HeadlessMenu
								as="div"
								class="relative"
							>
								<HeadlessMenuButton
									aria-label="Device list settings"
									title="Device list settings"
									class="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover"
								>
									<Settings2
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</HeadlessMenuButton>
								<HeadlessMenuItems class="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-app-border bg-app-surface p-1.5 shadow-lg focus:outline-none">
									<div class="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3">
										Row density
									</div>
									<HeadlessMenuItem
										v-for="option in densityOptions"
										:key="option.id"
										v-slot="{ active }"
									>
										<button
											type="button"
											role="menuitemradio"
											:aria-checked="density === option.id"
											:class="['flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-left text-sm text-app-text', active ? 'bg-app-hover' : '']"
											@click="density = option.id"
										>
											<Check
												:class="['h-4 w-4', density === option.id ? 'text-app-accent' : 'invisible']"
												aria-hidden="true"
											/>
											{{ option.label }}
										</button>
									</HeadlessMenuItem>
								</HeadlessMenuItems>
							</HeadlessMenu>
						</div>
					</div>

					<!-- More filters (expandable) -->
					<div
						v-show="panelOpen"
						id="device-filter-panel"
						class="grid gap-x-8 gap-y-4 border-b border-app-border bg-app-surface-2 px-4 py-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]"
					>
						<fieldset class="min-w-0">
							<legend class="mb-1.5 text-[13px] font-medium text-app-text-2">
								Platform
							</legend>
							<div class="flex flex-wrap gap-1.5">
								<button
									v-for="p in platformOptions"
									:key="p.value"
									type="button"
									:aria-pressed="filters.platforms.includes(p.value)"
									:class="toggleChipClass(filters.platforms.includes(p.value))"
									@click="toggleIn('platforms', p.value)"
								>
									{{ p.label }}<span class="text-xs opacity-80">{{ p.count }}</span>
								</button>
							</div>
						</fieldset>
						<div class="min-w-0">
							<ThemedSelect
								id="device-version-filter"
								:model-value="filters.version || 'any'"
								:options="versionOptions"
								label="Client version"
								@update:model-value="filters.version = $event === 'any' ? '' : String($event)"
							/>
						</div>
						<div class="min-w-0">
							<ThemedSelect
								id="device-updates-filter"
								:model-value="filters.updates"
								:options="updatesOptions"
								label="Updates"
								@update:model-value="filters.updates = $event"
							/>
						</div>
						<fieldset class="min-w-0">
							<legend class="mb-1.5 text-[13px] font-medium text-app-text-2">
								Tags <span class="font-normal text-app-text-3">(devices with all selected)</span>
							</legend>
							<div
								v-if="tagOptions.length"
								class="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
							>
								<button
									v-for="t in tagOptions"
									:key="t.value"
									type="button"
									:aria-pressed="filters.tags.includes(t.value)"
									:class="toggleChipClass(filters.tags.includes(t.value))"
									@click="toggleIn('tags', t.value)"
								>
									{{ t.value }}<span class="text-xs opacity-80">{{ t.count }}</span>
								</button>
							</div>
							<p
								v-else
								class="text-[13px] text-app-text-3"
							>
								No device has tags.
							</p>
						</fieldset>
					</div>

					<!-- Active filters -->
					<div
						v-if="chips.length"
						class="flex flex-wrap items-center gap-1.5 border-b border-app-border-subtle px-4 py-2.5"
						role="group"
						aria-label="Active filters"
					>
						<span
							v-for="chip in chips"
							:key="chip.key"
							class="inline-flex h-7 max-w-full items-center gap-1 rounded-lg bg-app-chip pl-2.5 pr-1 text-xs font-medium text-app-text"
						>
							<span class="truncate">{{ chip.label }}</span>
							<button
								type="button"
								class="inline-flex h-5 w-5 flex-none items-center justify-center rounded text-app-text-2 hover:bg-app-hover hover:text-app-text"
								:aria-label="`Remove filter ${chip.label}`"
								@click="Object.assign(filters, removeFilterChip(filters, chip))"
							>
								<X
									class="h-3.5 w-3.5"
									aria-hidden="true"
								/>
							</button>
						</span>
						<button
							type="button"
							class="ml-1 text-xs font-medium text-app-link hover:underline"
							@click="clearFilters"
						>
							Clear all
						</button>
					</div>

					<!-- Selection bar -->
					<div
						v-if="selectedIds.length"
						class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-app-border bg-app-accent/5 px-4 py-2.5 text-[13px]"
						role="region"
						aria-label="Selected devices"
					>
						<span class="font-semibold text-app-text">{{ selectedIds.length }} selected</span>
						<span
							v-if="hiddenSelectedCount"
							class="text-app-text-3"
						>{{ hiddenSelectedCount }} hidden by filters</span>
						<button
							v-if="!allVisibleSelected && rows.length"
							type="button"
							class="font-medium text-app-link hover:underline"
							@click="selectVisible(true)"
						>
							Select all {{ rows.length }} shown
						</button>
						<button
							type="button"
							class="font-medium text-app-link hover:underline"
							@click="selectedIds = []"
						>
							Clear selection
						</button>
						<span class="ml-auto flex flex-wrap items-center gap-3">
							<span
								v-if="selectedOffline"
								class="text-app-text-3"
							>{{ selectedOnlineIds.length ? `${selectedOffline} offline ${selectedOffline === 1 ? 'device is' : 'devices are'} left out` : 'All selected devices are offline' }}</span>
							<AppButton
								size="sm"
								:disabled="!selectedOnlineIds.length"
								@click="runOnSelection"
							>
								<Terminal
									class="h-4 w-4"
									aria-hidden="true"
								/>
								Run command on {{ selectedOnlineIds.length }}
							</AppButton>
						</span>
					</div>

					<!-- Phone summary line -->
					<div
						v-if="loaded"
						class="border-b border-app-border-subtle px-4 py-2.5 text-[13px] text-app-text-3 md:hidden"
					>
						{{ stats.online }} online · {{ stats.offline }} offline<template v-if="stats.security">
							· <span class="font-semibold text-app-warn">{{ stats.security }} security update{{ stats.security === 1 ? '' : 's' }}</span>
						</template>
					</div>

					<!-- Table (tablet/desktop) -->
					<div
						v-if="rows.length"
						class="hidden overflow-x-auto md:block"
					>
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr class="bg-app-surface-2 text-left">
									<th
										scope="col"
										class="w-10 border-b border-app-border py-2.5 pl-4 pr-1"
									>
										<input
											type="checkbox"
											class="h-[18px] w-[18px] cursor-pointer rounded align-middle accent-app-accent"
											:checked="allVisibleSelected"
											:indeterminate="someVisibleSelected && !allVisibleSelected"
											:aria-label="allVisibleSelected ? 'Deselect the devices shown' : 'Select the devices shown'"
											@change="selectVisible(!allVisibleSelected)"
										>
									</th>
									<th
										v-for="col in columns"
										:key="col.id"
										scope="col"
										:aria-sort="col.sort && sort.key === col.sort ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined"
										:class="['whitespace-nowrap border-b border-app-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3', col.class]"
									>
										<button
											v-if="col.sort"
											type="button"
											:class="['group inline-flex items-center gap-1 align-middle uppercase tracking-[0.04em] hover:text-app-text', sort.key === col.sort ? 'text-app-text' : '', col.align === 'right' ? 'flex-row-reverse' : '']"
											:title="`Sort by ${col.label.toLowerCase()}`"
											@click="toggleSort(col.sort)"
										>
											{{ col.label }}
											<component
												:is="sort.key !== col.sort ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown"
												:class="['h-3.5 w-3.5', sort.key === col.sort ? '' : 'opacity-0 group-hover:opacity-60']"
												aria-hidden="true"
											/>
										</button>
										<span
											v-else
											:class="col.id === 'actions' ? 'sr-only' : ''"
										>{{ col.label }}</span>
									</th>
								</tr>
							</thead>
							<tbody>
								<template
									v-for="row in rows"
									:key="row.client.id"
								>
									<tr :class="['hover:bg-app-hover', row.selected ? 'bg-app-accent/5' : '']">
										<td :class="['border-b border-app-border-subtle pl-4 pr-1', cellPad, row.expanded ? 'border-b-0' : '']">
											<input
												type="checkbox"
												class="h-[18px] w-[18px] cursor-pointer rounded align-middle accent-app-accent"
												:checked="row.selected"
												:aria-label="`Select ${row.client.name || row.client.id}`"
												@change="toggleSelected(row.client.id)"
											>
										</td>
										<td :class="['w-full min-w-[160px] max-w-0 xl:min-w-[180px] border-b border-app-border-subtle px-3', cellPad, row.expanded ? 'border-b-0' : '']">
											<div class="flex min-w-0 items-center gap-3">
												<ClientIcon
													:os-full-name="row.client.os_full_name"
													:os-kernel="row.client.os_kernel"
													:os-family="row.client.os_family"
													:os="row.client.os"
													:tile="density === 'condensed' ? 28 : 36"
												/>
												<div class="min-w-0">
													<div class="flex items-center gap-1.5">
														<NuxtLink
															:to="`/dashboard/${row.client.id}`"
															class="truncate font-mono text-sm font-medium text-app-text hover:text-app-link hover:underline"
															:title="`ID ${row.client.id}`"
														>
															{{ row.client.name || row.client.id }}
														</NuxtLink>
														<Star
															v-if="row.favorite"
															class="h-3.5 w-3.5 flex-none fill-[#D97706] text-[#D97706]"
															role="img"
															aria-label="Favorite"
														/>
													</div>
													<div
														v-if="density !== 'condensed'"
														class="mt-0.5 truncate text-xs text-app-text-3"
														:title="row.os || undefined"
													>
														{{ row.os || '—' }}
													</div>
													<div
														v-if="density === 'spacious' && row.client.tags?.length"
														class="mt-1 flex flex-wrap gap-1"
													>
														<span
															v-for="tag in row.client.tags"
															:key="tag"
															class="rounded border border-app-border-strong px-1.5 text-[11px] text-app-text-3"
														>{{ tag }}</span>
													</div>
												</div>
											</div>
										</td>
										<td :class="['whitespace-nowrap border-b border-app-border-subtle px-3', cellPad, row.expanded ? 'border-b-0' : '']">
											<span :class="['inline-flex items-center gap-2 text-[13px] font-medium', row.online ? 'text-app-ok' : 'text-app-text-3']">
												<span
													aria-hidden="true"
													:class="['h-2 w-2 rounded-full', row.online ? 'bg-[#22C55E]' : 'border-2 border-app-text-4']"
												/>
												{{ row.statusText }}
											</span>
											<div
												v-if="row.updates.tone === 'security' || row.updates.tone === 'pending'"
												:class="['mt-0.5 text-xs xl:hidden', updatesToneClass[row.updates.tone]]"
											>
												{{ row.updates.text }}
											</div>
										</td>
										<td :class="['whitespace-nowrap border-b border-app-border-subtle px-3 font-mono text-[13px] text-app-text-2', cellPad, row.expanded ? 'border-b-0' : '']">
											{{ row.ip || '—' }}
										</td>
										<td :class="['hidden border-b border-app-border-subtle px-3 min-[1400px]:table-cell', cellPad, row.expanded ? 'border-b-0' : '']">
											<div class="flex max-w-[10rem] items-center gap-1.5 2xl:max-w-[14rem]">
												<button
													v-if="row.firstGroup"
													type="button"
													:aria-label="`Show group ${row.firstGroup}`"
													:title="row.firstGroup"
													class="min-w-0 truncate whitespace-nowrap rounded-md bg-app-chip px-2 py-[3px] font-mono text-xs font-medium text-app-text-2 hover:text-app-link"
													@click="filters.group = row.firstGroup"
												>
													{{ row.firstGroup }}
												</button>
												<button
													v-if="row.moreGroups.length"
													type="button"
													:title="row.moreGroups.join(', ')"
													:aria-label="`${row.moreGroups.length} more groups: ${row.moreGroups.join(', ')}. Show details`"
													class="flex-none whitespace-nowrap rounded-md border border-app-border-strong px-1.5 py-[2px] text-xs font-medium text-app-text-3 hover:text-app-text"
													@click="toggleExpanded(row.client.id)"
												>
													+{{ row.moreGroups.length }}
												</button>
												<span
													v-if="!row.firstGroup"
													class="text-[13px] text-app-text-4"
												>—</span>
											</div>
										</td>
										<td :class="['hidden whitespace-nowrap border-b border-app-border-subtle px-3 font-mono text-[13px] lg:table-cell', cellPad, row.expanded ? 'border-b-0' : '']">
											<span
												v-if="row.client.version"
												:class="['inline-flex items-center gap-1', row.outdated ? 'font-medium text-app-warn' : 'text-app-text-2']"
												:title="row.outdated ? `Older than the newest client in this fleet (${newest})` : undefined"
											>
												<CircleArrowUp
													v-if="row.outdated"
													class="h-3.5 w-3.5"
													aria-hidden="true"
												/>
												{{ row.client.version }}
												<span
													v-if="row.outdated"
													class="sr-only"
												>(outdated)</span>
											</span>
											<span
												v-else
												class="text-app-text-4"
											>—</span>
										</td>
										<td :class="['hidden whitespace-nowrap border-b border-app-border-subtle px-3 text-right xl:table-cell', cellPad, row.expanded ? 'border-b-0' : '']">
											<span
												v-if="!row.client.updates_status"
												class="text-[13px] text-app-text-4"
												:title="row.updates.text"
											>n/a</span>
											<UpdatesCount
												v-else
												:count="row.updates.pending"
												kind="updates"
											/>
										</td>
										<td :class="['hidden whitespace-nowrap border-b border-app-border-subtle px-3 text-right xl:table-cell', cellPad, row.expanded ? 'border-b-0' : '']">
											<span
												v-if="!row.client.updates_status"
												class="text-[13px] text-app-text-4"
												:title="row.updates.text"
											>n/a</span>
											<UpdatesCount
												v-else
												:count="row.updates.security"
												kind="security"
											/>
										</td>
										<td :class="['whitespace-nowrap border-b border-app-border-subtle pl-3 pr-4 text-right', cellPad, row.expanded ? 'border-b-0' : '']">
											<div class="inline-flex items-center">
												<button
													type="button"
													:aria-expanded="row.expanded"
													:aria-label="`${row.expanded ? 'Hide' : 'Show'} details of ${row.client.name || row.client.id}`"
													:title="row.expanded ? 'Hide details' : 'Show details'"
													class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-2 hover:bg-app-hover hover:text-app-text"
													@click="toggleExpanded(row.client.id)"
												>
													<ChevronDown
														:class="['h-4 w-4 transition-transform', row.expanded ? 'rotate-180' : '']"
														aria-hidden="true"
													/>
												</button>
												<DeviceActionsMenu
													:device="row.client"
													list
													small
													@action="onRowAction(row.client, $event)"
												/>
											</div>
										</td>
									</tr>
									<tr
										v-if="row.expanded"
										:class="row.selected ? 'bg-app-accent/5' : ''"
									>
										<td class="border-b border-app-border-subtle" />
										<td
											:colspan="columns.length"
											class="border-b border-app-border-subtle px-3 pb-4 pt-1"
										>
											<DeviceRowDetails
												:client="row.client"
												:newest="newest"
												@copy-id="onRowAction(row.client, 'copy-id')"
												@group="filters.group = $event"
												@tag="addTagFilter"
											/>
										</td>
									</tr>
								</template>
							</tbody>
						</table>
					</div>

					<!-- Card list (phone) -->
					<ul
						v-if="rows.length"
						class="flex flex-col md:hidden"
					>
						<li
							v-for="row in rows"
							:key="row.client.id"
						>
							<NuxtLink
								:to="`/dashboard/${row.client.id}`"
								class="flex items-center gap-3 border-b border-app-border-subtle px-4 py-3.5 text-app-text hover:bg-app-hover"
							>
								<ClientIcon
									:os-full-name="row.client.os_full_name"
									:os-kernel="row.client.os_kernel"
									:os-family="row.client.os_family"
									:os="row.client.os"
									:tile="40"
								/>
								<span class="flex min-w-0 flex-1 flex-col gap-[3px]">
									<span class="flex items-center gap-1.5">
										<span class="truncate font-mono text-sm font-medium">{{ row.client.name || row.client.id }}</span>
										<Star
											v-if="row.favorite"
											class="h-3.5 w-3.5 flex-none fill-[#D97706] text-[#D97706]"
											role="img"
											aria-label="Favorite"
										/>
									</span>
									<span class="truncate text-xs text-app-text-3">
										<span
											v-if="row.ip"
											class="font-mono"
										>{{ row.ip }} · </span>{{ row.os }}
									</span>
									<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-text-3">
										<span
											v-if="row.client.version"
											:class="['font-mono', row.outdated ? 'font-medium text-app-warn' : '']"
										>v{{ row.client.version }}</span>
										<UpdatesCount
											:count="row.updates.pending"
											kind="updates"
											labelled
										/>
										<UpdatesCount
											:count="row.updates.security"
											kind="security"
											labelled
										/>
									</span>
								</span>
								<span :class="['inline-flex flex-none items-center gap-1.5 whitespace-nowrap text-xs font-medium', row.online ? 'text-app-ok' : 'text-app-text-3']">
									<span
										aria-hidden="true"
										:class="['h-2 w-2 rounded-full', row.online ? 'bg-[#22C55E]' : 'border-2 border-app-text-4']"
									/>
									{{ row.online ? 'Online' : 'Offline' }}
								</span>
							</NuxtLink>
						</li>
					</ul>

					<!-- Loading / error / empty -->
					<div
						v-if="!rows.length"
						class="px-4 py-12 text-center"
					>
						<template v-if="!loaded">
							<div class="text-sm text-app-text-3">
								Loading devices…
							</div>
						</template>
						<template v-else-if="loadError">
							<div class="text-[15px] font-semibold text-app-text">
								Couldn't load devices
							</div>
							<p class="mb-4 mt-1.5 text-[13px] text-app-text-3">
								{{ loadError }}
							</p>
							<AppButton
								variant="secondary"
								size="sm"
								@click="refresh"
							>
								Try again
							</AppButton>
						</template>
						<template v-else>
							<div class="text-[15px] font-semibold text-app-text">
								No devices match these filters
							</div>
							<p class="mb-4 mt-1.5 text-[13px] text-app-text-3">
								{{ filters.group === 'favorites' && !favorites.length ? 'Mark devices as favorites with the star on their page.' : 'Try another group or status, or clear the search text.' }}
							</p>
							<AppButton
								variant="secondary"
								size="sm"
								@click="clearFilters"
							>
								Clear filters
							</AppButton>
						</template>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-2 rounded-b-xl bg-app-surface-2 px-4 py-3 text-[13px] text-app-text-3">
						<span>Showing {{ rows.length }} of {{ stats.total }} devices</span>
						<span v-if="lastRefreshed">Last refreshed {{ refreshedLabel }}</span>
					</div>
				</section>
			</template>
		</AppPage>

		<AddClientModal
			ref="addClientModal"
			@save="handleCreateClientAccess"
		/>
		<InstallClientModal
			ref="installClientModal"
			@save="installClientModal?.close()"
		/>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import { useClipboard, useIntervalFn, useLocalStorage } from '@vueuse/core';
import {
	ArrowDown,
	ArrowUp,
	Check,
	ChevronDown,
	ChevronsUpDown,
	CircleArrowUp,
	Plus,
	RefreshCw,
	Search,
	Settings2,
	SlidersHorizontal,
	Star,
	Terminal,
	X,
} from 'lucide-vue-next';
import AddClientModal from '~/components/clients/AddClientModal.vue';
import InstallClientModal from '~/components/clients/InstallClientModal.vue';
import ThemedSelect from '~/components/custom/ThemedSelect.vue';
import ClientIcon from '~/components/device/ClientIcon.vue';
import DeviceActionsMenu from '~/components/device/DeviceActionsMenu.vue';
import DeviceGroupPicker from '~/components/device/DeviceGroupPicker.vue';
import DeviceRowDetails from '~/components/device/DeviceRowDetails.vue';
import OpSegmented from '~/components/operate/OpSegmented.vue';
import UpdatesCount from '~/components/operate/UpdatesCount.vue';
import {
	isClientOnline,
	osLabel,
	relativeTime,
	updatesInfo,
	updatesToneClass,
	useFavoriteDevices,
} from '~/components/device/deviceHelpers';
import {
	DEFAULT_FILTERS,
	activeFilterChips,
	compareVersions,
	defaultSortDir,
	filtersFromQuery,
	filtersToQuery,
	isOutdated,
	matchesFilters,
	newestVersion,
	panelFilterCount,
	platformOf,
	removeFilterChip,
	sortClients,
	type DeviceFilters,
	type DeviceSort,
	type SortKey,
	type StatusFilter,
	type UpdatesFilter,
} from '~/utils/deviceList';
import type { Client, ClientAuth } from '~/types';

type Density = 'condensed' | 'comfortable' | 'spacious';

const { $api } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const { copy } = useClipboard();
const clientStore = useClientStore();
const statusStore = useStatusStore();
const { createClientAccess } = useClientAccess();
const { favorites, isFavorite, toggleFavorite } = useFavoriteDevices();

const clients = ref<Client[]>([]);
const totalCount = ref(0);
const loaded = ref(false);
const loading = ref(false);
const loadError = ref('');
const lastRefreshed = ref<Date | null>(null);
const now = ref(Date.now());
useIntervalFn(() => {
	now.value = Date.now();
}, 30000);

// Filters and sort live in the URL query (keys in utils/deviceList.ts), so views can be bookmarked.
const initial = filtersFromQuery(route.query);
const filters = reactive<DeviceFilters>(initial.filters);
const sort = ref<DeviceSort>(initial.sort);
const panelOpen = ref(panelFilterCount(initial.filters) > 0);
const density = useLocalStorage<Density>('openrport-device-list-density', 'comfortable');

const statusOptions: { value: StatusFilter; label: string }[] = [
	{ value: 'any', label: 'Any status' },
	{ value: 'online', label: 'Online' },
	{ value: 'offline', label: 'Offline' },
];
const updatesOptions: { value: UpdatesFilter; label: string }[] = [
	{ value: 'any', label: 'Any' },
	{ value: 'pending', label: 'Updates pending' },
	{ value: 'security', label: 'Security updates pending' },
	{ value: 'unreported', label: 'Not reported' },
];
const densityOptions: { id: Density; label: string }[] = [
	{ id: 'condensed', label: 'Condensed, single line' },
	{ id: 'comfortable', label: 'Comfortable, with OS' },
	{ id: 'spacious', label: 'Spacious, with tags' },
];
const columns: { id: string; label: string; class: string; sort?: SortKey; align?: 'right' }[] = [
	{ id: 'device', label: 'Device', class: '', sort: 'name' },
	{ id: 'status', label: 'Status', class: '', sort: 'status' },
	{ id: 'ip', label: 'IP address', class: '', sort: 'ip' },
	{ id: 'groups', label: 'Groups', class: 'hidden min-[1400px]:table-cell', sort: 'groups' },
	{ id: 'version', label: 'Client', class: 'hidden lg:table-cell', sort: 'version' },
	{ id: 'updates', label: 'Updates', class: 'hidden text-right xl:table-cell', sort: 'updates', align: 'right' },
	{ id: 'security', label: 'Security', class: 'hidden text-right xl:table-cell', sort: 'security', align: 'right' },
	{ id: 'actions', label: 'Actions', class: 'w-[96px]' },
];
const cellPad = computed(() => (density.value === 'condensed' ? 'py-2' : 'py-3'));

// --- selection and expansion (kept by client ID across filtering and sorting) ---
const selectedIds = ref<string[]>([]);
const selectedSet = computed(() => new Set(selectedIds.value));
const expandedIds = ref<string[]>([]);

async function loadClients() {
	loading.value = true;
	try {
		const all: Client[] = [];
		let offset = 0;
		let count = 0;
		// Page through the whole fleet (500 per request is the server maximum).
		do {
			const response = await $api.clients.listFleet(offset);
			all.push(...(response?.data ?? []));
			count = response?.meta?.count ?? all.length;
			offset += 500;
		} while (all.length < count && offset < 20000);
		clients.value = all;
		totalCount.value = count;
		loadError.value = '';
		// Forget selected devices that are gone.
		const ids = new Set(all.map(c => c.id));
		selectedIds.value = selectedIds.value.filter(id => ids.has(id));
	}
	catch (e) {
		console.error('Error loading clients:', e);
		loadError.value = 'The server did not return the device list. Check your connection and try again.';
	}
	finally {
		loading.value = false;
		loaded.value = true;
		lastRefreshed.value = new Date();
		now.value = Date.now();
	}
}

async function loadGroups() {
	try {
		await clientStore.loadGroups();
	}
	catch (e) {
		console.error('Error loading client groups:', e);
	}
}

async function refresh() {
	await Promise.all([loadClients(), loadGroups()]);
}

onMounted(refresh);

const newest = computed(() => newestVersion(clients.value.map(c => c.version)));

/** Counts of distinct values. */
function tally(values: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
	return counts;
}

const groupOptions = computed(() => [
	{ id: 'all', label: 'All devices', count: totalCount.value },
	{ id: 'favorites', label: 'Favorites', count: clients.value.filter(c => isFavorite(c.id)).length, description: 'Devices you starred in this browser' },
	...clientStore.groups.map(g => ({
		id: g.id,
		label: g.id,
		count: clients.value.filter(c => (c.groups ?? []).includes(g.id)).length || g.num_clients || 0,
		description: g.description,
	})),
]);

const PLATFORM_LABELS: Record<string, string> = { linux: 'Linux', windows: 'Windows', darwin: 'macOS', freebsd: 'FreeBSD', unknown: 'Unknown' };
const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
const platformOptions = computed(() => {
	const counts = tally(clients.value.map(platformOf));
	filters.platforms.forEach(p => counts.set(p, counts.get(p) ?? 0));
	return [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: platformLabel(value), count }));
});

const stats = computed(() => {
	const online = clients.value.filter(c => isClientOnline(c)).length;
	return {
		total: totalCount.value,
		online,
		offline: clients.value.length - online,
		reportingUpdates: clients.value.some(c => !!c.updates_status),
		security: clients.value.reduce((n, c) => n + (c.updates_status?.security_updates_available ?? 0), 0),
		outdated: clients.value.filter(c => isOutdated(c.version, newest.value)).length,
	};
});

const versionOptions = computed(() => {
	const counts = tally(clients.value.map(c => c.version).filter((v): v is string => !!v));
	if (filters.version && filters.version !== 'outdated') counts.set(filters.version, counts.get(filters.version) ?? 0);
	const versions = [...counts].sort((a, b) => compareVersions(b[0], a[0]));
	return [
		{ value: 'any', label: 'Any version' },
		...(newest.value ? [{ value: 'outdated', label: `Older than ${newest.value} (${stats.value.outdated})` }] : []),
		...versions.map(([v, n]) => ({ value: v, label: `${v} (${n})` })),
	];
});

const tagOptions = computed(() => {
	const counts = tally(clients.value.flatMap(c => c.tags ?? []));
	filters.tags.forEach(t => counts.set(t, counts.get(t) ?? 0));
	return [...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([value, count]) => ({ value, count }));
});

const toggleChipClass = (on: boolean) => [
	'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
	on ? 'border-app-accent bg-app-accent text-white' : 'border-app-border-strong bg-app-surface text-app-text-2 hover:bg-app-hover',
];

function toggleIn(field: 'platforms' | 'tags', value: string) {
	filters[field] = filters[field].includes(value)
		? filters[field].filter(v => v !== value)
		: [...filters[field], value];
}

function addTagFilter(tag: string) {
	if (!filters.tags.includes(tag)) filters.tags = [...filters.tags, tag];
}

const chips = computed(() => activeFilterChips(filters, { platformLabel }));
const panelCount = computed(() => panelFilterCount(filters));

const rows = computed(() => {
	const ctx = { isFavorite, newest: newest.value };
	const expanded = new Set(expandedIds.value);
	const matching = clients.value.filter(c => matchesFilters(c, filters, ctx));
	return sortClients(matching, sort.value.key, sort.value.dir).map((c) => {
		const online = isClientOnline(c);
		const seen = relativeTime(c.disconnected_at);
		const groups = c.groups ?? [];
		return {
			client: c,
			online,
			favorite: isFavorite(c.id),
			selected: selectedSet.value.has(c.id),
			expanded: expanded.has(c.id),
			outdated: isOutdated(c.version, ctx.newest),
			os: osLabel(c),
			ip: c.ipv4?.[0] ?? '',
			firstGroup: groups[0] ?? '',
			moreGroups: groups.slice(1),
			statusText: online ? 'Online' : `Offline${seen ? ` · ${seen}` : ''}`,
			updates: updatesInfo(c),
		};
	});
});

const allVisibleSelected = computed(() => rows.value.length > 0 && rows.value.every(r => r.selected));
const someVisibleSelected = computed(() => rows.value.some(r => r.selected));
const hiddenSelectedCount = computed(() => {
	const shown = new Set(rows.value.map(r => r.client.id));
	return selectedIds.value.filter(id => !shown.has(id)).length;
});
const selectedOnlineIds = computed(() => clients.value
	.filter(c => selectedSet.value.has(c.id) && isClientOnline(c))
	.map(c => c.id));
const selectedOffline = computed(() => selectedIds.value.length - selectedOnlineIds.value.length);

function toggleSelected(id: string) {
	selectedIds.value = selectedSet.value.has(id)
		? selectedIds.value.filter(s => s !== id)
		: [...selectedIds.value, id];
}

function selectVisible(on: boolean) {
	const visible = rows.value.map(r => r.client.id);
	if (on) {
		selectedIds.value = [...new Set([...selectedIds.value, ...visible])];
	}
	else {
		const drop = new Set(visible);
		selectedIds.value = selectedIds.value.filter(id => !drop.has(id));
	}
}

function toggleExpanded(id: string) {
	expandedIds.value = expandedIds.value.includes(id)
		? expandedIds.value.filter(e => e !== id)
		: [...expandedIds.value, id];
}

/** Opens Execute with the selected online devices as targets (pick code or a library entry there). */
function runOnSelection() {
	if (!selectedOnlineIds.value.length) return;
	navigateTo({ path: '/execute', query: { clients: selectedOnlineIds.value } });
}

function toggleSort(key: SortKey) {
	sort.value = sort.value.key === key
		? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
		: { key, dir: defaultSortDir(key) };
}

// Keep the URL query and the filters/sort in step, both ways (typing, back/forward).
const queryKey = (q: typeof route.query) => {
	const parsed = filtersFromQuery(q);
	return JSON.stringify(filtersToQuery(parsed.filters, parsed.sort));
};
watch([filters, sort], () => {
	const next = filtersToQuery(filters, sort.value);
	if (queryKey(route.query) === JSON.stringify(next)) return;
	router.replace({ query: { ...route.query, ...next } });
}, { deep: true });
watch(() => route.query, (query) => {
	if (queryKey(query) === JSON.stringify(filtersToQuery(filters, sort.value))) return;
	const parsed = filtersFromQuery(query);
	Object.assign(filters, parsed.filters);
	sort.value = parsed.sort;
});

function clearFilters() {
	Object.assign(filters, { ...DEFAULT_FILTERS, platforms: [], tags: [] });
}

async function onRowAction(client: Client, action: string) {
	switch (action) {
		case 'command':
			navigateTo(`/dashboard/${client.id}?tab=run`);
			break;
		case 'tunnel':
			navigateTo(`/dashboard/${client.id}?tab=tunnels`);
			break;
		case 'favorite':
			toggleFavorite(client.id);
			break;
		case 'copy-id':
			await copy(client.id);
			snackbar.add({ type: 'success', text: 'Client ID copied' });
			break;
	}
}

const refreshedLabel = computed(() => {
	void now.value;
	return relativeTime(lastRefreshed.value);
});

// Add device = create client credentials, then show the install commands for them.
const addClientModal = ref<InstanceType<typeof AddClientModal> | null>(null);
const installClientModal = ref<InstanceType<typeof InstallClientModal> | null>(null);

const openAddClientModal = () => {
	addClientModal.value?.open();
};

const handleCreateClientAccess = async (data: ClientAuth) => {
	try {
		await createClientAccess(data);
	}
	catch (e) {
		console.error('Error creating client access:', e);
		snackbar.add({ type: 'error', text: 'Could not create the client access' });
		return;
	}
	addClientModal.value?.close();
	snackbar.add({ type: 'success', text: `Client access ${data.id} created` });
	if (!statusStore.status?.connect_url) {
		await statusStore.loadStatus();
	}
	await installClientModal.value?.open({ ...data }, statusStore.status);
};
</script>
