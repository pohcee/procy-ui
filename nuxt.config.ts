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
			title: 'Procy',

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
				{ name: 'theme-color', content: '#10161F' },
				{ name: 'application-name', content: 'Procy' },
				{ name: 'apple-mobile-web-app-title', content: 'Procy' },
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

	alias: {
		assets: '/<rootDir>/assets',
	},

	routeRules: {
		// "/" is the public home page (signed-in users are sent on to /dashboard by middleware/auth.global.ts).
		'/login': { redirect: '/auth' },
		'/scripts': { redirect: '/execute' },
		'/commands': { redirect: '/execute' },
		// Inventory was folded into the device list.
		'/inventory': { redirect: '/dashboard' },
		'/Inventory': { redirect: '/dashboard' },
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

	// Static builds (`nuxi generate`) are served by rportd from its doc_root. Page files
	// are capitalised (pages/Execute.vue → /Execute/), but the app links to lowercase
	// URLs, and rportd serves files case-sensitively and only falls back to index.html
	// for a few known prefixes. Prerender the lowercase paths too so reloads and
	// bookmarks of every page work. Redirected routes (routeRules above) are prerendered
	// as small redirect pages so old links keep working.
	nitro: {
		prerender: {
			routes: [
				// The public home page, and /login (a redirect to the sign-in page).
				'/', '/login',
				'/execute', '/schedules', '/tunnels', '/library', '/audits',
				'/profile', '/users', '/user-groups', '/client-access', '/client-groups',
				'/vault', '/api-tokens', '/info', '/dashboard', '/auth',
				'/usage', '/invitations', '/billing', '/organization',
				// The operator console. Its organization pages (/operator/organizations/<id>) are not prerendered:
				// rportd serves them through its index.html fallback (vueHistoryPaths).
				'/operator', '/operator/organizations', '/operator/invitations', '/operator/signups', '/operator/deletions',
				'/operator/usage', '/operator/servers', '/operator/billing', '/operator/audit',
				// The old operator pages, kept so bookmarks load the app, which redirects them into the console.
				'/organizations', '/platform-usage', '/platform-billing', '/signups', '/deletions',
				// Signup, and the pages the signup emails link to (<public_url>/auth/signup/...).
				'/signup', '/signup/verify', '/auth/signup/verify', '/auth/signup/cancel-deletion', '/auth/confirm-email',
				// The page the server's Google sign-in callback redirects to (<ui_url>/auth/oidc#code=...).
				'/auth/oidc',
				// The end of a Google signup (<ui_url>/auth/signup/google#status=…).
				'/auth/signup/google',
				'/inventory', '/Inventory',
			],
		},
	},

	ssr: false,
	compatibilityDate: '2025-03-25',
});
