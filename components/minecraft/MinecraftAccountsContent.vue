<template>
	<div>
		<section
			v-if="selectedAccount"
			class="relative min-h-160 w-full overflow-hidden rounded-3xl shadow-sm bg-slate-900"
		>
			<div class="absolute inset-0">
				<MinecraftPresenceMap
					:account="selectedAccount"
					:selected-uuid="selectedUuid"
					@pointermove="handleMapPointerMove"
					@pointerleave="handleMapPointerLeave"
				/>
			</div>

			<div class="absolute left-3 top-3 z-999 flex flex-col items-end gap-2">
				<div class="flex items-center gap-2">
					<UBadge
						class="gap-1.5"
						:color="isOnline ? 'success' : 'neutral'"
						variant="solid"
					>
						<span
							class="block size-2 rounded-full"
							:class="isOnline ? 'bg-emerald-400' : 'bg-slate-400'"
						/>

						{{
							isOnline
								? t('minecraftAccounts.identity.online')
								: t('minecraftAccounts.identity.offline')
						}}
					</UBadge>
					<UBadge v-if="selectedAccount.isPrimary" color="primary">
						{{ t('minecraftAccounts.badges.primary') }}
					</UBadge>
				</div>
			</div>

			<div class="absolute right-3 top-3 z-999 flex flex-col items-end gap-2">
				<USelect
					v-if="uuidItems.length > 1"
					v-model="selectedUuidModel"
					:items="uuidItems"
					value-key="value"
					label-key="label"
					size="sm"
					class="w-56"
				/>
			</div>

			<div
				class="pointer-events-none absolute inset-x-0 top-3 z-999 flex justify-center px-18 sm:px-24"
			>
				<Transition name="hover-coords">
					<div
						v-if="hoverCoordsVisible && hoveredBlockPoint"
						class="pointer-events-none inline-flex max-w-full items-center gap-3 overflow-hidden rounded-full border border-white/15 bg-slate-950/72 px-3 py-2 text-white shadow-[0_1.5rem_3rem_rgba(0,0,0,0.35)] backdrop-blur-md"
						aria-live="polite"
					>
						<div class="flex items-center gap-1.5 whitespace-nowrap">
							<span
								class="text-[11px] font-medium tracking-[0.24em] text-white/55"
							>
								X
							</span>
							<span class="hover-coords-text" :aria-label="hoverXText">
								<span class="hover-coords-text__inner">
									<template
										v-for="(character, index) in hoverXCharacters"
										:key="`hover-x-${hoverXCharacters.length}-${index}`"
									>
										<span
											v-if="isDigitCharacter(character)"
											class="digit-flip"
											aria-hidden="true"
										>
											<span
												class="digit-flip__reel transition-transform duration-150 ease-out"
												:style="{
													transform: `translate3d(0, -${Number(character) * digitStepEm}em, 0)`,
												}"
											>
												<span
													v-for="digitCharacter in digitCharacters"
													:key="`hover-x-${index}-${digitCharacter}`"
													class="digit-flip__digit"
												>
													{{ digitCharacter }}
												</span>
											</span>
										</span>
										<span
											v-else
											class="hover-coords-text__char"
											aria-hidden="true"
										>
											{{ character }}
										</span>
									</template>
								</span>
							</span>
						</div>

						<div class="h-4 w-px bg-white/12" />

						<div class="flex items-center gap-1.5 whitespace-nowrap">
							<span
								class="text-[11px] font-medium tracking-[0.24em] text-white/55"
							>
								Z
							</span>
							<span class="hover-coords-text" :aria-label="hoverZText">
								<span class="hover-coords-text__inner">
									<template
										v-for="(character, index) in hoverZCharacters"
										:key="`hover-z-${hoverZCharacters.length}-${index}`"
									>
										<span
											v-if="isDigitCharacter(character)"
											class="digit-flip"
											aria-hidden="true"
										>
											<span
												class="digit-flip__reel transition-transform duration-150 ease-out"
												:style="{
													transform: `translate3d(0, -${Number(character) * digitStepEm}em, 0)`,
												}"
											>
												<span
													v-for="digitCharacter in digitCharacters"
													:key="`hover-z-${index}-${digitCharacter}`"
													class="digit-flip__digit"
												>
													{{ digitCharacter }}
												</span>
											</span>
										</span>
										<span
											v-else
											class="hover-coords-text__char"
											aria-hidden="true"
										>
											{{ character }}
										</span>
									</template>
								</span>
							</span>
						</div>
					</div>
				</Transition>
			</div>

			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 z-998 flex items-end p-4"
			>
				<div
					class="absolute inset-x-0 bottom-0 h-54 bg-linear-to-t from-slate-950/62 via-slate-950/24 to-transparent backdrop-blur-[32px] mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.96)_18%,rgba(0,0,0,0.78)_34%,rgba(0,0,0,0.38)_56%,transparent_100%)]"
				/>

				<div
					v-if="bodyRendererUrl"
					class="absolute bottom-0 left-4 w-26 shrink-0"
					aria-hidden="true"
				>
					<img
						ref="bodyImageElement"
						:src="bodyRendererUrl"
						:alt="displayName"
						class="block w-full translate-y-20 transition-opacity duration-500 ease-out drop-shadow-sm"
						:class="bodyImageLoaded ? 'opacity-100' : 'opacity-0'"
						@load="bodyImageLoaded = true"
						@error="bodyImageLoaded = true"
					/>
				</div>

				<div
					class="relative flex w-full items-end justify-between gap-3 text-white"
					style="text-shadow: rgba(0, 0, 0, 0.7) 0px 0px 5px"
				>
					<div class="min-w-0 pl-30">
						<div class="flex items-center gap-2 translate-y-1">
							<span class="text-[42px] leading-[normal] font-arkpixel truncate">
								{{ displayName }}
							</span>
						</div>
						<div>
							<span class="mr-1 text-xs text-white/80">
								{{ t('minecraftAccounts.overlay.lastLogin') }}
							</span>
							<span class="text-[17px] font-medium">{{ coordsText }}</span>
						</div>
					</div>

					<div
						class="shrink-0 space-y-0.5 text-right text-[11px] text-white/90"
					>
						<div class="flex gap-1 items-baseline justify-end">
							<span class="text-white/70">
								{{ t('minecraftAccounts.summary.lastSeen') }}
							</span>
							<span class="text-base font-medium">
								{{ formatDateTime(displayLastSeenAt) }}</span
							>
						</div>
						<div class="flex gap-1 items-baseline justify-end">
							<span class="text-white/70">
								{{ t('minecraftAccounts.summary.firstJoined') }}
							</span>
							<span class="text-base font-medium">
								{{ formatDateTime(displayFirstJoinedAt) }}</span
							>
						</div>
						<div class="flex gap-1 items-baseline justify-end">
							<span class="text-white/70">
								{{ t('minecraftAccounts.summary.statsCount') }}
							</span>
							<span class="text-base font-medium">
								{{ displayPlayerProfile.statsCount }}</span
							>
						</div>
						<div class="flex gap-1 items-baseline justify-end">
							<span class="text-white/70">
								{{ t('minecraftAccounts.summary.advancements') }}
							</span>
							<span class="text-base font-medium">
								{{
									t('minecraftAccounts.summary.advancementsValue', {
										completed: displayPlayerProfile.advancementsCompletedCount,
										total: displayPlayerProfile.advancementsTotalCount,
									})
								}}</span
							>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section v-else class="rounded-3xl bg-slate-50/80 p-8 dark:bg-slate-900/60">
			<div class="flex flex-col items-center gap-5 text-center">
				<div class="space-y-2">
					<UBadge color="neutral" variant="soft">
						{{ t('minecraftAccounts.empty.title') }}
					</UBadge>
					<h2
						class="mt-4 text-2xl font-semibold text-slate-950 dark:text-white"
					>
						{{ t('minecraftAccounts.bind.title') }}
					</h2>
					<p
						class="mx-auto max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300/80"
					>
						{{ t('minecraftAccounts.empty.description') }}
					</p>
				</div>
				<UButton
					type="button"
					size="xl"
					variant="link"
					icon="i-lucide-link"
					@click="emit('bind')"
				>
					{{ t('minecraftAccounts.empty.bindAction') }}
				</UButton>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import type { MinecraftMapPointerMoveEventPayload } from '~/utils/map'
