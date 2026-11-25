<template>
	<!-- The operator console's sidebar: platform-wide pages, then the operator's own settings. -->
	<nav
		aria-label="Operator console"
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
				active-class=""
				exact-active-class=""
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
import {
	BarChart3, Building2, CreditCard, ExternalLink, LayoutDashboard, LifeBuoy, ListChecks, Mail, Settings, Trash2, UserPlus,
} from 'lucide-vue-next';

const DOCS_URL = 'https://procy.sh/docs/';

interface NavItem {
	label: string;
	to: string;
	icon: Component;
	/** Highlight only on this exact path (the overview would otherwise match every console page). */
	exact?: boolean;
	match?: string[];
	external?: boolean;
	when?: () => boolean;
}

const emit = defineEmits<{ (e: 'navigate'): void }>();
const route = useRoute();
const { usage, billing, signup } = useCapabilities();

const allSections: { label?: string; items: NavItem[] }[] = [
	{
		label: 'Platform',
		items: [
			{ label: 'Overview', to: '/operator', icon: LayoutDashboard, exact: true },
			{ label: 'Organizations', to: '/operator/organizations', icon: Building2 },
			{ label: 'Signups', to: '/operator/signups', icon: UserPlus, when: () => signup.value },
			{ label: 'Invitations', to: '/operator/invitations', icon: Mail },
			{ label: 'Deletions', to: '/operator/deletions', icon: Trash2, when: () => signup.value },
			{ label: 'Usage', to: '/operator/usage', icon: BarChart3, when: () => usage.value },
			{ label: 'Billing', to: '/operator/billing', icon: CreditCard, when: () => billing.value },
			{ label: 'Audit log', to: '/operator/audit', icon: ListChecks },
		],
	},
	{
		items: [
			{ label: 'Settings', to: '/profile', icon: Settings, match: ['/users', '/user-groups', '/api-tokens', '/info'] },
			{ label: 'Docs', to: DOCS_URL, icon: LifeBuoy, external: true },
		],
	},
];

const sections = computed(() => allSections.map(section => ({
	...section,
	items: section.items.filter(item => !item.when || item.when()),
})));

const isActive = (item: NavItem): boolean => {
	if (item.external) return false;
	const path = route.path.toLowerCase().replace(/\/+$/, '') || '/';
	if (item.exact) return path === item.to;
	return [item.to, ...(item.match ?? [])].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
};
</script>
