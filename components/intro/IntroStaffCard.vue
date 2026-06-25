<template>
	<section class="flex flex-col gap-4 lg:gap-6">
		<div
			class="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-6"
		>
			<div class="grid gap-4 lg:grid-rows-2">
				<article
					class="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:row-span-2"
				>
					<div class="pointer-events-none absolute inset-0">
						<div
							class="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(245,158,11,0.16)_0%,rgba(251,191,36,0.08)_38%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.20)_0%,rgba(251,191,36,0.08)_38%,rgba(2,6,23,0)_100%)]"
						/>
						<div
							class="absolute inset-y-0 left-0 w-6 bg-[linear-gradient(90deg,rgba(251,191,36,0.14)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(90deg,rgba(251,191,36,0.12)_0%,rgba(2,6,23,0)_100%)]"
						/>
						<div
							class="absolute inset-y-0 right-0 w-6 bg-[linear-gradient(270deg,rgba(245,158,11,0.14)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(270deg,rgba(245,158,11,0.10)_0%,rgba(2,6,23,0)_100%)]"
						/>
						<div
							class="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(0deg,rgba(251,191,36,0.08)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(0deg,rgba(251,191,36,0.06)_0%,rgba(2,6,23,0)_100%)]"
						/>
						<div
							class="absolute -left-6 top-6 size-20 rounded-full bg-amber-300/14 blur-2xl dark:bg-amber-300/8"
						/>
						<div
							class="absolute right-0 top-0 size-20 rounded-full bg-yellow-200/12 blur-2xl dark:bg-yellow-200/8"
						/>
						<div
							class="absolute bottom-0 right-8 size-16 rounded-full bg-orange-300/10 blur-2xl dark:bg-orange-300/6"
						/>
					</div>
					<div
						class="relative z-10 flex h-full flex-col justify-center gap-4 px-4 py-4 backdrop-blur-xl sm:px-5 sm:py-5"
					>
						<SkeletonImage
							:src="ownerHeadUrl"
							:alt="ownerId"
							class="size-24 shrink-0 sm:size-28"
							image-class="size-24 rounded-xl object-cover drop-shadow sm:size-28"
						/>
						<div class="min-w-0">
							<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
								<div
									class="font-arkpixel text-3xl leading-none tracking-wide text-slate-900 dark:text-slate-50"
								>
									{{ t('content.intro.staff.owner.aliasLine') }}
								</div>
								<div class="text-lg text-slate-500 dark:text-slate-400">
									{{ ownerId }}
								</div>
							</div>
							<div class="text-sm leading-7 text-slate-700 dark:text-slate-200">
								{{ t('content.intro.staff.owner.roleLine') }}
							</div>
							<div
								class="mt-2 break-all text-base leading-7 text-slate-600 dark:text-slate-300"
							>
								{{ t('content.intro.staff.owner.bioLine') }}
							</div>
						</div>
					</div>
				</article>
			</div>
			<div class="flex flex-col gap-4 lg:min-h-full">
				<article
					class="h-fit rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-5 lg:h-auto lg:flex-1"
				>
					<div class="flex items-baseline gap-2">
						<h3
							class="font-arkpixel text-lg leading-none tracking-wide text-slate-900 dark:text-slate-50"
						>
							{{ t('content.intro.staff.committee.title') }}
						</h3>
						<span class="text-xs text-slate-500 dark:text-slate-400">
							{{ t('content.intro.staff.committee.subtitle') }}
						</span>
					</div>
					<div class="mt-4 grid grid-cols-6 gap-2">
						<UPopover
							v-for="member in committeeMembers"
							:key="member.id"
							:popper="{ placement: 'top' }"
						>
							<button
								type="button"
								class="flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-2 text-center transition hover:bg-slate-100/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-slate-900"
							>
								<SkeletonImage
									:src="member.headUrl"
									:alt="member.id"
									class="size-10 sm:size-12"
									image-class="size-10 rounded-lg object-cover drop-shadow sm:size-12"
								/>
								<p
									class="w-full truncate text-xs font-medium text-slate-700 dark:text-slate-200"
								>
									{{ member.id }}
								</p>
								<div class="flex flex-wrap justify-center gap-1">
									<UBadge
										v-for="badge in member.badges"
										:key="`${member.id}-${badge}`"
										color="neutral"
										variant="soft"
										size="xs"
									>
										{{ t(`content.intro.staff.badges.${badge}`) }}
									</UBadge>
								</div>
							</button>

							<template #content>
								<div class="w-52 space-y-3 p-3">
									<SkeletonImage
										:src="member.headUrl"
										:alt="member.id"
										class="mx-auto size-20"
										image-class="mx-auto size-20 rounded-xl object-cover drop-shadow"
									/>
									<div class="space-y-1 text-center">
										<p
											class="text-base font-medium text-slate-900 dark:text-slate-50"
										>
											{{ member.id }}
										</p>
										<p class="text-sm text-slate-500 dark:text-slate-400">
											{{ member.nickname }}
										</p>
									</div>
								</div>
							</template>
						</UPopover>
					</div>
				</article>

				<article
					class="h-fit rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-5 lg:h-auto lg:flex-1"
				>
					<div class="flex items-baseline justify-between gap-3">
						<div class="min-w-0">
							<div class="flex items-baseline gap-2">
								<h3
									class="font-arkpixel text-lg leading-none tracking-wide text-slate-900 dark:text-slate-50"
								>
									{{ t('content.intro.staff.councilOfElders.title') }}
								</h3>
								<span class="text-xs text-slate-500 dark:text-slate-400">
									{{ t('content.intro.staff.councilOfElders.subtitle') }}
								</span>
							</div>
						</div>
						<UBadge color="neutral" variant="soft" size="sm">
							{{ t('content.intro.staff.councilOfElders.count') }}
						</UBadge>
					</div>
					<div
						ref="councilOfEldersGridRef"
						class="mt-4 flex flex-wrap justify-center gap-2.5"
					>
						<UPopover
							v-for="member in displayedCouncilOfEldersMembers"
							:key="member.id"
							:popper="{ placement: 'top' }"
						>
							<UTooltip :text="member.id">
								<button
									type="button"
									class="rounded-lg transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								>
									<SkeletonImage
										:src="member.headUrl"
										:alt="member.id"
										class="size-12"
										image-class="size-12 rounded-lg object-cover drop-shadow"
									/>
								</button>
							</UTooltip>

							<template #content>
								<div class="w-52 space-y-3 p-3">
									<SkeletonImage
										:src="member.headUrl"
										:alt="member.id"
										class="mx-auto size-20"
										image-class="mx-auto size-20 rounded-xl object-cover drop-shadow"
									/>
									<div class="space-y-1 text-center">
										<p
											class="text-base font-medium text-slate-900 dark:text-slate-50"
										>
											{{ member.id }}
										</p>
										<p class="text-sm text-slate-500 dark:text-slate-400">
											{{ member.nickname }}
										</p>
									</div>
								</div>
							</template>
						</UPopover>
					</div>
				</article>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

