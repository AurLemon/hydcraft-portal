<template>
	<div
		ref="containerElement"
		class="relative overflow-hidden touch-pan-y"
		:class="viewerClass"
		aria-hidden="true"
	>
		<canvas
			ref="canvasElement"
			class="pointer-events-none block h-full w-full touch-pan-y"
		/>
	</div>
</template>

<script setup lang="ts">
import { IdleAnimation, SkinViewer } from 'skinview3d'

interface MinecraftSkinViewerProps {
	skinUrl: string
	viewerClass?: string
}

const props = defineProps<MinecraftSkinViewerProps>()

const canvasElement = useTemplateRef<HTMLCanvasElement>('canvasElement')
const containerElement = useTemplateRef<HTMLDivElement>('containerElement')

let viewer: SkinViewer | null = null
let resizeObserver: ResizeObserver | null = null
let createViewerTaskId = 0

const syncViewerSize = () => {
	if (!viewer || !containerElement.value) {
		return
	}

	const width = Math.max(containerElement.value.clientWidth, 1)
	const height = Math.max(containerElement.value.clientHeight, 1)
	viewer.setSize(width, height)
}

const disposeViewer = () => {
	viewer?.dispose()
	viewer = null
}

const createViewer = () => {
	if (!canvasElement.value || !containerElement.value || !props.skinUrl) {
		return
	}

	disposeViewer()
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
	viewer.zoom = 1
	viewer.fov = 38
	viewer.controls.target.set(0, 17, 0)
	viewer.camera.position.set(24, 16, 48)
	viewer.controls.update()
	viewer.playerWrapper.position.y = 16
	viewer.playerWrapper.rotation.x = 0
	viewer.playerWrapper.rotation.z = 0
	syncViewerSize()
}

const ensureViewerReady = async () => {
	if (!import.meta.client || !props.skinUrl) {
		disposeViewer()
		return
	}

	const taskId = ++createViewerTaskId
	await nextTick()
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve())
		})
	})

	if (taskId !== createViewerTaskId) {
		return
	}

	createViewer()
}

watch(
	() => props.skinUrl,
	async (skinUrl) => {
		if (!skinUrl) {
			disposeViewer()
			return
		}

		if (!viewer) {
			await ensureViewerReady()
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

	void ensureViewerReady()
	resizeObserver = new ResizeObserver(() => {
		syncViewerSize()
	})
	resizeObserver.observe(containerElement.value)
	syncViewerSize()
})

onActivated(() => {
	void ensureViewerReady()
})

onDeactivated(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	disposeViewer()
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	disposeViewer()
})
</script>
