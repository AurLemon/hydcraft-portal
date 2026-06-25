<template>
	<div
		ref="containerElement"
		class="relative overflow-hidden"
		:class="viewerClass"
		aria-hidden="true"
	>
		<canvas ref="canvasElement" class="block h-full w-full" />
	</div>
</template>

<script setup lang="ts">
import { IdleAnimation, SkinViewer } from 'skinview3d'

interface IntroMinecraftSkinViewerProps {
	skinUrl: string
	viewerClass?: string
}

const props = defineProps<IntroMinecraftSkinViewerProps>()

const canvasElement = useTemplateRef<HTMLCanvasElement>('canvasElement')
const containerElement = useTemplateRef<HTMLDivElement>('containerElement')

let viewer: SkinViewer | null = null
let resizeObserver: ResizeObserver | null = null

const applyIntroViewerCamera = (targetViewer: SkinViewer) => {
	targetViewer.zoom = 1
	targetViewer.fov = 42
	targetViewer.controls.target.set(0, 16.2, 0)
	targetViewer.camera.position.set(21.5, 15.5, 43.5)
	targetViewer.playerWrapper.position.y = 15.2
	targetViewer.camera.updateProjectionMatrix()
	targetViewer.controls.update()
}

const syncViewerSize = () => {
	if (!viewer || !containerElement.value) {
		return
	}

	viewer.width = Math.max(containerElement.value.clientWidth, 1)
	viewer.height = Math.max(containerElement.value.clientHeight, 1)
}

const createViewer = async () => {
	if (!canvasElement.value || !containerElement.value || !props.skinUrl) {
		return
	}

	viewer?.dispose()
	viewer = new SkinViewer({
		canvas: canvasElement.value,
		width: Math.max(containerElement.value.clientWidth, 1),
		height: Math.max(containerElement.value.clientHeight, 1),
		skin: props.skinUrl,
	})
	viewer.controls.enabled = false
	viewer.controls.enableRotate = false
	viewer.controls.enableZoom = false
	viewer.controls.enablePan = false
	viewer.autoRotate = true
	viewer.autoRotateSpeed = 1
	viewer.animation = new IdleAnimation()
	applyIntroViewerCamera(viewer)
	viewer.playerWrapper.rotation.x = 0
	viewer.playerWrapper.rotation.z = 0
}

watch(
	() => props.skinUrl,
	async (skinUrl) => {
		if (!skinUrl) {
			viewer?.dispose()
			viewer = null
			return
		}

		if (!viewer) {
			await nextTick()
			await createViewer()
			return
		}

		void viewer.loadSkin(skinUrl)
	},
	{ immediate: true },
)

onMounted(() => {
	if (!containerElement.value) {
		return
	}

	void createViewer()
	resizeObserver = new ResizeObserver(() => {
		syncViewerSize()
	})
	resizeObserver.observe(containerElement.value)
	syncViewerSize()
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	viewer?.dispose()
	viewer = null
})
</script>
