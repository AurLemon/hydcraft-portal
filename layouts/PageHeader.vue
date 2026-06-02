<script setup lang="ts">
import { computed } from 'vue'
import hydcraftLogo from '~/assets/resources/brand/logo_HydCraft.png'

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
const isHeroHeader = computed(() => route.meta.headerVariant === 'hero')

const headerScrimClass = computed(() =>
	isHeroHeader.value
		? 'bg-[#192024]/25'
		: 'bg-[#FAFAFA]/90 dark:bg-[#192024]/90',
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
</script>

<template>
	<header class="sticky top-0 z-100 pt-6 lg:px-8 lg:pt-10 lg:pb-16">
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
				:inactive-nav-item-class="inactiveNavItemClass"
			/>

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
