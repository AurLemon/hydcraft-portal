<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import hydcraftLogo from '~/assets/resources/brand/logo_HydCraft.png'

interface MenuItem {
	key: string
	label: string
	to: string
	isFallback?: boolean
}

interface LocaleItem {
	label: string
	value: LocaleCode
}

interface ThemeModeItem {
	value: ThemeMode
	label: string
	icon: string
}

type LocaleCode = 'zh-CN' | 'zh-TW' | 'en-US'
type ThemeMode = 'light' | 'dark' | 'system'

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useGlobalI18n()
const nuxtApp = useNuxtApp()
const colorMode = nuxtApp.$colorMode
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

const themeIconMap = {
	light: 'i-lucide-sun',
	dark: 'i-lucide-moon',
} as const

const getThemeModeIcon = (mode: ThemeMode): string =>
	mode === 'system' ? 'i-lucide-monitor' : themeIconMap[mode]

const localeItems: LocaleItem[] = [
	{ label: '简体中文', value: 'zh-CN' },
	{ label: '繁體中文', value: 'zh-TW' },
	{ label: 'English', value: 'en-US' },
]

const baseNavItems = computed<MenuItem[]>(() => [
	{ key: 'entry', label: t('routes.entry'), to: '/' },
	{ key: 'timeline', label: t('routes.timeline'), to: '/timeline' },
	{ key: 'about', label: t('routes.about'), to: '/about' },
])

const themeModes = computed<ThemeModeItem[]>(() => [
	{ value: 'light', label: t('header.theme.light'), icon: themeIconMap.light },
	{ value: 'dark', label: t('header.theme.dark'), icon: themeIconMap.dark },
	{
		value: 'system',
		label: t('header.theme.system'),
		icon: getThemeModeIcon('system'),
	},
])

const resolveTo = (item: MenuItem): string => localePath(item.to)

