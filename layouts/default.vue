<template>
	<div>
		<!-- Platform operators get the console shell everywhere (settings too), never the organization navigation. -->
		<OperatorShell v-if="operator">
			<slot />
		</OperatorShell>
		<AppShell v-else>
			<slot />
		</AppShell>
		<NuxtSnackbar />
	</div>
</template>

<script setup lang="ts">
import OperatorShell from '~/components/operator/console/OperatorShell.vue';

const { operator } = useCapabilities();
</script>
