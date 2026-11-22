<template>
	<AppCard title="Allowed user groups">
		<template #actions>
			<AppButton
				variant="secondary"
				size="sm"
			>
				<Pencil
					class="h-3.5 w-3.5"
					aria-hidden="true"
				/>
				Edit
			</AppButton>
		</template>
		<div class="flex flex-wrap items-center gap-1.5 text-[13px] text-app-text">
			<span class="rounded-md bg-app-chip px-2 py-1 text-xs font-medium text-app-text-2">Operations</span>
			<span class="text-app-text-3">+</span>
			<span class="italic text-app-text-2">Administrators</span>
		</div>
	</AppCard>
</template>

<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
</script>