const normalizePath = (path: string): string => {
	const matched = path.match(/^\/(?:zh-CN|zh-TW|en-US)(?=\/|$)(.*)$/)
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

	const routeToLabelKey: Record<string, string> = {
		'/': 'routes.entry',
		'/timeline': 'routes.timeline',
		'/story': 'routes.timeline',
		'/overview': 'routes.overview',
		'/about': 'routes.about',
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

const selectedThemeMode = computed<ThemeMode>(() => {
	const pref = colorMode.preference
	return pref === 'light' || pref === 'dark' || pref === 'system'
		? pref
		: 'system'
})

const themeButtonIcon = computed(() =>
	getThemeModeIcon(selectedThemeMode.value),
)

const selectedLocale = computed(() => locale.value as LocaleCode)
const isHeroHeader = computed(() => route.meta.headerVariant === 'hero')

const headerScrimClass = computed(() =>
	isHeroHeader.value
		? 'bg-[#192024]/25'
		: 'bg-[#FAFAFA]/55 dark:bg-[#192024]/45',
)

const headerActionButtonClass = computed(() =>
	isHeroHeader.value
		? 'h-9 w-9 rounded-full text-white hover:bg-white/10 hover:text-white active:bg-white/20'
		: 'h-9 w-9 rounded-full hover:bg-slate-500/10 active:bg-slate-500/20',
)

const activeNavItemClass = computed(() =>
	isHeroHeader.value
		? 'font-semibold text-white opacity-100'
		: 'font-semibold text-primary opacity-100 dark:text-primary',
)

const fallbackNavItemClass = computed(() =>
	isHeroHeader.value
		? 'text-white opacity-100'
		: 'text-primary opacity-100 dark:text-primary',
)

const inactiveNavItemClass = computed(() =>
	isHeroHeader.value
		? 'text-white opacity-80 hover:text-white hover:opacity-100'
		: 'text-slate-800 opacity-85 hover:text-slate-800 hover:opacity-100 dark:text-slate-300 dark:opacity-75 dark:hover:text-slate-100 dark:hover:opacity-100',
)

const resolveNavItemClass = (item: MenuItem): string =>
	isPathActive(item) ? activeNavItemClass.value : inactiveNavItemClass.value

const selectTheme = (mode: ThemeMode): void => {
	colorMode.preference = mode
}

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

const restoreScrollPosition = (savedY: number): void => {
	if (!import.meta.client) {
		return
	}

	const restore = () => {
		window.scrollTo({ top: savedY, behavior: 'auto' })
	}

	restore()
	requestAnimationFrame(() => {
		restore()
		window.dispatchEvent(new Event('scroll'))
	})
}

const selectLocale = async (value: LocaleCode): Promise<void> => {
	if (!value || value === locale.value) {
		return
	}

	const savedScrollY = import.meta.client ? window.scrollY : 0
	const setLocale = (
		nuxtApp.$i18n as { setLocale?: (code: LocaleCode) => Promise<void> }
	).setLocale

	if (setLocale) {
		await setLocale(value)
		await nextTick()
		restoreScrollPosition(savedScrollY)
		return
	}

	locale.value = value
	await nextTick()
	restoreScrollPosition(savedScrollY)
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
	<header class="sticky top-0 z-100 pt-6 lg:px-8 lg:pt-10 lg:pb-16">
		<div
			class="pointer-events-none absolute top-0 right-0 -bottom-4/5 left-0 z-10 backdrop-blur-[48px] mask-[linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.98)_30%,rgba(0,0,0,0.92)_45%,rgba(0,0,0,0.8)_55%,rgba(0,0,0,0.58)_65%,rgba(0,0,0,0.35)_75%,rgba(0,0,0,0.15)_85%,transparent_100%)] lg:-bottom-3/5"
			:class="headerScrimClass"
		/>

		<div
			ref="fallbackMeasure"
			class="pointer-events-none fixed top-0 left-0 -z-10 rounded-full p-2 text-[16px] leading-none font-semibold whitespace-nowrap opacity-0"
			aria-hidden="true"
		>
			{{ displayedFallback?.label ?? currentFallback?.label ?? '' }}
		</div>

		<div
			class="site-shell relative z-40 mx-auto flex items-center justify-between px-6 lg:px-0"
		>
			<div
				class="flex h-9 w-9 items-center justify-center"
				aria-label="HydCraft"
			>
				<img
					:src="hydcraftLogo"
					alt="HydCraft"
					class="h-7 w-7 object-contain"
				/>
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

			<div class="ml-auto flex items-center gap-2">
				<UPopover
					:popper="{ placement: 'bottom-end' }"
					:ui="{ content: 'z-[40000]' }"
				>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						:class="headerActionButtonClass"
						icon-only
						:aria-label="t('header.theme.switch')"
					>
						<UIcon :name="themeButtonIcon" class="h-6 w-6" />
					</UButton>

					<template #content>
						<div class="flex w-40 flex-col gap-1 p-2">
							<UButton
								v-for="mode in themeModes"
								:key="mode.value"
								type="button"
								color="neutral"
								variant="ghost"
								class="w-full justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
								:class="{
									'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200':
										selectedThemeMode === mode.value,
									'text-slate-600 dark:text-slate-300':
										selectedThemeMode !== mode.value,
								}"
								@click="selectTheme(mode.value)"
							>
								<UIcon :name="mode.icon" class="h-4 w-4" />
								<span>{{ mode.label }}</span>
								<UIcon
									v-if="selectedThemeMode === mode.value"
									name="i-lucide-check"
									class="ml-auto h-4 w-4"
								/>
							</UButton>
						</div>
					</template>
				</UPopover>

				<UPopover
					:popper="{ placement: 'bottom-end' }"
					:ui="{ content: 'z-[40000]' }"
				>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						:class="headerActionButtonClass"
						icon-only
						:aria-label="t('header.language.switch')"
					>
						<UIcon name="i-lucide-languages" class="h-6 w-6" />
					</UButton>

					<template #content>
						<div class="flex w-40 flex-col gap-1 p-2">
							<UButton
								v-for="item in localeItems"
								:key="item.value"
								type="button"
								color="neutral"
								variant="ghost"
								class="w-full justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
								:class="{
									'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200':
										selectedLocale === item.value,
									'text-slate-600 dark:text-slate-300':
										selectedLocale !== item.value,
								}"
								@click="selectLocale(item.value)"
							>
								<span>{{ item.label }}</span>
								<UIcon
									v-if="selectedLocale === item.value"
									name="i-lucide-check"
									class="ml-auto h-4 w-4"
								/>
							</UButton>
						</div>
					</template>
				</UPopover>
			</div>
		</div>
	</header>
</template>
