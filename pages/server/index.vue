<template>
	<div class="site-shell pb-16">
		<div v-if="pending" class="grid gap-12">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
				<USkeleton class="h-[40rem] rounded-xl lg:row-span-2" />
				<ServerOverviewMapShell
					:title="t('content.serverOverview.cards.satellite.title')"
					:open-label="t('content.serverOverview.actions.openMap')"
					open-to="https://map.nitrogen.hydcraft.cn"
					body-class="h-42"
				>
					<USkeleton class="h-full w-full rounded-none" />
				</ServerOverviewMapShell>
				<ServerOverviewMapShell
					:title="t('content.serverOverview.cards.mtr.title')"
					:open-label="t('content.serverOverview.actions.openMap')"
					open-to="https://rail.nitrogen.hydcraft.cn"
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

			<section class="grid gap-2">
				<USkeleton class="h-8 w-48 rounded-lg" />
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<USkeleton v-for="index in 10" :key="index" class="h-56 rounded-xl" />
				</div>
			</section>
		</div>

		<PageInlineException
			v-else-if="error || !overview"
			icon="i-lucide-cloud-off"
			:title="t('content.serverOverview.states.loadFailed')"
		/>

		<div v-else class="grid gap-12">
			<section class="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
				<ServerOverviewBridgeStatusCard
					class="lg:row-span-2"
					:servers="overview.servers"
					:selected-server-id="selectedServerId"
					@select-server="selectedServerId = $event"
				/>

				<ClientOnly>
					<ServerOverviewSatelliteMapCard />

					<template #fallback>
						<ServerOverviewMapShell
							:title="t('content.serverOverview.cards.satellite.title')"
							:open-label="t('content.serverOverview.actions.openMap')"
							open-to="https://map.nitrogen.hydcraft.cn"
							body-class="h-42"
						>
							<USkeleton class="h-full w-full rounded-none" />
						</ServerOverviewMapShell>
					</template>
				</ClientOnly>

				<ClientOnly>
					<ServerOverviewMtrMapCard />

					<template #fallback>
						<ServerOverviewMapShell
							:title="t('content.serverOverview.cards.mtr.title')"
							:open-label="t('content.serverOverview.actions.openMap')"
							open-to="https://rail.nitrogen.hydcraft.cn"
							body-class="h-42"
						>
							<USkeleton class="h-full w-full rounded-none" />
						</ServerOverviewMapShell>
					</template>
				</ClientOnly>
			</section>

			<ServerOverviewUsersSection
				:users="overview.recommendedUsers"
				:total-count="overview.totalUsers"
			/>
			<ServerOverviewPlayersSection
				:players="overview.recommendedPlayers"
				:total-count="overview.totalPlayers"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import PageInlineException from '~/components/common/PageInlineException.vue'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'
import type { ServerOverviewResponse } from '~/utils/server/overview'

definePageMeta({
	headerVariant: 'solid',
})

const { t } = useI18n()
const pageTitle = computed(() => t('content.serverOverview.pageTitle'))
useExplicitRouteTitle(pageTitle)

const { data, pending, error, refresh } =
	await useFetch<ServerOverviewResponse>('/api/public/server/overview')
const selectedServerId = ref<string | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const overview = computed(() => data.value ?? null)

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
		void refresh()
	}, 60_000)
})

onBeforeUnmount(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer)
		refreshTimer = null
	}
})
</script>
