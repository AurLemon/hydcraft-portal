<template>
	<NuxtLink :to="playerPath" class="group block h-full">
		<article
			class="relative h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
		>
			<div class="absolute inset-0 opacity-95" :style="cardBackgroundStyle" />
			<div
				class="pointer-events-none absolute inset-0 bg-slate-200/0 transition-colors duration-150 group-hover:bg-slate-200/82 dark:bg-slate-900/0 dark:group-hover:bg-slate-900/55"
			/>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.1)_52%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_52%,rgba(2,6,23,0)_100%)]"
			/>

			<div class="relative z-10 flex min-h-56 flex-col">
				<div class="mx-auto w-28 sm:w-32">
					<SkeletonImage
						:src="player.skinBodyUrl"
						:alt="player.username"
						class="w-full"
						image-class="block aspect-[2/3] w-full object-contain drop-shadow-[0_18px_36px_rgba(15,23,42,0.32)] select-none"
						skeleton-class="rounded-lg"
					/>
				</div>

				<div class="mt-3">
					<div
						class="truncate text-xl font-medium text-slate-900 dark:text-white"
					>
						{{ player.username }}
					</div>

					<div
						class="mt-1 grid gap-2 text-sm text-slate-700 dark:text-slate-200"
					>
						<div v-if="playTimeLabel">
							<div class="text-xs text-slate-500 dark:text-slate-400">
								{{ t('content.serverOverview.cards.players.fields.playTime') }}
							</div>
							<div
								class="text-base font-medium text-slate-800 dark:text-slate-100"
							>
								{{ playTimeLabel }}
							</div>
						</div>

						<div v-if="lastLoginLabel">
							<div class="text-xs text-slate-500 dark:text-slate-400">
								{{ t('content.serverOverview.cards.players.fields.lastLogin') }}
							</div>
							<div
								class="text-base font-medium text-slate-800 dark:text-slate-100"
							>
								{{ lastLoginLabel }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</article>
	</NuxtLink>
</template>

<script setup lang="ts">
import {
	DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT,
	type ServerOverviewRecommendedPlayer,
	type ServerOverviewRgbColor,
} from '~/utils/server/overview'
import { loadSkinAccentColor } from '~/utils/minecraft/skin-accent'

interface Props {
	player: ServerOverviewRecommendedPlayer
}

const props = defineProps<Props>()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()
const accentColor = ref<ServerOverviewRgbColor>({
	...props.player.accentColor,
})
const hasMounted = ref(false)
let accentLoadToken = 0

const TICKS_PER_SECOND = 20

const playerPath = computed(() => localePath(`/players/${props.player.mcid}`))

const playTimeLabel = computed(() => {
	if (!props.player.hasStats) {
		return null
	}

	const hours = props.player.playTimeTicks / TICKS_PER_SECOND / 3600

	return `${Math.round(hours * 10) / 10}h`
})

const lastLoginLabel = computed(() => {
	if (!props.player.authMeLastLoginAt) {
		return null
	}

	return new Date(props.player.authMeLastLoginAt).toLocaleString(locale.value)
})

const accentRgbText = computed(
	() =>
		`${accentColor.value.r}, ${accentColor.value.g}, ${accentColor.value.b}`,
)

const cardBackgroundStyle = computed(() => {
	if (!hasMounted.value) {
		return undefined
	}

	return {
		background:
			colorMode.value === 'dark'
				? `radial-gradient(circle at top center, rgba(${accentRgbText.value}, 0.24) 0%, rgba(${accentRgbText.value}, 0.12) 20%, rgba(2,6,23,0) 62%), linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(2,6,23,0.98) 42%, rgba(${accentRgbText.value}, 0.14) 100%)`
				: `radial-gradient(circle at top center, rgba(${accentRgbText.value}, 0.26) 0%, rgba(${accentRgbText.value}, 0.12) 22%, rgba(255,255,255,0) 62%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,250,252,0.98) 42%, rgba(${accentRgbText.value}, 0.1) 100%)`,
	}
})

const syncAccentColor = async () => {
	const currentToken = ++accentLoadToken
	const nextColor = await loadSkinAccentColor(props.player.skinImageUrl)

	if (currentToken !== accentLoadToken) {
		return
	}

	accentColor.value = nextColor
}

watch(
	() => props.player.accentColor,
	(value) => {
		accentColor.value = value ?? { ...DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT }
	},
	{ immediate: true, deep: true },
)

watch(
	() => props.player.skinImageUrl,
	() => {
		void syncAccentColor()
	},
	{ immediate: true },
)

onMounted(() => {
	hasMounted.value = true
})

onBeforeUnmount(() => {
	accentLoadToken += 1
})
</script>
