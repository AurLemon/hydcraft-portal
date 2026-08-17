<template>
	<div class="pointer-events-none absolute inset-0 z-30 text-white">
		<div class="immersive-site-shell absolute inset-0">
			<div class="relative h-full">
				<Transition name="overview-label">
					<div
						v-if="phase === 'scene' || phase === 'players'"
						:key="`scene-${sceneShortName}`"
						class="absolute top-28 left-0 max-w-[min(42rem,calc(100vw-3rem))] font-serif font-bold [text-shadow:0_2px_14px_rgba(2,6,23,0.88)] lg:top-36"
					>
						<p class="mt-4 text-4xl uppercase leading-tight sm:text-7xl">
							{{ sceneShortName }}
						</p>
						<p class="mt-1 text-lg uppercase sm:text-7xl">
							{{ t('home.immersive.overview.responsibleBy') }}
						</p>
					</div>
					<div
						v-else-if="phase === 'community'"
						key="community"
						class="absolute top-28 left-0 max-w-[min(48rem,calc(100vw-3rem))] font-serif font-bold [text-shadow:0_2px_14px_rgba(2,6,23,0.88)] lg:top-36"
					>
						<p class="mt-4 text-4xl uppercase leading-tight sm:text-7xl">
							{{
								t('home.immersive.overview.beyondScene', {
									name: sceneShortName,
								})
							}}
						</p>
						<p class="mt-1 text-lg uppercase sm:text-7xl">
							{{ t('home.immersive.overview.communityHasThem') }}
						</p>
					</div>
				</Transition>

				<Transition name="overview-panel">
					<div
						v-if="phase === 'community'"
						class="absolute bottom-8 left-0 font-medium [text-shadow:0_2px_14px_rgba(2,6,23,0.88)] lg:bottom-12"
					>
						<p class="text-sm font-medium text-white/70 sm:text-base">
							{{ t('home.immersive.overview.establishedFor') }}
							<HomeStatFlipNumber
								:value="foundedDays"
								class="mx-1 text-3xl font-medium text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.88)] sm:text-4xl"
							/>
							{{ t('home.immersive.overview.days') }}
						</p>
						<p class="mt-1 text-sm font-medium text-white/70 sm:text-base">
							{{ t('home.immersive.overview.memberCountPrefix') }}
							<HomeStatFlipNumber
								:value="memberCount"
								class="mx-1 text-3xl font-medium text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.88)] sm:text-4xl"
							/>
							{{ t('home.immersive.overview.people') }}
						</p>
					</div>
				</Transition>
			</div>
		</div>

		<Transition name="overview-panel">
			<section
				v-if="
					(phase === 'scene' || phase === 'players') &&
					players.length &&
					!detail
				"
				class="absolute inset-x-0 bottom-8 flex h-68 items-end justify-center sm:bottom-10 lg:bottom-12"
				:aria-label="t('home.immersive.overview.scenePlayers')"
			>
				<article
				v-for="(player, index) in players"
				:key="player.id"
				class="pointer-events-auto absolute bottom-0 flex h-60 w-[min(34rem,calc(100vw-3rem))] overflow-hidden rounded-lg border border-white/18 bg-slate-950 transition-[opacity,transform,filter] duration-300 ease-out will-change-[opacity,transform,filter]"
				:style="playerCardStyle(index)"
				>
					<div
						class="relative hidden w-36 shrink-0 overflow-hidden bg-slate-900/60 sm:block"
					>
						<SkeletonImage
							:src="player.avatarUrl"
							:alt="player.id"
							class="h-full w-full"
							image-class="h-full w-full scale-110 object-cover [image-rendering:pixelated]"
							skeleton-class="rounded-none"
						/>
						<div
							class="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-slate-950/72"
						/>
					</div>
					<div class="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
						<div class="flex min-w-0 items-center gap-3 sm:hidden">
							<SkeletonImage
								:src="player.avatarUrl"
								:alt="player.id"
								class="size-12 shrink-0"
								image-class="size-12 rounded-md object-cover [image-rendering:pixelated]"
							/>
							<div class="min-w-0">
								<p class="truncate font-arkpixel text-xl leading-none">
									{{ player.nickname }}
								</p>
								<p class="truncate text-xs text-white/60">{{ player.id }}</p>
							</div>
						</div>
						<div class="hidden min-w-0 sm:block">
							<p class="truncate font-arkpixel text-2xl leading-none">
								{{ player.nickname }}
							</p>
							<p class="mt-1 truncate text-sm text-white/60">{{ player.id }}</p>
						</div>
						<p class="mt-4 line-clamp-4 text-sm leading-6 text-white/78">
							{{ player.description }}
						</p>
						<UButton
							v-if="index === activePlayerIndex"
							type="button"
							color="neutral"
							variant="link"
							size="sm"
							trailing-icon="i-lucide-arrow-right"
							class="mt-auto w-fit px-0 text-white/78 hover:text-white"
							@click="openPlayerDetail(player)"
						>
							{{ t('home.immersive.overview.viewFullIntroduction') }}
						</UButton>
					</div>
				</article>
			</section>
		</Transition>

		<Transition name="community-rail">
			<aside
				v-if="phase === 'community' && communityMembers.length && !detail"
				class="community-member-rail pointer-events-auto absolute right-0 bottom-36 z-20 w-full sm:bottom-24 lg:top-24 lg:bottom-20 lg:w-[min(28rem,32vw)]"
				:aria-label="t('home.immersive.overview.communityMembers')"
			>
				<div class="grid gap-2 lg:hidden">
					<UMarquee
						v-for="(row, rowIndex) in communityMemberRows"
						:key="`mobile-community-row-${rowIndex}`"
						orientation="horizontal"
						:reverse="rowIndex === 1"
						pause-on-hover
						:repeat="2"
						:overlay="false"
						:ui="{
							root: 'h-14 min-w-0 [--gap:--spacing(2)] [--duration:120s]',
							content: '!w-auto !min-w-0',
						}"
					>
						<button
							v-for="(member, index) in row"
							:key="`${member.id}-${index}`"
							type="button"
							class="community-member-card group flex h-14 w-64 shrink-0 items-center gap-3 rounded-lg border border-white/14 bg-slate-950/76 px-3 py-2 text-left text-white backdrop-blur-xl transition-colors hover:bg-slate-900/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
							:style="{ animationDelay: `${index * 55}ms` }"
							@click="openCommunityDetail(member)"
						>
							<SkeletonImage
								:src="member.avatarUrl"
								:alt="member.nickname"
								class="size-9 shrink-0 rounded-md border-2"
								:class="
									member.isAdministrator
										? 'border-amber-300 bg-amber-300/16'
										: 'border-transparent'
								"
								image-class="size-full rounded-md object-cover [image-rendering:pixelated]"
							/>
							<span class="min-w-0">
								<span
									class="block truncate font-arkpixel text-base leading-tight"
								>
									{{ member.nickname }}
								</span>
								<span
									class="mt-0.5 block truncate text-xs leading-4 text-white/62"
								>
									{{ member.description }}
								</span>
							</span>
						</button>
					</UMarquee>
				</div>

				<UMarquee
					class="hidden h-full lg:block"
					orientation="vertical"
					reverse
					pause-on-hover
					:repeat="2"
					:overlay="false"
					:ui="{
						root: 'h-full min-w-0 !gap-0 [--gap:0px] [--duration:150s]',
						content: '!h-fit !w-full !min-w-0 !justify-start !gap-3 !pb-3',
					}"
				>
					<button
						v-for="(member, index) in communityMembers"
						:key="`${member.id}-${index}`"
						type="button"
						class="community-member-card group ml-3 box-border flex min-w-0 max-w-[calc(100%_-_0.75rem)] w-[calc(100%_-_0.75rem)] items-center gap-3 rounded-lg border border-white/14 bg-slate-950/76 px-4 py-3 text-left text-white backdrop-blur-xl transition-colors hover:bg-slate-900/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 lg:rounded-r-none lg:border-r-0 lg:pl-5"
						:style="{ animationDelay: `${index * 55}ms` }"
						@click="openCommunityDetail(member)"
					>
						<SkeletonImage
							:src="member.avatarUrl"
							:alt="member.nickname"
							class="size-10 shrink-0 rounded-md border-2 sm:size-11"
							:class="
								member.isAdministrator
									? 'border-amber-300 bg-amber-300/16'
									: 'border-transparent'
							"
							image-class="size-full rounded-md object-cover [image-rendering:pixelated]"
						/>
						<span class="min-w-0">
							<span class="block truncate font-arkpixel text-lg leading-tight">
								{{ member.nickname }}
							</span>
							<span
								class="mt-1 block line-clamp-2 text-xs leading-5 text-white/62"
							>
								{{ member.description }}
							</span>
						</span>
					</button>
				</UMarquee>
			</aside>
		</Transition>

		<Transition name="detail-panel">
			<aside
				v-if="detail"
				class="pointer-events-auto absolute right-0 bottom-0 z-50 flex h-[min(34rem,64dvh)] max-h-[64dvh] w-full flex-col border-t border-white/16 bg-slate-950/94 p-5 backdrop-blur-2xl sm:p-8 lg:top-0 lg:h-auto lg:max-h-none lg:w-[min(30rem,78vw)] lg:border-t-0 lg:border-l lg:p-10 lg:pt-36"
			>
				<UButton
					type="button"
					color="neutral"
					variant="ghost"
					icon="i-lucide-arrow-left"
					class="w-fit text-white hover:bg-white/12 hover:text-white"
					@click="closeDetail"
				>
					{{ t('home.immersive.overview.back') }}
				</UButton>
				<div class="mt-8 flex min-h-0 flex-1 flex-col">
					<div class="flex items-center gap-4">
						<SkeletonImage
							:src="detail.avatarUrl"
							:alt="detail.id"
							class="size-20 shrink-0"
							image-class="size-20 rounded-lg object-cover [image-rendering:pixelated]"
						/>
						<div class="min-w-0">
							<h2 class="truncate font-arkpixel text-3xl leading-none">
								{{ detail.nickname }}
							</h2>
							<p class="mt-1 truncate text-sm text-white/60">{{ detail.id }}</p>
						</div>
					</div>
					<div class="mt-8 min-h-0 overflow-y-auto pr-2">
						<p class="whitespace-pre-line text-base leading-8 text-white/80">
							{{ detail.description }}
						</p>
					</div>
				</div>
			</aside>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import type { HomeImmersiveMapPosition } from '~/utils/home/immersive-scenes'

