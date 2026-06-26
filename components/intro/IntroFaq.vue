<template>
	<section class="flex flex-col gap-6">
		<div class="flex justify-center">
			<h2
				class="text-center font-arkpixel text-3xl leading-tight tracking-wider text-slate-950 dark:text-slate-50 sm:text-4xl"
			>
				{{ title }}
			</h2>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<article
				v-for="(item, index) in items"
				:key="`intro-faq-${index}`"
				class="rounded-xl border border-slate-200 bg-white px-5 py-5 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:px-6"
			>
				<h3
					class="font-arkpixel text-lg leading-7 tracking-wide text-slate-950 dark:text-slate-50 sm:text-xl"
				>
					{{ item.question }}
				</h3>
				<p
					class="mt-3 text-base leading-8 text-slate-700/92 dark:text-slate-200/82"
				>
					{{ item.answer }}
				</p>
			</article>
		</div>
	</section>
</template>

<script setup lang="ts">
interface IntroFaqItem {
	question: string
	answer: string
}

const FAQ_COUNT = 8

const { t } = useI18n()

const title = computed(() => t('content.intro.faq.title'))

const items = computed<IntroFaqItem[]>(() =>
	Array.from({ length: FAQ_COUNT }, (_, index) => ({
		question: t(`content.intro.faq.items.${index}.question`),
		answer: t(`content.intro.faq.items.${index}.answer`),
	})),
)
</script>
