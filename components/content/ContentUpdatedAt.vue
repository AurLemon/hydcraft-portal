<template>
	<div
		v-if="updatedText"
		class="mt-14 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-slate-400 dark:text-slate-500"
	>
		<p class="flex items-center gap-1.5 leading-[normal]">
			<UIcon
				name="i-lucide-history"
				class="size-4 shrink-0 text-slate-400 dark:text-slate-500"
			/>
			<span>{{ updatedText }}</span>
		</p>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface UpdatedAtDoc {
	meta?: {
		updatedAt?: string
	}
	updatedAt?: string
}

const props = defineProps<{
	doc: UpdatedAtDoc
}>()

const { t, locale } = useI18n()

const formatUpdatedDate = (date: Date) => {
	const year = date.getFullYear()
	const month = date.getMonth() + 1
	const day = date.getDate()
	const hour = date.getHours()
	const minute = String(date.getMinutes()).padStart(2, '0')

	if (locale.value.startsWith('ja')) {
		return `${year} 年 ${month} 月 ${day} 日 ${hour}:${minute}`
	}

	if (locale.value.startsWith('zh')) {
		return `${year} 年 ${month} 月 ${day} 日 ${hour}:${minute}`
	}

	return new Intl.DateTimeFormat(locale.value, {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
		timeZone: 'Asia/Shanghai',
	}).format(date)
}

const updatedAt = computed(
	() => props.doc.updatedAt ?? props.doc.meta?.updatedAt ?? '',
)

const updatedText = computed(() => {
	if (!updatedAt.value) {
		return ''
	}

	const updatedDate = new Date(updatedAt.value)

	if (Number.isNaN(updatedDate.getTime())) {
		return ''
	}

	return t('main.contentFooter.updatedAt', {
		date: formatUpdatedDate(updatedDate),
	})
})
</script>