import { getMinecraftBodyRendererUrl } from '~/utils/minecraft/body-renderer'
import {
	formatMinecraftDateTime,
	getDefaultObservedPlayerUuid,
	resolveObservedPlayerSummary,
	type MinecraftAccountForm,
	type MinecraftLocationSummary,
} from '~/utils/minecraft/accounts'

interface MinecraftAccountsContentProps {
	accounts: MinecraftAccountForm[]
	selectedAccount: MinecraftAccountForm | null
	savingId: string | null
}

const props = defineProps<MinecraftAccountsContentProps>()

const emit = defineEmits<{
	save: [account: MinecraftAccountForm]
	bind: []
}>()

const { locale, t } = useI18n()
const selectedUuid = ref<string | null>(null)
const bodyImageLoaded = ref(false)
const bodyImageElement = useTemplateRef<HTMLImageElement>('bodyImageElement')
const hoveredBlockPoint = ref<{ x: number; z: number } | null>(null)
const hoverCoordsVisible = ref(false)
let bodyImageAnimationFrameId: number | null = null
let hoverCoordsHideTimer: ReturnType<typeof setTimeout> | null = null
const HOVER_COORDS_HIDE_DELAY = 5000
const digitCharacters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const digitStepEm = 1.2

const formatDateTime = (value: string | null): string =>
	formatMinecraftDateTime(
		value,
		locale.value,
		t('minecraftAccounts.fields.notAvailable'),
	)

