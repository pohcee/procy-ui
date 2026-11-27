import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'));

export default defineNuxtConfig({
	modules: [
		'@nuxt/icon',
		'@pinia/nuxt',
		'shadcn-nuxt',
		'nuxt-snackbar',
		'@nuxt/eslint',
	],

	ssr: false,

	imports: {
		// nuxt-snackbar registers this auto-import in a late hook, after Nuxt
		// has generated its auto-import type declarations, so declare it here
		// as well to make it visible to TypeScript.
		presets: [{ from: 'vue3-snackbar', imports: ['useSnackbar'] }],
	},
	devtools: { enabled: true },

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

	css: [
		'~/assets/css/tailwind.css',
	],

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
	},
	compatibilityDate: '2025-03-25',

	// Static builds (`nuxi generate`) are served by rportd from its doc_root. Page files
	// are capitalised (pages/Execute.vue → /Execute/), but the app links to lowercase
	// URLs, and rportd serves files case-sensitively and only falls back to index.html
	// for a few known prefixes. Prerender the lowercase paths too so reloads and
	// bookmarks of every page work. Redirected routes (routeRules above) are prerendered
	// as small redirect pages so old links keep working.
	nitro: {
		prerender: {
			// Nuxt 4 adds /index.html (the SPA shell) for client-only apps, and the prerendered home page (/)
			// writes the same file: the two writes race and leave the tail of one after the other's </html>,
			// which rportd then serves for every deep link. Let / be the only writer. Upstream: nuxt/nuxt#37266
			// (fix in nuxt/nuxt#37279); drop this once a Nuxt release has it. A RegExp, as strings are prefixes.
			ignore: [/^\/index\.html$/],
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

	vite: {
		// Tailwind 4: CSS-first config in assets/css/tailwind.css (no tailwind.config.js, no PostCSS step).
		plugins: [tailwindcss()],
	},

	eslint: {
		config: {
			stylistic: {
				indent: 'tab',
				semi: true,
			},
		},
	},

	shadcn: {
		// shadcn-nuxt 2 defaults to a 'Ui' prefix (<UiDropdownMenu>); the app uses the bare names.
		prefix: '',
		componentDir: './components/ui',
	},

	snackbar: {
		bottom: true,
		duration: 3000,
	},
});
