<template>
	<!--
		Standard page body: max-width container, responsive padding, page header
		(title + optional description + actions), then the page content.
		Usage:
			<AppPage title="Devices" description="Every client connected to this server.">
				<template #actions><AppButton>…</AppButton></template>
				…content…
			</AppPage>
	-->
	<div class="mx-auto flex w-full max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
		<div
			v-if="title || $slots.actions || $slots.header"
			class="flex flex-wrap items-end justify-between gap-4"
		>
			<slot name="header">
				<div class="min-w-0">
					<h1 class="text-2xl font-bold tracking-tight text-app-text sm:text-[28px] sm:leading-tight">
						{{ title }}
					</h1>
					<p
						v-if="description"
						class="mt-1.5 text-sm text-app-text-3"
					>
						{{ description }}
					</p>
				</div>
			</slot>
			<div
				v-if="$slots.actions"
				class="flex flex-wrap items-center gap-2.5"
			>
				<slot name="actions" />
			</div>
		</div>
		<slot />
	</div>
</template>

<script setup lang="ts">
defineProps<{
	title?: string;
	description?: string;
}>();
</script>
