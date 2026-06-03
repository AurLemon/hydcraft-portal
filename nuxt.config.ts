import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
	compatibilityDate: '2024-04-03',
	ssr: true,
	devtools: { enabled: false },
	modules: [
		'@nuxt/eslint',
		[
			'@nuxtjs/i18n',
			{
				defaultLocale: 'zh-CN',
				strategy: 'prefix_except_default',
				lazy: true,
				langDir: '../locales',
				locales: [
					{ code: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
					{ code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
					{ code: 'ja-JP', name: '日本語', file: 'ja-JP.json' },
					{ code: 'en-US', name: 'English', file: 'en-US.json' },
				],
				detectBrowserLanguage: false,
				vueI18n: './i18n.config.ts',
			},
		],
		['@nuxtjs/seo', {}],
		'@nuxt/content',
		'@nuxt/ui',
	],
	components: [
		{
			path: '~/components',
			pathPrefix: false,
		},
	],
	imports: {
		dirs: ['composables'],
	},
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
				'lucide:history',
				'lucide:sun',
				'lucide:moon',
				'lucide:monitor',
				'lucide:languages',
				'lucide:check',
				'lucide:x',
				'lucide:info',
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
	seo: {
		enabled: false,
	},
	schemaOrg: {
		enabled: false,
	},
	ogImage: {
		enabled: false,
	},
	sitemap: {
		autoLastmod: true,
	},
	robots: {
		sitemap: '/sitemap.xml',
	},
	linkChecker: {
		failOnError: true,
		fetchRemoteUrls: false,
		report: {
			html: true,
			markdown: true,
		},
	},
	site: {
		url: process.env.NUXT_SITE_URL,
		name: 'HydCraft Portal',
		description:
			'氢气工艺 HydCraft 是一个 Minecraft 服务器社区，连接交通、科技、建筑与开发爱好者。',
		defaultLocale: 'zh-CN',
	},
	content: {
		experimental: {
			sqliteConnector: 'native',
		},
	},
	css: [
		'~/assets/styles/fonts/index.css',
		'~/assets/styles/base/main.css',
		'~/assets/styles/base/tailwind.css',
	],
	vite: {
		plugins: [tailwindcss()],
	},
	app: {
		head: {
			title: 'HydCraft Portal',
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
