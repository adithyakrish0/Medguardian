import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'var(--font-jakarta)',
					'ui-sans-serif',
					'system-ui',
					'sans-serif'
				]
			},
			colors: {
				background: 'var(--background)',
				foreground: 'var(--foreground)',
				primary: {
					DEFAULT: 'var(--primary)',
					50: '#EFF6FF',
					100: '#DBEAFE',
					500: '#3B82F6',
					600: '#2563EB',
					700: '#1D4ED8',
					foreground: 'var(--primary-foreground)'
				},
				secondary: {
					DEFAULT: 'var(--secondary)',
					foreground: 'var(--secondary-foreground)'
				},
				success: {
					DEFAULT: 'var(--success)',
					50: '#ECFDF5',
					500: '#10B981',
					600: '#059669'
				},
				warning: {
					DEFAULT: 'var(--warning)',
					50: '#FFFBEB',
					500: '#F59E0B',
					600: '#D97706'
				},
				critical: {
					DEFAULT: 'var(--critical)',
					50: '#FEF2F2',
					500: '#EF4444',
					600: '#DC2626'
				},
				info: {
					DEFAULT: '#3B82F6'
				},
				gray: {
					50: '#F9FAFB',
					100: '#F3F4F6',
					200: '#E5E7EB',
					500: '#6B7280',
					700: '#374151',
					900: '#111827'
				},
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'var(--accent-foreground)'
				},
				card: {
					DEFAULT: 'var(--card)',
					foreground: 'var(--card-foreground)',
					border: 'var(--card-border)'
				},
				popover: {
					DEFAULT: 'var(--popover)',
					foreground: 'var(--popover-foreground)'
				},
				muted: {
					DEFAULT: 'var(--muted)',
					foreground: 'var(--muted-foreground)'
				},
				destructive: {
					DEFAULT: 'var(--destructive)',
					foreground: 'var(--destructive-foreground)'
				},
				border: 'var(--border)',
				input: 'var(--input)',
				ring: 'var(--ring)',
				chart: {
					'1': 'var(--chart-1)',
					'2': 'var(--chart-2)',
					'3': 'var(--chart-3)',
					'4': 'var(--chart-4)',
					'5': 'var(--chart-5)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
