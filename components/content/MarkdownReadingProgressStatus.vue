<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface MarkdownReadingProgressDoc {
	body?: unknown
}

interface ReadingProgressTarget {
	article: HTMLElement
	stats: HTMLElement | null
	footer: HTMLElement | null
	header: HTMLElement | null
}

const props = withDefaults(
	defineProps<{
		doc: MarkdownReadingProgressDoc
		targetSelector?: string
		statsSelector?: string
		footerSelector?: string
		headerSelector?: string
	}>(),
	{
		targetSelector: '[data-markdown-page]',
		statsSelector: '[data-reading-stats]',
		footerSelector: 'footer',
		headerSelector: 'header',
	},
)

const { t } = useI18n()
const progress = ref(0)
const visible = ref(false)
const target = ref<ReadingProgressTarget | null>(null)
const progressMeasureRef = ref<HTMLElement | null>(null)
const progressTextWidth = ref<number | null>(null)

let animationFrameId: number | null = null
let observer: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

const circleRadius = 10
const circleCircumference = 2 * Math.PI * circleRadius
const digitCharacters = Array.from({ length: 10 }, (_, index) => `${index}`)
const digitStepEm = 1.2
const progressText = computed(() => `${progress.value}%`)
const progressDigits = computed(() => String(progress.value).split(''))

const extractText = (node: unknown): string => {
	if (typeof node === 'string') {
		return node
	}

	if (Array.isArray(node)) {
		if (
			node.length >= 2 &&
			typeof node[0] === 'string' &&
			node[1] !== null &&
			typeof node[1] === 'object' &&
			!Array.isArray(node[1])
		) {
			return node.slice(2).map(extractText).join(' ')
		}

		return node.map(extractText).join(' ')
	}

	if (node !== null && typeof node === 'object') {
		const record = node as Record<string, unknown>

		if (Array.isArray(record.value)) {
			return record.value.map(extractText).join(' ')
		}

		if (Array.isArray(record.children)) {
			return record.children.map(extractText).join(' ')
		}

		if (typeof record.text === 'string') {
			return record.text
		}
	}

	return ''
}

const normalizeText = (text: string): string => text.replace(/\s+/g, ' ').trim()

const contentText = computed(() => normalizeText(extractText(props.doc.body)))

const cjkCharCount = computed(
	() =>
		(
			contentText.value.match(
				/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g,
			) || []
		).length,
)

