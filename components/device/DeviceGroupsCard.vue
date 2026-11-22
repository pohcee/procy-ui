<template>
	<AppCard title="Groups">
		<div
			v-if="groups?.length"
			class="flex flex-wrap gap-1.5"
		>
			<NuxtLink
				v-for="group in groups"
				:key="group"
				:to="{ path: '/dashboard', query: { group } }"
				class="inline-flex items-center gap-1.5 rounded-md bg-app-chip px-2 py-1 text-xs font-medium text-app-text-2 hover:text-app-link"
			>
				<Boxes
					class="h-3.5 w-3.5 text-app-text-3"
					aria-hidden="true"
				/>
				{{ group }}
			</NuxtLink>
		</div>
		<p
			v-else
			class="text-[13px] text-app-text-3"
		>
			This device is not in any client group.
		</p>
	</AppCard>
</template>

<script setup lang="ts">
import { Boxes } from 'lucide-vue-next';

defineProps<{
	groups?: string[];
}>();
</script>
