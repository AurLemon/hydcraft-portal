<template>
	<div class="relative h-full w-full">
		<BlueMapViewport
			ref="viewportRef"
			v-if="effectiveAssetsBaseUrl"
			:assets-base-url="effectiveAssetsBaseUrl ?? ''"
			:focus="mapFocus"
			:player="player"
			:follow-key="followKey"
			:mode="mapMode"
			@view-change="emit('viewChange', $event)"
		/>

		<div
			v-if="!hasMapLocation"
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60 px-6 text-center text-sm text-white backdrop-blur-sm"
		>
			{{ t('minecraftAccounts.map.locationUnavailable') }}
		</div>
		<div
			v-else-if="unsupportedDimension"
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60 px-6 text-center text-sm text-white backdrop-blur-sm"
		>
			{{ t('minecraftAccounts.map.unsupportedDimension') }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
	BlueMapViewChangedEventPayload,
	BlueMapViewMode,
} from '~/utils/map'
import { resolveBlueMapDimensionDirectory } from '~/utils/map/bluemap/dimension-matcher'
import {
	AGGREGATE_SERVER_VIEW_ID,
	resolveServerViewSummary,
	type MinecraftAccountServerView,
	type MinecraftAccountSummary,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'
import { getMinecraftSkinRendererUrl } from '~/utils/minecraft/body-renderer'

interface MinecraftPresenceMapProps {
	account: MinecraftAccountSummary
	selectedViewId?: string | null
	mapMode?: BlueMapViewMode
}

const props = withDefaults(defineProps<MinecraftPresenceMapProps>(), {
	selectedViewId: null,
	mapMode: 'perspective',
})
const { t } = useI18n()
const emit = defineEmits<{
	viewChange: [view: BlueMapViewChangedEventPayload]
}>()
const viewportRef = ref<{
	alignNorth: () => void
	focusCurrentPosition: () => void
	resetView: () => void
} | null>(null)

defineExpose({
	alignNorth: () => viewportRef.value?.alignNorth(),
	focusPlayer: () => viewportRef.value?.focusCurrentPosition(),
	resetView: () => viewportRef.value?.resetView(),
})

const selectedServerView = computed<MinecraftAccountServerView | null>(() => {
	const selected = resolveServerViewSummary(props.account, props.selectedViewId)

	if (selected?.id !== AGGREGATE_SERVER_VIEW_ID) {
		return selected
	}

	const mapViews = props.account.serverViews.filter(
		(view) =>
			view.id !== AGGREGATE_SERVER_VIEW_ID && view.hasMap && view.blueMapConfig,
	)

	return (
		mapViews.find((view) => view.id === props.account.defaultViewId) ??
		mapViews[0] ??
		selected
	)
})

const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedServerView.value?.presence?.lastSavedLocation ??
		props.account.presence?.lastSavedLocation ??
		null,
)

const hasMapLocation = computed(
	() =>
		Number.isFinite(displayLocation.value?.x) &&
		Number.isFinite(displayLocation.value?.z),
)

const effectiveAssetsBaseUrl = computed(() => {
	const location = displayLocation.value
	const blueMapConfig = selectedServerView.value?.blueMapConfig
	if (!blueMapConfig) return null
	if (!location || !hasMapLocation.value)
		return blueMapConfig.defaultAssetsBaseUrl

	const configuredDimension = resolveBlueMapDimensionDirectory(
		blueMapConfig.dimensions,
		{
			dimension: location.dimension,
			worldName: location.worldName,
		},
	)
	if (configuredDimension)
		return `${blueMapConfig.assetsBaseUrl.replace(/\/+$/, '')}/${configuredDimension.replace(/^\/+/, '')}`
	return null
})

const unsupportedDimension = computed(
	() => hasMapLocation.value && !effectiveAssetsBaseUrl.value,
)

const mapFocus = computed(() => {
	const location = displayLocation.value
	if (!location || !hasMapLocation.value || unsupportedDimension.value) {
		return null
	}

	return {
		x: location.x ?? 0,
		y: location.y,
		z: location.z ?? 0,
		dimension: location.dimension ?? location.worldName ?? undefined,
	}
})

const followKey = computed(
	() => `${props.account.id}:${selectedServerView.value?.id ?? ''}`,
)

const player = computed(() => {
	const location = displayLocation.value
	if (!location || !hasMapLocation.value || unsupportedDimension.value) {
		return null
	}

	const skinKey =
		props.account.playerIdentity.playerId ??
		props.account.authmeRealname ??
		props.account.username
	const normalizedYaw =
		(((Number.isFinite(location.yaw) ? (location.yaw ?? 0) : 0) % 360) + 360) %
		360
	const formattedYaw = Number.isInteger(normalizedYaw)
		? normalizedYaw.toFixed(0)
		: normalizedYaw.toFixed(1)
	const coordinates = [location.x, location.y, location.z]
		.map((coordinate) =>
			Number.isFinite(coordinate) ? Math.round(coordinate ?? 0) : '?',
		)
		.join(', ')

	return {
		id: props.account.id,
		x: location.x ?? 0,
		y: location.y,
		z: location.z ?? 0,
		yaw: location.yaw,
		skinUrl: getMinecraftSkinRendererUrl(skinKey),
		detailLabels: {
			coordinates: t('minecraftAccounts.map.playerCoordinates', {
				coordinates,
			}),
			direction: t('minecraftAccounts.map.playerDirection', {
				degrees: formattedYaw,
			}),
			playerId: skinKey,
		},
		label:
			selectedServerView.value?.label ??
			props.account.playerIdentity.playerId ??
			props.account.username,
	}
})
</script>