export type HomeOverviewPhase =
	| 'hidden'
	| 'scene'
	| 'players'
	| 'community'
	| 'outro'

export interface HomeOverviewPerson {
	id: string
	nickname: string
	description: string
	avatarUrl: string
	isAdministrator: boolean
	position?: HomeImmersiveMapPosition
}

interface HomeOverviewStoryProps {
	phase: HomeOverviewPhase
	sceneShortName: string
	players: readonly HomeOverviewPerson[]
	activePlayerIndex: number
	playerProgress: number
	playerStackEntryProgress: number
	playerStackExitProgress: number
	communityMembers: readonly HomeOverviewPerson[]
	foundedDays: number
	memberCount: number
	detailPersonId: string | null
}

const props = defineProps<HomeOverviewStoryProps>()
const emit = defineEmits<{
	'update:detailPersonId': [personId: string | null]
}>()
const { t } = useI18n()
const detail = computed(() => {
	if (!props.detailPersonId) return null
	const people =
		props.phase === 'community' ? props.communityMembers : props.players

	return people.find((person) => person.id === props.detailPersonId) ?? null
})
const communityMemberRows = computed(() => [
	props.communityMembers.filter((_, index) => index % 2 === 0),
	props.communityMembers.filter((_, index) => index % 2 === 1),
])

