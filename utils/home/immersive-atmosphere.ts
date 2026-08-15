import type { BlueMapHomeAtmospherePostProcessing } from '~/utils/map'
import type {
	HomeImmersiveSceneLighting,
	HomeImmersiveSceneWater,
} from './immersive-scenes'

interface HomeImmersiveAtmospherePreset {
	intensity: number
	blurStrength: number
	beamStrength: number
	hazeStrength: number
	animationSpeed: number
	desktopQualityScale: number
	mobileQualityScale: number
}

const HOME_IMMERSIVE_ATMOSPHERE_PRESET: HomeImmersiveAtmospherePreset = {
	intensity: 0.84,
	blurStrength: 0.62,
	beamStrength: 0.78,
	hazeStrength: 0.82,
	animationSpeed: 1.05,
	desktopQualityScale: 0.5,
	mobileQualityScale: 0.34,
}

export const createHomeImmersiveAtmosphereOptions = (
	lighting: HomeImmersiveSceneLighting,
	water?: HomeImmersiveSceneWater,
): BlueMapHomeAtmospherePostProcessing => ({
	profile: 'homeAtmosphere',
	sunX: lighting.sourceXPercent / 100,
	sunY: 1 - lighting.sourceYPercent / 100,
	beamAngle: lighting.directionAngle,
	beamSpread: lighting.coneSpread,
	desktopBeamWidth: lighting.desktopConeWidth,
	mobileBeamWidth: lighting.mobileConeWidth,
	water,
	...HOME_IMMERSIVE_ATMOSPHERE_PRESET,
})
