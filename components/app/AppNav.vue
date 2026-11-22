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
			</NuxtLink>
		</div>
	</nav>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { ArrowLeftRight, BookOpen, Boxes, Clock, ListChecks, Monitor, Settings, Terminal } from 'lucide-vue-next';

interface NavItem {
	label: string;
	to: string;
	icon: Component;
	/** Extra route prefixes that should highlight this item. */
	match?: string[];
}

interface NavSection {
	label?: string;
	items: NavItem[];
}

const emit = defineEmits<{ (e: 'navigate'): void }>();
const route = useRoute();

const sections: NavSection[] = [
	{
		label: 'Operate',
		items: [
			{ label: 'Devices', to: '/dashboard', icon: Monitor },
			{ label: 'Execute', to: '/execute', icon: Terminal },
			{ label: 'Schedules', to: '/schedules', icon: Clock },
			{ label: 'Tunnels', to: '/tunnels', icon: ArrowLeftRight },
			{ label: 'Script library', to: '/library', icon: BookOpen },
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
		],
	},
];

const isActive = (item: NavItem): boolean => {
	const path = route.path.toLowerCase();
	return [item.to, ...(item.match ?? [])].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
};
</script>
