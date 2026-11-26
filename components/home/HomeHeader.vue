<template>
	<header class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
		<NuxtLink
			to="/"
			class="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-accent"
			aria-label="Procy home"
		>
			<img
				src="/favicon.svg"
				alt=""
				width="32"
				height="32"
				class="block h-8 w-8 shrink-0"
			>
			<span class="text-[17px] font-bold tracking-tight text-app-text">Procy</span>
		</NuxtLink>
		<nav
			aria-label="Main"
			class="flex items-center gap-1 sm:gap-2"
		>
			<a
				href="/docs/"
				:class="[linkClass, 'hidden sm:inline-flex']"
			>Docs</a>
			<a
				href="https://github.com/pohcee/procy"
				rel="noopener"
				:class="[linkClass, 'hidden sm:inline-flex']"
			>GitHub</a>
			<AppButton
				to="/auth"
				variant="ghost"
				size="sm"
			>
				Sign in
			</AppButton>
			<AppButton
				to="/signup"
				size="sm"
			>
				Start free trial
			</AppButton>
		</nav>
	</header>
</template>

<script setup lang="ts">
const linkClass = 'h-9 items-center rounded-[10px] px-3 text-[13px] font-medium text-app-text-2 transition-colors hover:bg-app-hover hover:text-app-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent';
</script>
