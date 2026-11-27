<!-- The system organization's own audit log: every operator action (the page of /audits, in the console). -->
<template>
	<AuditsPage />
</template>

<script setup lang="ts">
import AuditsPage from '~/pages/Audits.vue';

definePageMeta({ layout: 'operator' });
useHead({ title: 'Audit log' });
</script>
