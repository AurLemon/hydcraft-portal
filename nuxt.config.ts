import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
	compatibilityDate: '2024-04-03',
	ssr: true,
	devtools: { enabled: false },
	modules: ['@nuxt/eslint', '@nuxt/ui'],
	components: [
		{
			path: '~/components',
			pathPrefix: false,
		},
	],
	ui: {
		fonts: false,
		theme: {
			colors: [
				'primary',
				'secondary',
				'success',
				'info',
				'warning',
				'error',
				'neutral',
			],
		},
	},
	icon: {
		clientBundle: {
			icons: [
				'lucide:chevron-right',
				'lucide:external-link',
				'lucide:map',
				'lucide:server',
				'lucide:users',
			],
		},
		serverBundle: {
			collections: ['lucide'],
		},
		fallbackToApi: false,
	},
	colorMode: {
		preference: 'system',
	},
	css: [
		'material-icons/iconfont/material-icons.css',
		'material-icons/iconfont/outlined.css',
		'~/assets/styles/common.css',
		'~/assets/styles/fonts.css',
		'~/assets/styles/main.css',
		'~/assets/styles/tailwind.css',
	],
	vite: {
		plugins: [tailwindcss()],
	},
	app: {
		head: {
			title: 'HydCraft Intro',
			link: [
				{
					rel: 'preconnect',
					href: 'https://fonts.gstatic.cn',
					crossorigin: '',
				},
				{
					rel: 'preconnect',
					href: 'https://cdn-font.hyperos.mi.com',
					crossorigin: '',
				},
				{
					rel: 'icon',
					type: 'image/x-icon',
					href: '/favicon.ico',
				},
			],
			meta: [
				{ charset: 'utf-8' },
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{
					name: 'description',
					content:
						'氢气工艺 HydCraft 是一个 Minecraft 服务器社区，连接交通、科技、建筑与开发爱好者。',
				},
			],
			titleTemplate: '%s',
		},
		pageTransition: { name: 'page', mode: 'out-in' },
	},
	typescript: {
		strict: true,
		typeCheck: process.env.NODE_ENV === 'production',
	},
})
