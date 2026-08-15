export type HomeImmersiveSceneCreditRole = 'builder'

export interface HomeImmersiveSceneCredit {
	role: HomeImmersiveSceneCreditRole
	handle: string
	href: string
	icon: string
}

export interface HomeImmersiveSceneLocalizedPresentation {
	name: string
	desktopVerticalName?: {
		prefix: string
		name: string
	}
	title: string
	description: string
	credit: Pick<HomeImmersiveSceneCredit, 'handle' | 'href'>
	gallery: readonly HomeImmersiveSceneGalleryItem[]
}

export interface HomeImmersiveSceneGalleryItem {
	asset: HomeImmersiveSceneGalleryAsset
	alt: string
	caption: string
}

export type HomeImmersiveSceneGalleryAsset = 'owenCoastConcert1' | 'owenWpgh1'

export interface HomeImmersiveSceneCamera {
	x: number
	y: number
	z: number
	distance: number
	rotation: number
	angle: number
	tilt: number
}

export interface HomeImmersiveSceneLighting {
	sourceXPercent: number
	sourceYPercent: number
	directionAngle: number
	coneSpread: number
	desktopConeWidth: number
	mobileConeWidth: number
	scanXAmplitude: number
	scanPeriodSeconds: number
}

export interface HomeImmersiveSceneWater {
	rippleStrength: number
	reflectionStrength: number
	reflectionWidth: number
	animationSpeed: number
	waveSeed: number
	irregularity: number
	tintColor: [number, number, number]
	tintStrength: number
	transmissionStrength: number
	glintStrength: number
	glintDensity: number
	glintSharpness: number
	glintSpeed: number
	bloomStrength: number
	bloomRadius: number
}

export interface HomeImmersiveScene {
	id: string
	mapAssetsBaseUrl: string
	camera: HomeImmersiveSceneCamera
	lighting: HomeImmersiveSceneLighting
	water?: HomeImmersiveSceneWater
	presentation: {
		skinUsername: string
		credit: Pick<HomeImmersiveSceneCredit, 'role' | 'icon'>
		locales: Record<string, HomeImmersiveSceneLocalizedPresentation>
	}
}

export const HOME_IMMERSIVE_MAP_ASSETS_PROXY_BASE_URL =
	'/api/public/home-map-assets'

/**
 * 仅在开发环境显式开启环境变量时，允许首页地图交互与镜头参数输出。
 * 生产构建始终关闭。
 */
export const HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED =
	import.meta.dev &&
	import.meta.env.VITE_HOME_IMMERSIVE_DEVELOPER_CONTROLS === 'true'

/**
 * 首页目前固定展示首个场景；保留数组和完整场景契约，供后续切换与随机
 * 策略扩展，而不让页面组件承担地图、文案和皮肤的内容配置。
 */
