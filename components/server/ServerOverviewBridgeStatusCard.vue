<template>
	<div
		class="relative isolate h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-950"
	>
		<template v-if="selectedServer">
			<ServerOverviewOnlineSparkline
				:bridge-status="selectedServer.bridgeStatus"
			/>

			<div class="relative z-10 flex h-full flex-col justify-between">
				<div class="flex flex-col gap-2">
					<div class="flex items-baseline gap-2">
						<div class="flex items-center gap-2">
							<span
								class="size-3 rounded-full translate-y-1"
								:class="statusDotClass"
							/>
						</div>

						<div class="flex items-baseline gap-2 text-right">
							<div class="flex items-end gap-1 text-slate-950 dark:text-white">
								<span class="text-7xl leading-none font-semibold translate-y-1">
									{{ onlineCountText }}
								</span>
								<span
									class="pb-1 text-2xl leading-none text-slate-500 dark:text-slate-400"
								>
									/ {{ maxPlayersText }}
								</span>
							</div>

							<UPopover
								v-if="servers.length > 1"
								v-model:open="serverMenuOpen"
								:popper="{ placement: 'bottom-end' }"
							>
								<button
									type="button"
									class="inline-flex items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
									:aria-label="
										t('content.serverOverview.cards.bridge.selectServer')
									"
								>
									<UIcon name="i-lucide-chevron-down" class="size-4" />
								</button>

								<template #content>
									<div
										class="grid w-64 max-w-[calc(100vw-2rem)] gap-1 overflow-hidden rounded-lg p-1.5"
									>
										<button
											v-for="server in servers"
											:key="server.serverId"
											type="button"
											class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
											:class="{
												'bg-primary-100/60 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200':
													server.serverId === selectedServerId,
												'text-slate-600 dark:text-slate-300':
													server.serverId !== selectedServerId,
											}"
											@click="selectServer(server.serverId)"
										>
											<span class="min-w-0 flex-1 truncate">
												{{ server.name }}
											</span>
											<UIcon
												v-if="server.serverId === selectedServerId"
												name="i-lucide-check"
												class="size-3.5 shrink-0"
											/>
										</button>
									</div>
								</template>
							</UPopover>
						</div>
					</div>

					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 text-2xl text-slate-950 dark:text-white">
							<div class="truncate">
								{{ selectedServer.name }}
							</div>
						</div>

						<div
							v-if="headItems.length"
							class="flex max-w-[50%] flex-wrap content-start justify-end gap-1.5 mt-1"
						>
							<UTooltip
								v-for="player in headItems"
								:key="player.uuid"
								:text="player.username || player.uuid"
							>
								<button
									type="button"
									class="rounded-md transition hover:opacity-85 focus:outline-none"
									@click="openPlayerPresence(player)"
								>
									<SkeletonImage
										:src="
											getMinecraftHeadRendererUrl(
												player.username || player.uuid,
											)
										"
										:alt="player.username || player.uuid"
										class="size-6 overflow-hidden rounded-md drop-shadow"
										image-class="block size-6 object-cover"
										skeleton-class="rounded-lg"
									/>
								</button>
							</UTooltip>
						</div>
					</div>
				</div>

				<div class="mt-8 flex flex-col gap-3 text-sm">
					<div class="flex flex-wrap gap-x-4 gap-y-2">
						<template v-for="link in mapLinkItems" :key="link.label">
							<a
								:href="link.to"
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center gap-1.5 text-base text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
							>
								<UIcon :name="link.icon" class="size-5" />
								<span>{{ link.label }}</span>
							</a>
						</template>
					</div>

					<div class="flex flex-wrap gap-x-4 gap-y-2">
						<template v-for="link in resourceLinkItems" :key="link.label">
							<NuxtLink
								v-if="!link.external"
								:to="link.to"
								class="inline-flex items-center gap-1.5 text-base text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
							>
								<UIcon :name="link.icon" class="size-5" />
								<span>{{ link.label }}</span>
							</NuxtLink>

							<a
								v-else
								:href="link.to"
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center gap-1.5 text-base text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
							>
								<UIcon :name="link.icon" class="size-5" />
								<span>{{ link.label }}</span>
							</a>
						</template>
					</div>
				</div>
			</div>
		</template>

		<div
			v-else
			class="rounded-xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400"
		>
			{{ t('content.serverOverview.states.emptyServers') }}
		</div>

		<ServerOverviewPlayerPresenceModal
			v-model:open="playerPresenceOpen"
			:server-id="selectedServer?.serverId ?? null"
			:player="selectedPlayer"
		/>
	</div>
