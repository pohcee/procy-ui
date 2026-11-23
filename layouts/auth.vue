<template>
	<div class="flex min-h-[100dvh] bg-app-bg font-sans text-app-text">
		<!-- Form column -->
		<div class="flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-8 sm:py-7">
			<header class="flex items-center gap-2.5">
				<img
					src="/favicon.svg"
					alt=""
					width="36"
					height="36"
					class="block h-9 w-9 shrink-0"
				>
				<span class="text-[17px] font-bold tracking-tight text-app-text">Procy</span>
			</header>
			<main class="flex flex-1 items-center justify-center py-8 sm:py-12">
				<div class="w-full max-w-[400px]">
					<slot />
				</div>
			</main>
			<footer class="text-xs text-app-text-3">
				© Procy · Remote management for your fleet
			</footer>
		</div>

		<!-- Illustration panel (desktop only) -->
		<aside
			class="relative hidden w-[52%] max-w-[860px] flex-col justify-between overflow-hidden bg-[#10161F] p-10 text-white lg:flex"
			aria-hidden="true"
		>
			<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,rgba(37,99,235,0.45),transparent_65%)]" />
			<div class="relative">
				<p class="text-sm font-semibold uppercase tracking-[0.08em] text-[#93B8FF]">
					Procy
				</p>
				<p class="mt-3 max-w-md text-[28px] font-bold leading-tight tracking-tight">
					Every device, one secure tunnel away.
				</p>
				<p class="mt-3 max-w-md text-[15px] text-[#C2CAD6]">
					Run commands, open tunnels and watch your fleet from anywhere.
				</p>
			</div>
			<img
				src="/login.svg"
				alt=""
				width="945"
				height="787"
				class="relative -mr-10 ml-auto block h-auto w-[min(100%,760px)]"
			>
		</aside>
	</div>
</template>
