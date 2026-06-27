<template>
	<a
		:href="stats.sponsorPageUrl"
		target="_blank"
		rel="noreferrer"
		class="group block"
	>
		<section
			class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 sm:p-7"
		>
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.12),transparent_34%)] backdrop-blur-xl"
			/>

			<div class="relative flex flex-col gap-6">
				<div class="flex flex-col lg:flex-row items-start gap-4">
					<div
						class="flex size-16 shrink-0 items-center justify-center rounded-2xl text-5xl"
					>
						<span aria-hidden="true">🥺</span>
					</div>

					<div class="min-w-0 flex-1">
						<i18n-t
							keypath="content.serverOverview.cards.sponsor.summary"
							tag="p"
							class="font-arkpixel text-2xl leading-7 text-slate-900 dark:text-slate-100"
						>
							<template #date>
								{{ formattedDate }}
							</template>
							<template #count>
								<strong class="mx-0.5 lg:text-4xl font-semibold">
									{{ stats.supporterCount }}
								</strong>
							</template>
							<template #amount>
								<strong class="mx-0.5 lg:text-4xl font-semibold">
									{{ stats.totalAmount }}
								</strong>
							</template>
						</i18n-t>
						<div class="mt-2 text-base text-slate-600 dark:text-slate-300">
							{{ t('content.serverOverview.cards.sponsor.cta') }}
						</div>
					</div>
				</div>
			</div>
		</section>
	</a>
</template>

<script setup lang="ts">
import type { AfdianSponsorStatsResponse } from '~/utils/server/afdian'

interface Props {
	stats: AfdianSponsorStatsResponse
}

const props = defineProps<Props>()
const { t, locale } = useI18n()

const asOfDate = computed(() => new Date(props.stats.asOfDate))
const formattedDate = computed(() =>
	new Intl.DateTimeFormat(locale.value, {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).format(asOfDate.value),
)
</script>
