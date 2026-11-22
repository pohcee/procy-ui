<template>
	<!-- The app shell gives each page a full-height region; this makes it scroll. -->
	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
		<slot />
	</div>
</template>

<script setup lang="ts">
// `is-extra` is still passed by some pages; accepted for compatibility.
defineProps<{ isExtra?: string | boolean }>();
</script>
