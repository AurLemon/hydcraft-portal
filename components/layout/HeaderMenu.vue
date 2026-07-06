<script setup lang="ts">
import { useHeaderMenuState } from '~/composables/useHeaderMenuState'
import HeaderMenuRouteBadge from '~/components/layout/HeaderMenuRouteBadge.vue'

const props = defineProps<{
	activeNavItemClass: string
	fallbackNavItemClass: string
	hidden?: boolean
	inactiveNavItemClass: string
}>()

const {
	activeDisplayNavItem,
	backButtonLabel,
	canGoBack,
	closeMobileMenu,
	desktopMenuNav,
	desktopOverflowModel,
	desktopOverflowNavItems,
	desktopOverflowSelectItems,
	desktopVisibleNavItems,
	displayNavItems,
	displayedGroup,
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
} = useHeaderMenuState({
	activeNavItemClass: () => props.activeNavItemClass,
	fallbackNavItemClass: () => props.fallbackNavItemClass,
	inactiveNavItemClass: () => props.inactiveNavItemClass,
	hidden: () => props.hidden,
})

const mobileRouteListInner = ref<HTMLElement | null>(null)
const mobileRouteListHeight = ref<number | null>(null)

type MobileActionKind = 'back' | 'route' | null

let mobileRouteListAnimationFrame: number | null = null
let mobileRouteListResizeObserver: ResizeObserver | null = null

const currentMobileAction = computed<MobileActionKind>(() => {
	if (canGoBack.value) {
		return 'back'
	}

	if (displayedGroup.value.key !== routeGroupKey.value) {
		return 'route'
	}

	return null
})

const hasCurrentMobileAction = computed(
	() => currentMobileAction.value !== null,
)
const mobileCurrentNavItemClass = computed(() =>
	activeDisplayNavItem.value.isFallback
		? props.fallbackNavItemClass
		: props.activeNavItemClass,
)

const syncMobileRouteListHeight = () => {
	const inner = mobileRouteListInner.value

	if (!inner) {
		return
	}

	mobileRouteListHeight.value = inner.scrollHeight
}

const scheduleMobileRouteListHeightSync = () => {
	if (mobileRouteListAnimationFrame !== null) {
		cancelAnimationFrame(mobileRouteListAnimationFrame)
	}

	mobileRouteListAnimationFrame = requestAnimationFrame(() => {
		mobileRouteListAnimationFrame = null
		syncMobileRouteListHeight()
	})
}

watch(
	[
		() => mobileMenuOpen.value,
		() => groupTransitionKey.value,
		() => selectableMobileGroupNavItems.value.length,
		() => selectableMobileFallback.value?.key ?? '',
	],
	async ([isOpen]) => {
		if (!isOpen) {
			return
		}

		await nextTick()
		scheduleMobileRouteListHeightSync()
	},
	{ flush: 'post' },
)

watch(
	mobileRouteListInner,
	(inner, previousInner) => {
		if (previousInner) {
			mobileRouteListResizeObserver?.unobserve(previousInner)
		}

		if (inner) {
			mobileRouteListResizeObserver?.observe(inner)
			scheduleMobileRouteListHeightSync()
		}
	},
	{ flush: 'post' },
)

onMounted(() => {
	mobileRouteListResizeObserver = new ResizeObserver(() => {
		scheduleMobileRouteListHeightSync()
	})

	if (mobileRouteListInner.value) {
		mobileRouteListResizeObserver.observe(mobileRouteListInner.value)
		syncMobileRouteListHeight()
	}
})

onBeforeUnmount(() => {
	if (mobileRouteListAnimationFrame !== null) {
		cancelAnimationFrame(mobileRouteListAnimationFrame)
	}

	mobileRouteListResizeObserver?.disconnect()
})
</script>

