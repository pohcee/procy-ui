<template>
	<!--
		Settings sub-navigation. Vertical list beside the content from md up,
		a horizontally scrollable row of tabs on phones.
	-->
	<nav
		ref="navEl"
		aria-label="Settings sections"
		class="subnav-scroll relative -mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-app-border px-4 sm:-mx-6 sm:px-6 md:mx-0 md:w-[200px] md:shrink-0 md:flex-col md:gap-0.5 md:overflow-visible md:border-b-0 md:px-0"
	>
		<NuxtLink
			v-for="item in items"
			:key="item.to"
			:to="item.to"
			:class="[
				'relative inline-flex h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors',
				'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent',
				'md:h-10 md:rounded-lg',
				isActive(item.to)
					? 'text-app-text after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-app-accent md:bg-app-raised md:shadow-[inset_0_0_0_1px_rgb(var(--app-border))] md:after:hidden'
					: 'text-app-text-3 hover:text-app-text md:text-app-text-2 md:hover:bg-app-hover',
			]"
			:aria-current="isActive(item.to) ? 'page' : undefined"
		>
			{{ item.label }}
		</NuxtLink>
	</nav>
</template>

<script setup lang="ts">
const items = [
	{ to: '/profile', label: 'Profile' },
	{ to: '/users', label: 'Users' },
	{ to: '/user-groups', label: 'User groups' },
	{ to: '/client-access', label: 'Client access' },
	{ to: '/client-groups', label: 'Client groups' },
	{ to: '/vault', label: 'Vault' },
	{ to: '/api-tokens', label: 'API tokens' },
	{ to: '/info', label: 'Server info' },
];

const route = useRoute();
const isActive = (to: string) => route.path.toLowerCase() === to;

// On phones the row scrolls sideways: bring the current section into view.
const navEl = ref<HTMLElement | null>(null);
onMounted(() => {
	const nav = navEl.value;
	const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
	if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
	nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
});
</script>

<style scoped>
.subnav-scroll {
	scrollbar-width: none;
}
.subnav-scroll::-webkit-scrollbar {
	display: none;
}
</style>
