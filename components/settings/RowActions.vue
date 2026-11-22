<template>
	<!-- Row "more" menu used by the settings tables and phone cards. -->
	<DropdownMenu>
		<DropdownMenuTrigger as-child>
			<button
				type="button"
				:aria-label="label"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-3 transition-colors hover:bg-app-hover hover:text-app-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-accent"
			>
				<MoreHorizontal
					class="h-5 w-5"
					aria-hidden="true"
				/>
			</button>
		</DropdownMenuTrigger>
		<DropdownMenuContent
			align="end"
			class="w-max min-w-[13rem] rounded-xl border border-app-border bg-app-surface p-1 text-app-text shadow-lg"
		>
			<template
				v-for="(item, index) in items"
				:key="item.label"
			>
				<DropdownMenuSeparator
					v-if="item.danger && index > 0"
					class="my-1 h-px bg-app-border-subtle"
				/>
				<DropdownMenuItem
					:class="[
						'flex min-h-[36px] w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-sm focus:bg-app-hover',
						item.danger ? 'text-app-danger focus:text-app-danger' : 'text-app-text focus:text-app-text',
					]"
					@click="item.action()"
				>
					<component
						:is="item.icon"
						v-if="item.icon"
						class="h-4 w-4 shrink-0"
						aria-hidden="true"
					/>
					<span>{{ item.label }}</span>
				</DropdownMenuItem>
			</template>
		</DropdownMenuContent>
	</DropdownMenu>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { MoreHorizontal } from 'lucide-vue-next';

interface RowAction {
	label: string;
	icon?: Component;
	danger?: boolean;
	action: () => void;
}

withDefaults(defineProps<{
	items: RowAction[];
	label?: string;
}>(), {
	label: 'More actions',
});
</script>
