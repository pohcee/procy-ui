import { useMutationObserver } from '@vueuse/core';

const SERIES_LIGHT = ['#2563EB', '#7C3AED', '#0F766E', '#C2410C', '#BE185D'];
const SERIES_DARK = ['#60A5FA', '#C084FC', '#2DD4BF', '#FB923C', '#F472B6'];

function readToken(name: string, fallback: string): string {
	if (typeof window === 'undefined') return fallback;
	const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return raw ? `rgb(${raw.split(/\s+/).join(', ')})` : fallback;
}

/**
 * Chart colours for the device charts, derived from the app tokens. Tracks the `dark` class on <html>
 * directly, so it is right for light, dark and "system" theme alike.
 */
export function useDeviceChartTheme() {
	const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
	if (typeof document !== 'undefined') {
		useMutationObserver(document.documentElement, () => {
			isDark.value = document.documentElement.classList.contains('dark');
		}, { attributes: true, attributeFilter: ['class'] });
	}

	const colors = computed(() => {
		void isDark.value;
		return {
			series: isDark.value ? SERIES_DARK : SERIES_LIGHT,
			grid: readToken('--app-border', isDark.value ? '#232C38' : '#E3E6EB'),
			text: readToken('--app-text-3', isDark.value ? '#8E99A8' : '#5B6472'),
			tooltipBg: readToken('--app-raised', isDark.value ? '#2A3442' : '#FFFFFF'),
			tooltipText: readToken('--app-text', isDark.value ? '#E6EBF2' : '#14171C'),
			tooltipBorder: readToken('--app-border-strong', isDark.value ? '#2E3947' : '#D5DAE1'),
		};
	});

	return { isDark, colors };
}
