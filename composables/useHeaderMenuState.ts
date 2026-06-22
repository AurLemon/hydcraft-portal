import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
	findHeaderMenuGroupByKey,
	findHeaderMenuGroupByPath,
	headerMenuGroups,
	isPathInHeaderMenuGroup,
	mainHeaderMenuGroup,
	normalizeHeaderMenuPath,
	type HeaderMenuGroup,
	type HeaderMenuItem,
} from '~/utils/layout/header-menu'
import { useResolvedRouteTitleDefinition } from '~/utils/layout/route-display'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

interface HeaderMenuStateOptions {
	activeNavItemClass: () => string
	fallbackNavItemClass: () => string
	inactiveNavItemClass: () => string
	hidden?: () => boolean | undefined
}

interface MenuItem {
	key: string
	label: string
	to: string
	icon?: string
	isFallback?: boolean
	badgeType?: 'minecraft-player' | 'user-profile'
	badgeAvatarUrl?: string | null
	badgeFallbackText?: string | null
}

interface MenuSelectItem {
	label: string
	value: string
}

export const useHeaderMenuState = (options: HeaderMenuStateOptions) => {
	const route = useRoute()
	const error = useError()
	const localePath = useLocalePath()
	const resolvedRouteTitleDefinition = useResolvedRouteTitleDefinition()
	const menuMeasure = ref<HTMLElement | null>(null)
	const desktopMenuNav = ref<HTMLElement | null>(null)
	const mobileActiveButton = ref<HTMLElement | null>(null)
	const mobileMenuOpen = ref(false)
	const desktopOverflowModel = ref<string | undefined>()
	const shellWidth = ref<number | null>(null)
	const viewportWidth = ref<number | null>(null)
	const desktopAvailableWidth = ref<number | null>(null)
	const measuredItemWidths = ref<Record<string, number>>({})
	const mobileMenuAnchor = ref({ left: 24, top: 48, width: 0, height: 0 })
	const displayedGroupKey = ref('main')
	const SIDE_GUTTER = 12
	const MOBILE_SIDE_GUTTER = 12
	const MOBILE_BREAKPOINT = 768
	const DESKTOP_ITEM_GAP = 8
	const DESKTOP_OVERFLOW_TRIGGER_WIDTH = 36
	const DESKTOP_SIBLING_GAP = 16
	let resizeObserver: ResizeObserver | null = null

	const resolveTo = (item: MenuItem | HeaderMenuItem): string =>
		localePath(item.to)
	const normalizePath = (path: string): string => normalizeHeaderMenuPath(path)
	const userProfileRouteUsername = computed(() => {
		const normalizedRoutePath = normalizePath(route.path)

		if (!/^\/u\/[^/]+$/.test(normalizedRoutePath)) {
			return ''
		}

		return String(route.params.username ?? '').trim()
	})
	const { data: userProfileRouteBadge } = useAsyncData(
		() =>
			userProfileRouteUsername.value
				? `header-route-user-profile:${userProfileRouteUsername.value}`
				: 'header-route-user-profile:idle',
		async () => {
			if (!userProfileRouteUsername.value) {
				return null
			}

			const response = await $fetch<{
				profile: {
					username: string
					displayName: string | null
					avatarUrl: string | null
				} | null
			}>(
				`/api/public/users/${encodeURIComponent(
					userProfileRouteUsername.value,
				)}`,
			).catch(() => null)

			return response?.profile ?? null
		},
		{
			default: () => null,
			watch: [userProfileRouteUsername],
		},
	)
	const pathGroup = computed<HeaderMenuGroup | undefined>(() =>
		findHeaderMenuGroupByPath(route.path),
	)
	const routeGroupKey = computed(() => pathGroup.value?.key ?? 'main')
	const displayedGroup = computed<HeaderMenuGroup>(
		() =>
			findHeaderMenuGroupByKey(displayedGroupKey.value) ?? mainHeaderMenuGroup,
	)
	const routeGroup = computed<HeaderMenuGroup>(
		() => findHeaderMenuGroupByKey(routeGroupKey.value) ?? mainHeaderMenuGroup,
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
	const routeGroupMenuItems = computed<MenuItem[]>(() =>
		routeGroup.value.items.map((item) => ({
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
	const routeBadge = computed(() => {
		const normalizedRoutePath = normalizePath(route.path)

		if (/^\/players\/[^/]+$/.test(normalizedRoutePath)) {
			const mcid = String(route.params.mcid ?? '').trim()

			if (!mcid) {
				return null
			}

			return {
				type: 'minecraft-player' as const,
				avatarUrl: getMinecraftHeadRendererUrl(mcid),
				fallbackText: mcid.slice(0, 1).toUpperCase() || 'P',
			}
		}

		if (/^\/u\/[^/]+$/.test(normalizedRoutePath)) {
			const username = String(route.params.username ?? '').trim()

			if (!username) {
				return null
			}

			return {
				type: 'user-profile' as const,
				avatarUrl: userProfileRouteBadge.value?.avatarUrl ?? null,
				fallbackText:
					(
						userProfileRouteBadge.value?.username?.trim() ||
						userProfileRouteBadge.value?.displayName?.trim() ||
						username
					)
						.slice(0, 1)
						.toUpperCase() ||
					username.slice(0, 1).toUpperCase() ||
					'U',
			}
		}

		return null
	})
	const currentRouteFallback = computed<MenuItem>(() => {
		if (error.value) {
			return {
				key: 'error-page',
				label: t('header.nav.errorPage'),
				to: route.fullPath || route.path,
				isFallback: true,
			}
		}

		const normalizedRoutePath = normalizePath(route.path)
		const isEntryRoute = normalizedRoutePath === '/'

		return {
			key: route.fullPath || route.path,
			label: isEntryRoute
				? 'HydCraft Portal'
				: t(
						resolvedRouteTitleDefinition.value?.labelKey ??
							'header.nav.currentPage',
					),
			to: route.fullPath || route.path,
			isFallback: true,
			badgeType: routeBadge.value?.type,
			badgeAvatarUrl: routeBadge.value?.avatarUrl ?? null,
			badgeFallbackText: routeBadge.value?.fallbackText ?? null,
		}
	})
	const currentFallback = computed<MenuItem | null>(() => {
		if (!isViewingRouteGroup.value || activeRouteBelongsToAnyGroup.value) {
			return null
		}

		if (groupMenuItems.value.some((item) => isPathActive(item))) {
			return null
		}

		return currentRouteFallback.value
	})
	const displayNavItems = computed<MenuItem[]>(() =>
		currentFallback.value
			? [...groupMenuItems.value, currentFallback.value]
			: groupMenuItems.value,
	)
	const activeDisplayNavItem = computed<MenuItem>(() => {
		const activeItem = routeGroupMenuItems.value.find((item) =>
			isPathActive(item),
		)
		const firstItem = routeGroupMenuItems.value[0]

		return activeItem || currentRouteFallback.value || firstItem
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
	const desktopPreservedItemKey = computed(() => {
		const activeKey = activeDisplayNavItem.value?.key

		return displayNavItems.value.some((item) => item.key === activeKey)
			? activeKey
			: null
	})
	const sumMenuItemsWidth = (items: MenuItem[]): number | null => {
		if (!items.length) {
			return 0
		}

		let total = 0

		for (const item of items) {
			const width = measuredItemWidths.value[item.key]

			if (!width) {
				return null
			}

			total += width
		}

		return total + DESKTOP_ITEM_GAP * Math.max(items.length - 1, 0)
	}
	const desktopOverflowLayout = computed(() => {
		const items = [...displayNavItems.value]
		const availableWidth = desktopAvailableWidth.value

		if (
			availableWidth == null ||
			availableWidth <= 0 ||
			viewportWidth.value == null ||
			viewportWidth.value < MOBILE_BREAKPOINT
		) {
			return {
				visibleItems: items,
				overflowItems: [] as MenuItem[],
			}
		}

		const fullWidth = sumMenuItemsWidth(items)

		if (fullWidth == null || fullWidth <= availableWidth) {
			return {
				visibleItems: items,
				overflowItems: [] as MenuItem[],
			}
		}

		const preservedKey = desktopPreservedItemKey.value
		const visibleItems = [...items]
		const overflowItems: MenuItem[] = []
		const fitsAvailableWidth = (): boolean => {
			const visibleWidth = sumMenuItemsWidth(visibleItems)

			if (visibleWidth == null) {
				return true
			}

			const overflowWidth = overflowItems.length
				? DESKTOP_OVERFLOW_TRIGGER_WIDTH + DESKTOP_ITEM_GAP
				: 0

			return visibleWidth + overflowWidth <= availableWidth
		}

		while (visibleItems.length > 1 && !fitsAvailableWidth()) {
			const removableIndex = [...visibleItems.keys()]
				.reverse()
				.find((index) => visibleItems[index]?.key !== preservedKey)

			if (removableIndex == null) {
				break
			}

			const [removedItem] = visibleItems.splice(removableIndex, 1)

			if (!removedItem) {
				break
			}

			overflowItems.unshift(removedItem)
		}

		return {
			visibleItems,
			overflowItems,
		}
	})
	const desktopVisibleNavItems = computed(
		() => desktopOverflowLayout.value.visibleItems,
	)
	const desktopOverflowNavItems = computed(
		() => desktopOverflowLayout.value.overflowItems,
	)
	const desktopOverflowSelectItems = computed<MenuSelectItem[]>(() =>
		desktopOverflowNavItems.value.map((item) => ({
			label: item.label,
			value: item.key,
		})),
	)
	const visibleDesktopShellWidth = computed(() => {
		const width = sumMenuItemsWidth(desktopVisibleNavItems.value)

		if (width == null) {
			return null
		}

		return (
			width +
			(desktopOverflowNavItems.value.length
				? DESKTOP_OVERFLOW_TRIGGER_WIDTH + DESKTOP_ITEM_GAP
				: 0)
		)
	})
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
		const visibleWidth = visibleDesktopShellWidth.value

		if (
			visibleWidth !== null &&
			viewportWidth.value !== null &&
			viewportWidth.value >= MOBILE_BREAKPOINT
		) {
			return { width: `${visibleWidth + SIDE_GUTTER * 2}px` }
		}

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
		isPathActive(item)
			? options.activeNavItemClass()
			: options.inactiveNavItemClass()
	const resolveDesktopNavItemClass = (item: MenuItem): string =>
		item.isFallback ? options.fallbackNavItemClass() : resolveNavItemClass(item)
	const resolveHighlightClass = (item: MenuItem): string =>
		isPathActive(item) || item.isFallback ? 'opacity-100' : ''
	const hiddenMenuClass = computed(() =>
		options.hidden?.()
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
	const selectDesktopOverflowItem = async (
		value: string | undefined,
	): Promise<void> => {
		desktopOverflowModel.value = undefined

		if (!value) {
			return
		}

		const selectedItem = desktopOverflowNavItems.value.find(
			(item) => item.key === value,
		)

		if (!selectedItem) {
			return
		}

		await navigateTo(resolveTo(selectedItem))
	}
	const syncMeasuredMenuMetrics = async (): Promise<void> => {
		if (!import.meta.client) {
			return
		}

		await nextTick()
		const measure = menuMeasure.value

		if (!measure) {
			return
		}

		shellWidth.value = Math.ceil(measure.scrollWidth)

		const nextWidths = Object.fromEntries(
			Array.from(
				measure.querySelectorAll<HTMLElement>('[data-menu-measure-key]'),
			).map((element) => [
				element.dataset.menuMeasureKey ?? '',
				Math.ceil(element.offsetWidth),
			]),
		)

		measuredItemWidths.value = nextWidths
	}
	const syncViewportWidth = (): void => {
		if (!import.meta.client) {
			return
		}

		viewportWidth.value = window.innerWidth
	}
	const syncDesktopAvailableWidth = async (): Promise<void> => {
		if (!import.meta.client) {
			return
		}

		await nextTick()
		const nav = desktopMenuNav.value
		const parent = nav?.parentElement

		if (!nav || !parent) {
			desktopAvailableWidth.value = null
			return
		}

		const parentRect = parent.getBoundingClientRect()
		const centerX = parentRect.left + parentRect.width / 2
		let leftBoundary = parentRect.left
		let rightBoundary = parentRect.right

		for (const child of Array.from(parent.children)) {
			if (!(child instanceof HTMLElement)) {
				continue
			}

			if (child.dataset.headerMenuOwned === 'true') {
				continue
			}

			const rect = child.getBoundingClientRect()

			if (rect.width <= 0 || rect.height <= 0) {
				continue
			}

			if (rect.right <= centerX) {
				leftBoundary = Math.max(leftBoundary, rect.right)
				continue
			}

			if (rect.left >= centerX) {
				rightBoundary = Math.min(rightBoundary, rect.left)
				continue
			}

			leftBoundary = Math.max(leftBoundary, Math.min(rect.right, centerX))
			rightBoundary = Math.min(rightBoundary, Math.max(rect.left, centerX))
		}

		const leftSpace = Math.max(0, centerX - leftBoundary - DESKTOP_SIBLING_GAP)
		const rightSpace = Math.max(
			0,
			rightBoundary - centerX - DESKTOP_SIBLING_GAP,
		)

		desktopAvailableWidth.value = Math.floor(
			Math.max(0, Math.min(leftSpace, rightSpace) * 2),
		)

		if (resizeObserver) {
			resizeObserver.observe(parent)

			for (const child of Array.from(parent.children)) {
				if (
					child instanceof HTMLElement &&
					child.dataset.headerMenuOwned !== 'true'
				) {
					resizeObserver.observe(child)
				}
			}
		}
	}
	const onResize = (): void => {
		syncViewportWidth()
		void syncMeasuredMenuMetrics()
		void syncDesktopAvailableWidth()
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
		void syncMeasuredMenuMetrics()
		void syncDesktopAvailableWidth()
	})
	watch(
		displayNavItems,
		() => {
			void syncMeasuredMenuMetrics()
			void syncDesktopAvailableWidth()
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
		() => options.hidden?.(),
		(hidden) => {
			if (hidden) {
				closeMobileMenu()
			}
		},
	)
	watch(
		desktopOverflowNavItems,
		() => {
			desktopOverflowModel.value = undefined
		},
		{ deep: true },
	)
	onMounted(() => {
		syncViewportWidth()
		void syncMeasuredMenuMetrics()
		void syncDesktopAvailableWidth()

		resizeObserver = new ResizeObserver(() => {
			void syncMeasuredMenuMetrics()
			void syncDesktopAvailableWidth()
		})

		if (menuMeasure.value) {
			resizeObserver.observe(menuMeasure.value)
		}

		if (desktopMenuNav.value) {
			resizeObserver.observe(desktopMenuNav.value)
		}

		window.addEventListener('resize', onResize, { passive: true })
	})
	onBeforeUnmount(() => {
		resizeObserver?.disconnect()
		resizeObserver = null
		window.removeEventListener('resize', onResize)
	})

	return {
		activeDisplayNavItem,
		backButtonLabel,
		canGoBack,
		closeMobileMenu,
		currentFallback,
		desktopMenuNav,
		desktopOverflowModel,
		desktopOverflowSelectItems,
		desktopOverflowNavItems,
		desktopVisibleNavItems,
		displayNavItems,
		displayedGroup,
		fallbackNavItemClass: computed(() => options.fallbackNavItemClass()),
		groupMenuItems,
		groupTransitionKey,
		hiddenMenuClass,
		isMobileMenuClamped,
		isPathActive,
		menuMeasure,
		menuShellStyle,
		mobileActiveButton,
		mobileMenuAnchor,
		mobileMenuOpen,
		openMobileMenu,
		resolveDesktopNavItemClass,
		resolveHighlightClass,
		resolveNavItemClass,
		resolveTo,
		routeGroupKey,
		selectDesktopOverflowItem,
		selectMobileFallback,
		selectableMobileFallback,
		selectableMobileGroupNavItems,
		selectMobileNavItem,
		showParentMenu,
		showRouteMenu,
	}
}
