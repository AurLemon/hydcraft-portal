<template>
	<a
		:href="postscriptHref"
		target="_blank"
		rel="noopener noreferrer"
		class="my-8 block rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/80"
	>
		<div class="flex flex-col items-start gap-3">
			<div
				class="inline-flex items-center gap-2 text-2xl font-medium text-slate-700 dark:text-slate-200"
			>
				<UIcon name="i-lucide-arrow-right" class="size-6 shrink-0" />
				<span>{{ t('content.timeline.postscriptCard.title') }}</span>
			</div>
			<div class="ml-8 origin-left scale-60 -mt-2">
				<BrandingAurLemon />
			</div>
		</div>
	</a>
</template>

<script setup lang="ts">
import BrandingAurLemon from '~/components/branding/AurLemon.vue'

type LocaleCode = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'

const { locale, t } = useI18n()

const POSTSCRIPT_URL_MAP: Record<LocaleCode, string> = {
	'zh-CN': 'https://aurlemon.top/journey#%E6%9C%8D%E4%B8%BB%E5%90%8E%E8%AE%B0',
	'zh-TW': 'https://aurlemon.top/journey#%E6%9C%8D%E4%B8%BB%E5%90%8E%E8%AE%B0',
	'ja-JP':
		'https://aurlemon.top/ja-JP/journey#%E6%9C%8D%E4%B8%BB%E5%BE%8C%E8%A8%98',
	'en-US': 'https://aurlemon.top/en-US/journey#server-owner-postscript',
}

const postscriptHref = computed(() => {
	const currentLocale = locale.value as LocaleCode

	return POSTSCRIPT_URL_MAP[currentLocale] || POSTSCRIPT_URL_MAP['zh-CN']
})
</script>
