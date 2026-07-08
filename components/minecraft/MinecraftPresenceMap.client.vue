<template>
	<div class="relative h-full w-full">
		<div ref="mapContainerRef" class="h-full w-full" />

		<div
			v-if="!hasMapLocation"
			class="absolute inset-0 flex items-center justify-center bg-slate-950/60 px-6 text-center text-sm text-white backdrop-blur-sm"
		>
			{{ t('minecraftAccounts.map.locationUnavailable') }}
		</div>

		<div
			v-else-if="!providerConfigured"
			class="absolute inset-0 flex items-center justify-center bg-slate-950/60 px-6 text-center text-sm text-white backdrop-blur-sm"
		>
			{{ t('minecraftAccounts.map.providerUnavailable') }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import { createDynmapProvider, hydcraftDynmapDefaults } from '~/utils/map'
import type { MinecraftMapController, MinecraftMapProvider } from '~/utils/map'
import {
	AGGREGATE_SERVER_VIEW_ID,
	resolveServerViewSummary,
	type MinecraftAccountServerView,
	type MinecraftAccountSummary,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'

interface MinecraftPresenceMapProps {
	account: MinecraftAccountSummary
	selectedViewId?: string | null
}

const props = defineProps<MinecraftPresenceMapProps>()

const { t } = useI18n()
const mapContainerRef = ref<HTMLElement | null>(null)
const controllerRef = ref<MinecraftMapController | null>(null)
const providerRef = ref<MinecraftMapProvider | null>(null)
const leafletRef = ref<Awaited<typeof import('leaflet')> | null>(null)
const markerRef = ref<LeafletMarker | null>(null)
let removeMouseLeaveListener: (() => void) | null = null

const selectedServerView = computed<MinecraftAccountServerView | null>(() => {
	const selected = resolveServerViewSummary(props.account, props.selectedViewId)

	if (selected?.id !== AGGREGATE_SERVER_VIEW_ID) {
		return selected
	}

	const mapViews = props.account.serverViews.filter(
		(view) =>
			view.id !== AGGREGATE_SERVER_VIEW_ID && view.hasMap && view.mapConfig,
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

const providerConfigured = computed(() =>
	Boolean(selectedServerView.value?.mapConfig?.tileBaseUrl),
)

const providerKey = computed(() => {
	const config = selectedServerView.value?.mapConfig
	if (!config) {
		return '__no_map__'
	}

	return [
		config.tileBaseUrl ?? '',
		config.worldName,
		config.mapName,
		config.tileExtension,
		config.defaultCenterX,
		config.defaultCenterZ,
		config.defaultZoom,
	].join('|')
})

const displayLocationKey = computed(() => {
	const location = displayLocation.value
	if (!location) {
		return ''
	}

	return `${location.dimension ?? ''}|${location.x ?? ''}|${location.z ?? ''}`
})

const buildProvider = (): MinecraftMapProvider => {
	const config = selectedServerView.value?.mapConfig
	return createDynmapProvider({
		...hydcraftDynmapDefaults,
		tileBaseUrl: config?.tileBaseUrl ?? null,
		worldName: config?.worldName ?? hydcraftDynmapDefaults.worldName,
		mapName: config?.mapName ?? hydcraftDynmapDefaults.mapName,
		tileExtension:
			config?.tileExtension === 'png'
				? 'png'
				: hydcraftDynmapDefaults.tileExtension,
		defaultCenter: {
			x: config?.defaultCenterX ?? hydcraftDynmapDefaults.defaultCenter.x,
			z: config?.defaultCenterZ ?? hydcraftDynmapDefaults.defaultCenter.z,
		},
		defaultZoom: config?.defaultZoom ?? hydcraftDynmapDefaults.defaultZoom,
	})
}

const updateMarker = () => {
	const controller = controllerRef.value
	const provider = providerRef.value
	const leaflet = leafletRef.value
	const map = (controller?.getLeafletInstance() as LeafletMap | null) ?? null
	const location = displayLocation.value

	if (
		!controller ||
		!provider ||
		!leaflet ||
		!map ||
		!location ||
		!hasMapLocation.value
	) {
		if (markerRef.value) {
			markerRef.value.remove()
		}
		markerRef.value = null
		return
	}

	const point = {
		x: location.x ?? 0,
		z: location.z ?? 0,
	}
	const latlng = controller.toLatLng(point)
	const latlngExpression: [number, number] = [latlng.lat, latlng.lng]
	const icon = leaflet.divIcon({
		className: 'minecraft-presence-marker',
		html: `
			<div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
				<div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(255, 255, 255, 0.32); box-shadow: 0 0 18px 4px rgba(255, 255, 255, 0.3);"></div>
				<div style="position: absolute; width: 10px; height: 10px; border-radius: 9999px; background: #0ea5e9; box-shadow: 0 0 0 4px #ffffff;"></div>
			</div>
		`,
		iconSize: [18, 18],
		iconAnchor: [9, 9],
	})

	if (markerRef.value) {
		markerRef.value.setLatLng(latlngExpression)
		markerRef.value.setIcon(icon)
	} else {
		markerRef.value = new leaflet.Marker(latlngExpression, { icon })
		markerRef.value.addTo(map)
	}

	controller.centerOnBlock(point, Math.max(provider.defaultView.zoom, 2))
}

const teardown = () => {
	markerRef.value?.remove()
	markerRef.value = null
	removeMouseLeaveListener?.()
	removeMouseLeaveListener = null
	controllerRef.value?.destroy()
	controllerRef.value = null
	providerRef.value = null
	leafletRef.value = null
}

const mountMap = async () => {
	await nextTick()
	const container = mapContainerRef.value
	if (!container) {
		return
	}

	teardown()

	const [leaflet, mapModule] = await Promise.all([
		import('leaflet'),
		import('~/utils/map'),
	])
	const provider = buildProvider()
	const controller = mapModule.createLeafletMapController(provider)

	leafletRef.value = leaflet
	providerRef.value = provider
	controllerRef.value = controller

	controller.on('ready', () => {
		;(controller.getLeafletInstance() as LeafletMap | null)?.invalidateSize()
		updateMarker()
	})

	const handleMouseLeave = () => undefined
	container.addEventListener('mouseleave', handleMouseLeave)
	removeMouseLeaveListener = () => {
		container.removeEventListener('mouseleave', handleMouseLeave)
	}

	controller.mount({
		container,
		center: hasMapLocation.value
			? {
					x: displayLocation.value?.x ?? provider.defaultView.center.x,
					z: displayLocation.value?.z ?? provider.defaultView.center.z,
				}
			: provider.defaultView.center,
		zoom: hasMapLocation.value ? 2 : provider.defaultView.zoom,
		showZoomControl: false,
	})

	requestAnimationFrame(() => {
		;(controller.getLeafletInstance() as LeafletMap | null)?.invalidateSize()
		updateMarker()
	})
}

onMounted(() => {
	void mountMap()
})

watch(providerKey, () => {
	void mountMap()
})

watch(displayLocationKey, () => {
	updateMarker()
})

onBeforeUnmount(() => {
	teardown()
})
</script>
