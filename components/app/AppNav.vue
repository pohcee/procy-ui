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
import { ArrowLeftRight, BarChart3, BookOpen, Building2, Clock, CreditCard, ExternalLink, Trash2, UserPlus, LifeBuoy, ListChecks, Monitor, Settings, Terminal } from 'lucide-vue-next';
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
	/** Shown only when this is true (opt-in features: operator, usage). */
	when?: () => boolean;
}

interface NavSection {
	label?: string;
	items: NavItem[];
	when?: () => boolean;
}

const emit = defineEmits<{ (e: 'navigate'): void }>();
const route = useRoute();
const { has, operator, usage, billing, signup } = useCapabilities();
const { isAdmin } = useIsAdmin();

const allSections: NavSection[] = [
	{
		// Platform operators (users of the system organization): no devices of their own.
		label: 'Platform',
		when: () => operator.value,
		items: [
			{ label: 'Organizations', to: '/organizations', icon: Building2 },
			{ label: 'Platform usage', to: '/platform-usage', icon: BarChart3, when: () => usage.value },
			{ label: 'Platform billing', to: '/platform-billing', icon: CreditCard, when: () => billing.value },
			{ label: 'Signups', to: '/signups', icon: UserPlus, when: () => signup.value },
			{ label: 'Deletions', to: '/deletions', icon: Trash2, when: () => signup.value },
		],
	},
	{
		label: 'Operate',
		when: () => !operator.value,
		items: [
			{ label: 'Devices', to: '/dashboard', icon: Monitor },
			{ label: 'Execute', to: '/execute', icon: Terminal },
			{ label: 'Schedules', to: '/schedules', icon: Clock, capability: 'scheduled_jobs' },
			{ label: 'Tunnels', to: '/tunnels', icon: ArrowLeftRight },
			{ label: 'Script library', to: '/library', icon: BookOpen, capability: 'library' },
			{ label: 'Audit log', to: '/audits', icon: ListChecks },
		],
	},
	{
		items: [
			{ label: 'Usage', to: '/usage', icon: BarChart3, when: () => usage.value && isAdmin.value && !operator.value },
			{ label: 'Billing', to: '/billing', icon: CreditCard, when: () => billing.value && isAdmin.value && !operator.value },
			{
				label: 'Settings',
				to: '/profile',
				icon: Settings,
				match: ['/users', '/user-groups', '/client-access', '/client-groups', '/vault', '/api-tokens', '/info', '/organization'],
			},
			{ label: 'Docs', to: DOCS_URL, icon: LifeBuoy, external: true },
		],
	},
];

const sections = computed(() => allSections
	.filter(section => !section.when || section.when())
	.map(section => ({
		...section,
		items: section.items.filter(item => (!item.capability || has(item.capability)) && (!item.when || item.when())),
	})));

const isActive = (item: NavItem): boolean => {
	if (item.external) return false;
	const path = route.path.toLowerCase();
	return [item.to, ...(item.match ?? [])].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
};
</script>
