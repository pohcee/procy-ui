<template>
	<new-page-wrapper>
		<AppPage
			title="Execute"
			description="Run a command or script on one or many devices and watch results arrive live."
		>
			<RunWorkspace />
		</AppPage>
	</new-page-wrapper>
</template>

<script setup lang="ts">
import RunWorkspace from '~/components/run/RunWorkspace.vue';
</script>
