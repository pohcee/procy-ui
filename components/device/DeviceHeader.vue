<template>
	<header class="border-b border-app-border bg-app-surface">
		<div class="mx-auto w-full max-w-[1280px] px-4 pt-2 sm:px-6 sm:pt-5 lg:px-8">
			<!-- Phone: back row -->
			<div class="-ml-2 flex items-center gap-1 md:hidden">
				<NuxtLink
					to="/dashboard"
					aria-label="Back to devices"
					class="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-app-text hover:bg-app-hover"
				>
					<ChevronLeft
						class="h-5 w-5"
						aria-hidden="true"
					/>
				</NuxtLink>
				<span class="mr-auto text-[15px] font-semibold text-app-text">Devices</span>
				<DeviceActionsMenu
					:device="device"
					@action="emit('action', $event)"
				/>
			</div>

			<!-- Desktop: breadcrumb -->
			<nav
				aria-label="Breadcrumb"
				class="hidden items-center gap-2 text-[13px] text-app-text-3 md:flex"
			>
				<NuxtLink
					to="/dashboard"
					class="text-app-text-2 hover:text-app-link hover:underline"
				>Devices</NuxtLink>
				<template v-if="device?.groups?.length">
					<span aria-hidden="true">/</span>
					<span>{{ device.groups[0] }}</span>
				</template>
				<span aria-hidden="true">/</span>
				<span
					aria-current="page"
					class="truncate font-medium text-app-text"
				>{{ device?.name || deviceId }}</span>
			</nav>

			<div class="mt-2 flex flex-wrap items-center justify-between gap-4 md:mt-3.5">
				<div class="flex min-w-0 items-center gap-3.5">
					<ClientIcon
						:os-full-name="device?.os_full_name"
						:os-kernel="device?.os_kernel"
						:os-family="device?.os_family"
						:os="device?.os"
						:tile="48"
						:size="26"
					/>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
							<h1 class="break-all font-mono text-xl font-medium tracking-tight text-app-text sm:text-2xl">
								{{ device?.name || deviceId }}
							</h1>
							<span
								:class="[
									'inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold',
									online ? 'bg-app-ok-bg text-app-ok' : 'bg-app-muted text-app-text-3',
								]"
							>
								<span
									aria-hidden="true"
									:class="['h-[7px] w-[7px] rounded-full', online ? 'bg-[#22C55E]' : 'border-2 border-app-text-4']"
								/>
								{{ online ? 'Online' : 'Offline' }}
							</span>
							<button
								type="button"
								:aria-label="favorite ? 'Remove from favorites' : 'Add to favorites'"
								:aria-pressed="favorite"
								class="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-app-hover"
								@click="toggleFavorite(device?.id)"
							>
								<Star
									:class="['h-[18px] w-[18px]', favorite ? 'fill-[#D97706] text-[#D97706]' : 'text-app-text-3']"
									aria-hidden="true"
								/>
							</button>
						</div>
						<div class="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-app-text-3">
							<span
								v-if="device?.ipv4?.length"
								class="font-mono"
							>{{ device.ipv4[0] }}</span>
							<span v-if="osName">{{ osName }}</span>
							<span v-if="device?.os_arch">{{ device.os_arch }}</span>
							<span v-if="!online && device?.disconnected_at">Last seen {{ relativeTime(device.disconnected_at) }}</span>
						</div>
					</div>
				</div>

				<!-- Desktop actions -->
				<div class="hidden flex-wrap items-center gap-2.5 md:flex">
					<AppButton
						variant="secondary"
						@click="emit('action', 'tunnel')"
					>
						<Cable
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Open tunnel
					</AppButton>
					<AppButton @click="emit('action', 'command')">
						<Terminal
							class="h-4 w-4"
							aria-hidden="true"
						/>
						Run command
					</AppButton>
					<DeviceActionsMenu
						:device="device"
						bordered
						@action="emit('action', $event)"
					/>
				</div>
			</div>

			<!-- Phone actions -->
			<div class="mt-3.5 grid grid-cols-2 gap-2.5 md:hidden">
				<button
					type="button"
					class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-app-accent text-[15px] font-semibold text-white hover:bg-app-accent-hover"
					@click="emit('action', 'command')"
				>
					<Terminal
						class="h-[18px] w-[18px]"
						aria-hidden="true"
					/>
					Run
				</button>
				<button
					type="button"
					class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-app-border-strong bg-app-surface text-[15px] font-medium text-app-text hover:bg-app-hover"
					@click="emit('action', 'tunnel')"
				>
					<Cable
						class="h-[18px] w-[18px]"
						aria-hidden="true"
					/>
					Tunnel
				</button>
			</div>

			<slot />
		</div>
	</header>
</template>

<script setup lang="ts">
import { Cable, ChevronLeft, Star, Terminal } from 'lucide-vue-next';
import ClientIcon from '~/components/device/ClientIcon.vue';
import DeviceActionsMenu from '~/components/device/DeviceActionsMenu.vue';
import { isClientOnline, osLabel, relativeTime, useFavoriteDevices } from '~/components/device/deviceHelpers';
import type { Client } from '~/types';

const props = defineProps<{
	device: Client;
	deviceId?: string;
}>();

const emit = defineEmits<{
	(e: 'action', action: string): void;
}>();

const { isFavorite, toggleFavorite } = useFavoriteDevices();
const online = computed(() => isClientOnline(props.device));
const favorite = computed(() => isFavorite(props.device?.id));
const osName = computed(() => osLabel(props.device));
</script>
