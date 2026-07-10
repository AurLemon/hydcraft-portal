<template>
	<div
		ref="containerElement"
		class="relative overflow-hidden touch-pan-y"
		:class="viewerClass"
		aria-hidden="true"
	>
		<img
			v-if="fallbackUrl"
			:src="fallbackUrl"
			alt=""
			loading="lazy"
			decoding="async"
			class="pointer-events-none absolute inset-0 block h-full w-full object-contain transition-opacity duration-200"
			:class="viewerReady ? 'opacity-0' : 'opacity-100'"
		/>
		<canvas
			v-if="active"
			ref="canvasElement"
			class="pointer-events-none relative block h-full w-full touch-pan-y transition-opacity duration-200"
			:class="viewerReady ? 'opacity-100' : 'opacity-0'"
		/>
	</div>
</template>

<script setup lang="ts">
import { IdleAnimation, SkinViewer } from 'skinview3d'

interface MinecraftSkinViewerProps {
	skinUrl: string
	fallbackUrl?: string
	active?: boolean
	viewerClass?: string
}

const props = withDefaults(defineProps<MinecraftSkinViewerProps>(), {
	fallbackUrl: '',
	active: true,
})

const canvasElement = useTemplateRef<HTMLCanvasElement>('canvasElement')
const containerElement = useTemplateRef<HTMLDivElement>('containerElement')
const viewerReady = ref(false)

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

const releaseViewer = (forceContextLoss = false) => {
	viewerReady.value = false
	const activeViewer = viewer
	viewer = null

	if (!activeViewer) {
		return
	}

	activeViewer.dispose()
	if (forceContextLoss) {
		activeViewer.renderer.forceContextLoss()
	}
}

const disposeViewer = (forceContextLoss = false) => {
	createViewerTaskId += 1
	releaseViewer(forceContextLoss)
}

const createViewer = async (taskId: number) => {
	if (
		!canvasElement.value ||
		!containerElement.value ||
		!props.skinUrl ||
		!props.active
	) {
		return
	}

	releaseViewer()
	const nextViewer = new SkinViewer({
		canvas: canvasElement.value,
		width: Math.max(containerElement.value.clientWidth, 1),
		height: Math.max(containerElement.value.clientHeight, 1),
	})
	viewer = nextViewer
	nextViewer.controls.enabled = false
	nextViewer.controls.enableRotate = false
	nextViewer.controls.enableZoom = false
	nextViewer.controls.enablePan = false
	nextViewer.autoRotate = true
	nextViewer.autoRotateSpeed = 1
	nextViewer.animation = new IdleAnimation()
	nextViewer.zoom = 1
	nextViewer.fov = 38
	nextViewer.controls.target.set(0, 17, 0)
	nextViewer.camera.position.set(24, 16, 48)
	nextViewer.controls.update()
	nextViewer.playerWrapper.position.y = 16
	nextViewer.playerWrapper.rotation.x = 0
	nextViewer.playerWrapper.rotation.z = 0
	syncViewerSize()

	try {
		await nextViewer.loadSkin(props.skinUrl)
		if (
			taskId === createViewerTaskId &&
			viewer === nextViewer &&
			props.active
		) {
			viewerReady.value = true
		}
	} catch {
		if (viewer === nextViewer) {
			disposeViewer(false)
		}
	}
}

const ensureViewerReady = async () => {
	if (!import.meta.client || !props.skinUrl || !props.active) {
		disposeViewer(!props.active)
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

	await createViewer(taskId)
}

watch(
	[() => props.skinUrl, () => props.active],
	async ([skinUrl, active]) => {
		if (!skinUrl || !active) {
			disposeViewer(!active)
			return
		}

		await ensureViewerReady()
	},
	{ immediate: true },
)

onMounted(() => {
	if (!containerElement.value) {
		return
	}

	resizeObserver = new ResizeObserver(() => {
		syncViewerSize()
	})
	resizeObserver.observe(containerElement.value)
	syncViewerSize()
})

onActivated(() => {
	if (props.active) {
		void ensureViewerReady()
	}
})

onDeactivated(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	disposeViewer(false)
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	disposeViewer(true)
})
</script>
