<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
	findHeaderMenuGroupByKey,
	findHeaderMenuGroupByPath,
	headerMenuFallbackLabelKeys,
	headerMenuGroups,
	isPathInHeaderMenuGroup,
	mainHeaderMenuGroup,
	normalizeHeaderMenuPath,
	type HeaderMenuGroup,
	type HeaderMenuItem,
} from '~/utils/layout/header-menu'

interface MenuItem {
	key: string
	label: string
	to: string
	icon?: string
	isFallback?: boolean
}

const props = defineProps<{
	activeNavItemClass: string
	fallbackNavItemClass: string
	hidden?: boolean
	inactiveNavItemClass: string
}>()

const route = useRoute()
const error = useError()
const localePath = useLocalePath()
const menuMeasure = ref<HTMLElement | null>(null)
const mobileActiveButton = ref<HTMLElement | null>(null)
const mobileMenuOpen = ref(false)
const shellWidth = ref<number | null>(null)
const viewportWidth = ref<number | null>(null)
const mobileMenuAnchor = ref({ left: 24, top: 48, width: 0, height: 0 })
const displayedGroupKey = ref('main')
const SIDE_GUTTER = 12
const MOBILE_SIDE_GUTTER = 12
const MOBILE_BREAKPOINT = 1024
let resizeObserver: ResizeObserver | null = null

const resolveTo = (item: MenuItem | HeaderMenuItem): string =>
	localePath(item.to)

const normalizePath = (path: string): string => normalizeHeaderMenuPath(path)

const pathGroup = computed<HeaderMenuGroup | undefined>(() =>
	findHeaderMenuGroupByPath(route.path),
)

const routeGroupKey = computed(() => pathGroup.value?.key ?? 'main')

const displayedGroup = computed<HeaderMenuGroup>(
	() =>
		findHeaderMenuGroupByKey(displayedGroupKey.value) ?? mainHeaderMenuGroup,
)

const parentGroup = computed<HeaderMenuGroup | null>(() => {
	const parentKey = displayedGroup.value.parentKey

	return parentKey ? (findHeaderMenuGroupByKey(parentKey) ?? null) : null
})

const isViewingRouteGroup = computed(
	() => displayedGroup.value.key === routeGroupKey.value,
)

const activeRouteBelongsToAnyGroup = computed(() =>
	headerMenuGroups.some((group) => {
		if (group.match?.(normalizePath(route.path))) {
			return true
		}

		return isPathInHeaderMenuGroup(group, route.path)
	}),
)

const groupMenuItems = computed<MenuItem[]>(() =>
	displayedGroup.value.items.map((item) => ({
		key: item.key,
		label: t(item.labelKey),
		to: item.to,
		icon: item.icon,
	})),
)

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
	if (!isViewingRouteGroup.value || activeRouteBelongsToAnyGroup.value) {
		return null
	}

	if (groupMenuItems.value.some((item) => isPathActive(item))) {
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

	const normalizedPath = normalizePath(route.path)
	const labelKey = headerMenuFallbackLabelKeys[normalizedPath]

	return {
		key: route.fullPath || route.path,
		label: labelKey ? t(labelKey) : t('header.nav.currentPage'),
		to: route.fullPath || route.path,
		isFallback: true,
	}
})

const displayNavItems = computed<MenuItem[]>(() =>
	currentFallback.value
		? [...groupMenuItems.value, currentFallback.value]
		: groupMenuItems.value,
)

const activeDisplayNavItem = computed<MenuItem>(() => {
	const activeItem = displayNavItems.value.find((item) => isPathActive(item))
	const firstItem = displayNavItems.value[0]

	return (
		activeItem ||
		currentFallback.value ||
		firstItem || {
			key: 'current-page',
			label: t('header.nav.currentPage'),
			to: route.fullPath || route.path,
			isFallback: true,
		}
	)
})

