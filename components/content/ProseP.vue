<template>
	<p :lang="paragraphLang" :class="[paragraphClass, props.class]">
		<slot />
	</p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
	class?: unknown
}>()

const { locale } = useI18n()

const proseBaseClass =
	'my-3 w-full text-pretty text-justify [text-align-last:left]'
const proseCjkClass = `${proseBaseClass} break-normal [text-justify:inter-character] [line-break:loose]`
const proseEnglishClass = `${proseBaseClass} hyphens-auto break-words [text-justify:inter-word]`

const paragraphLang = computed(() => {
	if (locale.value.startsWith('ja')) {
		return 'ja'
	}

	if (locale.value.startsWith('en')) {
		return 'en'
	}

	return 'zh-CN'
})

const paragraphClass = computed(() =>
	paragraphLang.value === 'en' ? proseEnglishClass : proseCjkClass,
)
</script>
