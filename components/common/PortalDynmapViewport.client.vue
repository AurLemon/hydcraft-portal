<template>
	<div class="absolute inset-0">
		<div ref="mapContainerRef" class="h-full w-full" />

		<div
			v-if="!providerReady"
			class="absolute inset-0 z-998 flex items-center justify-center bg-slate-900"
		>
			<USkeleton class="h-full w-full rounded-none" />
		</div>
	</div>

	<div
		class="pointer-events-none absolute inset-x-0 top-3 z-999 flex justify-center px-6"
	>
		<Transition name="hover-coords" mode="out-in">
			<div
				v-if="hoverCoordsVisible && hoveredBlockPoint"
				key="hover-coords"
				class="pointer-events-none inline-flex items-center gap-3 text-sm text-white [text-shadow:rgba(0,0,0,0.7)_0px_0px_5px]"
				aria-live="polite"
			>
				<div class="flex items-center gap-1 whitespace-nowrap">
					<span
						class="translate-y-0.5 text-[11px] font-medium tracking-[0.24em] text-white/55"
					>
						X
					</span>
					<span class="hover-coords-text" :aria-label="hoverXText">
						<span class="hover-coords-text__inner">
							<template
								v-for="(character, index) in hoverXCharacters"
								:key="`hover-x-${hoverXCharacters.length}-${index}`"
							>
								<span
									v-if="isDigitCharacter(character)"
									class="digit-flip"
									aria-hidden="true"
								>
									<span
										class="digit-flip__reel transition-transform duration-150 ease-out"
										:style="{
											transform: `translate3d(0, -${Number(character) * digitStepEm}em, 0)`,
										}"
									>
										<span
											v-for="digitCharacter in digitCharacters"
											:key="`hover-x-${index}-${digitCharacter}`"
											class="digit-flip__digit"
										>
											{{ digitCharacter }}
										</span>
									</span>
								</span>
								<span v-else class="hover-coords-text__char" aria-hidden="true">
									{{ character }}
								</span>
							</template>
						</span>
					</span>
				</div>

				<div class="flex items-center gap-1 whitespace-nowrap">
					<span
						class="translate-y-0.5 text-[11px] font-medium tracking-[0.24em] text-white/55"
					>
						Z
					</span>
					<span class="hover-coords-text" :aria-label="hoverZText">
						<span class="hover-coords-text__inner">
							<template
								v-for="(character, index) in hoverZCharacters"
								:key="`hover-z-${hoverZCharacters.length}-${index}`"
							>
								<span
									v-if="isDigitCharacter(character)"
									class="digit-flip"
									aria-hidden="true"
								>
									<span
										class="digit-flip__reel transition-transform duration-150 ease-out"
										:style="{
											transform: `translate3d(0, -${Number(character) * digitStepEm}em, 0)`,
										}"
									>
										<span
											v-for="digitCharacter in digitCharacters"
											:key="`hover-z-${index}-${digitCharacter}`"
											class="digit-flip__digit"
										>
											{{ digitCharacter }}
										</span>
									</span>
								</span>
								<span v-else class="hover-coords-text__char" aria-hidden="true">
									{{ character }}
								</span>
							</template>
						</span>
					</span>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import type {
	MinecraftMapController,
	MinecraftMapPointerMoveEventPayload,
} from '~/utils/map'

interface Props {
	hoverHideDelayMs?: number
}

const props = withDefaults(defineProps<Props>(), {
	hoverHideDelayMs: 3000,
})

const mapContainerRef = ref<HTMLElement | null>(null)
const controllerRef = ref<MinecraftMapController | null>(null)
const providerReady = ref(false)
const hoveredBlockPoint = ref<{ x: number; z: number } | null>(null)
const hoverCoordsVisible = ref(false)
let unbindPointerMove: (() => void) | null = null
let removeMouseLeaveListener: (() => void) | null = null
let hoverCoordsHideTimer: ReturnType<typeof setTimeout> | null = null

const digitCharacters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const digitStepEm = 1.2

