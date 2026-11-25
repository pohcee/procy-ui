<template>
	<!-- What an operator decides a signup on (domain, free mail, MX, method, waiting time, duplicates), as small chips. -->
	<ul
		class="mt-1 flex flex-wrap gap-1"
		aria-label="Signup facts"
	>
		<li
			v-for="f in signupFacts(row, now)"
			:key="f.text"
			:title="f.title"
			:class="['rounded px-1.5 py-px text-[11px] font-medium leading-4', tones[f.tone]]"
		>
			<span
				v-if="f.title"
				class="sr-only"
			>{{ f.title }}: </span>{{ f.text }}
		</li>
	</ul>
</template>

<script setup lang="ts">
import { signupFacts, type SignupFact, type SignupRow } from '~/utils/signup';

defineProps<{ row: SignupRow; now: Date }>();

const tones: Record<SignupFact['tone'], string> = {
	ok: 'bg-app-ok-bg text-app-ok',
	warn: 'bg-app-warn-bg text-app-warn',
	danger: 'bg-app-danger-bg text-app-danger',
	info: 'bg-app-blue-bg text-app-blue',
	neutral: 'bg-app-chip text-app-text-2',
};
</script>
