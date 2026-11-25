<template>
	<!-- The operator console (/operator/...): platform operators only. -->
	<div>
		<OperatorShell>
			<slot />
		</OperatorShell>
		<NuxtSnackbar />
	</div>
</template>

<script setup lang="ts">
import OperatorShell from '~/components/operator/console/OperatorShell.vue';
</script>
