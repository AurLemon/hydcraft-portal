import { calwynIslandsScene } from './immersive-scenes/calwyn-islands'
import { guangyangScene } from './immersive-scenes/guangyang'
import { homeImmersiveOverview } from './immersive-scenes/overview'
import { owenIslandsScene } from './immersive-scenes/owen-islands'
import { saikongScene } from './immersive-scenes/saikong'
import { spawnpointScene } from './immersive-scenes/spawnpoint'
import type {
	HomeImmersiveScene,
	HomeImmersiveSceneDefinition,
} from './immersive-scenes/types'

export * from './immersive-scenes/types'
export { homeImmersiveWater } from './immersive-scenes/atmosphere'
export { homeImmersiveOverview } from './immersive-scenes/overview'
export { calwynIslandsScene } from './immersive-scenes/calwyn-islands'
export { guangyangScene } from './immersive-scenes/guangyang'
export { owenIslandsScene } from './immersive-scenes/owen-islands'
export { saikongScene } from './immersive-scenes/saikong'
export { spawnpointScene } from './immersive-scenes/spawnpoint'

/**
 * 仅在开发环境显式开启环境变量时，允许首页地图交互与镜头参数输出。
 * 生产构建始终关闭。
 */
export const HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED =
	import.meta.dev &&
	import.meta.env.VITE_HOME_IMMERSIVE_DEVELOPER_CONTROLS === 'true'

export const homeImmersiveSceneDefinitions: readonly HomeImmersiveSceneDefinition[] =
	[
		owenIslandsScene,
		calwynIslandsScene,
		guangyangScene,
		spawnpointScene,
		saikongScene,
	]

/**
 * Compatibility export for the current homepage. Overview cameras are aliases
 * of the fixed overview config and are not owned by an individual scene.
 */
export const homeImmersiveScenes: readonly HomeImmersiveScene[] =
	homeImmersiveSceneDefinitions.map((scene) => ({
		...scene,
		overviewCamera: homeImmersiveOverview.map.camera,
		mobileOverviewCamera: homeImmersiveOverview.map.mobileCamera,
	}))

export const defaultHomeImmersiveScene = homeImmersiveScenes[0]!
