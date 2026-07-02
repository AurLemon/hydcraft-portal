<template>
	<p
		class="mt-2 text-sm leading-[normal] text-slate-400 dark:text-slate-500"
		data-reading-stats
	>
		{{ statsText }}
	</p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getContentStats } from '~/utils/content-stats'

interface ReadingStatsDoc {
	body?: unknown
}

const props = defineProps<{
	doc: ReadingStatsDoc
}>()

const { t } = useI18n()
const contentStats = computed(() => getContentStats(props.doc.body))

const statsText = computed(() =>
	t('main.contentFooter.stats', {
		count: contentStats.value.totalCount,
		minutes: contentStats.value.readingMinutes,
	}),
)
</script>