const hoverXText = computed(() =>
	hoveredBlockPoint.value ? String(hoveredBlockPoint.value.x) : '--',
)
const hoverZText = computed(() =>
	hoveredBlockPoint.value ? String(hoveredBlockPoint.value.z) : '--',
)
const hoverXCharacters = computed(() => hoverXText.value.split(''))
const hoverZCharacters = computed(() => hoverZText.value.split(''))
const isDigitCharacter = (character: string) => /\d/.test(character)

const clearHoverCoordsHideTimer = () => {
	if (hoverCoordsHideTimer) {
		clearTimeout(hoverCoordsHideTimer)
		hoverCoordsHideTimer = null
	}
}

const scheduleHoverCoordsHide = () => {
	clearHoverCoordsHideTimer()
	hoverCoordsHideTimer = setTimeout(() => {
		hoverCoordsVisible.value = false
	}, props.hoverHideDelayMs)
}

const handlePointerMove = (payload: MinecraftMapPointerMoveEventPayload) => {
	hoveredBlockPoint.value = {
		x: Math.round(payload.blockPoint.x),
		z: Math.round(payload.blockPoint.z),
	}
	hoverCoordsVisible.value = true
	scheduleHoverCoordsHide()
}

const teardown = () => {
	clearHoverCoordsHideTimer()
	unbindPointerMove?.()
	unbindPointerMove = null
	removeMouseLeaveListener?.()
	removeMouseLeaveListener = null
	controllerRef.value?.destroy()
	controllerRef.value = null
	providerReady.value = false
}

onMounted(() => {
	void (async () => {
		await nextTick()
		const container = mapContainerRef.value

		if (!container) {
			return
		}

		const [, mapModule] = await Promise.all([
			import('leaflet'),
			import('~/utils/map'),
		])
		const provider = mapModule.createPortalDynmapProvider()
		const controller = mapModule.createLeafletMapController(provider)

		controllerRef.value = controller

		controller.on('ready', () => {
			providerReady.value = true
			;(controller.getLeafletInstance() as LeafletMap | null)?.invalidateSize()
		})

		unbindPointerMove = controller.on('pointermove', handlePointerMove)

		const handleMouseLeave = () => {
			scheduleHoverCoordsHide()
		}
		container.addEventListener('mouseleave', handleMouseLeave)
		removeMouseLeaveListener = () => {
			container.removeEventListener('mouseleave', handleMouseLeave)
		}

		controller.mount({
			container,
			center: provider.defaultView.center,
			zoom: provider.defaultView.zoom,
			showZoomControl: false,
		})

		requestAnimationFrame(() => {
			;(controller.getLeafletInstance() as LeafletMap | null)?.invalidateSize()
		})
	})()
})

onBeforeUnmount(() => {
	teardown()
})
</script>

<style scoped>
.hover-coords-enter-active,
.hover-coords-leave-active {
	transition:
		opacity 220ms ease-out,
		transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 220ms ease-out;
}

.hover-coords-enter-from,
.hover-coords-leave-to {
	opacity: 0;
	filter: blur(1px);
	transform: translateY(8px) scale(0.96);
}

.hover-coords-enter-to,
.hover-coords-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0) scale(1);
}

.digit-flip {
	display: inline-block;
	width: 0.62em;
	height: 1.2em;
	overflow: hidden;
	overflow: clip;
	clip-path: inset(0);
	contain: paint;
	line-height: 1.2em;
	text-align: center;
	font-variant-numeric: tabular-nums;
	vertical-align: -0.16em;
}

.digit-flip__reel {
	display: flex;
	flex-direction: column;
	line-height: 1.2em;
	will-change: transform;
}

.digit-flip__digit {
	display: block;
	width: 100%;
	height: 1.2em;
	line-height: 1.2em;
	text-align: center;
}

.hover-coords-text {
	display: inline-block;
	min-width: 2ch;
	max-width: 8ch;
	line-height: 1;
	font-size: 1rem;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum';
	overflow: hidden;
}

.hover-coords-text__inner {
	display: inline-block;
	width: max-content;
	height: 1.2em;
	line-height: 1.2em;
	transform: translateY(-0.12em);
	white-space: nowrap;
}

.hover-coords-text__char {
	display: inline-block;
	height: 1.2em;
	line-height: 1.2em;
	vertical-align: -0.16em;
}
</style>
