<template>
	<ServerOverviewDirectoryShell
		:title="t('content.serverOverview.cards.committee.title')"
	>
		<article
			class="rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-5"
		>
			<div class="grid grid-cols-3 gap-2 lg:grid-cols-7">
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
								{{
									t(`content.serverOverview.cards.committee.badges.${badge}`)
								}}
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
	</ServerOverviewDirectoryShell>
</template>

<script setup lang="ts">
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

type CommitteeBadgeKey =
	| 'chair'
	| 'owner'
	| 'member'
	| 'advisor'
	| 'viceOwner'
	| 'councilOfEldersSecretary'

interface CommitteeMemberDefinition {
	id: string
	nickname: string
	badges: CommitteeBadgeKey[]
}

interface CommitteeMember extends CommitteeMemberDefinition {
	headUrl: string
}

const committeeMemberDefinitions: CommitteeMemberDefinition[] = [
	{
		id: 'Aurora_Lemon',
		nickname: '柠檬',
		badges: ['chair', 'owner'],
	},
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

const { t } = useI18n()

const committeeMembers = computed<CommitteeMember[]>(() =>
	committeeMemberDefinitions.map((member) => ({
		...member,
		headUrl: getMinecraftHeadRendererUrl(member.id),
	})),
)
</script>
