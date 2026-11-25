<template>
	<!-- The free trial first, then the public plan catalog; without a catalog the trial and a short note. -->
	<div
		class="grid gap-4"
		:class="model.plans.length ? 'md:grid-cols-2 lg:grid-cols-3' : 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center'"
	>
		<article
			class="flex flex-col gap-5 rounded-2xl bg-[#10161F] p-6 text-white ring-1 ring-white/10 sm:p-7"
			aria-labelledby="plan-trial"
		>
			<div>
				<h3
					id="plan-trial"
					class="text-[15px] font-semibold text-[#93B8FF]"
				>
					{{ model.trial.title }}
				</h3>
				<p class="mt-2 text-[32px] font-bold leading-none tracking-tight">
					{{ model.trial.summary }}
				</p>
				<p class="mt-3 text-sm leading-relaxed text-[#C2CAD6]">
					{{ model.trial.detail }}
				</p>
			</div>
			<ul class="flex flex-col gap-2 text-sm text-[#E6EBF2]">
				<li
					v-for="f in trialFeatures"
					:key="f"
					class="flex gap-2"
				>
					<Check
						class="mt-0.5 h-4 w-4 shrink-0 text-[#93B8FF]"
						aria-hidden="true"
					/>{{ f }}
				</li>
			</ul>
			<AppButton
				to="/signup"
				class="mt-auto"
			>
				Start free trial
			</AppButton>
		</article>

		<p
			v-if="!model.plans.length"
			class="max-w-md text-[15px] leading-relaxed text-app-text-2 lg:pl-6"
		>
			Pricing is being finalized. During the preview, every new organization starts with the free trial.
			Questions about a larger fleet? Write to
			<a
				href="mailto:support@procy.sh"
				class="font-medium text-app-link underline underline-offset-2"
			>support@procy.sh</a>.
		</p>

		<article
			v-for="p in model.plans"
			:key="p.id"
			class="flex flex-col gap-5 rounded-2xl border border-app-border bg-app-surface p-6 sm:p-7"
			:aria-labelledby="`plan-${p.id}`"
		>
			<div>
				<div class="flex items-center justify-between gap-3">
					<h3
						:id="`plan-${p.id}`"
						class="text-[15px] font-semibold text-app-text"
					>
						{{ p.name }}
					</h3>
					<span
						v-if="p.trial"
						class="rounded-full bg-app-blue-bg px-2.5 py-0.5 text-xs font-medium text-app-blue"
					>The trial runs on this plan</span>
				</div>
				<p class="mt-2 flex items-baseline gap-1.5">
					<span class="text-[32px] font-bold leading-none tracking-tight text-app-text">{{ p.price }}</span>
					<span
						v-if="p.period"
						class="text-sm text-app-text-3"
					>{{ p.period }}</span>
				</p>
			</div>
			<ul class="flex flex-col gap-2 text-sm text-app-text-2">
				<li
					v-for="f in p.features"
					:key="f"
					class="flex gap-2"
				>
					<Check
						class="mt-0.5 h-4 w-4 shrink-0 text-app-ok"
						aria-hidden="true"
					/>{{ f }}
				</li>
			</ul>
		</article>
	</div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import type { HomePlans } from '~/utils/plans';

defineProps<{ model: HomePlans }>();

const trialFeatures = [
	'Every feature: devices, commands, tunnels, schedules, vault',
	'Invite your team from day one',
];
</script>
