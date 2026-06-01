<template>
	<p class="mt-2 text-sm leading-[normal] text-slate-400 dark:text-slate-500">
		{{ statsText }}
	</p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface ContentDoc {
	body?: unknown
}

const props = defineProps<{
	doc: ContentDoc
}>()

const { t } = useI18n()

const extractText = (node: unknown): string => {
	if (typeof node === 'string') {
		return node
	}

	if (Array.isArray(node)) {
		if (
			node.length >= 2 &&
			typeof node[0] === 'string' &&
			node[1] !== null &&
			typeof node[1] === 'object' &&
			!Array.isArray(node[1])
		) {
			return node.slice(2).map(extractText).join(' ')
		}

		return node.map(extractText).join(' ')
	}

	if (node !== null && typeof node === 'object') {
		const record = node as Record<string, unknown>

		if (Array.isArray(record.value)) {
			return record.value.map(extractText).join(' ')
		}

		if (Array.isArray(record.children)) {
			return record.children.map(extractText).join(' ')
		}

		if (typeof record.text === 'string') {
			return record.text
		}
	}

	return ''
}

const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()

const contentText = computed(() => normalizeText(extractText(props.doc.body)))

const cjkCharCount = computed(
	() =>
		(
			contentText.value.match(
				/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g,
			) || []
		).length,
)

const englishWordCount = computed(
	() =>
		(contentText.value.match(/\b(?:[A-Za-z]+(?:'[A-Za-z]+)?|\d+)\b/g) || [])
			.length,
)

const totalCount = computed(() => cjkCharCount.value + englishWordCount.value)

const readingMinutes = computed(() =>
	Math.max(
		1,
		Math.ceil(cjkCharCount.value / 250 + englishWordCount.value / 180),
	),
)

const statsText = computed(() =>
	t('main.contentFooter.stats', {
		count: totalCount.value,
		minutes: readingMinutes.value,
	}),
)
</script>
