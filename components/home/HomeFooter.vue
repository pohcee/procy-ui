<template>
	<footer class="border-t border-app-border">
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-sm sm:px-6 md:flex-row md:justify-between">
			<div class="max-w-xs">
				<p class="flex items-center gap-2 font-bold tracking-tight text-app-text">
					<img
						src="/favicon.svg"
						alt=""
						width="24"
						height="24"
						class="h-6 w-6"
					>
					Procy
				</p>
				<p class="mt-2 text-app-text-3">
					Remote access and management for your devices. Open source under the AGPL.
				</p>
			</div>
			<div class="grid grid-cols-1 gap-8 min-[420px]:grid-cols-3 sm:gap-12">
				<div>
					<h2 class="text-[13px] font-semibold text-app-text">
						Product
					</h2>
					<ul class="mt-3 flex flex-col gap-2 text-app-text-3">
						<li>
							<a
								href="/docs/"
								:class="link"
							>Docs</a>
						</li>
						<li>
							<a
								href="https://github.com/pohcee/procy-server"
								rel="noopener"
								:class="link"
							>Source on GitHub</a>
						</li>
						<li>
							<NuxtLink
								to="/auth"
								:class="link"
							>
								Sign in
							</NuxtLink>
						</li>
					</ul>
				</div>
				<div>
					<h2 class="text-[13px] font-semibold text-app-text">
						Contact
					</h2>
					<ul class="mt-3 flex flex-col gap-2 text-app-text-3">
						<li>
							Help:
							<a
								href="mailto:support@procy.sh"
								:class="link"
							>support@procy.sh</a>
						</li>
						<li>
							Security reports:
							<a
								href="mailto:security@procy.sh"
								:class="link"
							>security@procy.sh</a>
						</li>
					</ul>
				</div>
				<div>
					<h2 class="text-[13px] font-semibold text-app-text">
						Legal
					</h2>
					<!-- No terms or privacy pages exist yet: plain text, no dead links. -->
					<ul class="mt-3 flex flex-col gap-2 text-app-text-3">
						<li>Terms (coming soon)</li>
						<li>Privacy (coming soon)</li>
						<li>© Procy</li>
					</ul>
				</div>
			</div>
		</div>
	</footer>
</template>

<script setup lang="ts">
const link = 'rounded underline-offset-2 hover:text-app-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent';
</script>
