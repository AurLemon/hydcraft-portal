<template>
	<article
		class="site-shell mx-auto px-6 pb-18 text-[17px] leading-8 text-slate-800 dark:text-slate-100 lg:px-0"
	>
		<ContentRenderer v-if="doc" :value="doc" />
	</article>
</template>

<script setup lang="ts">
type LocaleCode = 'zh-CN' | 'zh-TW' | 'en-US'

const route = useRoute()
const { locale } = useGlobalI18n()

const normalizedPage = computed(() => {
	const path = route.path
		.replace(/^\/(?:zh-CN|zh-TW|en-US)(?=\/|$)/, '')
		.replace(/^\/+|\/+$/g, '')

	return path || 'index'
})

const localePath = computed(() =>
	String(locale.value as LocaleCode).toLowerCase(),
)

const { data: doc } = await useAsyncData(
	() => `content-${localePath.value}-${normalizedPage.value}`,
	async () => {
		const localizedDoc = await $fetch(
			`/api/content-page/${localePath.value}/${normalizedPage.value}`,
		)

		if (localizedDoc) {
			return localizedDoc
		}

		if (localePath.value !== 'zh-cn') {
			return await $fetch(`/api/content-page/zh-cn/${normalizedPage.value}`)
		}

		return null
	},
	{ watch: [localePath, normalizedPage] },
)
</script>
