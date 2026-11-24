<template>
	<nav
		aria-label="Primary"
		class="flex flex-col gap-6"
	>
		<div
			v-for="section in sections"
			:key="section.label ?? 'bottom'"
			class="flex flex-col gap-0.5"
		>
			<div
				v-if="section.label"
				class="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C96A5]"
			>
				{{ section.label }}
			</div>
			<NuxtLink
				v-for="item in section.items"
				:key="item.to"
				:to="item.to"
				:external="item.external"
				:target="item.external ? '_blank' : undefined"
				:rel="item.external ? 'noopener' : undefined"
				:aria-current="isActive(item) ? 'page' : undefined"
				:class="[
					'flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors',
					isActive(item) ? 'bg-app-nav-active text-white' : 'text-[#C9D1DC] hover:bg-app-nav-hover hover:text-white',
				]"
				@click="emit('navigate')"
			>
				<component
					:is="item.icon"
					class="h-[18px] w-[18px] shrink-0"
					aria-hidden="true"
				/>
				{{ item.label }}
				<ExternalLink
					v-if="item.external"
					class="ml-auto h-3.5 w-3.5 shrink-0 opacity-60"
					aria-hidden="true"
				/>
			</NuxtLink>
		</div>
	</nav>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { ArrowLeftRight, BookOpen, Boxes, Clock, ExternalLink, LifeBuoy, ListChecks, Monitor, Settings, Terminal } from 'lucide-vue-next';
import type { Capability } from '~/composables/useCapabilities';

/** Public documentation; absolute so it also works on servers that don't host the docs. */
const DOCS_URL = 'https://procy.sh/docs/';

interface NavItem {
	label: string;
	to: string;
	icon: Component;
	/** Extra route prefixes that should highlight this item. */
	match?: string[];
	/** Opens outside the app, in a new tab. */
	external?: boolean;
	/** Shown only when the server offers this feature. */
	capability?: Capability;
}

interface NavSection {
	label?: string;
	items: NavItem[];
}

const emit = defineEmits<{ (e: 'navigate'): void }>();
const route = useRoute();
const { has } = useCapabilities();

const allSections: NavSection[] = [
	{
		label: 'Operate',
		items: [
			{ label: 'Devices', to: '/dashboard', icon: Monitor },
			{ label: 'Execute', to: '/execute', icon: Terminal },
			{ label: 'Schedules', to: '/schedules', icon: Clock, capability: 'scheduled_jobs' },
			{ label: 'Tunnels', to: '/tunnels', icon: ArrowLeftRight },
			{ label: 'Script library', to: '/library', icon: BookOpen, capability: 'library' },
			{ label: 'Inventory', to: '/inventory', icon: Boxes },
			{ label: 'Audit log', to: '/audits', icon: ListChecks },
		],
	},
	{
		items: [
			{
				label: 'Settings',
				to: '/profile',
				icon: Settings,
				match: ['/users', '/user-groups', '/client-access', '/client-groups', '/vault', '/api-tokens', '/info'],
			},
			{ label: 'Docs', to: DOCS_URL, icon: LifeBuoy, external: true },
		],
	},
];

const sections = computed(() => allSections.map(section => ({
	...section,
	items: section.items.filter(item => !item.capability || has(item.capability)),
})));

const isActive = (item: NavItem): boolean => {
	if (item.external) return false;
	const path = route.path.toLowerCase();
	return [item.to, ...(item.match ?? [])].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
};
</script>
