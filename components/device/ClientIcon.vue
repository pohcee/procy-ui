<template>
	<!-- Decorative OS tile: tinted square with the OS logo. The OS name is always shown as text next to it. -->
	<span
		aria-hidden="true"
		:class="['os-tile inline-flex flex-none items-center justify-center', `os-${logo.tone}`]"
		:style="{ width: `${tile}px`, height: `${tile}px`, borderRadius: `${Math.round(tile / 4)}px` }"
	>
		<Icon
			:name="logo.icon"
			:size="`${iconSize}px`"
			mode="svg"
		/>
	</span>
</template>

<script setup lang="ts">
type Tone = 'ub' | 'db' | 'al' | 'ok' | 'blue' | 'purple' | 'danger' | 'muted';

const props = defineProps({
	osFullName: {
		type: String,
		default: undefined,
	},
	osKernel: {
		type: String,
		default: undefined,
	},
	osFamily: {
		type: String,
		default: undefined,
	},
	os: {
		type: String,
		default: undefined,
	},
	/** Icon size in px. Defaults to ~55% of the tile. */
	size: {
		type: Number,
		default: undefined,
	},
	/** Tile (square) size in px. */
	tile: {
		type: Number,
		default: 28,
	},
});

const iconSize = computed(() => props.size ?? Math.round(props.tile * 0.55));

const icons: Record<string, { icon: string; tone: Tone }> = {
	default: { icon: 'mdi:server', tone: 'muted' },
	ubuntu: { icon: 'mdi:ubuntu', tone: 'ub' },
	debian: { icon: 'mdi:debian', tone: 'db' },
	apple: { icon: 'mdi:apple', tone: 'muted' },
	aws: { icon: 'mdi:aws', tone: 'ub' },
	centos: { icon: 'mdi:centos', tone: 'purple' },
	fedora: { icon: 'mdi:fedora', tone: 'blue' },
	freebsd: { icon: 'mdi:freebsd', tone: 'danger' },
	linux: { icon: 'mdi:linux', tone: 'muted' },
	alpine: { icon: 'mdi:linux', tone: 'al' },
	oracle: { icon: 'mdi:database', tone: 'danger' },
	rocky: { icon: 'mdi:linux', tone: 'ok' },
	redhat: { icon: 'mdi:redhat', tone: 'danger' },
	suse: { icon: 'mdi:linux', tone: 'ok' },
	windows: { icon: 'mdi:microsoft-windows', tone: 'blue' },
	axisIpCamera: { icon: 'mdi:camera', tone: 'purple' },
	almalinux: { icon: 'mdi:linux', tone: 'al' },
	arch: { icon: 'mdi:arch', tone: 'al' },
};

const getLinuxIcon = (osFullName?: string, osFamily?: string, os?: string) => {
	const lower = osFullName?.toLowerCase() || '';
	const firstWord = lower.trim().split(' ')[0];

	switch (true) {
		case lower.includes('debian'):
			return icons.debian;
		case lower.includes('ubuntu'):
			return icons.ubuntu;
		case lower.includes('fedora'):
			return icons.fedora;
		case lower.includes('alpine'):
			return icons.alpine;
		case lower.includes('rocky'):
			return icons.rocky;
		case lower.includes('suse'):
			return icons.suse;
		case lower.includes('centos'):
			return icons.centos;
		case firstWord === 'axis':
			return icons.axisIpCamera;
		case firstWord === 'almalinux':
			return icons.almalinux;
		case firstWord === 'oracle':
			return icons.oracle;
		case osFamily === 'arch':
			return icons.arch;
		case os?.toLowerCase().includes('ubuntu'):
			return icons.ubuntu;
		case osFamily === 'debian':
			return icons.debian;
		case osFamily === 'fedora':
			return icons.fedora;
		case osFamily === 'alpine':
			return icons.alpine;
		case osFamily === 'rhel' && os?.includes('compute'):
			return icons.aws;
		case osFamily === 'rhel':
			return icons.redhat;
		case osFamily === 'suse':
			return icons.suse;
		default:
			return icons.linux;
	}
};

const logo = computed(() => {
	switch (props.osKernel) {
		case 'linux':
			return getLinuxIcon(props.osFullName, props.osFamily, props.os);
		case 'windows':
			return icons.windows;
		case 'darwin':
		case 'macos':
			return icons.apple;
		case 'freebsd':
			return icons.freebsd;
		default:
			return icons.default;
	}
});
</script>

<style>
/* OS tile tints from the redesign (light, then dark). */
.os-ub { background: #FDEBE3; color: #9A3412; }
.os-db { background: #FCE7EF; color: #9D174D; }
.os-al { background: #E0F2FE; color: #075985; }
.os-ok { background: rgb(var(--app-ok-bg)); color: rgb(var(--app-ok)); }
.os-blue { background: rgb(var(--app-blue-bg)); color: rgb(var(--app-blue)); }
.os-purple { background: rgb(var(--app-purple-bg)); color: rgb(var(--app-purple)); }
.os-danger { background: rgb(var(--app-danger-bg)); color: rgb(var(--app-danger)); }
.os-muted { background: rgb(var(--app-chip)); color: rgb(var(--app-text-2)); }
.dark .os-ub { background: #3A1E12; color: #FDBA8C; }
.dark .os-db { background: #3A1428; color: #F9A8D4; }
.dark .os-al { background: #0E2A3D; color: #7DD3FC; }
</style>
