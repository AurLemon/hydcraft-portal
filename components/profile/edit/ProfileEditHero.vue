<template>
	<section class="relative overflow-hidden rounded-2xl">
		<div class="absolute inset-0">
			<SkeletonImage
				:src="effectiveCoverImage"
				:alt="
					t('profile.media.coverAlt', {
						name: form.displayName || profile.username,
					})
				"
				class="h-full w-full"
				image-class="block h-full w-full object-cover"
				skeleton-class="rounded-none"
				loading="eager"
			/>
		</div>
		<div
			class="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-slate-950/46 via-slate-950/16 to-transparent backdrop-blur-[32px] mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.92)_14%,rgba(0,0,0,0.66)_24%,rgba(0,0,0,0.28)_34%,transparent_48%)]"
		/>
		<div
			class="relative z-20 flex min-h-96 flex-col sm:min-h-128 lg:h-96 lg:min-h-0"
		>
			<div
				class="z-20 flex flex-wrap justify-end gap-2 p-4 md:absolute md:top-6 md:right-6 md:p-0"
			>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-eye"
					:class="heroActionClass"
					:to="localePath(`/u/${form.username}`)"
				>
					{{ t('profile.actions.viewPublicProfile') }}
				</UButton>
				<AttachmentUploadButton
					purpose="user-cover"
					owner-type="user"
					:owner-id="profile.id"
					preview-shape="cover"
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-image"
					:button-class="heroActionClass"
					@uploaded="$emit('coverUploaded', $event)"
				>
					{{ t('profile.actions.editCover') }}
				</AttachmentUploadButton>
			</div>

			<div
				class="flex flex-1 flex-col justify-center px-5 pt-2 pb-4 md:p-8 md:pr-48"
			>
				<div
					class="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left lg:mt-10"
				>
					<ProfileAvatarUploadButton
						:owner-id="profile.id"
						:avatar-url="form.avatarUrl"
						:display-name="form.displayName"
						:username="form.username"
						@uploaded="$emit('avatarUploaded', $event)"
					/>

					<div class="min-w-0 max-w-full">
						<div
							class="flex max-w-full items-center justify-center gap-2 break-words text-3xl leading-tight font-semibold text-white [text-shadow:0_1px_3px_rgba(15,23,42,0.42)] sm:justify-start sm:truncate sm:text-4xl"
						>
							<span class="min-w-0 truncate">
								{{ form.displayName || profile.username }}
							</span>
							<UIcon
								v-if="profile.verified.enabled"
								name="i-lucide-badge-check"
								class="h-6 w-6 shrink-0 text-sky-300 sm:h-7 sm:w-7"
								:aria-label="verifiedText"
							/>
						</div>
						<div
							class="mt-1 truncate text-base text-slate-100 [text-shadow:0_1px_2px_rgba(15,23,42,0.36)] sm:text-lg"
						>
							@{{ form.username }}
						</div>
					</div>
				</div>
			</div>

			<div class="relative px-5 py-5">
				<div
					class="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
				>
					<div
						v-if="profile.verified.enabled"
						class="flex min-w-0 justify-center gap-2 text-sm lg:text-base font-medium text-sky-100 md:justify-start"
					>
						<UIcon
							name="i-lucide-check-circle-2"
							class="mt-0.5 h-4 w-4 shrink-0 text-sky-300"
						/>
						<span class="text-center md:truncate md:text-left">{{
							verifiedText
						}}</span>
					</div>
					<div
						class="flex flex-wrap justify-center gap-2 md:flex-nowrap md:whitespace-nowrap md:flex-1 md:justify-end md:ml-auto"
					>
						<UBadge
							v-for="badge in profile.badges"
							:key="badge.id"
							color="neutral"
							variant="subtle"
							class="gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold shadow-[0_10px_26px_rgba(0,0,0,0.26)] backdrop-blur-md"
							:class="getProfileBadgeDarkStyle(badge.color).class"
						>
							<UIcon
								:name="getProfileBadgeDarkStyle(badge.color).icon"
								class="h-4 w-4"
								:class="getProfileBadgeDarkStyle(badge.color).iconClass"
							/>
							{{ badgeLabel(badge) }}
						</UBadge>
						<UBadge
							v-if="profile.roleBadge"
							color="neutral"
							variant="subtle"
							class="gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold shadow-[0_10px_26px_rgba(0,0,0,0.26)] backdrop-blur-md"
							:class="getProfileBadgeDarkStyle(profile.roleBadge.color).class"
						>
							<UIcon
								:name="getProfileBadgeDarkStyle(profile.roleBadge.color).icon"
								class="h-4 w-4"
								:class="
									getProfileBadgeDarkStyle(profile.roleBadge.color).iconClass
								"
							/>
							{{ badgeLabel(profile.roleBadge) }}
						</UBadge>
						<UBadge
							color="neutral"
							variant="subtle"
							class="gap-1.5 rounded-md border border-white/20 bg-slate-950/38 px-3 py-1.5 text-sm font-semibold text-slate-100 shadow-[0_10px_26px_rgba(0,0,0,0.24)] backdrop-blur-md"
						>
							<UIcon name="i-lucide-calendar" class="h-4 w-4 text-slate-300" />
							{{ t('profile.badges.joinedDays', { days: joinedDays }) }}
						</UBadge>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import defaultCover from '~/assets/resources/pages/timeline_cover.webp'
import type {
	EditableProfile,
	ProfileBadge,
	ProfileForm,
} from '~/utils/profile/edit'
import { getProfileBadgeDarkStyle } from '~/utils/profile/badges'

interface ProfileEditHeroProps {
	profile: EditableProfile
	form: ProfileForm
	coverImage: string
}

const props = defineProps<ProfileEditHeroProps>()
defineEmits<{
	avatarUploaded: [result: AttachmentUploadResult]
	coverUploaded: [result: AttachmentUploadResult]
}>()
const { t, locale } = useI18n()
const localePath = useLocalePath()

const effectiveCoverImage = computed(() => props.coverImage || defaultCover)
const joinedDays = computed(() =>
	Math.max(dayjs().diff(dayjs(props.profile.joinedAt), 'day'), 0),
)
const verifiedText = computed(() => {
	const verified = props.profile.verified

	if (locale.value === 'zh-TW') {
		return verified.textZhTw || verified.textZhCn || t('profile.verified.text')
	}

	if (locale.value === 'en-US') {
		return verified.textEnUs || verified.textZhCn || t('profile.verified.text')
	}

	if (locale.value === 'ja-JP') {
		return verified.textJaJp || verified.textZhCn || t('profile.verified.text')
	}

	return verified.textZhCn || t('profile.verified.text')
})
const badgeLabel = (badge: ProfileBadge): string => {
	if (badge.key === 'server-member') {
		return t('profile.badges.serverMember')
	}

	if (locale.value === 'zh-TW') {
		return badge.labelZhTw || badge.labelZhCn || badge.label
	}

	if (locale.value === 'en-US') {
		return badge.labelEnUs || badge.labelZhCn || badge.label
	}

	if (locale.value === 'ja-JP') {
		return badge.labelJaJp || badge.labelZhCn || badge.label
	}

	return badge.labelZhCn || badge.label
}
const heroActionClass =
	'border border-white/18 !bg-slate-950/46 !text-white shadow-lg backdrop-blur-md hover:!bg-slate-950/62 disabled:!bg-slate-950/46 disabled:!text-white disabled:opacity-70'
</script>
