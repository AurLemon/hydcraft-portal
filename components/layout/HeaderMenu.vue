<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface MenuItem {
	key: string
	label: string
	to: string
	isFallback?: boolean
}

type LocaleCode = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'

const props = defineProps<{
	activeNavItemClass: string
	fallbackNavItemClass: string
	inactiveNavItemClass: string
}>()

const route = useRoute()
const error = useError()
const localePath = useLocalePath()
const menuInner = ref<HTMLElement | null>(null)
const fallbackMeasure = ref<HTMLElement | null>(null)
const shellWidth = ref<number | null>(null)
const viewportWidth = ref<number | null>(null)
const displayedFallback = ref<MenuItem | null>(null)
const fallbackSlotVisible = ref(false)
const fallbackSlotWidth = ref(0)
const SIDE_GUTTER = 12
const MOBILE_SIDE_GUTTER = 12
const MOBILE_BREAKPOINT = 1024
let resizeObserver: ResizeObserver | null = null
let fallbackLeaveTimer: ReturnType<typeof setTimeout> | null = null

const baseNavItems = computed<MenuItem[]>(() => [
	{ key: 'entry', label: t('routes.entry'), to: '/' },
	{ key: 'timeline', label: t('routes.timeline'), to: '/timeline' },
	{ key: 'about', label: t('routes.about'), to: '/about' },
])

const resolveTo = (item: MenuItem): string => localePath(item.to)

const normalizePath = (path: string): string => {
	const matched = path.match(/^\/(?:zh-CN|zh-TW|ja-JP|en-US)(?=\/|$)(.*)$/)
	if (!matched) {
		return path
	}

	return matched[1] ? `/${matched[1].replace(/^\/+/, '')}` : '/'
}

const isPathActive = (
	item: MenuItem,
	currentPath: string = route.path,
): boolean => {
	const target = resolveTo(item)
	if (item.to === '/') {
		return currentPath === target
	}

	return currentPath === target || currentPath.startsWith(`${target}/`)
}

const currentFallback = computed<MenuItem | null>(() => {
	const hasCurrent = baseNavItems.value.some((item) => isPathActive(item))
	if (hasCurrent) {
		return null
	}

	if (error.value) {
		return {
			key: 'error-page',
			label: t('header.nav.errorPage'),
			to: route.fullPath || route.path,
			isFallback: true,
		}
	}

	const routeToLabelKey: Record<string, string> = {
		'/': 'routes.entry',
		'/timeline': 'routes.timeline',
		'/story': 'routes.timeline',
		'/overview': 'routes.overview',
		'/about': 'routes.about',
		'/links': 'routes.links',
		'/partners': 'routes.partners',
	}

	const normalizedPath = normalizePath(route.path)
	const fallbackLabel = t(
		routeToLabelKey[normalizedPath] || 'header.nav.currentPage',
	)

	return {
		key: route.fullPath || route.path,
		label: fallbackLabel,
		to: route.fullPath || route.path,
		isFallback: true,
	}
})

const resolveHighlightClass = (item: MenuItem): string =>
	isPathActive(item) ? 'translate-y-[0px] scale-y-[1] opacity-100' : ''

const displayNavItems = computed<MenuItem[]>(() =>
	currentFallback.value
		? [...baseNavItems.value, currentFallback.value]
		: baseNavItems.value,
)

const isMobileMenuClamped = computed(() => {
	if (viewportWidth.value === null || shellWidth.value === null) {
		return false
	}

	const contentWidth = shellWidth.value + SIDE_GUTTER * 2
	const maxMobileWidth = viewportWidth.value - MOBILE_SIDE_GUTTER * 2
	return (
		viewportWidth.value < MOBILE_BREAKPOINT && contentWidth > maxMobileWidth
	)
})

const menuShellStyle = computed(() => {
	if (shellWidth.value === null) {
		return undefined
	}

	const contentWidth = shellWidth.value + SIDE_GUTTER * 2
	if (
		viewportWidth.value === null ||
		viewportWidth.value >= MOBILE_BREAKPOINT
	) {
		return { width: `${contentWidth}px` }
	}

	const maxMobileWidth = Math.max(
		0,
		viewportWidth.value - MOBILE_SIDE_GUTTER * 2,
	)

	return {
		width: `${Math.min(contentWidth, maxMobileWidth)}px`,
	}
})

const resolveNavItemClass = (item: MenuItem): string =>
	isPathActive(item) ? props.activeNavItemClass : props.inactiveNavItemClass

const measureFallbackWidth = async (): Promise<void> => {
	await nextTick()
	const el = fallbackMeasure.value
	if (!el) {
		return
	}

	fallbackSlotWidth.value = Math.ceil(el.scrollWidth)
}

const syncShellWidth = async (): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	await nextTick()
	const inner = menuInner.value
	if (!inner) {
		return
	}

	shellWidth.value = Math.ceil(inner.scrollWidth)
}