const selectableMobileGroupNavItems = computed<MenuItem[]>(() =>
	groupMenuItems.value.filter(
		(item) => item.key !== activeDisplayNavItem.value.key,
	),
)

const selectableMobileFallback = computed<MenuItem | null>(() => {
	const fallback = currentFallback.value
	if (!fallback || fallback.key === activeDisplayNavItem.value.key) {
		return null
	}

	return fallback
})

const groupTransitionKey = computed(() => displayedGroup.value.key)
const canGoBack = computed(() => parentGroup.value !== null)

const backButtonLabel = computed(() =>
	parentGroup.value ? t('header.nav.backToParent') : t('header.nav.back'),
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

const resolveHighlightClass = (item: MenuItem): string =>
	isPathActive(item) ? 'translate-y-[0px] scale-y-[1] opacity-100' : ''

const hiddenMenuClass = computed(() =>
	props.hidden
		? 'pointer-events-none translate-y-1 opacity-0 select-none'
		: 'translate-y-0 opacity-100',
)

const closeMobileMenu = (): void => {
	mobileMenuOpen.value = false
}

const syncMobileMenuAnchor = async (): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	await nextTick()
	const el = mobileActiveButton.value
	if (!el) {
		return
	}

	const rect = el.getBoundingClientRect()
	mobileMenuAnchor.value = {
		left: Math.round(rect.left),
		top: Math.round(rect.top),
		width: Math.round(rect.width),
		height: Math.round(rect.height),
	}
}

const openMobileMenu = async (): Promise<void> => {
	await syncMobileMenuAnchor()
	mobileMenuOpen.value = true
}

const showParentMenu = (): void => {
	if (!parentGroup.value) {
		return
	}

	displayedGroupKey.value = parentGroup.value.key
}

const showRouteMenu = (): void => {
	displayedGroupKey.value = routeGroupKey.value
}

const selectMobileNavItem = async (item: MenuItem): Promise<void> => {
	closeMobileMenu()
	await navigateTo(resolveTo(item))
}

const selectMobileFallback = async (): Promise<void> => {
	if (!selectableMobileFallback.value) {
		return
	}

	await selectMobileNavItem(selectableMobileFallback.value)
}

const syncShellWidth = async (): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	await nextTick()
	const measure = menuMeasure.value
	if (!measure) {
		return
	}

	shellWidth.value = Math.ceil(measure.scrollWidth)
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
	if (mobileMenuOpen.value) {
		void syncMobileMenuAnchor()
	}
}

watch(
	routeGroupKey,
	(next) => {
		displayedGroupKey.value = next
	},
	{ immediate: true },
)

watch(groupTransitionKey, () => {
	void syncShellWidth()
})

watch(
	displayNavItems,
	() => {
		void syncShellWidth()
	},
	{ deep: true, flush: 'post' },
)

watch(mobileMenuOpen, (open) => {
	if (open) {
		void syncMobileMenuAnchor()
		return
	}

	displayedGroupKey.value = routeGroupKey.value
})

watch(
	() => props.hidden,
	(hidden) => {
		if (hidden) {
			closeMobileMenu()
		}
	},
)

onMounted(() => {
	syncViewportWidth()
	void syncShellWidth()

	if (menuMeasure.value) {
		resizeObserver = new ResizeObserver(() => {
			void syncShellWidth()
		})
		resizeObserver.observe(menuMeasure.value)
	}

	window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	window.removeEventListener('resize', onResize)
})
</script>

