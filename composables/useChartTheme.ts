function readHslVar(name: string): string {
	if (typeof window === 'undefined') return 'hsl(0, 0%, 50%)';
	const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	if (!raw) return 'hsl(0, 0%, 50%)';
	const [h, s, l] = raw.split(' ');
	return `hsl(${h}, ${s}, ${l})`;
}

export const useChartTheme = () => {
	const { colorMode } = useTheme();

	// colorMode is read here only to force recomputation when it changes;
	// the actual values are re-read live from the CSS custom properties.
	const chart1 = computed(() => {
		void colorMode.value;
		return readHslVar('--chart-1');
	});
	const chart2 = computed(() => {
		void colorMode.value;
		return readHslVar('--chart-2');
	});
	const chartColors = computed(() => {
		void colorMode.value;
		return ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'].map(readHslVar);
	});
	const gridColor = computed(() => {
		void colorMode.value;
		return colorMode.value === 'dark' ? '#3a3a3a' : '#e5e7eb';
	});
	const textColor = computed(() => {
		void colorMode.value;
		return colorMode.value === 'dark' ? '#9d9d9d' : '#6b7280';
	});
	const tooltipBackgroundColor = computed(() => {
		void colorMode.value;
		return colorMode.value === 'dark' ? '#1e1e1e' : '#ffffff';
	});
	const tooltipTextColor = computed(() => {
		void colorMode.value;
		return colorMode.value === 'dark' ? '#d4d4d4' : '#111827';
	});

	return {
		chart1,
		chart2,
		chartColors,
		gridColor,
		textColor,
		tooltipBackgroundColor,
		tooltipTextColor,
	};
};
