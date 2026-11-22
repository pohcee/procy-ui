<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script setup lang="ts">
import { clearLegacyAuthCookies } from '~/utils/authToken';

useTheme();

// Drop auth cookies left by the original rport UI / earlier builds (see utils/authToken.ts).
onMounted(() => clearLegacyAuthCookies());

const appName = 'OpenRPort2';
useHead({
	// "Login · OpenRPort2"; plain "OpenRPort2" when a page sets no title.
	titleTemplate: (title?: string) => (title && title !== appName ? `${title} · ${appName}` : appName),
});
</script>

<style>

</style>
