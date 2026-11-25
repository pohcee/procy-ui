<template>
	<!--
		The organization tabs. Each tab is a link (?tab=…), so tabs can be bookmarked and shared; the list follows the
		tablist pattern: arrow keys, Home and End move between tabs, the current one has aria-selected.
	-->
	<div
		ref="listEl"
		role="tablist"
		aria-label="Organization sections"
		class="tabs-scroll -mx-4 flex gap-1 overflow-x-auto border-b border-app-border px-4 sm:mx-0 sm:px-0"
		@keydown="onKey"
	>
		<NuxtLink
			v-for="t in tabs"
			:id="`org-tab-${t.value}`"
			:key="t.value"
			:to="link(t.value)"
			role="tab"
			:aria-selected="t.value === current"
			aria-controls="org-tab-panel"
			:tabindex="t.value === current ? 0 : -1"
			active-class=""
			exact-active-class=""
			:class="[
				'relative inline-flex h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors',
				'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent',
				t.value === current
					? 'text-app-text after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-app-accent'
					: 'text-app-text-3 hover:text-app-text',
			]"
		>
			{{ t.label }}
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
import { orgConsoleLink, type OrgTab } from '~/utils/operatorConsole';

const props = defineProps<{
	id: string;
	current: OrgTab;
	tabs: { value: OrgTab; label: string }[];
}>();

const link = (tab: OrgTab) => orgConsoleLink(props.id, tab);
const listEl = ref<HTMLElement | null>(null);

const onKey = (e: KeyboardEvent) => {
	const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
	if (!keys.includes(e.key)) return;
	e.preventDefault();
	const i = props.tabs.findIndex(t => t.value === props.current);
	const n = props.tabs.length;
	const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
	const tab = props.tabs[next];
	if (!tab) return;
	navigateTo(link(tab.value), { replace: true });
	nextTick(() => listEl.value?.querySelector<HTMLElement>(`#org-tab-${tab.value}`)?.focus());
};
</script>

<style scoped>
.tabs-scroll {
	scrollbar-width: none;
}
.tabs-scroll::-webkit-scrollbar {
	display: none;
}
</style>
