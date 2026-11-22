<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script setup lang="ts">
useTheme();

const appName = 'OpenRPort2';
useHead({
	// "Login · OpenRPort2"; plain "OpenRPort2" when a page sets no title.
	titleTemplate: (title?: string) => (title && title !== appName ? `${title} · ${appName}` : appName),
});
</script>

<style>

</style>
