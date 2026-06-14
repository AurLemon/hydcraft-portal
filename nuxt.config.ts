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
					{
						code: 'zh-CN',
						name: '简体中文',
						files: [
							'zh-CN/common.json',
							'zh-CN/auth.json',
							'zh-CN/profile.json',
							'zh-CN/attachments.json',
							'zh-CN/minecraft.json',
							'zh-CN/admin.json',
							'zh-CN/home.json',
							'zh-CN/content.json',
							'zh-CN/errors.json',
						],
					},
					{
						code: 'zh-TW',
						name: '繁體中文',
						files: [
							'zh-TW/common.json',
							'zh-TW/auth.json',
							'zh-TW/profile.json',
							'zh-TW/attachments.json',
							'zh-TW/minecraft.json',
							'zh-TW/admin.json',
							'zh-TW/home.json',
							'zh-TW/content.json',
							'zh-TW/errors.json',
						],
					},
					{
						code: 'ja-JP',
						name: '日本語',
						files: [
							'ja-JP/common.json',
							'ja-JP/auth.json',
							'ja-JP/profile.json',
							'ja-JP/attachments.json',
							'ja-JP/minecraft.json',
							'ja-JP/admin.json',
							'ja-JP/home.json',
							'ja-JP/content.json',
							'ja-JP/errors.json',
						],
					},
					{
						code: 'en-US',
						name: 'English',
						files: [
							'en-US/common.json',
							'en-US/auth.json',
							'en-US/profile.json',
							'en-US/attachments.json',
							'en-US/minecraft.json',
							'en-US/admin.json',
							'en-US/home.json',
							'en-US/content.json',
							'en-US/errors.json',
						],
					},
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
				'lucide:chevron-down',
				'lucide:chevron-left',
				'lucide:chevrons-left',
				'lucide:chevrons-right',
				'lucide:external-link',
				'lucide:history',
				'lucide:search',
				'lucide:rotate-ccw',
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
				'lucide:plus',
				'lucide:save',
				'lucide:radio-tower',
				'lucide:database',
				'lucide:shield-check',
				'lucide:circle-alert',
				'lucide:circle-check',
				'lucide:clock-3',
				'lucide:loader-circle',
				'lucide:log-in',
				'lucide:log-out',
				'lucide:user',
				'lucide:user-plus',
				'lucide:box',
				'lucide:shield',
				'lucide:link',
				'lucide:mail',
				'lucide:mail-plus',
				'lucide:key-round',
				'lucide:eye',
				'lucide:eye-off',
				'lucide:arrow-left',
				'lucide:arrow-right',
				'lucide:camera',
				'lucide:copy',
				'lucide:image',
				'lucide:pencil',
				'lucide:trash-2',
				'lucide:calendar',
				'lucide:files',
				'lucide:monitor-smartphone',
				'lucide:smartphone',
				'lucide:tablet-smartphone',
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
	nitro: {
		serverAssets: [
			{
				baseName: 'ip2region',
				dir: './data/ip2region',
			},
		],
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
	runtimeConfig: {
		cos: {
			secretId: process.env.COS_SECRET_ID ?? '',
			secretKey: process.env.COS_SECRET_KEY ?? '',
			region: process.env.COS_REGION ?? '',
			attachmentsBucket: process.env.COS_ATTACHMENTS_BUCKET ?? '',
			publicBaseUrl: process.env.COS_PUBLIC_BASE_URL ?? '',
		},
		public: {
			siteUrl: process.env.NUXT_SITE_URL ?? '',
		},
	},
	content: {
		experimental: {
			sqliteConnector: 'native',
		},
	},
	nitro: {
		experimental: {
			tasks: true,
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
