<script setup lang="ts">
import { useToast } from '@nuxt/ui/composables'
import { en, ja, zh_cn, zh_tw } from '@nuxt/ui/locale'
import PageFooter from '~/components/layout/PageFooter.vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import PageHeader from '~/components/layout/PageHeader.vue'
import PageStatusBar from '~/components/layout/PageStatusBar.vue'
import { normalizeHeaderMenuPath } from '~/utils/layout/header-menu'
import {
	useExplicitRouteTitleState,
	useResolvedRouteTitleDefinition,
} from '~/utils/layout/route-display'
import {
	profileLanguageToLocaleCode,
	type ProfileLanguage,
} from '~/utils/profile/edit'
import { resolvePageContainerVariant } from '~/utils/layout/page-presentation'

type LocaleCode = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'
type LocaleNameKey = 'zhCN' | 'zhTW' | 'jaJP' | 'enUS'

interface NuxtI18nApi {
	setLocale?: (code: LocaleCode) => Promise<void>
	loadLocaleMessages?: (code: LocaleCode) => Promise<void>
}

const toast = useToast()
const nuxtApp = useNuxtApp()
const route = useRoute()
const isImmersivePage = computed(
	() => resolvePageContainerVariant(route) === 'immersive',
)
const switchLocalePath = useSwitchLocalePath()
const locale = (nuxtApp.$i18n as { locale: Ref<LocaleCode> }).locale
const { t } = useI18n({ useScope: 'global' })
const { user, resolved } = usePortalAuth()
const explicitRouteTitle = useExplicitRouteTitleState()
const resolvedRouteTitleDefinition = useResolvedRouteTitleDefinition()
const normalizedRoutePath = computed(() => normalizeHeaderMenuPath(route.path))
const isHomePage = computed(() => normalizedRoutePath.value === '/')
const isViewportLockedImmersivePage = computed(
	() => isImmersivePage.value && !isHomePage.value,
)
const MANUAL_LOCALE_SWITCH_STORAGE_KEY = 'hydcraft:manual-locale-switch-at'
const MANUAL_LOCALE_SWITCH_GRACE_MS = 1500
const DEFAULT_LOCALE: LocaleCode = 'zh-CN'
const prefixedLocaleRoutePattern = /^\/(?:zh-TW|ja-JP|en-US)(?:\/|$)/

const CHINESE_PRIMARY_LOCALES = new Set([
	'zh',
	'cmn',
	'yue',
	'wuu',
	'hak',
	'nan',
])

const TRADITIONAL_CHINESE_REGIONS = new Set(['tw', 'hk', 'mo'])
const JAPANESE_PRIMARY_LOCALES = new Set(['ja', 'jp'])

const isChineseLocale = (localeTag: string): boolean => {
	if (!localeTag) {
		return false
	}

	const primary = localeTag.split('-', 1)[0] ?? ''

	if (CHINESE_PRIMARY_LOCALES.has(primary)) {
		return true
	}

	return (
		localeTag.includes('chinese') ||
		localeTag.includes('mandarin') ||
		localeTag.includes('cantonese')
	)
}

const resolveChineseLocaleCode = (localeTag: string): LocaleCode => {
	const fragments = localeTag.split('-').filter(Boolean)

	if (
		fragments.includes('hant') ||
		fragments.some((part) => TRADITIONAL_CHINESE_REGIONS.has(part))
	) {
		return 'zh-TW'
	}

	return 'zh-CN'
}

const normalizeLocaleCode = (value: string | null | undefined): LocaleCode => {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/_/g, '-')

	if (isChineseLocale(normalized)) {
		return resolveChineseLocaleCode(normalized)
	}

	const primary = normalized.split('-', 1)[0] ?? ''
	if (
		JAPANESE_PRIMARY_LOCALES.has(primary) ||
		normalized.includes('japanese')
	) {
		return 'ja-JP'
	}

	return 'en-US'
}

const toLocaleNameKey = (localeCode: LocaleCode): LocaleNameKey => {
	if (localeCode === 'zh-TW') {
		return 'zhTW'
	}

	if (localeCode === 'en-US') {
		return 'enUS'
	}

	if (localeCode === 'ja-JP') {
		return 'jaJP'
	}

	return 'zhCN'
}

const nuxtUiLocale = computed(() => {
	if (locale.value === 'zh-TW') {
		return zh_tw
	}

	if (locale.value === 'en-US') {
		return en
	}

	if (locale.value === 'ja-JP') {
		return ja
	}

	return zh_cn
})

const i18nApi = nuxtApp.$i18n as NuxtI18nApi

const setAppLocale = async (nextLocale: LocaleCode): Promise<void> => {
	if (nextLocale === normalizeLocaleCode(locale.value)) {
		return
	}

	if (i18nApi.setLocale) {
		await i18nApi.setLocale(nextLocale)
		return
	}

	locale.value = nextLocale
}

const isDefaultLocaleRoute = (path: string): boolean =>
	!prefixedLocaleRoutePattern.test(path)