const selectedObservedPlayer = computed(() =>
	props.selectedAccount
		? resolveObservedPlayerSummary(props.selectedAccount, selectedUuid.value)
		: null,
)

const displayName = computed(
	() =>
		props.selectedAccount?.playerIdentity.playerId ??
		props.selectedAccount?.authmeRealname ??
		props.selectedAccount?.username ??
		'',
)

const bodyRendererUrl = computed(() =>
	displayName.value ? getMinecraftBodyRendererUrl(displayName.value) : '',
)

const queueBodyImageReveal = () => {
	if (import.meta.client && bodyImageAnimationFrameId != null) {
		cancelAnimationFrame(bodyImageAnimationFrameId)
	}

	if (!import.meta.client) {
		bodyImageLoaded.value = true
		return
	}

	bodyImageAnimationFrameId = window.requestAnimationFrame(() => {
		bodyImageLoaded.value = true
		bodyImageAnimationFrameId = null
	})
}

const syncBodyImageLoadedState = () => {
	const isReady = Boolean(
		bodyImageElement.value?.complete && bodyImageElement.value.naturalWidth > 0,
	)

	if (isReady) {
		queueBodyImageReveal()
	}
}

const clearHoverCoordsHideTimer = () => {
	if (hoverCoordsHideTimer) {
		clearTimeout(hoverCoordsHideTimer)
		hoverCoordsHideTimer = null
	}
}

const scheduleHoverCoordsHide = () => {
	clearHoverCoordsHideTimer()
	hoverCoordsHideTimer = setTimeout(() => {
		hoverCoordsVisible.value = false
	}, HOVER_COORDS_HIDE_DELAY)
}

const handleMapPointerMove = (payload: MinecraftMapPointerMoveEventPayload) => {
	hoveredBlockPoint.value = {
		x: Math.round(payload.blockPoint.x),
		z: Math.round(payload.blockPoint.z),
	}
	hoverCoordsVisible.value = true
	scheduleHoverCoordsHide()
}

const handleMapPointerLeave = () => {
	scheduleHoverCoordsHide()
}

const hoverXText = computed(() =>
	hoveredBlockPoint.value ? String(hoveredBlockPoint.value.x) : '--',
)
const hoverZText = computed(() =>
	hoveredBlockPoint.value ? String(hoveredBlockPoint.value.z) : '--',
)
const hoverXCharacters = computed(() => hoverXText.value.split(''))
const hoverZCharacters = computed(() => hoverZText.value.split(''))
const isDigitCharacter = (character: string) => /\d/.test(character)

const isOnline = computed(
	() =>
		selectedObservedPlayer.value?.online ??
		props.selectedAccount?.presence?.online ??
		false,
)

const displayLocation = computed<MinecraftLocationSummary | null>(
	() =>
		selectedObservedPlayer.value?.lastSavedLocation ??
		props.selectedAccount?.presence?.lastSavedLocation ??
		null,
)

