import type { Ref } from 'vue';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DiskUsage, QueryParams, TunnelPayload } from '~/types';

// Local equivalent of @tanstack/vue-table's `Updater` (the package is not installed).
type Updater<T> = T | ((old: T) => T);

export function valueUpdater<T>(updaterOrValue: Updater<T>, ref: Ref<T>) {
	ref.value
		= typeof updaterOrValue === 'function'
			? (updaterOrValue as (old: T) => T)(ref.value)
			: updaterOrValue;
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function randomPassword(length: number) {
	const characters = '!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const passwordArray = [];
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		passwordArray.push(characters[randomIndex]);
	}

	return passwordArray.join('');
}
export function randomSanitizedPassword(length: number) {
	const characters = '_+-.:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const passwordArray = [];
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		passwordArray.push(characters[randomIndex]);
	}

	return passwordArray.join('');
}
export function randomID(length: number) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const IDArray = [];
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		IDArray.push(characters[randomIndex]);
	}
	return IDArray.join('');
}
export function formatedDate(dateString: string) {
	const date = new Date(dateString);
	return `${date.getUTCDate().toString().padStart(2, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCFullYear().toString().substr(-2)} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} UTC`;
}
export function bytesToSize(bytes: number): string {
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	if (bytes === 0) return 'n/a';
	const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))), 10);
	if (i === 0) return `${bytes} ${sizes[i]})`;
	return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}

// The mountpoints monitoring payload is a flat map keyed as "<metric>.<mountName>",
// e.g. { "free_b./": 123, "total_b./": 456 } - the agent only ever reports free_b/total_b.
export function parseMountpoints(raw: Record<string, number> | undefined): DiskUsage[] {
	if (!raw) return [];
	const byMount = new Map<string, { free?: number; total?: number }>();
	for (const [key, value] of Object.entries(raw)) {
		let mount: string | undefined;
		let field: 'free' | 'total' | undefined;
		if (key.startsWith('free_b.')) {
			mount = key.slice('free_b.'.length);
			field = 'free';
		}
		else if (key.startsWith('total_b.')) {
			mount = key.slice('total_b.'.length);
			field = 'total';
		}
		if (!mount || !field) continue;
		const entry = byMount.get(mount) ?? {};
		entry[field] = value;
		byMount.set(mount, entry);
	}

	const disks: DiskUsage[] = [];
	for (const [mount, entry] of byMount) {
		if (entry.free === undefined || entry.total === undefined) continue;
		disks.push({
			mount,
			free: entry.free,
			total: entry.total,
			usedPercent: entry.total > 0 ? ((entry.total - entry.free) / entry.total) * 100 : 0,
		});
	}
	return disks.sort((a, b) => a.mount.localeCompare(b.mount));
}

export function toQueryString(params: QueryParams | TunnelPayload): string {
	const queryParams = Object.entries(params)
		.filter(([_, value]) => value !== undefined && value !== null)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&');
	return queryParams ? `?${queryParams}` : '';
}
