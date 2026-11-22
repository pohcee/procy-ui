import { useLocalStorage } from '@vueuse/core';
import type { Ref } from 'vue';
import type { Client } from '~/types';

/** A client counts as online when the server reports it connected (falls back to disconnected_at). */
export function isClientOnline(client: Partial<Client> | null | undefined): boolean {
	if (!client) return false;
	if (client.connection_state) return client.connection_state === 'connected';
	return client.disconnected_at == null;
}

export function relativeTime(value: string | Date | null | undefined): string {
	if (!value) return '';
	const date = new Date(value);
	const diff = Date.now() - date.getTime();
	if (Number.isNaN(diff)) return '';
	const minutes = Math.round(diff / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} h ago`;
	const days = Math.round(hours / 24);
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days} days ago`;
	return date.toLocaleDateString();
}

export function osLabel(client: Partial<Client> | null | undefined): string {
	if (!client) return '';
	return client.os_full_name || client.os_kernel || client.os || '';
}

export interface UpdatesInfo {
	text: string;
	tone: 'none' | 'ok' | 'pending' | 'security';
	pending: number;
	security: number;
}

export function updatesInfo(client: Partial<Client> | null | undefined): UpdatesInfo {
	const status = client?.updates_status;
	if (!status) {
		return { text: isClientOnline(client) ? 'Not reported' : 'Unknown (offline)', tone: 'none', pending: 0, security: 0 };
	}
	const pending = status.updates_available ?? 0;
	const security = status.security_updates_available ?? 0;
	if (security > 0) return { text: `${pending} pending · ${security} security`, tone: 'security', pending, security };
	if (pending > 0) return { text: `${pending} pending`, tone: 'pending', pending, security };
	return { text: 'Up to date', tone: 'ok', pending, security };
}

export const updatesToneClass: Record<UpdatesInfo['tone'], string> = {
	none: 'text-app-text-3',
	ok: 'text-app-text-3',
	pending: 'font-medium text-app-text-2',
	security: 'font-semibold text-app-warn',
};

let favoritesRef: Ref<string[]> | null = null;

/**
 * Favourite devices. The rport server has no per-user favourites, so they are kept in this
 * browser's local storage (shared between the device list and the device page).
 */
export function useFavoriteDevices() {
	if (!favoritesRef) {
		favoritesRef = useLocalStorage<string[]>('openrport-favorite-devices', []);
	}
	const favorites = favoritesRef;
	const isFavorite = (id: string | undefined) => !!id && favorites.value.includes(id);
	const toggleFavorite = (id: string | undefined) => {
		if (!id) return;
		favorites.value = isFavorite(id)
			? favorites.value.filter(f => f !== id)
			: [...favorites.value, id];
	};
	return { favorites, isFavorite, toggleFavorite };
}
