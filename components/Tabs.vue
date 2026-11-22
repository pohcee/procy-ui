<template>
	<div
		role="tablist"
		class="scrollbar-hide flex gap-1 overflow-x-auto overflow-y-hidden border-b border-app-border"
	>
		<button
			v-for="(tab, index) in tabs"
			:key="index"
			type="button"
			role="tab"
			:aria-selected="activeTabIndex === index"
			:class="[
				'-mb-px inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
				activeTabIndex === index
					? 'border-app-accent text-app-text'
					: 'border-transparent text-app-text-3 hover:text-app-text',
			]"
			@click="activateTab(index)"
		>
			<component
				:is="tab.icon"
				v-if="tab.icon"
				class="h-4 w-4"
				aria-hidden="true"
			/>
			{{ tab.title }}
		</button>
	</div>

	<div class="pt-4">
		<slot :active-tab-index="activeTabIndex" />
	</div>
</template>

<script setup>
import { ref } from 'vue';

defineOptions({ name: 'TabGroup' });

const props = defineProps({
	defaultTabIndex: {
		type: Number,
		default: 0,
	},
	tabs: {
		type: Array,
		required: true,
	},
});
const activeTabIndex = ref(props.defaultTabIndex);

const activateTab = (index) => {
	activeTabIndex.value = index;
};
</script>
