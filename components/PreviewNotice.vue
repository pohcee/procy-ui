<template>
	<!-- The service is in preview (design decision 2026-11-25): one notice, shown on the home and signup pages. -->
	<p
		:class="[
			'flex items-start gap-2.5 rounded-xl border border-app-blue/20 bg-app-blue-bg text-app-blue',
			compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-3 text-sm',
		]"
	>
		<Sprout
			:class="['shrink-0', compact ? 'mt-px h-4 w-4' : 'mt-0.5 h-[18px] w-[18px]']"
			aria-hidden="true"
		/>
		<span><strong class="font-semibold">Preview</strong> — we're just starting out; features and plans may change.</span>
	</p>
</template>

<script setup lang="ts">
import { Sprout } from 'lucide-vue-next';

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });
</script>