export const homeImmersiveScenes: readonly HomeImmersiveScene[] = [
	{
		id: 'owen-islands',
		mapAssetsBaseUrl: 'https://map-assets.hydcraft.cn/oxygen/world',
		camera: {
			x: 13874.57,
			y: 63,
			z: 9773.19,
			distance: 3264.93,
			rotation: -0.5999,
			angle: 0.5044,
			tilt: 0,
		},
		lighting: {
			sourceXPercent: 89,
			sourceYPercent: 3,
			directionAngle: -0.96,
			coneSpread: 0.38,
			desktopConeWidth: 0.24,
			mobileConeWidth: 0.2,
			scanXAmplitude: 0.12,
			scanPeriodSeconds: 24,
		},
		water: {
			rippleStrength: 1.12,
			reflectionStrength: 1.16,
			reflectionWidth: 0.086,
			animationSpeed: 0.72,
			waveSeed: 18.73,
			irregularity: 0.86,
			tintColor: [0.08, 0.48, 0.58],
			tintStrength: 0.42,
			transmissionStrength: 0.84,
			glintStrength: 0.86,
			glintDensity: 0.24,
			glintSharpness: 0.68,
			glintSpeed: 1.12,
			bloomStrength: 0.3,
			bloomRadius: 0.82,
		},
		presentation: {
			skinUsername: 'CatPillager',
			credit: {
				role: 'builder',
				icon: 'i-simple-icons-xiaohongshu',
			},
			locales: {
				'zh-CN': {
					name: '仓鼠的\n欧文群岛',
					desktopVerticalName: {
						prefix: '仓鼠的',
						name: '欧文\n群岛',
					},
					title: '服务器中最独特的自治体。',
					description:
						'欧文群岛是服务器最特殊的自治体之一。近乎由 CatPillager（仓鼠）一人统筹的体系，让精致的欧美建筑和优雅的道路曲线塑造出了完美无瑕的欧文。全服中，他是欧文绝对的 Leader，纵然是服主柠檬都无法插手。',
					credit: {
						handle: '@Cat_Pillager',
						href: 'https://xhslink.cn/m/6FNeCc1V9q1',
					},
					gallery: [
						{
							asset: 'owenCoastConcert1',
							alt: '欧文滨海音乐厅',
							caption: '欧文滨海音乐厅',
						},
						{
							asset: 'owenWpgh1',
							alt: '威尔斯综合医疗中心',
							caption: '威尔斯综合医疗中心',
						},
					],
				},
				'zh-TW': {
					name: '倉鼠的\n歐文群島',
					desktopVerticalName: {
						prefix: '倉鼠的',
						name: '歐文\n群島',
					},
					title: '伺服器中最獨特的自治體。',
					description:
						'歐文群島是伺服器最特殊的自治體之一。近乎由 CatPillager（倉鼠）一人統籌的體系，讓精緻的歐美建築和優雅的道路曲線塑造出了完美無瑕的歐文。全服中，他是歐文絕對的 Leader，縱然是服主檸檬都無法插手。',
					credit: {
						handle: '@Cat_Pillager',
						href: 'https://xhslink.cn/m/6FNeCc1V9q1',
					},
					gallery: [
						{
							asset: 'owenCoastConcert1',
							alt: '歐文濱海音樂廳',
							caption: '歐文濱海音樂廳',
						},
						{
							asset: 'owenWpgh1',
							alt: '威爾斯綜合醫療中心',
							caption: '威爾斯綜合醫療中心',
						},
					],
				},
				'en-US': {
					name: 'Owen\nArchipelago',
					title: "The server's most distinctive autonomous city.",
					description:
						"Owen is a distinctive autonomous community. CatPillager alone shaped its Western architecture and graceful roads. He is Owen's Leader—even AurLemon cannot intervene.",
					credit: {
						handle: '@Cat_Pillager',
						href: 'https://xhslink.cn/m/6FNeCc1V9q1',
					},
					gallery: [
						{
							asset: 'owenCoastConcert1',
							alt: 'Owen Coastal Concert Hall',
							caption: 'Owen Coastal Concert Hall',
						},
						{
							asset: 'owenWpgh1',
							alt: 'Wells General Hospital',
							caption: 'Wells General Hospital',
						},
					],
				},
				'ja-JP': {
					name: 'オーウェン\n諸島',
					title: 'サーバーで最も個性的な自治体。',
					description:
						'オーウェン諸島は特別な自治体です。CatPillager がほぼ一人で欧米風建築と優雅な道路を築きました。彼はオーウェンの Leader であり、AurLemon でさえ干渉できません。',
					credit: {
						handle: '@Cat_Pillager',
						href: 'https://xhslink.cn/m/6FNeCc1V9q1',
					},
					gallery: [
						{
							asset: 'owenCoastConcert1',
							alt: 'オーウェン海浜音楽ホール',
							caption: 'オーウェン海浜音楽ホール',
						},
						{
							asset: 'owenWpgh1',
							alt: 'ウェルズ総合医療センター',
							caption: 'ウェルズ総合医療センター',
						},
					],
				},
			},
		},
	},
]

export const defaultHomeImmersiveScene = homeImmersiveScenes[0]!
