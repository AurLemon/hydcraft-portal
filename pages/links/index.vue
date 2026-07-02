<template>
	<div class="site-shell">
		<div class="grid gap-12">
			<div class="relative overflow-hidden rounded-2xl">
				<SkeletonImage
					:src="linksBannerImage"
					alt=""
					class="absolute inset-0 w-full"
					image-class="h-54 lg:min-h-48 block h-full w-full object-cover  transition-opacity duration-200"
				/>
				<div
					class="absolute inset-0 h-full z-10 flex min-h-54 flex-col justify-between lg:gap-5 px-6 py-6 text-white lg:flex-row lg:items-center lg:px-8"
				>
					<p
						class="max-w-2xl font-arkpixel mt-8 mb-10 lg:mt-0 lg:mb-0 text-center lg:text-left font-medium text-3xl lg:text-4xl leading-tight [text-shadow:0_1px_2px_rgba(15,23,42,0.42)]"
					>
						{{ t('content.links.banner.title') }}
					</p>
					<UButton
						type="button"
						color="primary"
						class="w-fit mx-auto lg:mx-0"
						icon="i-lucide-arrow-right"
						@click="handleApplyClick"
					>
						{{ t('content.links.banner.action') }}
					</UButton>
				</div>
			</div>

			<section class="flex flex-col gap-2">
				<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
					{{ t('content.links.sections.business') }}
				</h2>
				<div v-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<USkeleton v-for="index in 4" :key="index" class="h-52 rounded-xl" />
				</div>
				<div
					v-else-if="businessLinks.length"
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
				>
					<FriendLinkCard
						v-for="link in businessLinks"
						:key="link.id"
						:link="link"
					/>
				</div>
				<div v-else :class="emptyStateClass">
					{{ t('content.links.empty.business') }}
				</div>
			</section>

			<section class="flex flex-col gap-2">
				<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
					{{ t('content.links.sections.personal') }}
				</h2>
				<div v-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<USkeleton v-for="index in 4" :key="index" class="h-52 rounded-xl" />
				</div>
				<div
					v-else-if="personalLinks.length"
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
				>
					<FriendLinkCard
						v-for="link in personalLinks"
						:key="link.id"
						:link="link"
					/>
				</div>
				<div v-else :class="emptyStateClass">
					{{ t('content.links.empty.personal') }}
				</div>
			</section>

			<section class="flex flex-col gap-2">
				<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
					{{ t('content.links.sections.organization') }}
				</h2>
				<div v-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<USkeleton v-for="index in 4" :key="index" class="h-52 rounded-xl" />
				</div>
				<div
					v-else-if="organizationLinks.length"
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
				>
					<FriendLinkCard
						v-for="link in organizationLinks"
						:key="link.id"
						:link="link"
					/>
				</div>
				<div v-else :class="emptyStateClass">
					{{ t('content.links.empty.organization') }}
				</div>
			</section>
		</div>

		<FriendLinkApplicationModal
			v-model:open="applicationOpen"
			@submitted="handleApplicationSubmitted"
		/>
	</div>
</template>

<script setup lang="ts">
import linksBannerImage from '~/assets/resources/pages/links_banner.webp'
import { getPortalRedirectQuery } from '~/utils/auth/redirect'
import type { FriendLinksPublicResponse } from '~/utils/links/friend-links'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { user, resolved, fetchCurrentUser } = usePortalAuth()
const { data, pending } =
	await useFetch<FriendLinksPublicResponse>('/api/links')
const applicationOpen = ref(false)
const emptyStateClass =
	'rounded-xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400'

const businessLinks = computed(() => data.value?.business ?? [])
const personalLinks = computed(() => data.value?.personal ?? [])
const organizationLinks = computed(() => data.value?.organization ?? [])

onMounted(() => {
	if (!resolved.value) {
		void fetchCurrentUser()
	}
})

const handleApplyClick = async (): Promise<void> => {
	if (!resolved.value) {
		await fetchCurrentUser()
	}

	if (!user.value) {
		await navigateTo({
			path: localePath('/login'),
			query: getPortalRedirectQuery(route.fullPath, {
				fallbackPath: localePath('/links'),
				loginPath: localePath('/login'),
			}),
		})
		return
	}

	applicationOpen.value = true
}

const handleApplicationSubmitted = (): void => {}
</script>
