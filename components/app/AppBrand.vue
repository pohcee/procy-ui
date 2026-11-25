<template>
	<NuxtLink
		:to="to"
		class="flex items-center gap-2.5"
		:aria-label="`${appName} home`"
	>
		<img
			src="/favicon.svg"
			alt=""
			:width="size"
			:height="size"
			:style="{ width: `${size}px`, height: `${size}px` }"
			class="block shrink-0"
		>
		<span class="text-[15px] font-bold tracking-tight text-white">{{ appName }}</span>
	</NuxtLink>
</template>

<script setup lang="ts">
// `to`: the home of the shell (the operator console links to /operator).
withDefaults(defineProps<{ size?: number; to?: string }>(), { size: 36, to: '/dashboard' });

const appName = 'Procy';
</script>
