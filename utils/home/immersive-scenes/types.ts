export type HomeImmersiveSceneCreditRole = 'builder'

export interface HomeImmersiveSceneCredit {
	role: HomeImmersiveSceneCreditRole
	handle: string
	href: string
	icon: string
}

export type HomeImmersiveSceneGalleryAsset =
	| 'owenCoastConcert1'
	| 'owenWpgh1'
	| 'xwHotelScreenshots1'
	| 'xwHotelScreenshots2'
	| 'guangyangScreenshots1'
	| 'guangyangScreenshots2'
	| 'spawnpointScreenshots1'
	| 'saikongScreenshots1'

export interface HomeImmersiveSceneGalleryItem {
	asset: HomeImmersiveSceneGalleryAsset
	alt: string
	caption: string
}

export interface HomeImmersiveSceneDesktopDisplayName {
	layout: 'horizontal' | 'vertical'
	prefix: string
	name: string
}

export interface HomeImmersiveSceneLocalizedPresentation {
	name: string
	desktopDisplayName?: HomeImmersiveSceneDesktopDisplayName
	title: string
	description: string
	credit: Pick<HomeImmersiveSceneCredit, 'handle' | 'href'> | null
	gallery: readonly HomeImmersiveSceneGalleryItem[]
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
	voidFillColor: [number, number, number]
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

export interface HomeImmersiveMapPosition {
	x: number
	y: number
	z: number
}

export type HomeImmersiveLocalizedText = Readonly<Record<string, string>>

export interface HomeImmersiveScenePlayer {
	/** Minecraft player ID used by the live server lookup and head renderer. */
	id: string
	serverId: string
	nickname: string
	bio: HomeImmersiveLocalizedText
	focusOrder: number
}

export interface HomeImmersiveSceneContributor {
	/** Shared profile ID. Contributors do not require a Portal account or map position. */
	id: string
}

/** Canonical scene-owned config. Overview behavior intentionally lives elsewhere. */
export interface HomeImmersiveSceneDefinition {
	id: string
	shortName: HomeImmersiveLocalizedText
	mapAssetsBaseUrl: string
	camera: HomeImmersiveSceneCamera
	lighting: HomeImmersiveSceneLighting
	players: readonly HomeImmersiveScenePlayer[]
	contributors?: readonly HomeImmersiveSceneContributor[]
	presentation: {
		skinUsername: string
		credit: Pick<HomeImmersiveSceneCredit, 'role' | 'icon'>
		locales: Record<string, HomeImmersiveSceneLocalizedPresentation>
	}
}

/**
 * Compatibility shape for existing consumers. New overview code should read
 * `homeImmersiveOverview.map` instead of these aliases.
 */
export interface HomeImmersiveScene extends HomeImmersiveSceneDefinition {
	overviewCamera: HomeImmersiveSceneCamera
	mobileOverviewCamera: HomeImmersiveSceneCamera
}

export type HomeImmersiveOverviewMemberRole =
	| 'owner'
	| 'committee'
	| 'councilOfElders'

export interface HomeImmersiveOverviewMember {
	id: string
	nickname: string
	serverId: string
	roles: readonly HomeImmersiveOverviewMemberRole[]
	bio: HomeImmersiveLocalizedText
}

export interface HomeImmersiveOverviewConfig {
	map: {
		camera: HomeImmersiveSceneCamera
		mobileCamera: HomeImmersiveSceneCamera
		fallbackSpawn: HomeImmersiveMapPosition
	}
	stats: {
		foundedAt: string
		timeZone: 'Asia/Shanghai'
		memberCount: number
	}
	members: readonly HomeImmersiveOverviewMember[]
}