const playerCardStyle = (index: number) => {
	const offset = index - props.playerProgress
	const distance = Math.abs(offset)
	const translate = Math.max(-78, Math.min(78, offset * 52))
	const scale = Math.max(0.76, 1 - Math.min(distance, 1) * 0.1)
	const adjacentVisibility = Math.max(0, Math.min(1, (1.15 - distance) / 0.2))
	const entryVisibility =
		index === 0
			? Math.min(1, props.playerStackEntryProgress * 1.5)
			: Math.max(0, Math.min(1, (props.playerStackEntryProgress - 0.35) / 0.65))
	const exitVisibility =
		index === props.players.length - 1
			? Math.max(0, Math.min(1, (1 - props.playerStackExitProgress) / 0.55))
			: Math.max(0, 1 - props.playerStackExitProgress * 1.8)
	const opacity =
		(1 - Math.min(distance, 1) * 0.18) *
		adjacentVisibility *
		entryVisibility *
		exitVisibility
	const centeredIndex = Math.round(props.playerProgress)

	return {
		filter: `blur(${Math.min(distance * 0.75, 1.2)}px)`,
		opacity,
		transform: `translateX(${translate}%) scale(${scale})`,
		zIndex: index === centeredIndex ? 30 : offset > 0 ? 20 : 10,
	}
}

