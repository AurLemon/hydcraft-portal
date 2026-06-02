<script setup lang="ts">
import { computed } from 'vue'
import PageFooter from '~/layouts/PageFooter.vue'
import PageHeader from '~/layouts/PageHeader.vue'

interface NuxtErrorLike {
	statusCode?: number
	status?: number
	statusText?: string
	message?: string
}

const props = defineProps<{
	error: NuxtErrorLike
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const statusCode = computed(
	() => props.error.statusCode ?? props.error.status ?? 500,
)
const statusDetail = computed(
	() =>
		props.error.statusText ?? props.error.message ?? t('error.fallbackDetail'),
)

const handleBackHome = (): void => {
	void clearError({ redirect: localePath('/') })
}

const handleBackTimeline = (): void => {
	void clearError({ redirect: localePath('/timeline') })
}

useHead(() => ({
	title: `${statusCode.value} - ${t('error.pageTitle')}`,
	meta: [
		{
			name: 'robots',
			content: 'noindex,nofollow',
		},
	],
}))
</script>

<template>
	<UApp
		:toaster="{
			position: 'top-right',
			ui: {
				viewport: 'z-[60000]',
			},
		}"
	>
		<div class="relative flex min-h-[105vh] flex-col">
			<PageHeader />

			<main
				class="site-shell mx-auto flex w-full flex-1 items-center px-6 py-12"
			>
				<section class="w-full px-6 py-10">
					<div
						class="relative mx-auto flex max-w-3xl flex-col items-center text-center"
					>
						<div
							class="text-[10rem] font-semibold leading-none text-slate-900 dark:text-slate-50"
						>
							{{ statusCode }}
						</div>

						<div
							class="mt-0.5 text-base text-slate-500 uppercase dark:text-slate-400"
						>
							{{ statusDetail }}
						</div>

						<div
							class="mt-16 text-3xl font-arkpixel text-slate-900 dark:text-slate-50 md:text-3xl"
						>
							{{ t('error.headline') }}
						</div>
					</div>
				</section>
			</main>

			<PageFooter />
		</div>
	</UApp>
</template>