<template>
	<div
		ref="menuMeasure"
		data-header-menu-owned="true"
		class="pointer-events-none fixed top-0 left-0 -z-10 inline-flex w-max flex-none flex-nowrap items-center justify-center gap-2 opacity-0"
		aria-hidden="true"
	>
		<span
			v-for="item in displayNavItems"
			:key="item.key"
			:data-menu-measure-key="item.key"
			class="inline-flex items-center gap-1.5 rounded-full p-2 text-[16px] leading-none whitespace-nowrap"
			:class="{ 'font-semibold': isPathActive(item) || item.isFallback }"
		>
			<HeaderMenuRouteBadge
				:badge-type="item.badgeType"
				:src="item.badgeAvatarUrl || undefined"
				:alt="item.label"
				:fallback-text="item.badgeFallbackText"
			/>
			{{ item.label }}
		</span>
	</div>

	<nav
		ref="desktopMenuNav"
		data-header-menu-owned="true"
		class="absolute left-1/2 hidden max-w-[calc(100vw-1.5rem)] min-w-0 -translate-x-1/2 justify-center transition duration-[300ms] ease-out md:flex"
		:class="hiddenMenuClass"
	>
		<Transition name="header-menu-left-action">
			<button
				v-if="canGoBack"
				type="button"
				class="absolute top-1/2 right-full mr-5 flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-800 opacity-80 transition duration-[220ms] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-100"
				:aria-label="backButtonLabel"
				@click="showParentMenu"
			>
				<UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
			</button>
		</Transition>

		<Transition name="header-menu-right-action">
			<button
				v-if="displayedGroup.key !== routeGroupKey"
				type="button"
				class="absolute top-1/2 left-full ml-5 flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-slate-800 opacity-80 transition duration-[220ms] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-100"
				:aria-label="t('header.nav.currentGroup')"
				@click="showRouteMenu"
			>
				<UIcon name="i-lucide-corner-down-right" class="h-5 w-5" />
			</button>
		</Transition>

		<div
			class="relative max-w-full overflow-hidden rounded-full px-2 transition-[width] duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
			:class="
				isMobileMenuClamped
					? 'overflow-x-auto overflow-y-hidden'
					: 'overflow-hidden'
			"
			:style="menuShellStyle"
		>
			<Transition
				mode="out-in"
				enter-active-class="transition duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
				enter-from-class="-translate-y-2 opacity-0"
				enter-to-class="translate-y-0 opacity-100"
				leave-active-class="transition duration-[300ms] ease-in"
				leave-from-class="translate-y-0 opacity-100"
				leave-to-class="translate-y-2 opacity-0"
			>
				<div
					:key="groupTransitionKey"
					class="inline-flex w-max flex-none flex-nowrap items-center justify-center gap-2"
				>
					<NuxtLink
						v-for="item in desktopVisibleNavItems"
						:key="item.key"
						:to="resolveTo(item)"
						class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
						:class="resolveDesktopNavItemClass(item)"
						:aria-current="
							item.isFallback || isPathActive(item) ? 'page' : undefined
						"
					>
						<span
							class="pointer-events-none absolute top-[calc(50%+0.24em)] left-1/2 -z-10 h-[0.95em] w-[96%] origin-center -translate-x-1/2 -translate-y-1/2 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
							:class="resolveHighlightClass(item)"
							aria-hidden="true"
						/>
						<span
							v-if="item.isFallback"
							class="inline-flex items-center gap-1.5 font-semibold"
						>
							<HeaderMenuRouteBadge
								:badge-type="item.badgeType"
								:src="item.badgeAvatarUrl || undefined"
								:alt="item.label"
								:fallback-text="item.badgeFallbackText"
							/>
							<span class="inline-block">{{ item.label }}</span>
						</span>
						<span v-else>{{ item.label }}</span>
					</NuxtLink>

					<USelect
						v-if="desktopOverflowNavItems.length"
						:model-value="desktopOverflowModel"
						:items="desktopOverflowSelectItems"
						value-key="value"
						label-key="label"
						placeholder=""
						color="neutral"
						variant="none"
						size="md"
						class="header-menu-overflow-select"
						:ui="{
							base: 'h-10 w-10 justify-center rounded-full bg-transparent p-0 text-slate-800 opacity-70 transition hover:bg-transparent hover:opacity-100 focus:bg-transparent active:bg-transparent active:opacity-70 data-[state=open]:bg-transparent dark:text-slate-100',
							value: 'flex w-full items-center justify-center',
							placeholder: 'flex w-full items-center justify-center',
							trailing: 'hidden',
							trailingIcon: 'hidden',
							content: 'min-w-36',
							viewport: 'min-w-36',
							item: 'whitespace-nowrap',
							itemLabel: 'whitespace-nowrap',
						}"
						@update:model-value="selectDesktopOverflowItem"
					>
						<template #default>
							<UIcon
								name="i-lucide-ellipsis"
								class="h-5 w-5 text-slate-800 dark:text-slate-100"
							/>
						</template>
					</USelect>
				</div>
			</Transition>
		</div>
	</nav>

	<div
		ref="mobileActiveButton"
		data-header-menu-owned="true"
		class="absolute top-12 left-6 z-10 transition duration-[300ms] ease-out md:hidden"
		:class="hiddenMenuClass"
	>
		<UButton
			type="button"
			color="neutral"
			variant="ghost"
			class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:bg-slate-500/10 dark:active:bg-white/10"
			:class="mobileCurrentNavItemClass"
			:aria-label="activeDisplayNavItem.label"
			aria-current="page"
			@click="openMobileMenu"
		>
			<span
				class="pointer-events-none absolute top-[calc(50%+0.24em)] left-1/2 -z-10 h-[0.95em] w-[96%] origin-center -translate-x-1/2 -translate-y-1/2 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-100 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
				aria-hidden="true"
			/>
			<Transition name="header-current-page-label" mode="out-in">
				<span
					:key="activeDisplayNavItem.key"
					class="inline-flex items-center gap-1.5"
				>
					<HeaderMenuRouteBadge
						:badge-type="activeDisplayNavItem.badgeType"
						:src="activeDisplayNavItem.badgeAvatarUrl || undefined"
						:alt="activeDisplayNavItem.label"
						:fallback-text="activeDisplayNavItem.badgeFallbackText"
					/>
					<span class="inline-block">{{ activeDisplayNavItem.label }}</span>
				</span>
			</Transition>
		</UButton>
	</div>

	<UModal
		:open="mobileMenuOpen"
		:transition="false"
		:ui="{
			overlay:
				'z-[80] bg-slate-950/32 backdrop-blur-md data-[state=open]:animate-[fade-in_260ms_ease-out] data-[state=closed]:animate-[fade-out_220ms_ease-in] dark:bg-slate-950/62',
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
							class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:bg-slate-500/10 dark:active:bg-white/10"
							:class="mobileCurrentNavItemClass"
							aria-current="page"
							@click="closeMobileMenu"
						>
							<span
								class="pointer-events-none absolute top-[calc(50%+0.24em)] left-1/2 -z-10 h-[0.95em] w-[96%] origin-center -translate-x-1/2 -translate-y-1/2 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-100 shadow-[0_0_10px_rgba(125,211,252,0.12)]"
								aria-hidden="true"
							/>
							<Transition name="header-current-page-label" mode="out-in">
								<span
									:key="activeDisplayNavItem.key"
									class="inline-flex items-center gap-1.5"
								>
									<HeaderMenuRouteBadge
										:badge-type="activeDisplayNavItem.badgeType"
										:src="activeDisplayNavItem.badgeAvatarUrl || undefined"
										:alt="activeDisplayNavItem.label"
										:fallback-text="activeDisplayNavItem.badgeFallbackText"
									/>
									<span class="inline-block">{{
										activeDisplayNavItem.label
									}}</span>
								</span>
							</Transition>
						</UButton>
					</div>

					<div
						class="flex w-[calc(100vw-3rem)] max-w-full flex-col items-start gap-2"
					>
						<div
							class="w-full overflow-hidden transition-[height] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
							:style="{
								height:
									mobileRouteListHeight === null
										? 'auto'
										: `${mobileRouteListHeight}px`,
							}"
						>
							<Transition
								mode="out-in"
								enter-active-class="transition duration-[420ms] ease-out"
								enter-from-class="-translate-y-1.5 opacity-0"
								enter-to-class="translate-y-0 opacity-100"
								leave-active-class="transition duration-[300ms] ease-in"
								leave-from-class="translate-y-0 opacity-100"
								leave-to-class="translate-y-1.5 opacity-0"
								@after-enter="scheduleMobileRouteListHeightSync"
								@after-leave="scheduleMobileRouteListHeightSync"
							>
								<div
									:key="groupTransitionKey"
									ref="mobileRouteListInner"
									class="flex min-w-0 max-w-full flex-wrap items-center gap-2"
								>
									<UButton
										v-for="item in selectableMobileGroupNavItems"
										:key="item.key"
										type="button"
										color="neutral"
										variant="ghost"
										class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap text-white opacity-100 transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white active:bg-slate-500/10 dark:text-slate-50 dark:hover:text-slate-900 dark:active:bg-white/10"
										@click="selectMobileNavItem(item)"
									>
										<span
											class="pointer-events-none absolute top-[calc(50%+0.24em)] left-1/2 -z-10 h-[0.95em] w-[96%] origin-center -translate-x-1/2 -translate-y-1/2 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
											aria-hidden="true"
										/>
										{{ item.label }}
									</UButton>

									<UButton
										v-if="selectableMobileFallback"
										type="button"
										color="neutral"
										variant="ghost"
										class="group relative z-0 rounded-full p-2 text-[16px] leading-none whitespace-nowrap text-white opacity-100 transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white active:bg-slate-500/10 dark:text-slate-50 dark:hover:text-slate-900 dark:active:bg-white/10"
										@click="selectMobileFallback"
									>
										<span
											class="pointer-events-none absolute top-[calc(50%+0.24em)] left-1/2 -z-10 h-[0.95em] w-[96%] origin-center -translate-x-1/2 -translate-y-1/2 scale-y-[1] rounded-md bg-[rgba(125,211,252,0.16)] opacity-0 shadow-[0_0_10px_rgba(125,211,252,0.12)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
											aria-hidden="true"
										/>
										{{ selectableMobileFallback.label }}
									</UButton>
								</div>
							</Transition>
						</div>

						<div
							class="overflow-hidden transition-[width,margin-right,opacity] duration-[180ms] ease-out"
							:class="
								hasCurrentMobileAction
									? 'mr-2 w-7 opacity-80'
									: 'mr-0 w-0 opacity-0'
							"
						>
							<div class="relative h-7 w-7">
								<Transition name="header-mobile-action" mode="out-in">
									<button
										v-if="currentMobileAction === 'back'"
										key="back"
										type="button"
										class="absolute inset-0 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-white hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
										:aria-label="backButtonLabel"
										@click="showParentMenu"
									>
										<UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
									</button>

									<button
										v-else-if="currentMobileAction === 'route'"
										key="route"
										type="button"
										class="absolute inset-0 flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 text-white hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
										:aria-label="t('header.nav.currentGroup')"
										@click="showRouteMenu"
									>
										<UIcon name="i-lucide-corner-down-right" class="h-5 w-5" />
									</button>
								</Transition>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
