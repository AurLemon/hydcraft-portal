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
import type {
	MinecraftMapController,
	MinecraftMapPointerMoveEventPayload,
	MinecraftMapProvider,
} from '~/utils/map'
import {
	resolveObservedPlayerSummary,
	type MinecraftAccountSummary,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'

interface MinecraftPresenceMapProps {
	account: MinecraftAccountSummary
	selectedUuid?: string | null
}

const props = defineProps<MinecraftPresenceMapProps>()
const emit = defineEmits<{
	pointermove: [payload: MinecraftMapPointerMoveEventPayload]
	pointerleave: []
}>()

const { t } = useI18n()
const mapContainerRef = ref<HTMLElement | null>(null)
const controllerRef = ref<MinecraftMapController | null>(null)
const providerRef = ref<MinecraftMapProvider | null>(null)
const leafletRef = ref<Awaited<typeof import('leaflet')> | null>(null)
const markerRef = ref<LeafletMarker | null>(null)
const providerReady = ref(false)
let unbindPointerMove: (() => void) | null = null
let removeMouseLeaveListener: (() => void) | null = null

const selectedObservedPlayer = computed(() =>
	resolveObservedPlayerSummary(props.account, props.selectedUuid),
)
const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedObservedPlayer.value?.lastSavedLocation ??
		props.account.presence?.lastSavedLocation ??
		null,
)
const hasMapLocation = computed(
	() =>
		Number.isFinite(displayLocation.value?.x) &&
		Number.isFinite(displayLocation.value?.z),
)
const providerConfigured = computed(
	() => providerRef.value?.isConfigured ?? false,
)

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
				<div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(14, 165, 233, 0.22); box-shadow: 0 0 18px 4px rgba(125, 211, 252, 0.45);"></div>
				<div style="position: absolute; width: 10px; height: 10px; border-radius: 9999px; background: #ffffff; box-shadow: 0 0 0 4px #0ea5e9;"></div>
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

const recenterToDefault = () => {
	const controller = controllerRef.value
	const provider = providerRef.value
	if (!controller || !provider) {
		return
	}

	if (markerRef.value) {
		markerRef.value.remove()
		markerRef.value = null
	}
	controller.centerOnBlock(
		provider.defaultView.center,
		provider.defaultView.zoom,
	)
}

const teardown = () => {
	providerReady.value = false
	markerRef.value = null
	unbindPointerMove?.()
	unbindPointerMove = null
	removeMouseLeaveListener?.()
	removeMouseLeaveListener = null
	controllerRef.value?.destroy()
	controllerRef.value = null
	providerRef.value = null
	leafletRef.value = null
}

onMounted(() => {
	void (async () => {
		await nextTick()
		const container = mapContainerRef.value
		if (!container) {
			return
		}

		const [leaflet, mapModule] = await Promise.all([
			import('leaflet'),
			import('~/utils/map'),
		])
		const provider = mapModule.createPortalDynmapProvider()
		const controller = mapModule.createLeafletMapController(provider)

		leafletRef.value = leaflet
		providerRef.value = provider
		controllerRef.value = controller

		controller.on('ready', () => {
			providerReady.value = true
			;(controller.getLeafletInstance() as LeafletMap | null)?.invalidateSize()
			updateMarker()
		})

		unbindPointerMove = controller.on('pointermove', (payload) => {
			emit('pointermove', payload)
		})

		const handleMouseLeave = () => {
			emit('pointerleave')
		}
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
	})()
})

watch(
	() => props.account.id,
	() => {
		const map =
			(controllerRef.value?.getLeafletInstance() as LeafletMap | null) ?? null
		if (map) {
			map.invalidateSize()
		}
		if (hasMapLocation.value) {
			updateMarker()
		} else {
			recenterToDefault()
		}
	},
)

watch(displayLocation, () => {
	updateMarker()
})

onBeforeUnmount(() => {
	teardown()
})
</script>
