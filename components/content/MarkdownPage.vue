<template>
	<article
		class="site-shell mx-auto pb-12 text-lg leading-8 text-slate-800 dark:text-slate-100"
	>
		<slot v-if="doc" name="header" :doc="doc" />
		<ContentRenderer v-if="doc" :value="doc" />
		<slot v-if="doc" name="footer" :doc="doc" />
	</article>
</template>

<script setup lang="ts">
type LocaleCode = 'zh-CN' | 'zh-TW' | 'en-US'

const route = useRoute()
const { $i18n } = useNuxtApp()
const locale = ($i18n as { locale: Ref<LocaleCode> }).locale

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
		const localizedDoc = await queryCollection('content')
			.path(`/${localePath.value}/${normalizedPage.value}`)
			.first()

		if (localizedDoc) {
			return localizedDoc
		}

		if (localePath.value !== 'zh-cn') {
			return await queryCollection('content')
				.path(`/zh-cn/${normalizedPage.value}`)
				.first()
		}

		return null
	},
	{ watch: [localePath, normalizedPage] },
)
</script>
