<template>
	<div class="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-app-bg px-6 text-center font-sans text-app-text">
		<img
			src="/favicon.svg"
			alt=""
			width="72"
			height="72"
			class="block h-[72px] w-[72px]"
		>
		<div>
			<p class="font-mono text-sm font-medium text-app-text-3">
				{{ error?.statusCode ?? 'Error' }}
			</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
				{{ heading }}
			</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-app-text-3">
				{{ detail }}
			</p>
		</div>
		<AppButton @click="goHome">
			Back to devices
		</AppButton>
	</div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError | null }>();

// error.vue renders instead of app.vue, so apply the user's theme here too.
useTheme();

const notFound = computed(() => props.error?.statusCode === 404);
const heading = computed(() => (notFound.value ? 'Page not found' : 'Something went wrong'));
const detail = computed(() => (notFound.value
	? 'This page doesn’t exist in Procy. It may have been removed or the link is out of date.'
	: (props.error?.message || 'An unexpected error occurred.')));

useHead({ title: computed(() => heading.value) });

const goHome = () => clearError({ redirect: '/dashboard' });
</script>