.mobile-menu-pop {
	animation: mobile-menu-pop-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.header-current-page-label-enter-active {
	transition: opacity 240ms ease-out;
}

.header-current-page-label-leave-active {
	transition: opacity 180ms ease-in;
}

.header-current-page-label-enter-from,
.header-current-page-label-leave-to {
	opacity: 0;
}

.header-current-page-label-enter-to,
.header-current-page-label-leave-from {
	opacity: 1;
}

.header-menu-left-action-enter-active,
.header-menu-left-action-leave-active,
.header-menu-right-action-enter-active,
.header-menu-right-action-leave-active {
	transition: opacity 240ms ease-out;
}

.header-menu-left-action-enter-from,
.header-menu-left-action-leave-to,
.header-menu-right-action-enter-from,
.header-menu-right-action-leave-to {
	opacity: 0;
}

.header-menu-left-action-enter-to,
.header-menu-left-action-leave-from,
.header-menu-right-action-enter-to,
.header-menu-right-action-leave-from {
	opacity: 0.8;
}

.header-mobile-action-enter-active {
	transition:
		opacity 180ms ease-out,
		transform 180ms ease-out;
}

.header-mobile-action-leave-active {
	transition:
		opacity 140ms ease-in,
		transform 140ms ease-in;
}

.header-mobile-action-enter-from {
	opacity: 0;
	transform: translateX(5px);
}

.header-mobile-action-leave-to {
	opacity: 0;
	transform: translateX(-5px);
}

.header-mobile-action-enter-to,
.header-mobile-action-leave-from {
	opacity: 1;
	transform: translateX(0);
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