const isFreshManualLocaleSwitch = (): boolean => {
	if (!import.meta.client) {
		return false
	}

	const switchedAt = Number(
		window.sessionStorage.getItem(MANUAL_LOCALE_SWITCH_STORAGE_KEY) ?? 0,
	)

	return Date.now() - switchedAt < MANUAL_LOCALE_SWITCH_GRACE_MS
}

const getPreferredLocale = (): LocaleCode | null => {
	const language = user.value?.preferences?.language as
		| ProfileLanguage
		| undefined

	return language ? profileLanguageToLocaleCode[language] : null
}

const maybeRedirectDefaultRouteToPreferredLocale = async (): Promise<void> => {
	if (
		!import.meta.client ||
		!resolved.value ||
		!user.value ||
		!isDefaultLocaleRoute(route.path) ||
		isFreshManualLocaleSwitch()
	) {
		return
	}

	const preferredLocale = getPreferredLocale()

	if (!preferredLocale || preferredLocale === DEFAULT_LOCALE) {
		return
	}

	const targetPath = switchLocalePath(preferredLocale)

	if (!targetPath || targetPath === route.fullPath) {
		return
	}

	await navigateTo(targetPath, { replace: true })
}

watch(
	[
		() => resolved.value,
		() => user.value?.preferences?.language,
		() => route.fullPath,
	],
	() => {
		void maybeRedirectDefaultRouteToPreferredLocale()
	},
	{ immediate: true },
)

const translateLocaleNotice = (
	key: string,
	promptLocale: LocaleCode,
	values: Record<string, string> = {},
): string => t(key, values, { locale: promptLocale })

const resolveLocaleDisplayName = (
	localeCode: LocaleCode,
	promptLocale: LocaleCode,
): string =>
	translateLocaleNotice(
		`localeNotice.localeNames.${toLocaleNameKey(localeCode)}`,
		promptLocale,
	)

let localeSuggestionChecked = false
let localeSuggestionBusy = false

const maybePromptLocaleSwitch = async (): Promise<void> => {
	if (!import.meta.client || localeSuggestionBusy || localeSuggestionChecked) {
		return
	}

	localeSuggestionChecked = true

	const preferredLocale = normalizeLocaleCode(useBrowserLocale())
	const currentLocale = normalizeLocaleCode(locale.value)

	if (preferredLocale === currentLocale) {
		return
	}

	localeSuggestionBusy = true

	try {
		if (i18nApi.loadLocaleMessages) {
			await i18nApi.loadLocaleMessages(preferredLocale)
		}

		const targetLanguage = resolveLocaleDisplayName(
			preferredLocale,
			preferredLocale,
		)
		const currentLanguage = resolveLocaleDisplayName(
			currentLocale,
			preferredLocale,
		)
		const switchLabel = translateLocaleNotice(
			'localeNotice.switchAction',
			preferredLocale,
			{ targetLanguage },
		)

		const toastEntry = toast.add({
			id: 'locale-switch-once',
			title: translateLocaleNotice('localeNotice.title', preferredLocale, {
				targetLanguage,
			}),
			description: translateLocaleNotice(
				'localeNotice.description',
				preferredLocale,
				{
					currentLanguage,
					targetLanguage,
				},
			),
			color: 'info',
			icon: 'i-lucide-languages',
			duration: 12000,
			actions: [
				{
					label: switchLabel,
					color: 'primary',
					onClick: () => {
						void setAppLocale(preferredLocale)
						toast.remove(toastEntry.id)
					},
				},
				{
					label: translateLocaleNotice(
						'localeNotice.keepAction',
						preferredLocale,
					),
					color: 'neutral',
					variant: 'ghost',
					onClick: () => {
						toast.remove(toastEntry.id)
					},
				},
			],
		})
	} finally {
		localeSuggestionBusy = false
	}
}

if (import.meta.client) {
	void maybePromptLocaleSwitch()
}

useHead(() => ({
	title:
		normalizedRoutePath.value === '/'
			? 'HydCraft Portal'
			: `${
					explicitRouteTitle.value ||
					t(
						resolvedRouteTitleDefinition.value?.labelKey ??
							'header.nav.currentPage',
					)
				} / HydCraft Portal`,
	htmlAttrs: {
		lang: locale.value,
	},
}))
</script>

<template>
	<UApp
		:locale="nuxtUiLocale"
		:tooltip="{
			delayDuration: 50,
			skipDelayDuration: 0,
		}"
		:toaster="{
			position: 'top-right',
			ui: {
				viewport: 'z-[60000]',
			},
		}"
	>
		<div
			id="app"
			class="relative flex flex-col"
			:class="
				isViewportLockedImmersivePage
					? 'h-dvh min-h-0 overflow-hidden bg-slate-950'
					: 'min-h-[105vh]'
			"
		>
			<PageHeader />
			<PageContainer />
			<PageFooter v-if="!isViewportLockedImmersivePage" />
			<PageStatusBar />
		</div>
	</UApp>
</template>
