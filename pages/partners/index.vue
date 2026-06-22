<template>
	<div class="site-shell">
		<div class="lg:-mt-12 mb-10 w-full">
			<div class="mb-6 w-full">
				<SkeletonImage
					:src="partnersCover"
					alt="Partners cover"
					class="w-full overflow-hidden rounded-2xl h-54 lg:h-80 select-none"
					image-class="block h-full w-full object-cover transition-opacity duration-200"
				/>
			</div>
			<div class="mx-auto flex w-full flex-col gap-2">
				<div
					class="text-4xl font-arkpixel tracking-wider text-slate-950 dark:text-slate-50 leading-tight"
				>
					<div class="block text-center max-w-3xl mx-auto">
						{{ t('content.partners.hero.line1') }}
					</div>
					<div class="block text-center max-w-3xl mx-auto">
						{{ t('content.partners.hero.line2') }}
						<span
							class="partner-heart inline-block align-baseline text-xs text-rose-500 -ml-4 select-none"
							aria-hidden="true"
						>
							♥
						</span>
					</div>
				</div>
				<div class="text-center text-slate-500 dark:text-slate-400">
					{{ t('content.partners.hero.subtitle') }}
				</div>
			</div>
		</div>

		<div class="grid gap-12">
			<section class="flex flex-col gap-2">
				<div
					class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
				>
					<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
						{{ t('content.partners.sections.community') }}
					</h2>
					<div
						class="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
					>
						<button
							v-for="item in communityTabs"
							:key="item.value"
							type="button"
							class="rounded-md px-3 py-1.5 text-sm transition-colors"
							:class="
								activeCommunityKind === item.value
									? activeCommunityTabClass
									: 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
							"
							@click="activeCommunityKind = item.value"
						>
							{{ item.label }}
						</button>
					</div>
				</div>

				<div v-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<USkeleton v-for="index in 3" :key="index" class="h-56 rounded-lg" />
				</div>
				<div
					v-else-if="activeCommunityPartners.length"
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
				>
					<PartnerCard
						v-for="partner in activeCommunityPartners"
						:key="partner.id"
						:partner="partner"
						@open="openPartner"
					/>
				</div>
				<div v-else :class="emptyStateClass">
					{{ t('content.partners.empty.community') }}
				</div>
			</section>

			<section class="flex flex-col gap-2">
				<h2 class="mx-1 text-2xl text-slate-950 dark:text-white">
					{{ t('content.partners.sections.supportAcknowledgements') }}
				</h2>

				<div v-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<USkeleton v-for="index in 3" :key="index" class="h-44 rounded-lg" />
				</div>
				<div
					v-else-if="supportAcknowledgements.length"
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
				>
					<PartnerCard
						v-for="partner in supportAcknowledgements"
						:key="partner.id"
						:partner="partner"
						@open="openPartner"
					/>
				</div>
				<div v-else :class="emptyStateClass">
					{{ t('content.partners.empty.supportAcknowledgements') }}
				</div>
			</section>
		</div>

		<PartnerDetailModal
			v-model:open="detailOpen"
			:partner="selectedPartner"
			@edit="openPartnerEditor"
		/>
		<PartnerEditModal
			v-model:open="editOpen"
			:partner="selectedPartner"
			@updated="handlePartnerUpdated"
		/>
	</div>
</template>

<script setup lang="ts">
import partnersCover from '~/assets/resources/pages/partners_cover.webp'
import type {
	PartnerKind,
	PartnerSummary,
	PartnersPublicResponse,
} from '~/utils/partners'

const { t } = useI18n()
const colorMode = useColorMode()
const { data, pending } =
	await useFetch<PartnersPublicResponse>('/api/partners')

interface CommunityTabItem {
	label: string
	value: CommunityTabValue
}

type CommunityTabValue = 'ALL' | Extract<PartnerKind, 'SERVER' | 'ORGANIZATION'>

const activeCommunityKind = ref<CommunityTabValue>('ALL')
const emptyStateClass =
	'rounded-xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400'

const isLightMode = computed(() => colorMode.value === 'light')
const activeCommunityTabClass = computed(() =>
	isLightMode.value ? 'bg-primary-500 text-white' : 'bg-white text-slate-950',
)
const communityTabs = computed<CommunityTabItem[]>(() => [
	{ label: t('content.partners.kinds.ALL'), value: 'ALL' },
	{ label: t('content.partners.kinds.SERVER'), value: 'SERVER' },
	{
		label: t('content.partners.kinds.ORGANIZATION'),
		value: 'ORGANIZATION',
	},
])
const community = computed(() => data.value?.community ?? [])
const supportAcknowledgements = computed(
	() => data.value?.supportAcknowledgements ?? [],
)
const activeCommunityPartners = computed(() => {
	if (activeCommunityKind.value === 'ALL') {
		return community.value
	}

	return community.value.filter(
		(partner) => partner.kind === activeCommunityKind.value,
	)
})

const detailOpen = ref(false)
const editOpen = ref(false)
const selectedPartner = ref<PartnerSummary | null>(null)

const openPartner = (partner: PartnerSummary): void => {
	selectedPartner.value = partner
	detailOpen.value = true
	editOpen.value = false
}

const openPartnerEditor = (partner: PartnerSummary): void => {
	selectedPartner.value = partner
	detailOpen.value = false
	editOpen.value = true
}

const handlePartnerUpdated = (updated: PartnerSummary): void => {
	selectedPartner.value = updated

	if (!data.value) {
		return
	}

	const replaceInList = (list: PartnerSummary[]): PartnerSummary[] =>
		list.map((item) => (item.id === updated.id ? updated : item))

	data.value = {
		community: replaceInList(data.value.community),
		supportAcknowledgements: replaceInList(data.value.supportAcknowledgements),
	}
}
</script>

<style scoped>
.partner-heart {
	animation: partner-heartbeat 1.15s ease-in-out infinite;
	transform-origin: center;
}

@keyframes partner-heartbeat {
	0%,
	100% {
		transform: scale(1);
	}
	30% {
		transform: scale(1.25);
	}
	50% {
		transform: scale(0.95);
	}
	70% {
		transform: scale(1.15);
	}
}
</style>
