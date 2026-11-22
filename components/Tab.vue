<template>
	<div>
		<slot v-if="isActive" />
	</div>
</template>

<script setup>
defineOptions({ name: 'TabPanel' });

defineProps({
	isActive: {
		type: Boolean,
		required: true,
	},
});
</script>
