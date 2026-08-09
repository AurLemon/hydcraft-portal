import { computed } from 'vue'
import { hasHeroVideoBackground } from '~/utils/layout/hero-video'

type ThemeMode = 'light' | 'dark' | 'system'

interface HeaderAppearanceState {
	usesHeroVideoHeaderChrome: ComputedRef<boolean>
	selectedThemeMode: ComputedRef<ThemeMode>
	themeButtonIcon: ComputedRef<string>
	headerScrimClass: ComputedRef<string>
	headerActionButtonClass: ComputedRef<string>
	headerLoginButtonClass: ComputedRef<string>
	headerMenuActionClass: ComputedRef<string>
	headerUserMenuButtonClass: ComputedRef<string>
	headerUserMenuChevronClass: ComputedRef<string>
	activeNavItemClass: ComputedRef<string>
	fallbackNavItemClass: ComputedRef<string>
	inactiveNavItemClass: ComputedRef<string>
}

const themeIconMap = {
	light: 'i-lucide-sun',
	dark: 'i-lucide-moon',
} as const

const getThemeModeIcon = (mode: ThemeMode): string =>
	mode === 'system' ? 'i-lucide-monitor' : themeIconMap[mode]

export const useHeaderAppearance = (): HeaderAppearanceState => {
	const route = useRoute()
	const colorMode = useNuxtApp().$colorMode

	const usesHeroVideoHeaderChrome = computed(
		() => route.meta.headerVariant === 'hero' || hasHeroVideoBackground(route),
	)

	const selectedThemeMode = computed<ThemeMode>(() => {
		const pref = colorMode.preference

		return pref === 'light' || pref === 'dark' || pref === 'system'
			? pref
			: 'system'
	})

	const themeButtonIcon = computed(() =>
		getThemeModeIcon(selectedThemeMode.value),
	)

	const activeNavTextClass = computed(() =>
		usesHeroVideoHeaderChrome.value
			? 'text-[rgb(125,211,252)]'
			: 'text-primary dark:text-[rgb(125,211,252)]',
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

	const headerMenuActionClass = computed(() =>
		usesHeroVideoHeaderChrome.value
			? 'text-white! hover:text-white!'
			: 'text-slate-800! hover:text-slate-800! dark:text-slate-100! dark:hover:text-slate-100!',
	)

	const headerUserMenuButtonClass = computed(() =>
		usesHeroVideoHeaderChrome.value
			? 'text-white hover:text-white'
			: 'text-default',
	)

	const headerUserMenuChevronClass = computed(() =>
		usesHeroVideoHeaderChrome.value ? 'text-white' : 'text-default',
	)

	const activeNavItemClass = computed(
		() => `font-semibold ${activeNavTextClass.value} opacity-100`,
	)

	const fallbackNavItemClass = computed(
		() => `${activeNavTextClass.value} opacity-100`,
	)

	const inactiveNavItemClass = computed(() =>
		usesHeroVideoHeaderChrome.value
			? 'text-white opacity-80 hover:text-white hover:opacity-100'
			: 'text-slate-800 opacity-85 hover:text-slate-800 hover:opacity-100 dark:text-slate-300 dark:opacity-75 dark:hover:text-slate-100 dark:hover:opacity-100',
	)

	return {
		usesHeroVideoHeaderChrome,
		selectedThemeMode,
		themeButtonIcon,
		headerScrimClass,
		headerActionButtonClass,
		headerLoginButtonClass,
		headerMenuActionClass,
		headerUserMenuButtonClass,
		headerUserMenuChevronClass,
		activeNavItemClass,
		fallbackNavItemClass,
		inactiveNavItemClass,
	}
}
