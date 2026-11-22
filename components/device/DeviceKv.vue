<template>
	<!-- Key/value list used by the device cards (label column + value column; stacks on narrow cards). -->
	<dl class="grid grid-cols-1 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[minmax(110px,170px)_minmax(0,1fr)] sm:gap-y-2.5">
		<template
			v-for="item in items"
			:key="item.label"
		>
			<dt class="text-app-text-3">
				{{ item.label }}
			</dt>
			<dd
				:class="['mb-2 min-w-0 text-app-text [overflow-wrap:anywhere] sm:mb-0', item.mono ? 'font-mono' : '']"
			>
				<NuxtLink
					v-if="item.to && item.value"
					:to="item.to"
					class="text-app-link hover:underline"
				>
					{{ item.value }}
				</NuxtLink>
				<template v-else>
					{{ item.value === undefined || item.value === null || item.value === '' ? '—' : item.value }}
				</template>
			</dd>
		</template>
	</dl>
</template>

<script setup lang="ts">
export interface KvItem {
	label: string;
	value?: string | number | null;
	mono?: boolean;
	to?: string;
}

defineProps<{
	items: KvItem[];
}>();
</script>
