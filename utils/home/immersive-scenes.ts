export type HomeImmersiveSceneCreditRole = 'builder'

export interface HomeImmersiveSceneCredit {
	role: HomeImmersiveSceneCreditRole
	handle: string
	href: string
	icon: string
}

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
		copyKey: string
		skinUsername: string
		credit: HomeImmersiveSceneCredit
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
			copyKey: 'owenIslands',
			skinUsername: 'CatPillager',
			credit: {
				role: 'builder',
				handle: '@CatPillager',
				href: 'https://xhslink.cn/m/6FNeCc1V9q1',
				icon: 'i-simple-icons-xiaohongshu',
			},
		},
	},
]

export const defaultHomeImmersiveScene = homeImmersiveScenes[0]!
