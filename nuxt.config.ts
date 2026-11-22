import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'));

export default defineNuxtConfig({
	devtools: { enabled: true },

	css: [
		'~/assets/css/tailwind.css',
		'~/assets/css/prism-tomorrow.css',
	],

	postcss: {
		plugins: {
			tailwindcss: {},
			autoprefixer: {},
		},
	},

	modules: [
		'@nuxt/icon',
		'@pinia/nuxt',
		'@nuxtjs/tailwindcss',
		'shadcn-nuxt',
		'nuxt-snackbar',
		'nuxt-headlessui',
		'@nuxt/eslint',
	],

	eslint: {
		config: {
			stylistic: {
				indent: 'tab',
				semi: true,
			},
		},
	},

	shadcn: {
		componentDir: './components/ui',
	},

	snackbar: {
		bottom: true,
		duration: 3000,
	},

	headlessui: {
		prefix: 'Headless',
	},

	app: {
		head: {
			title: 'OpenRPort2',

			link: [
				// SVG first for modern browsers; .ico for older ones.
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
				{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
				{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
				{ rel: 'manifest', href: '/site.webmanifest' },
				// Inter for UI text, JetBrains Mono for hostnames / IPs / ports / code.
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
			],
			meta: [
				{ name: 'theme-color', content: '#1D4ED8' },
				{ name: 'application-name', content: 'OpenRPort2' },
				{ name: 'apple-mobile-web-app-title', content: 'OpenRPort2' },
			],
			bodyAttrs: {
				class: 'min-h-screen h-full',
			},
		},
	},

	imports: {
		// nuxt-snackbar registers this auto-import in a late hook, after Nuxt
		// has generated its auto-import type declarations, so declare it here
		// as well to make it visible to TypeScript.
		presets: [{ from: 'vue3-snackbar', imports: ['useSnackbar'] }],
	},

	plugins: [
		// { src: '~/node_modules/@tabler/core/dist/js/tabler.min.js', mode: 'client' }
	],

	alias: {
		assets: '/<rootDir>/assets',
	},

	routeRules: {
		'/': { redirect: '/dashboard' },
		'/scripts': { redirect: '/execute' },
		'/commands': { redirect: '/execute' },
	},

	router: {
		options: {
			linkActiveClass: 'bg-sky-700',
			linkExactActiveClass: 'bg-sky-700',
		},
	},

	runtimeConfig: {
		public: {
			appEnv: process.env.NUXT_APP_ENV,
			apiUrl: process.env.NUXT_API_URL,
			appVersion: pkg.version,
		},
	},

	ssr: false,
	compatibilityDate: '2025-03-25',
});
