<template>
	<AppCard title="IP addresses">
		<div class="flex flex-col">
			<div
				v-for="family in families"
				:key="family.label"
				class="flex gap-3 border-b border-app-border-subtle py-2.5 last:border-b-0"
			>
				<span class="w-12 flex-none text-[13px] text-app-text-3">{{ family.label }}</span>
				<div class="min-w-0 flex-1">
					<ul
						v-if="family.list.length"
						class="flex flex-col gap-1"
					>
						<li
							v-for="ip in family.expanded ? family.list : family.list.slice(0, 1)"
							:key="ip"
							class="break-all font-mono text-[13px] text-app-text"
						>
							{{ ip }}
						</li>
					</ul>
					<span
						v-else
						class="text-[13px] text-app-text-3"
					>None reported</span>
				</div>
				<button
					v-if="family.list.length > 1"
					type="button"
					:aria-expanded="family.expanded"
					:aria-label="family.expanded ? `Show only the first ${family.label} address` : `Show all ${family.list.length} ${family.label} addresses`"
					class="h-7 flex-none self-start rounded-md px-2 text-xs font-medium text-app-link hover:bg-app-hover"
					@click="family.toggle"
				>
					{{ family.expanded ? 'Less' : `+${family.list.length - 1} more` }}
				</button>
			</div>
		</div>
	</AppCard>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
	ipv4?: string[];
	ipv6?: string[];
}>(), {
	ipv4: () => [],
	ipv6: () => [],
});

const ipv4View = ref(false);
const ipv6View = ref(false);

const families = computed(() => [
	{ label: 'IPv4', list: props.ipv4 ?? [], expanded: ipv4View.value, toggle: () => { ipv4View.value = !ipv4View.value; } },
	{ label: 'IPv6', list: props.ipv6 ?? [], expanded: ipv6View.value, toggle: () => { ipv6View.value = !ipv6View.value; } },
]);
</script>