</template>

<script setup lang="ts">
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'
import type {
	ServerOverviewObservedPlayer,
	ServerOverviewServerItem,
} from '~/utils/server/overview'

interface Props {
	servers: ServerOverviewServerItem[]
	selectedServerId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
	selectServer: [serverId: string]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const serverMenuOpen = ref(false)
const playerPresenceOpen = ref(false)
const selectedPlayer = ref<ServerOverviewObservedPlayer | null>(null)

const selectedServer = computed(
	() =>
		props.servers.find(
			(server) => server.serverId === props.selectedServerId,
		) ??
		props.servers[0] ??
		null,
)

const maxPlayersText = computed(() => {
	if (!shouldShowPlayerCount.value) {
		return '-'
	}

	const maxPlayers = selectedServer.value?.bridgeStatus.maxPlayers

	return maxPlayers == null ? '-' : String(maxPlayers)
})

const shouldShowPlayerCount = computed(
	() => selectedServer.value?.bridgeStatus.connected ?? false,
)

const onlineCountText = computed(() =>
	shouldShowPlayerCount.value
		? String(selectedServer.value?.bridgeStatus.onlineCount ?? 0)
		: '-',
)

const statusDotClass = computed(() => {
	const bridgeStatus = selectedServer.value?.bridgeStatus

	if (!bridgeStatus || !bridgeStatus.enabled) {
		return 'bg-slate-400'
	}

	if (bridgeStatus.connected) {
		return 'bg-emerald-500'
	}

	if (
		bridgeStatus.lastConnectionState === 'ERROR' ||
		bridgeStatus.lastConnectionState === 'REJECTED'
	) {
		return 'bg-rose-500'
	}

	if (bridgeStatus.running || bridgeStatus.manualRequired) {
		return 'bg-amber-500'
	}

	return 'bg-slate-400'
})

const headItems = computed(
	() => selectedServer.value?.bridgeStatus.observedPlayers ?? [],
)

const openPlayerPresence = (player: ServerOverviewObservedPlayer): void => {
	selectedPlayer.value = player
	playerPresenceOpen.value = true
}

const mapLinkItems = computed(() => [
	{
		label: t('content.serverOverview.cards.bridge.links.satellite'),
		to: 'https://map.nitrogen.hydcraft.cn',
		icon: 'i-lucide-map',
		external: true,
	},
	{
		label: t('content.serverOverview.cards.bridge.links.mtr'),
		to: 'https://rail.nitrogen.hydcraft.cn',
		icon: 'i-lucide-train-front',
		external: true,
	},
	{
		label: t('content.serverOverview.cards.bridge.links.createRail'),
		to: 'https://track.nitrogen.hydcraft.cn',
		icon: 'i-lucide-route',
		external: true,
	},
])

const resourceLinkItems = computed(() => [
	{
		label: t('content.serverOverview.cards.bridge.links.charter'),
		to: localePath('/server/charter'),
		icon: 'i-lucide-file-text',
		external: false,
	},
	{
		label: t('content.serverOverview.cards.bridge.links.communityCovenant'),
		to: localePath('/server/community-covenant'),
		icon: 'i-lucide-scale',
		external: false,
	},
	{
		label: t('content.serverOverview.cards.bridge.links.wiki'),
		to: 'https://wiki.hydcraft.cn',
		icon: 'i-lucide-book-open',
		external: true,
	},
	{
		label: t('content.serverOverview.cards.bridge.links.docs'),
		to: 'https://docs.hydcraft.cn',
		icon: 'i-lucide-book-text',
		external: true,
	},
	{
		label: t('content.serverOverview.cards.bridge.links.sponsor'),
		to: 'https://afdian.com/a/HydCraft',
		icon: 'i-lucide-heart-handshake',
		external: true,
	},
])

const selectServer = (serverId: string) => {
	serverMenuOpen.value = false
	emit('selectServer', serverId)
}
</script>
