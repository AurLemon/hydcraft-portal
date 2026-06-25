<template>
	<section
		class="relative isolate h-104 w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm sm:h-120"
		@mouseenter="handleUserInteraction"
		@mousemove="handleUserInteraction"
	>
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
							class="text-[11px] font-medium tracking-[0.24em] text-white/55 translate-y-0.5"
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
									<span
										v-else
										class="hover-coords-text__char"
										aria-hidden="true"
									>
										{{ character }}
									</span>
								</template>
							</span>
						</span>
					</div>

					<div class="flex items-center gap-1 whitespace-nowrap">
						<span
							class="text-[11px] font-medium tracking-[0.24em] text-white/55 translate-y-0.5"
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
									<span
										v-else
										class="hover-coords-text__char"
										aria-hidden="true"
									>
										{{ character }}
									</span>
								</template>
							</span>
						</span>
					</div>
				</div>
			</Transition>
		</div>

		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-998 h-2/3 bg-linear-to-t from-slate-500/78 dark:from-slate-950/78 via-transparent dark:via-slate-950/1 to-transparent backdrop-blur-xl mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.96)_18%,rgba(0,0,0,0.78)_34%,rgba(0,0,0,0.38)_56%,transparent_100%)]"
		/>

		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-999 flex justify-center px-6 pb-6 sm:px-10 sm:pb-8"
		>
			<div class="flex w-full max-w-3xl flex-col items-center gap-4">
				<Transition name="rule-fade" mode="out-in">
					<div
						:key="currentIndex"
						class="flex w-full flex-col items-center gap-1.5 text-center"
					>
						<div class="flex items-center gap-3">
							<span
								class="font-arkpixel text-2xl leading-none text-primary-300/90 [text-shadow:0_2px_10px_rgba(15,23,42,0.5)]"
							>
								{{ String(currentIndex + 1).padStart(2, '0') }}
							</span>
							<span
								class="font-arkpixel text-2xl leading-tight tracking-wider text-white [text-shadow:0_2px_10px_rgba(15,23,42,0.5)] sm:text-3xl"
							>
								{{ currentRule.title }}
							</span>
						</div>
						<p
							class="max-w-2xl text-sm leading-6 text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.5)]"
						>
							{{ currentRule.desc }}
						</p>
					</div>
				</Transition>

				<div
					class="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-950/40 px-2 py-1.5 backdrop-blur-md"
				>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-chevron-left"
						class="text-white/85 hover:bg-white/12 hover:text-white focus-visible:bg-white/12 active:bg-white/16"
						:aria-label="t('content.intro.participation.prev')"
						@click="goPrev"
					/>
					<div class="flex items-center gap-1.5">
						<button
							v-for="index in RULE_COUNT"
							:key="`participation-dot-${index}`"
							type="button"
							class="block size-1.5 rounded-full transition-all duration-200"
							:class="
								index - 1 === currentIndex
									? 'bg-white'
									: 'bg-white/35 hover:bg-white/60'
							"
							:aria-label="
								t('content.intro.participation.goto', {
									index,
								})
							"
							@click="goTo(index - 1)"
						/>
					</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-chevron-right"
						class="text-white/85 hover:bg-white/12 hover:text-white focus-visible:bg-white/12 active:bg-white/16"
						:aria-label="t('content.intro.participation.next')"
						@click="goNext"
					/>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import type {
	MinecraftMapController,
	MinecraftMapPointerMoveEventPayload,
	MinecraftMapProvider,
} from '~/utils/map'

const { t } = useI18n()

const mapContainerRef = ref<HTMLElement | null>(null)
const controllerRef = ref<MinecraftMapController | null>(null)
const providerRef = ref<MinecraftMapProvider | null>(null)
const providerReady = ref(false)
const hoveredBlockPoint = ref<{ x: number; z: number } | null>(null)
const hoverCoordsVisible = ref(false)
let unbindPointerMove: (() => void) | null = null
let removeMouseLeaveListener: (() => void) | null = null
let hoverCoordsHideTimer: ReturnType<typeof setTimeout> | null = null