type StaffBadgeKey =
	| 'member'
	| 'advisor'
	| 'viceOwner'
	| 'councilOfEldersSecretary'

interface CommitteeMemberDefinition {
	id: string
	nickname: string
	badges: StaffBadgeKey[]
}

interface CommitteeMember extends CommitteeMemberDefinition {
	headUrl: string
}

interface CouncilOfEldersMemberDefinition {
	id: string
	nickname: string
}

interface CouncilOfEldersMember extends CouncilOfEldersMemberDefinition {
	headUrl: string
}

const ownerId = 'Aurora_Lemon'
const DESKTOP_COUNCIL_OF_ELDERS_HIDDEN_COUNT = 4
const DESKTOP_LAYOUT_MIN_WIDTH = 1024

const committeeMemberDefinitions: CommitteeMemberDefinition[] = [
	{
		id: 'Xiao_awa_',
		nickname: '肖阿瓦',
		badges: ['member', 'councilOfEldersSecretary'],
	},
	{
		id: 'Complex_Colors',
		nickname: '杂色',
		badges: ['member'],
	},
	{
		id: 'CatPillager',
		nickname: '仓鼠',
		badges: ['member', 'viceOwner'],
	},
	{
		id: 'qixuanjun233',
		nickname: '七炫',
		badges: ['member', 'viceOwner'],
	},
	{
		id: 'larker_package',
		nickname: '拉克',
		badges: ['member', 'viceOwner'],
	},
	{
		id: 'FisheyeArtist59',
		nickname: '题散',
		badges: ['advisor'],
	},
]

