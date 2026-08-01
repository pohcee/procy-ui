import { createSharedComposable, useColorMode } from '@vueuse/core';

const _useTheme = () => {
	const colorMode = useColorMode({
		attribute: 'class',
		selector: 'html',
		storageKey: 'openrport-color-scheme',
		emitAuto: true,
		modes: {
			light: 'light',
			dark: 'dark',
		},
	});

	return { colorMode };
};

export const useTheme = createSharedComposable(_useTheme);