<template>
	<div
		ref="menuMeasure"
		class="pointer-events-none fixed top-0 left-0 -z-10 inline-flex w-max flex-none flex-nowrap items-center justify-center gap-2 opacity-0"
		aria-hidden="true"
	>
		<span
			v-for="item in displayNavItems"
			:key="item.key"
			class="rounded-full p-2 text-[16px] leading-none whitespace-nowrap"
			:class="{ 'font-semibold': isPathActive(item) || item.isFallback }"
		>
			{{ item.label }}
		</span>
	</div>

	<nav
		class="absolute left-1/2 hidden max-w-[calc(100vw-1.5rem)] min-w-0 -translate-x-1/2 justify-center transition duration-[220ms] ease-out md:flex"
		:class="hiddenMenuClass"
	>
		<button
			v-if="canGoBack"
			type="button"
			class="absolute top-1/2 right-full mr-5 flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-800 opacity-80 transition duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-100"
			:aria-label="backButtonLabel"
			@click="showParentMenu"
		>
			<UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
		</button>

		<button
			v-if="displayedGroup.key !== routeGroupKey"
			type="button"
			class="absolute top-1/2 left-full ml-5 flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-800 opacity-80 transition duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-100"
			:aria-label="t('header.nav.currentGroup')"
			@click="showRouteMenu"
		>
			<UIcon name="i-lucide-corner-down-right" class="h-5 w-5" />
		</button>

		<div
			class="relative max-w-full overflow-hidden rounded-full px-2 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
			:class="
				isMobileMenuClamped
					? 'overflow-x-auto overflow-y-hidden'
					: 'overflow-hidden'
			"
			:style="menuShellStyle"
		>
			<Transition
				mode="out-in"
				enter-active-class="transition duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
				enter-from-class="-translate-y-2 opacity-0"
				enter-to-class="translate-y-0 opacity-100"
				leave-active-class="transition duration-[160ms] ease-in"
				leave-from-class="translate-y-0 opacity-100"
				leave-to-class="translate-y-2 opacity-0"
			>
				<div
					:key="groupTransitionKey"
					class="inline-flex w-max flex-none flex-nowrap items-center justify-center gap-2"
				>
					<NuxtLink
						v-for="item in groupMenuItems"
						:key="item.key"
						:to="resolveTo(item)"
						class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
						:class="resolveNavItemClass(item)"
						:aria-current="isPathActive(item) ? 'page' : undefined"
					>
						<span
							class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-[0.18em] scale-y-[0.55] rounded-md bg-[rgba(125,211,252,0.16)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:scale-y-[1] group-hover:opacity-100"
							:class="resolveHighlightClass(item)"
							aria-hidden="true"
						/>
						{{ item.label }}
					</NuxtLink>

					<NuxtLink
						v-if="currentFallback"
						:to="resolveTo(currentFallback)"
						class="group relative z-0 rounded-full p-2 text-[16px] leading-none font-semibold whitespace-nowrap transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
						:class="fallbackNavItemClass"
						aria-current="page"
					>
						<span
							class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-0 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-100 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
							aria-hidden="true"
						/>
						{{ currentFallback.label }}
					</NuxtLink>
				</div>
			</Transition>
		</div>
	</nav>

	<div
		ref="mobileActiveButton"
		class="absolute top-12 left-6 z-10 transition duration-[220ms] ease-out md:hidden"
		:class="hiddenMenuClass"
	>
		<UButton
			type="button"
			color="neutral"
			variant="ghost"
			class="group relative z-0 rounded-full p-2 text-[16px] leading-none font-semibold whitespace-nowrap text-primary opacity-100 transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] active:bg-slate-500/10 dark:text-[rgb(125,211,252)] dark:active:bg-white/10"
			:aria-label="activeDisplayNavItem.label"
			aria-current="page"
			@click="openMobileMenu"
		>
			<span
				class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-0 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-100 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
				aria-hidden="true"
			/>
			{{ activeDisplayNavItem.label }}
		</UButton>
	</div>

	<UModal
		:open="mobileMenuOpen"
		:transition="false"
		:ui="{
			overlay:
				'z-[80] bg-slate-950/32 backdrop-blur-md data-[state=open]:animate-[fade-in_180ms_ease-out] data-[state=closed]:animate-[fade-out_160ms_ease-in] dark:bg-slate-950/62',
			content:
				'fixed inset-0 z-[120] h-dvh w-screen translate-x-0 translate-y-0 bg-transparent p-0 shadow-none ring-0',
			body: 'p-0',
		}"
		@update:open="mobileMenuOpen = $event"
	>
		<template #content>
			<div class="relative h-dvh w-screen" @click="closeMobileMenu">
				<div
					class="mobile-menu-pop absolute flex max-w-[calc(100vw-2rem)] flex-col items-start gap-3"
					:style="{
						left: `${mobileMenuAnchor.left}px`,
						top: `${mobileMenuAnchor.top}px`,
						transformOrigin: `${mobileMenuAnchor.width / 2}px ${
							mobileMenuAnchor.height / 2
						}px`,
					}"
					@click.stop
				>
					<div class="flex max-w-full items-center gap-2">
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							class="group relative z-0 rounded-full p-2 text-[16px] leading-none font-semibold whitespace-nowrap text-primary opacity-100 transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] active:bg-slate-500/10 dark:text-[rgb(125,211,252)] dark:active:bg-white/10"
							aria-current="page"
							@click="closeMobileMenu"
						>
							<span
								class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-0 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-100 shadow-[0_0_10px_rgba(125,211,252,0.12)]"
								aria-hidden="true"
							/>
							{{ activeDisplayNavItem.label }}
						</UButton>
					</div>

					<Transition
						mode="out-in"
						enter-active-class="transition duration-[220ms] ease-out"
						enter-from-class="-translate-y-1.5 opacity-0"
						enter-to-class="translate-y-0 opacity-100"
						leave-active-class="transition duration-[160ms] ease-in"
						leave-from-class="translate-y-0 opacity-100"
						leave-to-class="translate-y-1.5 opacity-0"
					>
						<div
							:key="groupTransitionKey"
							class="flex max-w-full flex-wrap items-center gap-2"
						>
							<button
								v-if="canGoBack"
								type="button"
								class="flex h-7 w-7 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-white opacity-80 transition duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								:aria-label="backButtonLabel"
								@click="showParentMenu"
							>
								<UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
							</button>

							<UButton
								v-for="item in selectableMobileGroupNavItems"
								:key="item.key"
								type="button"
								color="neutral"
								variant="ghost"
								class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap text-white opacity-100 transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white active:bg-slate-500/10 dark:text-slate-50 dark:hover:text-slate-900 dark:active:bg-white/10"
								@click="selectMobileNavItem(item)"
							>
								<span
									class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-[0.18em] scale-y-[0.55] rounded-md bg-[rgba(125,211,252,0.16)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:scale-y-[1] group-hover:opacity-100"
									aria-hidden="true"
								/>
								{{ item.label }}
							</UButton>

							<UButton
								v-if="selectableMobileFallback"
								type="button"
								color="neutral"
								variant="ghost"
								class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap text-white opacity-100 transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white active:bg-slate-500/10 dark:text-slate-50 dark:hover:text-slate-900 dark:active:bg-white/10"
								@click="selectMobileFallback"
							>
								<span
									class="pointer-events-none absolute bottom-[0.28em] left-1/2 -z-10 h-[0.95em] w-[96%] origin-bottom -translate-x-1/2 translate-y-[0.18em] scale-y-[0.55] rounded-md bg-[rgba(125,211,252,0.16)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:scale-y-[1] group-hover:opacity-100"
									aria-hidden="true"
								/>
								{{ selectableMobileFallback.label }}
							</UButton>

							<button
								v-if="displayedGroup.key !== routeGroupKey"
								type="button"
								class="flex h-7 w-7 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-white opacity-80 transition duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								:aria-label="t('header.nav.currentGroup')"
								@click="showRouteMenu"
							>
								<UIcon name="i-lucide-corner-down-right" class="h-5 w-5" />
							</button>
						</div>
					</Transition>
				</div>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
.mobile-menu-pop {
	animation: mobile-menu-pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes mobile-menu-pop-in {
	from {
		opacity: 0;
		transform: translateY(-6px) scale(0.96);
	}

	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}
</style>
