<template>
	<div class="flex h-[100dvh] flex-col bg-app-bg text-app-text lg:flex-row">
		<!-- Desktop sidebar -->
		<aside class="hidden w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-app-border-subtle bg-app-nav px-3.5 py-5 lg:flex">
			<div class="px-1.5">
				<AppBrand />
			</div>
			<AppNav class="flex-1" />
			<AppUserMenu />
		</aside>

		<!-- Mobile / tablet top bar -->
		<header class="flex shrink-0 items-center gap-2 bg-app-nav py-2 pl-3.5 pr-2 lg:hidden">
			<AppBrand
				:size="30"
				class="mr-auto"
			/>
			<button
				type="button"
				aria-label="Open menu"
				:aria-expanded="menuOpen"
				class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-app-nav-hover"
				@click="menuOpen = true"
			>
				<Menu
					class="h-5 w-5"
					aria-hidden="true"
				/>
			</button>
		</header>

		<!-- Page content: each page scrolls inside this region -->
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<BillingBanners />
			<slot />
		</div>

		<!-- Mobile drawer -->
		<DialogRoot v-model:open="menuOpen">
			<DialogPortal>
				<DialogOverlay class="fixed inset-0 z-50 bg-black/60 data-[state=closed]:duration-150 data-[state=open]:duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 lg:hidden" />
				<DialogContent
					:aria-describedby="undefined"
					class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-app-nav px-3.5 py-5 focus:outline-hidden data-[state=closed]:duration-150 data-[state=open]:duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left lg:hidden"
				>
					<DialogTitle class="sr-only">
						Menu
					</DialogTitle>
					<div class="flex items-center justify-between px-1.5">
						<AppBrand @click="menuOpen = false" />
						<button
							type="button"
							aria-label="Close menu"
							class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-app-nav-hover"
							@click="menuOpen = false"
						>
							<X
								class="h-5 w-5"
								aria-hidden="true"
							/>
						</button>
					</div>
					<AppNav
						class="flex-1"
						@navigate="menuOpen = false"
					/>
					<AppUserMenu @navigate="menuOpen = false" />
				</DialogContent>
			</DialogPortal>
		</DialogRoot>
	</div>
</template>

<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { Menu, X } from 'lucide-vue-next';
import BillingBanners from '~/components/billing/BillingBanners.vue';

const menuOpen = ref(false);
const route = useRoute();

// Close the drawer whenever navigation happens (links, back button, etc.).
watch(() => route.fullPath, () => {
	menuOpen.value = false;
});
</script>
