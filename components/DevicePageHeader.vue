<template>
	<div class="page-header">
		<div class="d-flex flex-row justify-content-between mb-2">
			<div class="d-flex flex-row">
				<div class="p-2">
					<!--                    <IconBrandDebian color="red"/> -->
					<component :is="IconComponent" />
				</div>
				<div class="p-2">
					<h2 class="page-title">
						{{ title?.toUpperCase() }}
					</h2>
				</div>
				<div class="p-2">
					<span class="badge bg-lime text-blue-fg tag-status badge-empty mt-2" />
				</div>
				<slot name="description" />
			</div>
			<div class="p-2">
				<slot name="action" />
			</div>
		</div>
		<div class="d-flex flex-row" />
	</div>
</template>

<script setup>
import { IconBrandDebian } from '@tabler/icons-vue';

defineProps({
	title: {
		type: String,
	},
	description: {
		type: String,
	},
	hasAction: {
		type: String,
	},
	actionName: {
		type: String,
	},
	isOnline: {
		type: Boolean,
	},
	brand: {
		type: String,
	},
});
const IconComponent = IconBrandDebian;
</script>
