<template>
	<a :href="summary.link" target="_blank" rel="noreferrer" class="group block">
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
							<template #count>
								<strong class="mx-0.5 lg:text-4xl font-semibold">
									{{ summary.supporterCount }}
								</strong>
							</template>
							<template #amount>
								<strong class="mx-0.5 lg:text-4xl font-semibold">
									{{ summary.totalAmount }}
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
export interface ServerOverviewSponsorCardSummary {
	supporterCount: string
	totalAmount: string
	link: string
}

defineProps<{
	summary: ServerOverviewSponsorCardSummary
}>()

const { t } = useI18n()
</script>
