<template>
	<NuxtLink
		to="/dashboard"
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
withDefaults(defineProps<{ size?: number }>(), { size: 36 });

const appName = 'Procy';
</script>