const syncFallbackWidth = async (): Promise<void> => {
	await measureFallbackWidth()
	await syncShellWidth()
}

const syncViewportWidth = (): void => {
	if (!import.meta.client) {
		return
	}

	viewportWidth.value = window.innerWidth
}

const onResize = (): void => {
	syncViewportWidth()
	void syncShellWidth()
}

watch(
	currentFallback,
	async (next) => {
		if (fallbackLeaveTimer) {
			clearTimeout(fallbackLeaveTimer)
			fallbackLeaveTimer = null
		}

		if (next) {
			displayedFallback.value = next
			fallbackSlotVisible.value = true
			await syncFallbackWidth()
			return
		}

		if (!displayedFallback.value) {
			fallbackSlotVisible.value = false
			fallbackSlotWidth.value = 0
			return
		}

		await measureFallbackWidth()
		fallbackSlotWidth.value = 0
		displayedFallback.value = null
		fallbackLeaveTimer = setTimeout(() => {
			fallbackSlotVisible.value = false
			fallbackLeaveTimer = null
		}, 350)
	},
	{ immediate: true },
)

watch(
	() => displayedFallback.value?.label,
	() => {
		if (!displayedFallback.value) {
			return
		}

		void syncFallbackWidth()
	},
)

watch(
	() =>
		displayNavItems.value.map((item) => `${item.key}:${item.label}`).join('|'),
	() => {
		void syncShellWidth()
	},
)

onMounted(() => {
	syncViewportWidth()
	void syncShellWidth()
	if (currentFallback.value) {
		void syncFallbackWidth()
	}

	if (menuInner.value) {
		resizeObserver = new ResizeObserver(() => {
			void syncShellWidth()
		})
		resizeObserver.observe(menuInner.value)
	}

	window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	window.removeEventListener('resize', onResize)
	if (fallbackLeaveTimer) {
		clearTimeout(fallbackLeaveTimer)
		fallbackLeaveTimer = null
	}
})
</script>

<template>
	<div
		ref="fallbackMeasure"
		class="pointer-events-none fixed top-0 left-0 -z-10 rounded-full p-2 text-[16px] leading-none font-semibold whitespace-nowrap opacity-0"
		aria-hidden="true"
	>
		{{ displayedFallback?.label ?? currentFallback?.label ?? '' }}
	</div>

	<nav
		class="absolute left-1/2 flex max-w-[calc(100vw-1.5rem)] min-w-0 -translate-x-1/2 justify-center"
	>
		<div
			class="max-w-full overflow-hidden rounded-full px-2 transition-[width] duration-500 ease-out"
			:class="
				isMobileMenuClamped
					? 'overflow-x-auto overflow-y-hidden'
					: 'overflow-hidden'
			"
			:style="menuShellStyle"
		>
			<div
				ref="menuInner"
				class="inline-flex w-max flex-none flex-nowrap items-center justify-center gap-1"
			>
				<NuxtLink
					v-for="item in baseNavItems"
					:key="item.key"
					:to="resolveTo(item)"
					class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
					:class="resolveNavItemClass(item)"
					:aria-current="isPathActive(item) ? 'page' : undefined"
				>
					<span
						class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-[0.18em] scale-y-[0.55] rounded-md bg-[rgba(125,211,252,0.28)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.18)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:scale-y-[1] group-hover:opacity-100 dark:bg-[rgba(125,211,252,0.16)] dark:shadow-[0_0_10px_rgba(125,211,252,0.12)]"
						:class="resolveHighlightClass(item)"
						aria-hidden="true"
					/>
					{{ item.label }}
				</NuxtLink>

				<div
					v-if="fallbackSlotVisible"
					class="overflow-hidden transition-[width] duration-350 ease-out"
					:style="{ width: `${fallbackSlotWidth}px` }"
				>
					<Transition
						mode="out-in"
						appear
						enter-active-class="transition-opacity duration-[250ms] ease-out"
						enter-from-class="opacity-0"
						enter-to-class="opacity-100"
						leave-active-class="transition-opacity duration-[250ms] ease-out"
						leave-from-class="opacity-100"
						leave-to-class="opacity-0"
					>
						<NuxtLink
							v-if="displayedFallback"
							:key="displayedFallback.to"
							:to="resolveTo(displayedFallback)"
							class="group relative z-0 rounded-full p-2 text-[16px] leading-none font-semibold whitespace-nowrap transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
							:class="fallbackNavItemClass"
							aria-current="page"
						>
							<span
								class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-0 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.28)] opacity-100 shadow-[0_0_10px_rgba(125,211,252,0.18)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[rgba(125,211,252,0.16)] dark:shadow-[0_0_10px_rgba(125,211,252,0.12)]"
								aria-hidden="true"
							/>
							{{ displayedFallback.label }}
						</NuxtLink>
					</Transition>
				</div>
			</div>
		</div>
	</nav>
</template>
