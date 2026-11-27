<template>
	<DropdownMenu>
		<DropdownMenuTrigger as-child>
			<button
				type="button"
				:aria-label="`More actions for ${device?.name || 'this device'}`"
				:class="[
					'inline-flex items-center justify-center text-app-text-2 hover:bg-app-hover hover:text-app-text',
					bordered ? 'h-11 w-11 rounded-[10px] border border-app-border-strong bg-app-surface' : small ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-[10px]',
				]"
			>
				<MoreHorizontal
					class="h-4 w-4"
					aria-hidden="true"
				/>
			</button>
		</DropdownMenuTrigger>
		<DropdownMenuContent
			align="end"
			:side-offset="8"
			class="z-40 w-max min-w-[14rem] max-w-[calc(100vw-2rem)] rounded-xl border border-app-border bg-app-surface p-1.5 text-left text-app-text shadow-lg"
		>
			<DropdownMenuItem
				v-for="item in items"
				:key="item.id"
				:class="[
					'flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-left text-sm focus:bg-app-hover data-[highlighted]:bg-app-hover',
					item.danger ? 'text-app-danger focus:text-app-danger' : 'text-app-text focus:text-app-text',
				]"
				@select="emit('action', item.id)"
			>
				<component
					:is="item.icon"
					:class="['h-4 w-4 shrink-0', item.danger ? 'text-app-danger' : 'text-app-text-3']"
					aria-hidden="true"
				/>
				{{ item.label }}
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { Cable, ClipboardCopy, FileClock, KeyRound, MoreHorizontal, RefreshCw, Star, Tags, Terminal, Trash2 } from 'lucide-vue-next';
import type { Client } from '~/types';
import { useFavoriteDevices } from '~/components/device/deviceHelpers';

const props = defineProps<{
	device?: Partial<Client>;
	bordered?: boolean;
	small?: boolean;
	/** Row menu in the device list: adds navigation-type entries. */
	list?: boolean;
}>();

const emit = defineEmits<{
	(e: 'action', action: string): void;
}>();

const { isFavorite } = useFavoriteDevices();
const { canCreateTunnels } = useCapabilities();

interface MenuItem { id: string; label: string; icon: Component; danger?: boolean }

const items = computed<MenuItem[]>(() => {
	const fav = isFavorite(props.device?.id);
	const favItem = { id: 'favorite', label: fav ? 'Remove from favorites' : 'Add to favorites', icon: Star };
	const deleteItem = { id: 'delete', label: 'Delete device…', icon: Trash2, danger: true };
	if (props.list) {
		return [
			{ id: 'command', label: 'Run command', icon: Terminal },
			...(canCreateTunnels.value ? [{ id: 'tunnel', label: 'Open tunnel', icon: Cable }] : []),
			favItem,
			{ id: 'copy-id', label: 'Copy client ID', icon: ClipboardCopy },
			deleteItem,
		];
	}
	return [
		{ id: 'tags', label: 'Edit tags & labels', icon: Tags },
		{ id: 'reload', label: 'Reload device data', icon: RefreshCw },
		favItem,
		{ id: 'copy-id', label: 'Copy client ID', icon: ClipboardCopy },
		{ id: 'audit', label: 'View audit log', icon: FileClock },
		...(props.device?.client_auth_id ? [{ id: 'client-access', label: 'Client access credentials', icon: KeyRound }] : []),
		deleteItem,
	];
});
</script>