const HOVER_COORDS_HIDE_DELAY = 3000
const RULE_COUNT = 6

const AUTO_PLAY_INTERVAL = 3000
const INTERACTION_PAUSE = 3000
const digitCharacters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const digitStepEm = 1.2

const currentIndex = ref(0)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null
let resumeTimer: ReturnType<typeof setTimeout> | null = null

interface ParticipationRule {
	title: string
	desc: string
}

// 用 t() 按 `rules.${index}.title/desc` 索引取，而非 tm() 取整个数组：
// vue-i18n 的 tm() 对对象数组会返回被处理过的 message，模板里直接渲染会打出 JSON 原文。
const rules = computed<ParticipationRule[]>(() =>
	Array.from({ length: RULE_COUNT }, (_, index) => ({
		title: t(`content.intro.participation.rules.${index}.title`),
		desc: t(`content.intro.participation.rules.${index}.desc`),
	})),
)

const currentRule = computed<ParticipationRule>(
	() => rules.value[currentIndex.value] ?? rules.value[0]!,
)

const stopAutoPlay = () => {
	if (autoPlayTimer) {
		clearInterval(autoPlayTimer)
		autoPlayTimer = null
	}
}

const startAutoPlay = () => {
	stopAutoPlay()
	autoPlayTimer = setInterval(() => {
		currentIndex.value = (currentIndex.value + 1) % RULE_COUNT
	}, AUTO_PLAY_INTERVAL)
}

const clearResumeTimer = () => {
	if (resumeTimer) {
		clearTimeout(resumeTimer)
		resumeTimer = null
	}
}

// 用户交互后：停掉自动播放，重置 10s 恢复计时；10s 内再次交互会刷新计时，持续暂停。
const handleUserInteraction = () => {
	stopAutoPlay()
	clearResumeTimer()
	resumeTimer = setTimeout(() => {
		startAutoPlay()
		resumeTimer = null
	}, INTERACTION_PAUSE)
}

const goNext = () => {
	currentIndex.value = (currentIndex.value + 1) % RULE_COUNT
	handleUserInteraction()
}

const goPrev = () => {
	currentIndex.value = (currentIndex.value - 1 + RULE_COUNT) % RULE_COUNT
	handleUserInteraction()
}

const goTo = (index: number) => {
	currentIndex.value = index
	handleUserInteraction()
}

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
	}, HOVER_COORDS_HIDE_DELAY)
}

const handlePointerMove = (payload: MinecraftMapPointerMoveEventPayload) => {
	hoveredBlockPoint.value = {
		x: Math.round(payload.blockPoint.x),
		z: Math.round(payload.blockPoint.z),
	}
	hoverCoordsVisible.value = true
	scheduleHoverCoordsHide()
}

const handlePointerLeave = () => {
	scheduleHoverCoordsHide()
}

const teardown = () => {
	clearHoverCoordsHideTimer()
	stopAutoPlay()
	clearResumeTimer()
	unbindPointerMove?.()
	unbindPointerMove = null
	removeMouseLeaveListener?.()
	removeMouseLeaveListener = null
	controllerRef.value?.destroy()
	controllerRef.value = null
	providerRef.value = null
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

		providerRef.value = provider
		controllerRef.value = controller

		controller.on('ready', () => {
			providerReady.value = true
			;(controller.getLeafletInstance() as LeafletMap | null)?.invalidateSize()
		})

		unbindPointerMove = controller.on('pointermove', handlePointerMove)

		const handleMouseLeave = () => {
			handlePointerLeave()
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

		startAutoPlay()
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

.rule-fade-enter-active,
.rule-fade-leave-active {
	transition:
		opacity 280ms ease-out,
		transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 280ms ease-out;
}

.rule-fade-enter-from,
.rule-fade-leave-to {
	opacity: 0;
	filter: blur(2px);
	transform: translateY(6px);
}

.rule-fade-enter-to,
.rule-fade-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0);
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