const coordsText = computed(() => {
	const location = displayLocation.value
	if (
		!location ||
		location.x == null ||
		location.z == null ||
		!Number.isFinite(location.x) ||
		!Number.isFinite(location.z)
	) {
		return t('minecraftAccounts.fields.unknownCoords')
	}

	return `${Math.round(location.x)}, ${Math.round(location.z)}`
})

const displayFirstJoinedAt = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile.firstPlayedAt ??
		props.selectedAccount?.firstJoinedAt ??
		null,
)

const displayLastSeenAt = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile.lastPlayedAt ??
		selectedObservedPlayer.value?.lastSeenAt ??
		props.selectedAccount?.lastSeenAt ??
		null,
)

const displayPlayerProfile = computed(
	() =>
		selectedObservedPlayer.value?.playerProfile ??
		props.selectedAccount?.playerProfile ?? {
			firstPlayedAt: null,
			lastPlayedAt: null,
			hasStats: false,
			hasAdvancements: false,
			statsCount: 0,
			advancementsTotalCount: 0,
			advancementsCompletedCount: 0,
		},
)

const uuidItems = computed(() =>
	(props.selectedAccount?.playerIdentity.observedPlayers ?? []).map(
		(player) => ({
			label: `${player.uuid}${player.online ? ` · ${t('minecraftAccounts.identity.online')}` : ''}`,
			value: player.uuid,
		}),
	),
)

const selectedUuidModel = computed<string>({
	get: () => selectedUuid.value ?? '',
	set: (value) => {
		selectedUuid.value = value || null
	},
})

watch(
	() => props.selectedAccount?.id,
	() => {
		selectedUuid.value = props.selectedAccount
			? getDefaultObservedPlayerUuid(props.selectedAccount)
			: null
		hoveredBlockPoint.value = null
		hoverCoordsVisible.value = false
		clearHoverCoordsHideTimer()
	},
	{ immediate: true },
)

watch(
	bodyRendererUrl,
	async () => {
		if (import.meta.client && bodyImageAnimationFrameId != null) {
			cancelAnimationFrame(bodyImageAnimationFrameId)
			bodyImageAnimationFrameId = null
		}

		bodyImageLoaded.value = false
		await nextTick()
		syncBodyImageLoadedState()
	},
	{ immediate: true },
)

onMounted(() => {
	syncBodyImageLoadedState()
})

onBeforeUnmount(() => {
	if (import.meta.client && bodyImageAnimationFrameId != null) {
		cancelAnimationFrame(bodyImageAnimationFrameId)
	}

	clearHoverCoordsHideTimer()
})
</script>

<style scoped>
.hover-coords-enter-active,
.hover-coords-leave-active {
	transition:
		opacity 220ms ease-out,
		transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 220ms ease-out;
}

.hover-coords-enter-from,
.hover-coords-leave-to {
	opacity: 0;
	filter: blur(1px);
	transform: translateY(8px) scale(0.96);
}

.hover-coords-enter-to,
.hover-coords-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0) scale(1);
}

.digit-flip {
	display: inline-block;
	width: 0.62em;
	height: 1.2em;
	overflow: hidden;
	overflow: clip;
	clip-path: inset(0);
	contain: paint;
	line-height: 1.2em;
	text-align: center;
	font-variant-numeric: tabular-nums;
	vertical-align: -0.16em;
}

.digit-flip__reel {
	display: flex;
	flex-direction: column;
	line-height: 1.2em;
	will-change: transform;
}

.digit-flip__digit {
	display: block;
	width: 100%;
	height: 1.2em;
	line-height: 1.2em;
	text-align: center;
}

.hover-coords-text {
	display: inline-block;
	min-width: 2ch;
	max-width: 8ch;
	line-height: 1;
	font-size: 1rem;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum';
	overflow: hidden;
}

.hover-coords-text__inner {
	display: inline-block;
	width: max-content;
	height: 1.2em;
	line-height: 1.2em;
	transform: translateY(-0.12em);
	white-space: nowrap;
}

.hover-coords-text__char {
	display: inline-block;
	height: 1.2em;
	line-height: 1.2em;
	vertical-align: -0.16em;
}
</style>