const englishWordCount = computed(
	() =>
		(contentText.value.match(/\b(?:[A-Za-z]+(?:'[A-Za-z]+)?|\d+)\b/g) || [])
			.length,
)

const totalCount = computed(() => cjkCharCount.value + englishWordCount.value)

const readingMinutes = computed(() =>
	Math.max(
		1,
		Math.ceil(cjkCharCount.value / 250 + englishWordCount.value / 180),
	),
)

const statsText = computed(() =>
	t('main.contentFooter.stats', {
		count: totalCount.value,
		minutes: readingMinutes.value,
	}),
)

const resolveTarget = (): ReadingProgressTarget | null => {
	if (!import.meta.client) {
		return null
	}

	const article = document.querySelector<HTMLElement>(props.targetSelector)
	if (!article) {
		return null
	}

	return {
		article,
		stats: document.querySelector<HTMLElement>(props.statsSelector),
		footer: document.querySelector<HTMLElement>(props.footerSelector),
		header: document.querySelector<HTMLElement>(props.headerSelector),
	}
}

const calculateProgress = (): void => {
	const currentTarget = target.value
	if (!import.meta.client || !currentTarget) {
		visible.value = false
		return
	}

	const { article, stats, footer, header } = currentTarget
	const articleTop = article.getBoundingClientRect().top + window.scrollY
	const articleBottom = articleTop + article.offsetHeight
	const end = articleBottom - window.innerHeight
	const viewportHeight = window.innerHeight
	const scrollY = window.scrollY
	const statsRect = stats?.getBoundingClientRect()
	const articleRect = article.getBoundingClientRect()
	const headerBottom = header?.getBoundingClientRect().bottom ?? 0
	const hasReachedHeader = statsRect
		? statsRect.top <= headerBottom
		: articleRect.top <= headerBottom
	const footerTop =
		footer?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
	const hasEnoughContent = article.offsetHeight > viewportHeight + 96
	const shouldShow =
		hasEnoughContent && hasReachedHeader && footerTop > viewportHeight - 32

	if (end <= articleTop) {
		progress.value = 100
		visible.value = false
		return
	}

	if (scrollY <= articleTop) {
		progress.value = 0
	} else if (scrollY >= end) {
		progress.value = 100
	} else {
		progress.value = Math.floor(
			((scrollY - articleTop) / (end - articleTop)) * 100,
		)
	}

	progress.value = Math.max(0, Math.min(100, progress.value))
	visible.value = shouldShow
}

const scheduleCalculate = (): void => {
	if (!import.meta.client) {
		return
	}

	if (animationFrameId !== null) {
		window.cancelAnimationFrame(animationFrameId)
	}

	animationFrameId = window.requestAnimationFrame(() => {
		animationFrameId = null
		calculateProgress()
	})
}

const bindTarget = (): void => {
	target.value = resolveTarget()
	resizeObserver?.disconnect()
	resizeObserver = null

	if (target.value) {
		resizeObserver = new ResizeObserver(scheduleCalculate)
		resizeObserver.observe(target.value.article)
		if (target.value.footer) {
			resizeObserver.observe(target.value.footer)
		}
	}

	scheduleCalculate()
}

const syncProgressTextWidth = async (): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	await nextTick()

	const width = progressMeasureRef.value?.getBoundingClientRect().width
	if (!width) {
		return
	}

	progressTextWidth.value = Math.ceil(width)
}

watch(
	() => [
		props.targetSelector,
		props.statsSelector,
		props.footerSelector,
		props.headerSelector,
	],
	() => {
		bindTarget()
	},
)

watch(
	() => props.doc,
	() => {
		scheduleCalculate()
	},
)

watch(progressText, () => {
	void syncProgressTextWidth()
})

onMounted(() => {
	bindTarget()
	void syncProgressTextWidth()

	window.addEventListener('scroll', scheduleCalculate, { passive: true })
	window.addEventListener('resize', scheduleCalculate, { passive: true })

	observer = new MutationObserver(() => {
		if (!target.value || !document.contains(target.value.article)) {
			bindTarget()
			return
		}

		scheduleCalculate()
	})
	observer.observe(document.body, { childList: true, subtree: true })
})

onBeforeUnmount(() => {
	if (!import.meta.client) {
		return
	}

	if (animationFrameId !== null) {
		window.cancelAnimationFrame(animationFrameId)
		animationFrameId = null
	}

	window.removeEventListener('scroll', scheduleCalculate)
	window.removeEventListener('resize', scheduleCalculate)
	observer?.disconnect()
	observer = null
	resizeObserver?.disconnect()
	resizeObserver = null
})
</script>

<template>
	<ClientOnly>
		<Teleport to="#page-statusbar">
			<Transition name="statusbar-content">
				<div
					v-if="visible"
					class="flex min-h-10 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 shadow-[0_4rem_5rem_#000a0f80] transition-[width,box-shadow,background-color] duration-500 ease-out dark:border-slate-700 dark:bg-slate-900"
					aria-live="polite"
				>
					<div class="flex items-center whitespace-nowrap">
						<div
							class="relative flex h-6 w-6 items-center justify-center text-primary-500"
						>
							<svg
								class="absolute inset-0 h-full w-full -rotate-90"
								viewBox="0 0 36 36"
							>
								<circle
									cx="18"
									cy="18"
									:r="circleRadius"
									class="stroke-slate-300 dark:stroke-slate-600"
									stroke-width="3"
									fill="none"
								/>
								<circle
									cx="18"
									cy="18"
									:r="circleRadius"
									class="stroke-current transition-all duration-150 ease-out"
									stroke-width="3"
									fill="none"
									stroke-linecap="round"
									:stroke-dasharray="circleCircumference"
									:stroke-dashoffset="
										circleCircumference - (progress / 100) * circleCircumference
									"
								/>
							</svg>
						</div>
						<span
							class="progress-text min-w-9 overflow-hidden text-lg leading-none font-medium tracking-wide text-slate-800 transition-[width] duration-220 ease-out dark:text-slate-300"
							:style="
								progressTextWidth === null
									? undefined
									: { width: `${progressTextWidth}px` }
							"
						>
							<span class="progress-text__inner" :aria-label="progressText">
								<span
									v-for="(digit, index) in progressDigits"
									:key="`${progressDigits.length}-${index}`"
									class="digit-flip"
									aria-hidden="true"
								>
									<span
										class="digit-flip__reel transition-transform duration-150 ease-out"
										:style="{
											transform: `translate3d(0, -${Number(digit) * digitStepEm}em, 0)`,
										}"
									>
										<span
											v-for="digitCharacter in digitCharacters"
											:key="digitCharacter"
											class="digit-flip__digit"
										>
											{{ digitCharacter }}
										</span>
									</span>
								</span>
								<span class="progress-percent" aria-hidden="true">%</span>
							</span>
						</span>
						<span
							ref="progressMeasureRef"
							class="progress-text pointer-events-none fixed top-0 left-0 -z-10 text-lg leading-none font-medium tracking-wide opacity-0"
							aria-hidden="true"
						>
							<span class="progress-text__inner">
								<span
									v-for="(digit, index) in progressDigits"
									:key="`measure-${progressDigits.length}-${index}`"
									class="digit-flip"
								>
									{{ digit }}
								</span>
								<span class="progress-percent">%</span>
							</span>
						</span>
					</div>
					<div class="text-sm text-slate-400 dark:text-slate-500">
						{{ statsText }}
					</div>
				</div>
			</Transition>
		</Teleport>
	</ClientOnly>
</template>

<style scoped>
.statusbar-content-enter-active,
.statusbar-content-leave-active {
	transition:
		opacity 220ms ease-out,
		transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 220ms ease-out;
}

.statusbar-content-enter-from,
.statusbar-content-leave-to {
	opacity: 0;
	filter: blur(1px);
	transform: translateY(8px) scale(0.96);
}

.statusbar-content-enter-to,
.statusbar-content-leave-from {
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

.progress-text {
	line-height: 1;
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum';
}

.progress-text__inner {
	display: inline-block;
	width: max-content;
	height: 1.2em;
	line-height: 1.2em;
	transform: translateY(-0.12em);
	white-space: nowrap;
}

.progress-percent {
	display: inline-block;
	height: 1.2em;
	margin-left: 0.02em;
	line-height: 1.2em;
	font-variant-numeric: tabular-nums;
	vertical-align: -0.16em;
}
</style>
