<template>
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-[15px] font-semibold text-app-text">
			New tunnel
		</h2>
		<AppButton
			variant="ghost"
			size="sm"
			@click="handleCancel"
		>
			Cancel
		</AppButton>
	</div>
</template>

<script setup lang="ts">
const emits = defineEmits<{
	cancel: [];
}>();
const handleCancel = () => {
	emits('cancel');
};
</script>
