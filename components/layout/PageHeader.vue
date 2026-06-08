<script setup lang="ts">
import { computed } from 'vue'
import hydcraftLogo from '~/assets/resources/brand/logo_HydCraft.png'
import { getPortalRedirectQuery } from '~/utils/auth/redirect'
import { hasHeroVideoBackground } from '~/utils/layout/hero-video'

interface LocaleItem {
	label: string
	value: LocaleCode
}

interface ThemeModeItem {
	value: ThemeMode
	label: string
	icon: string
}

type LocaleCode = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'
type ThemeMode = 'light' | 'dark' | 'system'

const route = useRoute()
const nuxtApp = useNuxtApp()
const colorMode = nuxtApp.$colorMode
const locale = (nuxtApp.$i18n as { locale: Ref<LocaleCode> }).locale
const localePath = useLocalePath()
const {
	user,
	pending: authPending,
	resolved,
	isAdmin,
	fetchCurrentUser,
	logout,
} = usePortalAuth()
const { notifySuccess } = useAdminToast()

const themeIconMap = {
	light: 'i-lucide-sun',
	dark: 'i-lucide-moon',
} as const

const getThemeModeIcon = (mode: ThemeMode): string =>
	mode === 'system' ? 'i-lucide-monitor' : themeIconMap[mode]

const localeItems: LocaleItem[] = [
	{ label: '简体中文', value: 'zh-CN' },
	{ label: '繁體中文', value: 'zh-TW' },
	{ label: '日本語', value: 'ja-JP' },
	{ label: 'English', value: 'en-US' },
]

const themeModes = computed<ThemeModeItem[]>(() => [
	{ value: 'light', label: t('header.theme.light'), icon: themeIconMap.light },
	{ value: 'dark', label: t('header.theme.dark'), icon: themeIconMap.dark },
	{
		value: 'system',
		label: t('header.theme.system'),
		icon: getThemeModeIcon('system'),
	},
])

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
const userMenuOpen = ref(false)
const popoverContentClass = 'z-[40000]'
const loginRoute = computed(() => ({
	path: localePath('/login'),
	query: getPortalRedirectQuery(route.fullPath, {
		fallbackPath: localePath('/'),
		loginPath: localePath('/login'),
	}),
}))
const usesHeroVideoHeaderChrome = computed(() => hasHeroVideoBackground(route))
const isAuthHeaderHidden = computed(
	() => route.meta.pageContainerVariant === 'auth',
)
const isLightMode = computed(() => colorMode.value === 'light')
const userAvatarLabel = computed(() =>
	(user.value?.displayName ?? user.value?.handle ?? '')
		.slice(0, 1)
		.toUpperCase(),
)
const activeNavTextClass = computed(() =>
	!usesHeroVideoHeaderChrome.value && isLightMode.value
		? 'text-primary'
		: 'text-[rgb(125,211,252)]',
)

const headerScrimClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? 'bg-[#192024]/25'
		: 'bg-[#FAFAFA]/90 dark:bg-[#192024]/90',
)

const headerActionButtonClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? 'h-9 w-9 rounded-full text-white hover:bg-white/10 hover:text-white active:bg-white/20'
		: 'h-9 w-9 rounded-full hover:bg-slate-500/10 active:bg-slate-500/20',
)

const headerLoginButtonClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? 'text-white! hover:text-white!'
		: 'text-slate-700! hover:text-slate-950! dark:text-slate-100! dark:hover:text-white!',
)

const headerUserMenuButtonClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? 'text-white hover:text-white'
		: 'text-default',
)

const headerUserMenuChevronClass = computed(() =>
	usesHeroVideoHeaderChrome.value ? 'text-white' : 'text-default',
)

const activeNavItemClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? `font-semibold ${activeNavTextClass.value} opacity-100`
		: `font-semibold ${activeNavTextClass.value} opacity-100`,
)

const fallbackNavItemClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? `${activeNavTextClass.value} opacity-100`
		: `${activeNavTextClass.value} opacity-100`,
)

const inactiveNavItemClass = computed(() =>
	usesHeroVideoHeaderChrome.value
		? 'text-white opacity-80 hover:text-white hover:opacity-100'
		: 'text-slate-800 opacity-85 hover:text-slate-800 hover:opacity-100 dark:text-slate-300 dark:opacity-75 dark:hover:text-slate-100 dark:hover:opacity-100',
)

