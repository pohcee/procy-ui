<template>
	<HeadlessMenu
		as="div"
		class="relative"
	>
		<HeadlessMenuButton
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
		</HeadlessMenuButton>
		<transition
			enter-active-class="transition duration-100 ease-out"
			enter-from-class="scale-95 opacity-0"
			enter-to-class="scale-100 opacity-100"
			leave-active-class="transition duration-75 ease-in"
			leave-from-class="scale-100 opacity-100"
			leave-to-class="scale-95 opacity-0"
		>
			<HeadlessMenuItems
				class="absolute right-0 z-40 mt-2 w-max min-w-[14rem] max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-app-border bg-app-surface p-1.5 text-left shadow-lg focus:outline-none"
			>
				<HeadlessMenuItem
					v-for="item in items"
					:key="item.id"
					v-slot="{ active }"
				>
					<button
						type="button"
						:class="['flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-left text-sm text-app-text', active ? 'bg-app-hover' : '']"
						@click="emit('action', item.id)"
					>
						<component
							:is="item.icon"
							class="h-4 w-4 shrink-0 text-app-text-3"
							aria-hidden="true"
						/>
						{{ item.label }}
					</button>
				</HeadlessMenuItem>
			</HeadlessMenuItems>
		</transition>
	</HeadlessMenu>
</template>

<script setup lang="ts">
import { Cable, ClipboardCopy, FileClock, KeyRound, MoreHorizontal, RefreshCw, Star, Tags, Terminal } from 'lucide-vue-next';
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

const items = computed(() => {
	const fav = isFavorite(props.device?.id);
	const favItem = { id: 'favorite', label: fav ? 'Remove from favorites' : 'Add to favorites', icon: Star };
	if (props.list) {
		return [
			{ id: 'command', label: 'Run command', icon: Terminal },
			...(canCreateTunnels.value ? [{ id: 'tunnel', label: 'Open tunnel', icon: Cable }] : []),
			favItem,
			{ id: 'copy-id', label: 'Copy client ID', icon: ClipboardCopy },
		];
	}
	return [
		{ id: 'tags', label: 'Edit tags & labels', icon: Tags },
		{ id: 'reload', label: 'Reload device data', icon: RefreshCw },
		favItem,
		{ id: 'copy-id', label: 'Copy client ID', icon: ClipboardCopy },
		{ id: 'audit', label: 'View audit log', icon: FileClock },
		...(props.device?.client_auth_id ? [{ id: 'client-access', label: 'Client access credentials', icon: KeyRound }] : []),
	];
});
</script>
