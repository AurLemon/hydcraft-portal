<template>
	<section
		class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-7"
	>
		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--ui-primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--ui-primary)_12%,transparent),transparent_32%)] backdrop-blur-xl"
		/>

		<div class="relative flex flex-col gap-6">
			<div class="flex items-start gap-4">
				<div
					class="flex size-16 shrink-0 items-center justify-center rounded-2xl text-5xl"
				>
					<span aria-hidden="true">😱</span>
				</div>

				<div class="min-w-0 flex-1">
					<p
						class="font-arkpixel text-2xl leading-8 text-slate-900 dark:text-slate-100 break-all"
					>
						<span>
							{{ summaryPrefix }}
						</span>
						<span class="lg:hidden" v-text="'\u00a0'" />
						<span class="leading-none lg:ml-3 lg:text-4xl">
							{{ summaryMemory }}
						</span>
						<span>
							{{ summaryMiddle }}
						</span>
						<span class="lg:hidden" v-text="'\u00a0'" />
						<span class="leading-none lg:mx-3 lg:text-4xl">
							{{ summaryYear }}
						</span>
						<span>
							{{ summaryConnector }}
						</span>
						<span class="leading-none lg:ml-3 lg:mr-3 lg:text-4xl">
							{{ summaryTier }}
						</span>
						<span>
							{{ summarySuffix }}
						</span>
					</p>
					<p
						class="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300"
					>
						{{ t('content.intro.ourWorks.requirements.detail') }}
					</p>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
const { t } = useI18n()

const summaryPrefix = computed(() =>
	t('content.intro.ourWorks.requirements.summaryPrefix'),
)
const summaryMemory = computed(() =>
	t('content.intro.ourWorks.requirements.summaryMemory'),
)
const summaryMiddle = computed(() =>
	t('content.intro.ourWorks.requirements.summaryMiddle'),
)
const summaryYear = computed(() =>
	t('content.intro.ourWorks.requirements.summaryYear'),
)
const summaryConnector = computed(() =>
	t('content.intro.ourWorks.requirements.summaryConnector'),
)
const summaryTier = computed(() =>
	t('content.intro.ourWorks.requirements.summaryTier'),
)
const summarySuffix = computed(() =>
	t('content.intro.ourWorks.requirements.summarySuffix'),
)
</script>
