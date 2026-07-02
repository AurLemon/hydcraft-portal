<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-2xl', body: 'p-0' }"
		@update:open="handleOpenChange"
	>
		<template #content="{ close }">
			<div class="relative">
				<UButton
					type="button"
					color="neutral"
					variant="ghost"
					icon="i-lucide-x"
					class="absolute right-3 top-3 z-10 text-white"
					:aria-label="t('common.cancel')"
					@click="close"
				/>

				<div class="relative h-56 bg-slate-100 dark:bg-slate-900">
					<SkeletonImage
						:src="coverSrc"
						:alt="partner?.name || ''"
						class="h-full w-full"
						:image-class="coverImageClass"
					/>
					<div
						class="absolute left-4 top-4 z-[1] flex flex-wrap items-center gap-2"
					>
						<UBadge
							v-if="partner?.kind"
							color="neutral"
							variant="subtle"
							size="sm"
						>
							{{ t(`content.partners.kinds.${partner.kind}`) }}
						</UBadge>
						<UTooltip
							v-if="partner?.archived"
							:text="t('content.partners.archived.tooltip')"
						>
							<UBadge color="error" variant="solid" size="sm">
								{{ t('content.partners.archived.label') }}
							</UBadge>
						</UTooltip>
					</div>
					<div
						class="absolute inset-x-0 bottom-4 z-[1] flex flex-wrap items-center justify-between gap-3 px-4"
					>
						<p
							v-if="relationshipEstablishedText"
							class="text-sm font-medium text-white/88"
						>
							{{ relationshipEstablishedText }}
						</p>
						<div class="ml-auto flex items-center gap-3">
							<UButton
								v-if="partner?.canEdit"
								type="button"
								color="neutral"
								variant="subtle"
								icon="i-lucide-pencil"
								:aria-label="t('admin.actions.edit')"
								class="text-white"
								@click="emit('edit', partner)"
							/>
							<UButton
								v-if="canVisitPartner"
								:href="partner?.websiteUrl || undefined"
								target="_blank"
								rel="noopener noreferrer"
								color="neutral"
								variant="subtle"
								icon="i-lucide-external-link"
								class="text-white"
							>
								{{ t('content.partners.actions.visit') }}
							</UButton>
						</div>
					</div>
				</div>

				<div class="grid gap-4 p-5">
					<div class="flex items-center gap-2">
						<UAvatar
							:src="partner?.avatarUrl || undefined"
							:alt="partner?.name || ''"
							size="3xl"
							class="rounded-lg"
							:ui="avatarUi"
						/>
						<div class="min-w-0 flex-1">
							<h2
								class="truncate text-2xl font-semibold text-slate-950 dark:text-white"
							>
								{{ partner?.name }}
							</h2>
						</div>
					</div>

					<p
						v-if="partner?.summary"
						class="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200"
					>
						{{ partner.summary }}
					</p>

					<div
						v-if="partner?.archived"
						class="flex items-start gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
					>
						<UIcon
							name="i-lucide-info"
							class="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400"
						/>
						<p>
							{{ t('content.partners.archived.description') }}
						</p>
					</div>

					<div
						v-if="partner?.coreMembers.length"
						class="flex justify-end items-center gap-3"
					>
						<p class="text-xs leading-6 text-slate-600 dark:text-slate-300">
							{{ coreMemberTitle }}
						</p>
						<div class="shrink-0">
							<UPopover v-if="shouldUseCoreMemberPopover">
								<button
									type="button"
									class="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								>
									<UAvatarGroup size="lg" :max="5">
										<UAvatar
											v-for="member in partner.coreMembers"
											:key="member.id"
											:src="member.avatarUrl || undefined"
											:alt="member.displayName || member.username"
											class="rounded-lg"
											:ui="avatarUi"
										/>
									</UAvatarGroup>
								</button>

								<template #content>
									<div class="grid w-72 gap-1 p-2">
										<NuxtLink
											v-for="member in partner.coreMembers"
											:key="member.id"
											:to="localePath(`/u/${member.username}`)"
											class="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
										>
											<UAvatar
												:src="member.avatarUrl || undefined"
												:alt="member.displayName || member.username"
												size="sm"
												class="rounded-lg"
												:ui="avatarUi"
											/>
											<div class="min-w-0">
												<p
													class="truncate font-medium text-slate-900 dark:text-white"
												>
													{{ member.displayName || member.username }}
												</p>
												<p class="truncate text-xs text-slate-500">
													@{{ member.username }}
												</p>
											</div>
										</NuxtLink>
									</div>
								</template>
							</UPopover>

							<div v-else class="flex items-center gap-2">
								<NuxtLink
									v-for="member in partner.coreMembers"
									:key="member.id"
									:to="localePath(`/u/${member.username}`)"
									class="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								>
									<UAvatar
										:src="member.avatarUrl || undefined"
										:alt="member.displayName || member.username"
										size="lg"
										class="rounded-lg"
										:ui="avatarUi"
									/>
								</NuxtLink>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import defaultCover from '~/assets/resources/pages/partners_cover.webp'
import type { PartnerSummary } from '~/utils/community/partners'

interface PartnerDetailModalProps {
	open: boolean
	partner: PartnerSummary | null
}

const props = defineProps<PartnerDetailModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	edit: [partner: PartnerSummary]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const coverSrc = computed(() => props.partner?.coverUrl || defaultCover)
const coverImageClass = computed(() =>
	[
		'block h-full w-full object-cover transition-opacity duration-200',
		props.partner?.archived ? 'grayscale saturate-0' : '',
	].join(' '),
)
const canVisitPartner = computed(() => Boolean(props.partner?.websiteUrl))
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}
const shouldUseCoreMemberPopover = computed(
	() => (props.partner?.coreMembers.length ?? 0) >= 5,
)
const relationshipEstablishedText = computed(() => {
	if (!props.partner?.relationshipEstablishedAt) {
		return ''
	}

	const date = new Date(props.partner.relationshipEstablishedAt)

	return t('content.partners.relationshipEstablishedAt', {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
	})
})
const coreMemberTitle = computed(() =>
	t('content.partners.coreMembers.title', {
		name: props.partner?.name ?? '',
	}),
)

const handleOpenChange = (value: boolean): void => {
	emit('update:open', value)
}
</script>
