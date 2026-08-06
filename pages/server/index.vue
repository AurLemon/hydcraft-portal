<template>
	<div class="site-shell pb-16">
		<div v-if="showInitialSkeleton" class="grid gap-12">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
				<USkeleton class="h-160 rounded-xl lg:row-span-2" />
				<ServerOverviewMapShell
					class="h-full"
					:title="t('content.serverOverview.cards.satellite.title')"
					:open-label="t('content.serverOverview.actions.openMap')"
					open-to="https://map.oxygen.hydcraft.cn"
					body-class="h-42"
				>
					<USkeleton class="h-full w-full rounded-none" />
				</ServerOverviewMapShell>
				<ServerOverviewMapShell
					class="h-full"
					:title="t('content.serverOverview.cards.mtr.title')"
					:open-label="t('content.serverOverview.actions.openMap')"
					open-to="https://rail.oxygen.hydcraft.cn"
					body-class="h-42"
				>
					<USkeleton class="h-full w-full rounded-none" />
				</ServerOverviewMapShell>
			</div>

			<section class="grid gap-2">
				<USkeleton class="h-8 w-48 rounded-lg" />
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<USkeleton v-for="index in 10" :key="index" class="h-56 rounded-xl" />
				</div>
			</section>

			<USkeleton class="h-64 rounded-xl" />

			<section class="grid gap-2">
				<USkeleton class="h-8 w-48 rounded-lg" />
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<USkeleton v-for="index in 10" :key="index" class="h-56 rounded-xl" />
				</div>
			</section>
		</div>

		<PageInlineException
			v-else-if="showInitialError"
			icon="i-lucide-cloud-off"
			:title="t('content.serverOverview.states.loadFailed')"
		/>

		<div v-else-if="overview" class="grid gap-12">
			<section class="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
				<ServerOverviewBridgeStatusCard
					class="lg:row-span-2"
					:servers="overview.servers"
					:selected-server-id="selectedServerId"
					@select-server="selectedServerId = $event"
				/>

				<ClientOnly>
					<ServerOverviewSatelliteMapCard
						class="h-full"
						:assets-base-url="selectedServerAssetsBaseUrl"
					/>

					<template #fallback>
						<ServerOverviewMapShell
							class="h-full"
							:title="t('content.serverOverview.cards.satellite.title')"
							:open-label="t('content.serverOverview.actions.openMap')"
							open-to="https://map.oxygen.hydcraft.cn"
							body-class="h-42"
						>
							<USkeleton class="h-full w-full rounded-none" />
						</ServerOverviewMapShell>
					</template>
				</ClientOnly>

				<ClientOnly>
					<ServerOverviewMtrMapCard class="h-full" />

					<template #fallback>
						<ServerOverviewMapShell
							class="h-full"
							:title="t('content.serverOverview.cards.mtr.title')"
							:open-label="t('content.serverOverview.actions.openMap')"
							open-to="https://rail.oxygen.hydcraft.cn"
							body-class="h-42"
						>
							<USkeleton class="h-full w-full rounded-none" />
						</ServerOverviewMapShell>
					</template>
				</ClientOnly>
			</section>

			<ServerOverviewSeasonEightCard />
			<ServerOverviewSponsorCard :summary="sponsorSummary" />
			<ServerOverviewUsersSection
				:users="overview.recommendedUsers"
				:total-count="overview.totalUsers"
			/>
			<ServerOverviewPlayersSection
				:players="overview.recommendedPlayers"
				:total-count="overview.totalPlayers"
				:historical-count="overview.historicalPlayersCount"
			/>
			<ServerOverviewMunicipalitySection />
			<ServerOverviewRailwayDataSection />
			<ServerOverviewCompanySection />
			<ServerOverviewMapSection />
			<ServerOverviewCommitteeSection />
		</div>

		<PageInlineException
			v-else
			icon="i-lucide-cloud-off"
			:title="t('content.serverOverview.states.loadFailed')"
		/>
	</div>
</template>

<script setup lang="ts">
import PageInlineException from '~/components/common/PageInlineException.vue'
import type { ServerOverviewSponsorCardSummary } from '~/components/server/ServerOverviewSponsorCard.vue'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'
import type { AfdianSponsorStatsResponse } from '~/utils/server/afdian'
import type {
	ServerOverviewLiveResponse,
	ServerOverviewResponse,
} from '~/utils/server/overview'

definePageMeta({
	headerVariant: 'solid',
})

const { t } = useI18n()
const pageTitle = computed(() => t('routes.server'))
useExplicitRouteTitle(pageTitle)

const { data, pending, error } = await useFetch<ServerOverviewResponse>(
	'/api/public/server/overview',
)
const { data: liveOverviewData, refresh: refreshLiveOverview } =
	await useFetch<ServerOverviewLiveResponse>(
		'/api/public/server/overview-live',
		{
			immediate: false,
		},
	)
const { data: sponsorData } = await useFetch<AfdianSponsorStatsResponse | null>(
	'/api/public/server/afdian',
)
const selectedServerId = ref<string | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const overview = computed<ServerOverviewResponse | null>(() => {
	const initialOverview = data.value ?? null

	if (!initialOverview) {
		return null
	}

	const liveOverview = liveOverviewData.value ?? null

	if (!liveOverview) {
		return initialOverview
	}

	return {
		...initialOverview,
		servers: liveOverview.servers,
		defaultServerId: liveOverview.defaultServerId,
		totalUsers: liveOverview.totalUsers,
		totalPlayers: liveOverview.totalPlayers,
	}
})
const sponsorStats = computed(() => sponsorData.value ?? null)
const showInitialSkeleton = computed(() => pending.value && !overview.value)
const showInitialError = computed(() => Boolean(error.value) && !overview.value)
const selectedServerAssetsBaseUrl = computed(
	() =>
		overview.value?.servers.find(
			(server) => server.serverId === selectedServerId.value,
		)?.blueMapConfig?.defaultAssetsBaseUrl ?? null,
)
const sponsorSummary = computed<ServerOverviewSponsorCardSummary>(() => {
	if (sponsorStats.value) {
		return {
			supporterCount: String(sponsorStats.value.supporterCount),
			totalAmount: sponsorStats.value.totalAmount,
			link: sponsorStats.value.sponsorPageUrl,
		}
	}

	return {
		supporterCount: '10+',
		totalAmount: '400+',
		link: 'https://afdian.com/a/HydCraft',
	}
})

watch(
	overview,
	(value) => {
		if (!value) {
			selectedServerId.value = null
			return
		}

		const hasSelectedServer = value.servers.some(
			(server) => server.serverId === selectedServerId.value,
		)

		if (!hasSelectedServer) {
			selectedServerId.value =
				value.defaultServerId ?? value.servers[0]?.serverId ?? null
		}
	},
	{ immediate: true },
)

onMounted(() => {
	refreshTimer = setInterval(() => {
		void refreshLiveOverview()
	}, 10_000)
})

onBeforeUnmount(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer)
		refreshTimer = null
	}
})
</script>