const councilOfEldersMemberDefinitions: CouncilOfEldersMemberDefinition[] = [
	{ id: 'xwTeng', nickname: '小万' },
	{ id: 'Nina_Naganohara', nickname: 'afe' },
	{ id: 'xxlm233', nickname: '宵宵狸猫' },
	{ id: 'CN_DaJiChi', nickname: '鸡翅' },
	{ id: 'Chuxia_SF', nickname: '初夏' },
	{ id: 'Dotkk', nickname: 'Dotkk' },
	{ id: 'ColaFrog', nickname: '可蛙' },
	{ id: 'QiShui233', nickname: '汽水' },
	{ id: 'TochoShizuku', nickname: '远绪' },
	{ id: 'LanYue_CN', nickname: '蓝月' },
	{ id: 'Mobike', nickname: '摩拜' },
	{ id: 'HidakaHokuto', nickname: '裤头' },
	{ id: 'BackSpace', nickname: '退格' },
	{ id: 'MainCity_Subway', nickname: '主城' },
	{ id: 'UYxiaoli', nickname: '小李' },
	{ id: 'misaka_12448', nickname: 'misaka' },
	{ id: 'Yasten58', nickname: '企鹅' },
	{ id: 'Mo_Dren', nickname: '万禺' },
	{ id: 'LuRenDing', nickname: '路人丁' },
	{ id: 'Niuboss123', nickname: '牛老板' },
	{ id: 'J14157', nickname: 'J14157' },
	{ id: 'Aerocraft_Filoya', nickname: '飞行器' },
	{ id: 'Dongfeng_SD', nickname: '东风小姐姐' },
	{ id: 'KuangSY_5716', nickname: 'Kwong' },
	{ id: 'Umi_Sonodaaa', nickname: 'Umi' },
	{ id: 'Misaka_13577', nickname: '弥撒卡' },
	{ id: 'FruKyuu', nickname: '芙秋' },
	{ id: 'LynaCrystal', nickname: '乾喵' },
]

const { t } = useI18n()

const ownerHeadUrl = getMinecraftHeadRendererUrl(ownerId)
const councilOfEldersGridRef = useTemplateRef<HTMLElement>(
	'councilOfEldersGridRef',
)
const viewportWidth = ref(0)
const shuffledCouncilOfEldersMembers = ref<CouncilOfEldersMember[]>([])
let viewportResizeObserver: ResizeObserver | null = null

const updateViewportWidth = () => {
	viewportWidth.value = window.innerWidth
}

const buildCouncilOfEldersMembers = (
	members: CouncilOfEldersMemberDefinition[],
): CouncilOfEldersMember[] =>
	members.map((member) => ({
		...member,
		headUrl: getMinecraftHeadRendererUrl(member.id),
	}))

const shuffleMembers = (
	members: CouncilOfEldersMemberDefinition[],
): CouncilOfEldersMember[] => {
	const shuffled = [...members]

	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1))
		const currentMember = shuffled[index]!
		shuffled[index] = shuffled[randomIndex]!
		shuffled[randomIndex] = currentMember
	}

	return buildCouncilOfEldersMembers(shuffled)
}

const committeeMembers = computed<CommitteeMember[]>(() =>
	committeeMemberDefinitions.map((member) => ({
		...member,
		headUrl: getMinecraftHeadRendererUrl(member.id),
	})),
)

const displayedCouncilOfEldersMembers = computed<CouncilOfEldersMember[]>(
	() => {
		if (viewportWidth.value >= DESKTOP_LAYOUT_MIN_WIDTH) {
			return shuffledCouncilOfEldersMembers.value.slice(
				0,
				Math.max(
					0,
					shuffledCouncilOfEldersMembers.value.length -
						DESKTOP_COUNCIL_OF_ELDERS_HIDDEN_COUNT,
				),
			)
		}

		return shuffledCouncilOfEldersMembers.value
	},
)

shuffledCouncilOfEldersMembers.value = buildCouncilOfEldersMembers(
	councilOfEldersMemberDefinitions,
)

onMounted(() => {
	shuffledCouncilOfEldersMembers.value = shuffleMembers(
		councilOfEldersMemberDefinitions,
	)

	updateViewportWidth()
	window.addEventListener('resize', updateViewportWidth)

	if (councilOfEldersGridRef.value) {
		viewportResizeObserver = new ResizeObserver(updateViewportWidth)
		viewportResizeObserver.observe(councilOfEldersGridRef.value)
	}
})

onBeforeUnmount(() => {
	viewportResizeObserver?.disconnect()
	window.removeEventListener('resize', updateViewportWidth)
})
</script>
