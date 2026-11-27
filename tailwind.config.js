const animate = require('tailwindcss-animate');

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	safelist: ['dark'],
	prefix: '',

	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			},
			colors: {
				// Neutral scale (cool slate) matching the OpenRPort2 design tokens. It backs
				// every legacy `gray-*` / `dark:*-gray-*` utility, so older markup follows the
				// new look too. Dark surfaces: 950 page, 900 card, 800 raised, 700 border.
				'gray': {
					50: '#F5F6F8',
					100: '#EEF1F5',
					200: '#E3E6EB',
					300: '#C2CAD6',
					400: '#8E99A8',
					500: '#6B7380',
					600: '#3B4452',
					700: '#2E3947',
					800: '#1A222D',
					900: '#121821',
					950: '#0B0F14',
				},
				// Brand blue. Legacy markup uses primary-800 / vtd-primary-500 as the main
				// action colour, so those map to the accent (#2563EB) rather than a darker step.
				'primary': {
					DEFAULT: '#2563EB',
					50: '#EFF6FF',
					100: '#DBEAFE',
					200: '#BFDBFE',
					300: '#93C5FD',
					400: '#60A5FA',
					500: '#2563EB',
					600: '#1D4ED8',
					700: '#1D4ED8',
					800: '#2563EB',
					900: '#1E3A8A',
					950: '#172554',
				},
				'vtd-primary': {
					50: '#EFF6FF',
					100: '#DBEAFE',
					200: '#BFDBFE',
					300: '#93C5FD',
					400: '#60A5FA',
					500: '#2563EB',
					600: '#1D4ED8',
					700: '#1D4ED8',
					800: '#1E40AF',
					900: '#1E3A8A',
				},
				// OpenRPort2 design tokens (see assets/css/tailwind.css), e.g. bg-app-surface,
				// text-app-text-3, border-app-border. They switch with light/dark automatically.
				'app': {
					'bg': 'rgb(var(--app-bg) / <alpha-value>)',
					'surface': 'rgb(var(--app-surface) / <alpha-value>)',
					'surface-2': 'rgb(var(--app-surface-2) / <alpha-value>)',
					'muted': 'rgb(var(--app-muted) / <alpha-value>)',
					'chip': 'rgb(var(--app-chip) / <alpha-value>)',
					'hover': 'rgb(var(--app-hover) / <alpha-value>)',
					'raised': 'rgb(var(--app-raised) / <alpha-value>)',
					'border': 'rgb(var(--app-border) / <alpha-value>)',
					'border-subtle': 'rgb(var(--app-border-subtle) / <alpha-value>)',
					'border-strong': 'rgb(var(--app-border-strong) / <alpha-value>)',
					'text': 'rgb(var(--app-text) / <alpha-value>)',
					'text-2': 'rgb(var(--app-text-2) / <alpha-value>)',
					'text-3': 'rgb(var(--app-text-3) / <alpha-value>)',
					'text-4': 'rgb(var(--app-text-4) / <alpha-value>)',
					'link': 'rgb(var(--app-link) / <alpha-value>)',
					'ok': 'rgb(var(--app-ok) / <alpha-value>)',
					'ok-bg': 'rgb(var(--app-ok-bg) / <alpha-value>)',
					'warn': 'rgb(var(--app-warn) / <alpha-value>)',
					'warn-bg': 'rgb(var(--app-warn-bg) / <alpha-value>)',
					'warn-row': 'rgb(var(--app-warn-row) / <alpha-value>)',
					'danger': 'rgb(var(--app-danger) / <alpha-value>)',
					'danger-bg': 'rgb(var(--app-danger-bg) / <alpha-value>)',
					'blue': 'rgb(var(--app-blue) / <alpha-value>)',
					'blue-bg': 'rgb(var(--app-blue-bg) / <alpha-value>)',
					'purple': 'rgb(var(--app-purple) / <alpha-value>)',
					'purple-bg': 'rgb(var(--app-purple-bg) / <alpha-value>)',
					'accent': 'rgb(var(--app-accent) / <alpha-value>)',
					'accent-hover': 'rgb(var(--app-accent-hover) / <alpha-value>)',
					'nav': 'rgb(var(--app-nav) / <alpha-value>)',
					'nav-hover': 'rgb(var(--app-nav-hover) / <alpha-value>)',
					'nav-active': 'rgb(var(--app-nav-active) / <alpha-value>)',
				},
				'vtd-secondary': {
					50: '#F9FAFB',
					100: '#F3F4F6',
					200: '#E5E7EB',
					300: '#D1D5DB',
					400: '#9CA3AF',
					500: '#6B7280',
					600: '#4B5563',
					700: '#374151',
					800: '#1F2937',
					900: '#111827',
				},
				'border': 'hsl(var(--border))',
				'input': 'hsl(var(--input))',
				'ring': 'hsl(var(--ring))',
				'background': 'hsl(var(--background))',
				'foreground': 'hsl(var(--foreground))',
				'secondary': {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				'destructive': {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				'muted': {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				'accent': {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				'popover': {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				'card': {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				xl: 'calc(var(--radius) + 4px)',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--reka-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--reka-accordion-content-height)' },
					to: { height: 0 },
				},
				'collapsible-down': {
					from: { height: 0 },
					to: { height: 'var(--reka-collapsible-content-height)' },
				},
				'collapsible-up': {
					from: { height: 'var(--reka-collapsible-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'collapsible-down': 'collapsible-down 0.2s ease-in-out',
				'collapsible-up': 'collapsible-up 0.2s ease-in-out',
			},
		},
	},
	plugins: [animate],
};
