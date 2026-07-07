<template>
	<div
		class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
	>
		<button
			type="button"
			class="relative block w-full overflow-hidden text-left"
			@click="onActivate"
		>
			<div class="relative h-46 overflow-hidden">
				<SkeletonImage
					:src="displayCover"
					:alt="partner.name"
					class="block h-full w-full"
					:image-class="coverImageClass"
				/>
				<div
					class="absolute inset-0 bg-slate-950/34 transition duration-300 group-hover:bg-slate-950/20 dark:bg-slate-950/46 dark:group-hover:bg-slate-950/30"
				/>

				<div class="absolute right-3 top-3 z-10 flex items-start gap-2">
					<UBadge
						v-if="partner.section === 'COMMUNITY' && partner.kind"
						color="neutral"
						variant="subtle"
						size="sm"
					>
						{{ t(`content.partners.kinds.${partner.kind}`) }}
					</UBadge>
					<UTooltip
						v-if="partner.archived"
						:text="t('content.partners.archived.tooltip')"
					>
						<UBadge color="error" variant="solid" size="sm">
							{{ t('content.partners.archived.label') }}
						</UBadge>
					</UTooltip>
				</div>

				<div
					class="absolute inset-0 z-[1] flex flex-col items-center px-6 py-8 pb-4"
					:class="partner.summary ? 'justify-end' : 'justify-center'"
				>
					<div
						class="flex w-full items-center justify-center gap-4 rounded-2xl text-white"
						:class="partner.summary ? 'mb-4' : ''"
					>
						<div
							v-if="partner.avatarUrl"
							class="h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ring-white/24"
						>
							<SkeletonImage
								:src="partner.avatarUrl"
								:alt="partner.name"
								class="h-full w-full"
								image-class="block h-full w-full object-cover"
								skeleton-class="rounded-none"
							/>
						</div>
						<UAvatar
							v-else
							:alt="partner.name"
							size="3xl"
							class="shrink-0 h-14 w-14 rounded-lg ring-2 ring-white/24"
							:ui="{
								root: 'rounded-lg overflow-hidden bg-white/14 text-white backdrop-blur-sm',
								fallback: 'rounded-lg bg-transparent text-white',
							}"
						/>
						<div class="min-w-0 max-w-54">
							<div class="relative pr-6">
								<h3
									class="truncate text-2xl text-center font-medium tracking-wide text-white"
								>
									{{ partner.name }}
								</h3>
								<UIcon
									name="i-lucide-chevron-right"
									class="absolute right-0 top-1/2 size-4 -translate-y-1/2 translate-x-1 text-white/72 opacity-0 transition duration-250 group-hover:translate-x-0 group-hover:opacity-100"
								/>
							</div>
						</div>
					</div>
					<div
						v-if="partner.summary"
						class="text-center text-sm leading-6 text-white/88"
					>
						<div class="line-clamp-2">
							{{ partner.summary }}
						</div>
					</div>
				</div>
			</div>
		</button>

		<UButton
			v-if="partner.canEdit"
			type="button"
			color="neutral"
			variant="link"
			size="xs"
			icon="i-lucide-pencil"
			:aria-label="t('admin.actions.edit')"
			class="absolute left-3 top-3 z-20"
			@click.stop="openEditor"
		/>
	</div>
</template>

<script setup lang="ts">
import { getPartnerDisplayCover } from '~/utils/community/partner-cover'
import type { PartnerSummary } from '~/utils/community/partners'

const props = defineProps<{
	partner: PartnerSummary
}>()
const emit = defineEmits<{
	open: [partner: PartnerSummary]
}>()

const { t } = useI18n()

const displayCover = computed(() => getPartnerDisplayCover(props.partner))
const coverImageClass = computed(() =>
	[
		'block h-full w-full object-cover brightness-[0.82] transition duration-300 group-hover:brightness-[0.96]',
		props.partner.archived
			? 'grayscale saturate-0'
			: 'saturate-[0.88] group-hover:saturate-100',
	].join(' '),
)

const onActivate = (): void => {
	emit('open', props.partner)
}

const openEditor = (): void => {
	emit('open', props.partner)
}
</script>