const openPlayerDetail = (player: HomeOverviewPerson): void => {
	emit('update:detailPersonId', player.id)
}

const openCommunityDetail = (member: HomeOverviewPerson): void => {
	emit('update:detailPersonId', member.id)
}

const closeDetail = (): void => {
	emit('update:detailPersonId', null)
}

watch(
	() => props.phase,
	() => {
		if (props.detailPersonId) closeDetail()
	},
)
</script>

<style scoped>
.overview-label-enter-active,
.overview-label-leave-active,
.overview-panel-enter-active,
.overview-panel-leave-active,
.detail-panel-enter-active,
.detail-panel-leave-active,
.community-rail-enter-active,
.community-rail-leave-active {
	transition:
		opacity 220ms ease,
		transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
		filter 360ms ease;
}

.overview-label-enter-from,
.overview-label-leave-to {
	opacity: 0;
	filter: blur(8px);
	transform: translateY(-1rem);
}

.overview-panel-enter-from,
.overview-panel-leave-to {
	opacity: 0;
	filter: blur(10px);
	transform: translateY(1.5rem);
}

.detail-panel-enter-from,
.detail-panel-leave-to {
	opacity: 0;
	filter: blur(6px);
	transform: translateX(3rem);
}

.community-rail-enter-from,
.community-rail-leave-to {
	filter: blur(10px);
	opacity: 0;
	transform: translateX(3rem);
}

.community-member-rail {
	-webkit-mask-image: linear-gradient(
		to bottom,
		transparent 0%,
		black 14%,
		black 86%,
		transparent 100%
	);
	mask-image: linear-gradient(
		to bottom,
		transparent 0%,
		black 14%,
		black 86%,
		transparent 100%
	);
}

@media (max-width: 1023px) {
	.detail-panel-enter-from,
	.detail-panel-leave-to {
		transform: translateY(100%);
	}

	.community-member-rail {
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 8%,
			black 92%,
			transparent 100%
		);
		mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 8%,
			black 92%,
			transparent 100%
		);
	}
}

.community-member-card {
	animation: community-member-card-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes community-member-card-in {
	from {
		filter: blur(10px);
		opacity: 0;
		transform: translateX(2rem);
	}

	to {
		filter: blur(0);
		opacity: 1;
		transform: translateX(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.overview-label-enter-active,
	.overview-label-leave-active,
	.overview-panel-enter-active,
	.overview-panel-leave-active,
	.detail-panel-enter-active,
	.detail-panel-leave-active,
	.community-rail-enter-active,
	.community-rail-leave-active,
	.community-member-card,
	article {
		transition: none;
	}

	.community-member-card {
		animation: none;
	}
}
</style>
