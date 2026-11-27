<template>
	<!-- Organization switcher for users of several organizations (hidden otherwise, and on servers without the API). -->
	<div
		v-if="visible"
		class="px-0.5 pb-2"
	>
		<DropdownMenu>
			<DropdownMenuTrigger as-child>
				<button
					type="button"
					:disabled="switching"
					class="flex h-11 w-full items-center gap-2.5 rounded-lg border border-[#2A3442] px-2.5 text-left text-[13px] text-[#C9D1DC] hover:bg-app-nav-hover hover:text-white disabled:cursor-wait disabled:opacity-60"
					:aria-label="`Organization: ${current?.name ?? 'unknown'}. Switch organization`"
				>
					<Building2
						class="h-4 w-4 shrink-0 text-[#8C96A5]"
						aria-hidden="true"
					/>
					<span class="min-w-0 flex-1">
						<span class="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C96A5]">Organization</span>
						<span class="block truncate font-medium text-white">{{ current?.name ?? 'Choose…' }}</span>
					</span>
					<LoaderCircle
						v-if="switching"
						class="h-4 w-4 shrink-0 animate-spin"
						aria-hidden="true"
					/>
					<ChevronsUpDown
						v-else
						class="h-4 w-4 shrink-0 text-[#8C96A5]"
						aria-hidden="true"
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				align="start"
				:side-offset="4"
				class="z-50 max-h-72 w-[var(--reka-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl border border-app-border bg-app-surface p-1.5 text-app-text shadow-lg"
			>
				<div class="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-app-text-3">
					Switch organization
				</div>
				<DropdownMenuItem
					v-for="org in orgs ?? []"
					:key="org.id"
					role="menuitemradio"
					:aria-checked="org.id === current?.id"
					class="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-app-text focus:bg-app-hover focus:text-app-text data-[highlighted]:bg-app-hover"
					@select="pick(org.id)"
				>
					<Check
						:class="['h-4 w-4 shrink-0', org.id === current?.id ? 'text-app-accent' : 'invisible']"
						aria-hidden="true"
					/>
					<span class="min-w-0">
						<span class="block truncate">{{ org.name }}</span>
						<span
							v-if="org.name !== org.id"
							class="block truncate font-mono text-xs text-app-text-3"
						>{{ org.id }}</span>
					</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
</template>

<script setup lang="ts">
import { Building2, Check, ChevronsUpDown, LoaderCircle } from 'lucide-vue-next';

const { orgs, visible, current, switching, switchTo } = useMembership();
const snackbar = useSnackbar();

const pick = async (id: string) => {
	try {
		await switchTo(id);
	}
	catch (e) {
		snackbar.add({ type: 'error', text: `Couldn't switch the organization: ${apiErrorMessage(e)}` });
	}
};
</script>
