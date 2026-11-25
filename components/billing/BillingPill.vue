<template>
	<!-- A billing status: icon + label, never colour alone. -->
	<span
		:class="[
			'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-semibold',
			toneClass[tone],
		]"
	>
		<component
			:is="toneIcon[tone]"
			class="h-3.5 w-3.5 shrink-0"
			:stroke-width="2.4"
			aria-hidden="true"
		/>
		{{ label }}
	</span>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, CircleDot, CircleMinus, Clock } from 'lucide-vue-next';
import type { Tone } from '~/utils/billing';

defineProps<{ label: string; tone: Tone }>();

const toneClass: Record<Tone, string> = {
	ok: 'bg-app-ok-bg text-app-ok',
	warn: 'bg-app-warn-bg text-app-warn',
	danger: 'bg-app-danger-bg text-app-danger',
	info: 'bg-app-blue-bg text-app-blue',
	neutral: 'bg-app-chip text-app-text-2',
};
const toneIcon = { ok: CircleCheck, warn: Clock, danger: CircleAlert, info: CircleDot, neutral: CircleMinus };
</script>
