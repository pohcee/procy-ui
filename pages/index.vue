<template>
	<!-- The public home page for signed-out visitors (signed-in users go on to /dashboard, see middleware/auth.global.ts). -->
	<div class="flex min-h-[100dvh] flex-col bg-app-bg font-sans text-app-text">
		<a
			href="#main"
			class="sr-only rounded-lg bg-app-surface px-3 py-2 text-sm font-medium text-app-text focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:outline focus:outline-2 focus:outline-app-accent"
		>Skip to content</a>
		<HomeHeader />

		<main
			id="main"
			class="flex-1"
		>
			<div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
				<PreviewNotice class="mb-4" />

				<!-- Hero: the night scene of the sign-in page, as the front door. -->
				<section
					class="relative overflow-hidden rounded-[28px] bg-[#10161F] text-white"
					aria-labelledby="home-title"
				>
					<div
						class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_40%,rgba(37,99,235,0.42),transparent_62%)]"
						aria-hidden="true"
					/>
					<div class="relative grid items-center gap-8 px-5 pb-6 pt-10 sm:px-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-4 lg:py-12 lg:pl-14 lg:pr-6">
						<div class="max-w-xl">
							<h1
								id="home-title"
								class="text-[38px] font-bold leading-[1.04] tracking-[-0.025em] sm:text-[54px]"
							>
								Every device, one secure tunnel away.
							</h1>
							<p class="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-[#C2CAD6]">
								Procy is remote access and management for your servers, routers and workstations. Run commands,
								open tunnels and watch the whole fleet from one browser tab, even when the devices sit behind NAT.
							</p>
							<p class="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-[#8E99A8]">
								Use it hosted here, or run the same server yourself. It’s open source under the AGPL.
							</p>
							<div class="mt-8 flex flex-wrap items-center gap-3">
								<AppButton to="/signup">
									Start free trial
								</AppButton>
								<NuxtLink
									to="/auth"
									:class="darkButton"
								>
									Sign in
								</NuxtLink>
								<span class="flex items-center gap-1 sm:ml-2">
									<a
										href="/docs/"
										:class="darkLink"
									>
										<BookOpen
											class="h-4 w-4"
											aria-hidden="true"
										/>Docs
									</a>
									<a
										href="https://github.com/pohcee/procy-server"
										rel="noopener"
										:class="darkLink"
									>
										<Github
											class="h-4 w-4"
											aria-hidden="true"
										/>GitHub
									</a>
								</span>
							</div>
						</div>
						<img
							src="/img/procy-night.svg"
							alt="The Procy raccoon runs secure tunnels under a firewall to a router, a server and a workstation."
							width="760"
							height="640"
							class="mx-auto block h-auto w-full max-w-[560px] lg:max-w-none"
						>
					</div>
				</section>
			</div>

			<!-- What it does -->
			<section
				class="mx-auto mt-20 grid w-full max-w-6xl gap-8 px-4 sm:mt-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16"
				aria-labelledby="home-what"
			>
				<div>
					<h2
						id="home-what"
						class="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]"
					>
						One place for the whole fleet
					</h2>
					<p class="mt-3 max-w-sm text-[15px] leading-relaxed text-app-text-3">
						Install the small Procy client on a device and it connects out to the server. Nothing to open on the
						firewall, no VPN to hand out.
					</p>
				</div>
				<ul class="border-t border-app-border">
					<li
						v-for="f in features"
						:key="f.title"
						class="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-b border-app-border py-5 md:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,15rem)] md:items-start"
					>
						<span
							class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-app-muted text-app-accent"
							aria-hidden="true"
						>
							<component
								:is="f.icon"
								class="h-[18px] w-[18px]"
							/>
						</span>
						<div>
							<h3 class="text-[15px] font-semibold text-app-text">
								{{ f.title }}
							</h3>
							<p class="mt-1 text-sm leading-relaxed text-app-text-3">
								{{ f.text }}
							</p>
						</div>
						<p
							class="col-start-2 truncate rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2 font-mono text-xs text-app-text-2 md:col-start-3 md:mt-0.5"
							:title="f.sample"
						>
							<span class="sr-only">Example: </span>{{ f.sample }}
						</p>
					</li>
				</ul>
			</section>

			<!-- Hosted or self-hosted -->
			<section
				class="mx-auto mt-20 w-full max-w-6xl px-4 sm:mt-24 sm:px-6"
				aria-labelledby="home-where"
			>
				<h2
					id="home-where"
					class="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]"
				>
					Hosted or on your own server
				</h2>
				<div class="mt-8 grid gap-4 md:grid-cols-2">
					<div class="rounded-2xl border border-app-border bg-app-surface p-6 sm:p-7">
						<Cloud
							class="h-6 w-6 text-app-accent"
							aria-hidden="true"
						/>
						<h3 class="mt-4 text-[17px] font-semibold">
							Hosted by us
						</h3>
						<p class="mt-2 text-sm leading-relaxed text-app-text-3">
							Create an organization, install the client on your devices, and you’re running. We run the server
							and keep it up to date. New organizations are reviewed by a person before they open.
						</p>
						<AppButton
							to="/signup"
							variant="secondary"
							class="mt-6"
						>
							Start free trial
						</AppButton>
					</div>
					<div class="rounded-2xl border border-app-border bg-app-surface p-6 sm:p-7">
						<Server
							class="h-6 w-6 text-app-accent"
							aria-hidden="true"
						/>
						<h3 class="mt-4 text-[17px] font-semibold">
							Self-hosted
						</h3>
						<p class="mt-2 text-sm leading-relaxed text-app-text-3">
							Run the same server on a machine of your own, with the same features. Your devices and data
							never leave your network. The code is AGPL-3.0, a fork of the open-source rport.
						</p>
						<div class="mt-6 flex flex-wrap gap-3">
							<a
								href="/docs/"
								:class="lightButton"
							>Read the docs</a>
							<a
								href="https://github.com/pohcee/procy-server"
								rel="noopener"
								:class="lightButton"
							>
								<Github
									class="h-4 w-4"
									aria-hidden="true"
								/>Source code
							</a>
						</div>
					</div>
				</div>
			</section>

			<!-- Plans -->
			<section
				class="mx-auto mb-24 mt-20 w-full max-w-6xl px-4 sm:mt-24 sm:px-6"
				aria-labelledby="home-plans"
			>
				<h2
					id="home-plans"
					class="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]"
				>
					Plans
				</h2>
				<p class="mt-3 max-w-xl text-[15px] leading-relaxed text-app-text-3">
					Every organization starts with a free trial, no card needed.
				</p>
				<HomePlans
					class="mt-8"
					:model="plans"
				/>
			</section>
		</main>

		<HomeFooter />
	</div>