const selectTheme = (mode: ThemeMode): void => {
	colorMode.preference = mode
}

const selectLocale = async (value: LocaleCode): Promise<void> => {
	if (!value || value === locale.value) {
		return
	}

	const setLocale = (
		nuxtApp.$i18n as { setLocale?: (code: LocaleCode) => Promise<void> }
	).setLocale

	if (setLocale) {
		await setLocale(value)
		return
	}

	locale.value = value
}

const handleLogout = async (): Promise<void> => {
	userMenuOpen.value = false
	await logout()
	notifySuccess({
		title: t('header.userMenu.logoutSuccessTitle'),
	})
}

if (import.meta.client && !resolved.value) {
	void fetchCurrentUser()
}
</script>

<template>
	<header class="sticky top-0 z-100 pt-6 pb-8 lg:px-8 lg:pt-10 lg:pb-16">
		<div
			class="pointer-events-none absolute top-0 right-0 -bottom-4/5 left-0 z-10 backdrop-blur-[48px] mask-[linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.98)_30%,rgba(0,0,0,0.92)_45%,rgba(0,0,0,0.8)_55%,rgba(0,0,0,0.58)_65%,rgba(0,0,0,0.35)_75%,rgba(0,0,0,0.15)_85%,transparent_100%)] lg:-bottom-3/5"
			:class="headerScrimClass"
		/>

		<div
			class="site-shell relative z-40 mx-auto flex items-center justify-between px-6 lg:px-0"
		>
			<div
				class="flex h-10 w-10 items-center justify-center select-none"
				aria-label="HydCraft"
			>
				<img
					:src="hydcraftLogo"
					alt="HydCraft"
					class="h-7 w-7 object-contain"
				/>
			</div>

			<HeaderMenu
				:active-nav-item-class="activeNavItemClass"
				:fallback-nav-item-class="fallbackNavItemClass"
				:hidden="isAuthHeaderHidden"
				:inactive-nav-item-class="inactiveNavItemClass"
			/>

			<div class="ml-auto flex items-center gap-2">
				<UPopover
					:popper="{ placement: 'bottom-end' }"
					:ui="{ content: popoverContentClass }"
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
					:ui="{ content: popoverContentClass }"
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

				<Transition
					mode="out-in"
					enter-active-class="transition duration-200 ease-out"
					enter-from-class="-translate-y-1.5 opacity-0"
					enter-to-class="translate-y-0 opacity-100"
					leave-active-class="transition duration-125 ease-in"
					leave-from-class="translate-y-0 opacity-100"
					leave-to-class="translate-y-1.5 opacity-0"
				>
					<div
						v-if="authPending && !resolved"
						key="auth-pending"
						class="flex h-9 items-center"
					>
						<USkeleton class="h-9 w-9 rounded-full" />
					</div>
					<div v-else-if="!user" key="auth-login" class="flex h-9 items-center">
						<UButton
							:to="loginRoute"
							color="neutral"
							variant="link"
							size="xs"
							class="px-2 text-sm whitespace-nowrap transition hover:opacity-80"
							:class="headerLoginButtonClass"
							:aria-label="t('header.auth.login')"
						>
							{{ t('header.auth.login') }}
						</UButton>
					</div>
					<div v-else key="auth-user" class="flex h-9 items-center">
						<UPopover
							v-model:open="userMenuOpen"
							:popper="{ placement: 'bottom-end' }"
							:ui="{ content: popoverContentClass }"
						>
							<button
								type="button"
								class="ml-0.5 flex h-9 items-center justify-center gap-1 rounded-full border-0 bg-transparent py-0 pr-1.5 pl-0 opacity-100 transition duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								:class="headerUserMenuButtonClass"
								:aria-label="t('header.userMenu.open')"
							>
								<span
									class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700 ring ring-slate-200 transition duration-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-700"
								>
									<Transition
										mode="out-in"
										enter-active-class="transition duration-200 ease-out"
										enter-from-class="scale-95 opacity-0"
										enter-to-class="scale-100 opacity-100"
										leave-active-class="transition duration-100 ease-in"
										leave-from-class="scale-100 opacity-100"
										leave-to-class="scale-95 opacity-0"
									>
										<img
											v-if="user.avatarUrl"
											:key="user.avatarUrl"
											:src="user.avatarUrl"
											:alt="user.displayName ?? user.handle"
											class="h-full w-full object-cover"
										/>
										<span v-else :key="userAvatarLabel" class="leading-none">
											{{ userAvatarLabel }}
										</span>
									</Transition>
								</span>
								<UIcon
									name="i-lucide-chevron-down"
									class="h-3.5 w-3.5 translate-y-0 opacity-80 transition duration-200"
									:class="[
										headerUserMenuChevronClass,
										{ 'rotate-180': userMenuOpen },
									]"
								/>
							</button>

							<template #content>
								<div class="flex min-w-40 flex-col gap-1 p-2">
									<div class="px-3 py-2">
										<div
											class="line-clamp-2 wrap-break-word text-[17px] leading-snug font-semibold text-slate-600 dark:text-slate-300"
										>
											{{ user.displayName ?? user.handle }}
										</div>
										<div
											class="text-[13px] leading-[normal] text-slate-500/80 dark:text-slate-400/80"
										>
											Hydroline ID
										</div>
									</div>

									<UButton
										:to="localePath('/me/profile')"
										color="neutral"
										variant="ghost"
										class="w-full justify-start gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
										@click="userMenuOpen = false"
									>
										<UIcon name="i-lucide-user" class="h-4.5 w-4.5 shrink-0" />
										<span class="leading-[normal] min-w-0 truncate">{{
											t('header.userMenu.profile')
										}}</span>
									</UButton>

									<UButton
										:to="localePath('/me/minecraft')"
										color="neutral"
										variant="ghost"
										class="w-full justify-start gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
										@click="userMenuOpen = false"
									>
										<UIcon name="i-lucide-box" class="h-4.5 w-4.5 shrink-0" />
										<span class="leading-[normal] min-w-0 truncate">{{
											t('header.userMenu.minecraftAccounts')
										}}</span>
									</UButton>

									<UButton
										:to="localePath('/me/security')"
										color="neutral"
										variant="ghost"
										class="w-full justify-start gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
										@click="userMenuOpen = false"
									>
										<UIcon
											name="i-lucide-shield-check"
											class="h-4.5 w-4.5 shrink-0"
										/>
										<span class="leading-[normal] min-w-0 truncate">{{
											t('header.userMenu.security')
										}}</span>
									</UButton>

									<UButton
										:to="localePath('/me/connections')"
										color="neutral"
										variant="ghost"
										class="w-full justify-start gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
										@click="userMenuOpen = false"
									>
										<UIcon name="i-lucide-link" class="h-4.5 w-4.5 shrink-0" />
										<span class="leading-[normal] min-w-0 truncate">{{
											t('header.userMenu.connections')
										}}</span>
									</UButton>

									<div
										v-if="isAdmin"
										class="my-1 border-t border-slate-200 dark:border-slate-700"
									/>

									<UButton
										v-if="isAdmin"
										:to="localePath('/admin/overview')"
										color="neutral"
										variant="ghost"
										class="w-full justify-start gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
										@click="userMenuOpen = false"
									>
										<UIcon
											name="i-lucide-shield"
											class="h-4.5 w-4.5 shrink-0"
										/>
										<span class="leading-[normal] min-w-0 truncate">{{
											t('header.userMenu.admin')
										}}</span>
									</UButton>

									<div
										class="my-1 border-t border-slate-200 dark:border-slate-700"
									/>

									<UButton
										type="button"
										color="error"
										variant="ghost"
										class="w-full justify-start gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-error-50! active:bg-error-100! dark:hover:bg-error-900/25! dark:active:bg-error-900/35!"
										@click="handleLogout"
									>
										<UIcon
											name="i-lucide-log-out"
											class="h-4.5 w-4.5 shrink-0"
										/>
										<span class="leading-[normal] min-w-0 truncate">{{
											t('header.userMenu.logout')
										}}</span>
									</UButton>
								</div>
							</template>
						</UPopover>
					</div>
				</Transition>
			</div>
		</div>
	</header>
</template>
