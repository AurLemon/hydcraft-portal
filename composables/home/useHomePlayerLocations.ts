import type { ComputedRef, ShallowRef } from 'vue'
import type {
	HomeImmersiveMapPosition,
	HomeImmersiveScene,
} from '~/utils/home/immersive-scenes'
import type {
	HomePlayerLocationItem,
	HomePlayerLocationsResponse,
} from '~/utils/home/player-locations'

interface UseHomePlayerLocationsResult {
	scenePlayerPositions: Readonly<
		ShallowRef<Record<string, HomeImmersiveMapPosition>>
	>
	overviewMemberPositions: Readonly<
		ShallowRef<Record<string, HomeImmersiveMapPosition>>
	>
	refresh: () => Promise<void>
}

const toPositionRecord = (
	items: readonly HomePlayerLocationItem[],
): Record<string, HomeImmersiveMapPosition> =>
	Object.fromEntries(
		items.flatMap((item) =>
			item.position ? [[item.playerId, item.position] as const] : [],
		),
	)

export const useHomePlayerLocations = (
	scene: ComputedRef<HomeImmersiveScene>,
): UseHomePlayerLocationsResult => {
	const scenePlayerPositions = shallowRef<
		Record<string, HomeImmersiveMapPosition>
	>({})
	const overviewMemberPositions = shallowRef<
		Record<string, HomeImmersiveMapPosition>
	>({})
	let loadGeneration = 0
	let overviewLoaded = false
	let refreshTimer: ReturnType<typeof setInterval> | null = null

	const refresh = async (): Promise<void> => {
		const sceneId = scene.value.id
		const includeOverview = !overviewLoaded
		const generation = ++loadGeneration

		try {
			const response = await $fetch<HomePlayerLocationsResponse>(
				'/api/public/home-player-locations',
				{ query: { sceneId, includeOverview } },
			)
			if (generation !== loadGeneration || scene.value.id !== sceneId) return

			scenePlayerPositions.value = toPositionRecord(response.scene)
			if (response.overview) {
				overviewMemberPositions.value = toPositionRecord(response.overview)
				overviewLoaded = true
			}
		} catch {
			// Periodic location refreshes keep the last valid projection on failure.
		}
	}

	watch(
		() => scene.value.id,
		() => {
			loadGeneration++
			scenePlayerPositions.value = {}
			void refresh()
		},
	)

	onMounted(() => {
		void refresh()
		refreshTimer = setInterval(() => void refresh(), 20_000)
	})

	onBeforeUnmount(() => {
		loadGeneration++
		if (refreshTimer) clearInterval(refreshTimer)
		refreshTimer = null
	})

	return {
		scenePlayerPositions: readonly(scenePlayerPositions),
		overviewMemberPositions: readonly(overviewMemberPositions),
		refresh,
	}
}