</template>

<script setup lang="ts">
import { BookOpen, Building2, Cable, CalendarClock, Cloud, Github, KeyRound, MonitorSmartphone, Server, SquareTerminal } from 'lucide-vue-next';
import HomeFooter from '~/components/home/HomeFooter.vue';
import HomeHeader from '~/components/home/HomeHeader.vue';
import HomePlans from '~/components/home/HomePlans.vue';
import PreviewNotice from '~/components/PreviewNotice.vue';
import { homePlans, type PublicPlan } from '~/utils/plans';

definePageMeta({ layout: false });
useHead({
	title: 'Remote access and management for your devices',
	meta: [{ name: 'description', content: 'Procy: remote access and management for your servers, routers and workstations. Hosted or self-hosted, open source (AGPL).' }],
});

const { $api } = useNuxtApp();

// The catalog (404 without [billing] plans) and the signup settings' trial length; any failure is the static fallback.
const catalog = ref<PublicPlan[] | null>(null);
const signupTrialDays = ref(0);
const plans = computed(() => homePlans(catalog.value, signupTrialDays.value));
onMounted(async () => {
	const [c, s] = await Promise.allSettled([$api.signup.plans(), $api.signup.config()]);
	if (c.status === 'fulfilled') catalog.value = c.value;
	if (s.status === 'fulfilled') signupTrialDays.value = s.value?.trialDays ?? 0;
});

const features = [
	{
		icon: MonitorSmartphone,
		title: 'Devices',
		text: 'Every machine with the client shows up with its operating system, addresses, uptime and whether it’s online. Tag and group them your way.',
		sample: 'db-02   online   Ubuntu 24.04',
	},
	{
		icon: SquareTerminal,
		title: 'Commands and scripts',
		text: 'Run a command or a saved script on one device or a hundred, then read each result side by side.',
		sample: 'systemctl restart nginx',
	},
	{
		icon: Cable,
		title: 'Tunnels',
		text: 'Reach SSH, remote desktop or a web admin page on a device behind NAT, straight from the browser.',
		sample: 'win-reception-02:3389',
	},
	{
		icon: CalendarClock,
		title: 'Schedules',
		text: 'Repeat a command or script on a timetable: backups every night, updates on Sunday morning.',
		sample: '0 3 * * *   backup.sh',
	},
	{
		icon: KeyRound,
		title: 'Vault',
		text: 'Keep shared passwords and keys encrypted on the server, next to the devices they unlock.',
		sample: 'router-admin   ••••••••',
	},
	{
		icon: Building2,
		title: 'Organizations',
		text: 'Invite your team, give each person a role, and keep every customer’s devices apart.',
		sample: 'acme   4 members   38 devices',
	},
];

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const darkButton = `inline-flex h-11 items-center justify-center rounded-[10px] border border-white/25 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 ${focus} focus-visible:outline-[#93B8FF]`;
const darkLink = `inline-flex h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-[#C2CAD6] transition-colors hover:bg-white/10 hover:text-white ${focus} focus-visible:outline-[#93B8FF]`;
const lightButton = `inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-app-border-strong bg-app-surface px-4 text-sm font-medium text-app-text transition-colors hover:bg-app-hover ${focus} focus-visible:outline-app-accent`;
</script>
