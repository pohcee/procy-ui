<template>
	<new-page-wrapper>
		<AppPage
			title="Execute"
			description="Run a command or script on one or many devices and watch results arrive live."
		>
			<RunWorkspace :initial-client-ids="initialClientIds" />
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import RunWorkspace from '~/components/run/RunWorkspace.vue';

// /execute?clients=id1,id2 (or ?clients=id1&clients=id2) starts with those devices as targets,
// e.g. a selection made on the device list.
const route = useRoute();
const initialClientIds = computed(() => {
	const raw = route.query.clients;
	return (Array.isArray(raw) ? raw : [raw])
		.flatMap(v => (v ?? '').split(','))
		.map(v => v.trim())
		.filter(Boolean);
});
</script>
