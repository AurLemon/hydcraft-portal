<template>
	<section
		class="relative isolate h-dvh min-h-160 w-full overflow-hidden bg-slate-950"
	>
		<div class="absolute inset-0">
			<HomeImmersiveBlueMap
				:key="scene.id"
				:assets-base-url="mapAssetsProxyBaseUrl"
				:camera="scene.camera"
				:lighting="scene.lighting"
				:water="scene.water"
				:class="developerControlsEnabled ? undefined : 'pointer-events-none'"
			/>
		</div>
		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,transparent_0%,rgba(2,6,23,0.12)_42%,rgba(2,6,23,0.7)_100%)]"
		/>
		<div
			class="pointer-events-none absolute inset-y-0 left-0 w-full bg-linear-to-r from-slate-950/82 via-slate-950/34 to-transparent lg:w-[72%]"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-linear-to-t from-slate-950/80 via-slate-950/24 to-transparent"
		/>

		<div
			class="immersive-site-shell pointer-events-none relative z-10 flex h-full flex-col px-6 pt-28 pb-8 text-white sm:px-10 lg:px-16 lg:pb-12"
		>
			<p
				class="lg:-translate-x-2 pointer-events-none mt-auto inline-block max-w-full self-start bg-[linear-gradient(to_right,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_22%,rgba(255,255,255,0.8)_100%)] bg-clip-text font-serif text-[clamp(4.5rem,11vw,11rem)] font-bold tracking-[-0.04em] whitespace-pre-line text-transparent uppercase leading-[1.05] drop-shadow-[0_2px_16px_rgba(2,6,23,0.8)] lg:mt-16 select-none"
				aria-hidden="true"
			>
				{{ t(`home.immersive.scenes.${scene.presentation.copyKey}.name`) }}
			</p>
			<div
				class="lg:-translate-x-2 mt-3 mx-4 inline-flex gap-1 w-fit items-center text-sm text-white/90 select-none"
			>
				<UIcon
					:name="scene.presentation.credit.icon"
					class="size-12 object-cover shrink-0 text-[#fd354f] leading-none"
				/>
				<a
					:href="scene.presentation.credit.href"
					target="_blank"
					rel="noopener noreferrer"
					class="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-base font-medium transition-colors hover:bg-white/14 hover:text-white"
				>
					<span>{{ scene.presentation.credit.handle }}</span>
					<UIcon name="i-lucide-external-link" class="size-3.5" />
				</a>
			</div>

			<div
				class="mt-2 max-w-full pb-2 [text-shadow:0_2px_16px_rgba(2,6,23,0.8)] lg:mt-auto lg:pb-12"
			>
				<div class="max-w-xl">
					<h1
						class="uppercase whitespace-pre-line text-xl font-semibold tracking-[0.08em] sm:text-3xl"
					>
						{{ t(`home.immersive.scenes.${scene.presentation.copyKey}.title`) }}
					</h1>
					<p class="mt-2 whitespace-pre-line text-sm text-white/72 sm:text-lg">
						{{
							t(
								`home.immersive.scenes.${scene.presentation.copyKey}.description`,
							)
						}}
					</p>
				</div>
			</div>

			<div
				class="ml-auto flex items-center gap-2 text-base font-medium tracking-wide text-white/90 [text-shadow:0_2px_12px_rgba(2,6,23,0.8)]"
			>
				<span
					class="h-2 w-2 rounded-full"
					:class="online ? 'bg-emerald-400' : 'bg-slate-400'"
				/>
				<span>{{ serverName }}</span>
				<span class="text-white/62">{{ onlineCount }}/{{ maxPlayers }}</span>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	defaultHomeImmersiveScene,
	HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED,
	HOME_IMMERSIVE_MAP_ASSETS_PROXY_BASE_URL,
} from '~/utils/home/immersive-scenes'
import { resolveMinecraftServerLocalizedName } from '~/utils/minecraft/server-name'
import type { ServerOverviewLiveResponse } from '~/utils/server/overview'

definePageMeta({
	headerVariant: 'hero',
	pageContainerVariant: 'immersive',
	pageTransition: {
		name: 'immersive-page',
		mode: 'out-in',
	},
})

const { locale, t } = useI18n()
const scene = defaultHomeImmersiveScene
const mapAssetsProxyBaseUrl = HOME_IMMERSIVE_MAP_ASSETS_PROXY_BASE_URL
const developerControlsEnabled = HOME_IMMERSIVE_DEVELOPER_CONTROLS_ENABLED
const { data: liveOverview } = await useFetch<ServerOverviewLiveResponse>(
	'/api/public/server/overview-live',
)

const defaultServer = computed(() => {
	const overview = liveOverview.value
	if (!overview) return null

	return (
		overview.servers.find(
			(server) => server.serverId === overview.defaultServerId,
		) ?? null
	)
})
const serverName = computed(
	() =>
		(defaultServer.value &&
			resolveMinecraftServerLocalizedName(
				defaultServer.value.names,
				locale.value,
			)) ||
		t('home.immersive.serverUnavailable'),
)
const onlineCount = computed(
	() => defaultServer.value?.bridgeStatus.onlineCount ?? 0,
)
const maxPlayers = computed(
	() => defaultServer.value?.bridgeStatus.maxPlayers ?? 0,
)
const online = computed(() =>
	Boolean(defaultServer.value?.bridgeStatus.connected),
)
</script>
