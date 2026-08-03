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
			title: 'OpenRport',

			link: [

			],
			bodyAttrs: {
				class: 'min-h-screen h-full',
			},
		},
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
