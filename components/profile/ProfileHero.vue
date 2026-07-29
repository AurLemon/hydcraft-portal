<template>
	<section class="relative overflow-hidden rounded-2xl">
		<div class="absolute inset-0">
			<SkeletonImage
				:src="effectiveCoverImage"
				:alt="t('profile.media.coverAlt', { name: displayName })"
				class="h-full w-full"
				image-class="block h-full w-full object-cover"
				skeleton-class="rounded-none"
				loading="eager"
			/>
		</div>
		<div
			class="profile-hero-identity-scrim pointer-events-none absolute inset-0 z-10"
		/>
		<div
			class="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-slate-950/46 via-slate-950/16 to-transparent backdrop-blur-[32px] mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.92)_14%,rgba(0,0,0,0.66)_24%,rgba(0,0,0,0.28)_34%,transparent_48%)]"
		/>
		<div
			class="relative z-20 flex min-h-96 flex-col sm:min-h-128 lg:h-96 lg:min-h-0"
		>
			<div
				v-if="hasActions"
				class="z-20 flex flex-wrap justify-end gap-2 p-4 md:absolute md:top-6 md:right-6 md:p-0"
			>
				<slot name="actions">
					<template v-if="actions.length">
						<UButton
							v-for="action in actions"
							:key="action.label"
							color="neutral"
							variant="soft"
							size="sm"
							:icon="action.icon"
							:to="action.to"
							:class="heroActionClass"
							@click="action.onClick?.()"
						>
							{{ action.label }}
						</UButton>
					</template>
					<UButton
						v-else-if="mode === 'public' && profile.isOwner"
						color="neutral"
						variant="soft"
						size="sm"
						icon="i-lucide-pencil"
						:class="heroActionClass"
						:to="localePath('/me/profile')"
					>
						{{ t('profile.actions.editPublicProfile') }}
					</UButton>
				</slot>
			</div>

			<div
				class="flex flex-1 flex-col justify-center px-5 pt-2 pb-4 md:p-8 md:pr-48"
			>
				<div
					class="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left lg:mt-10"
				>
					<slot
						name="avatar"
						:avatar-url="avatarUrl"
						:display-name="displayName"
						:username="username"
					>
						<div
							class="relative h-24 w-24 shrink-0 rounded-full border border-white/40 bg-slate-900/40 p-0 sm:h-28 sm:w-28"
						>
							<div class="h-full w-full overflow-hidden rounded-full">
								<template v-if="avatarUrl && !avatarImageFailed">
									<USkeleton
										v-if="!avatarImageReady"
										class="block h-full w-full rounded-full"
									/>
									<img
										ref="avatarImageRef"
										:src="avatarUrl"
										:alt="displayName"
										class="block h-full w-full rounded-full object-cover transition-opacity duration-200"
										:class="
											avatarImageReady ? 'opacity-100' : 'hidden opacity-0'
										"
										loading="eager"
										decoding="async"
										@load="markAvatarImageReady"
										@error="markAvatarImageFailed"
									/>
								</template>
								<div
									v-else
									class="flex h-full w-full items-center justify-center rounded-full bg-slate-700 text-3xl leading-none font-semibold text-slate-300 sm:text-4xl"
								>
									{{ avatarInitial }}
								</div>
							</div>
							<span
								v-if="profile.activityStatus"
								class="absolute right-1 bottom-1 h-5 w-5 rounded-full border-[3px] border-slate-950 shadow-lg"
								:class="statusDotClass"
								:title="activityText"
								:aria-label="activityText"
							/>
						</div>
					</slot>

					<div class="min-w-0 max-w-full">
						<div
							class="flex max-w-full items-center justify-center gap-2 break-words text-3xl leading-tight font-semibold text-white [text-shadow:0_1px_3px_rgba(15,23,42,0.42)] sm:justify-start sm:truncate sm:text-4xl"
						>
							<span class="min-w-0 truncate">
								{{ displayName }}
							</span>
							<UIcon
								v-if="profile.verified?.enabled"
								name="i-lucide-badge-check"
								class="h-6 w-6 shrink-0 text-sky-300 sm:h-7 sm:w-7"
								:aria-label="verifiedText"
							/>
						</div>
						<div
							class="mt-1 truncate text-base text-slate-100 [text-shadow:0_1px_2px_rgba(15,23,42,0.36)] sm:text-lg"
						>
							@{{ username }}
						</div>
						<p
							v-if="subtitle"
							class="mt-3 max-w-2xl text-sm leading-6 text-slate-100/90 [text-shadow:0_1px_2px_rgba(15,23,42,0.36)] sm:text-base"
						>
							{{ subtitle }}
						</p>
					</div>
				</div>
			</div>

			<div class="relative px-5 py-5">
				<div
					class="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
				>
					<div
						v-if="profile.verified?.enabled"
						class="flex min-w-0 justify-center gap-2 text-sm font-medium text-sky-100 md:justify-start lg:text-base"
					>
						<UIcon
							name="i-lucide-check-circle-2"
							class="mt-0.5 h-4 w-4 shrink-0 text-sky-300"
						/>
						<span
							class="text-center md:truncate md:text-left [text-shadow:0_1px_2px_rgba(15,23,42,0.36)]"
							>{{ verifiedText }}</span
						>
					</div>
					<div
						class="flex flex-wrap justify-center gap-2 md:ml-auto md:flex-1 md:flex-nowrap md:justify-end md:whitespace-nowrap"
					>
						<UBadge
							v-for="badge in visibleBadges"
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
							color="neutral"
							variant="subtle"
							class="gap-1.5 rounded-md border border-white/20 bg-slate-950/38 px-3 py-1.5 text-sm font-semibold text-slate-100 shadow-[0_10px_26px_rgba(0,0,0,0.24)]"
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
import defaultCover from '~/assets/resources/pages/timeline_cover.webp'
import type { ProfileBadge, ProfileVerified } from '~/utils/profile/edit'
import { getProfileBadgeDarkStyle } from '~/utils/profile/badges'

type ProfileHeroMode = 'public' | 'readonly' | 'edit'

interface ProfileHeroActivityStatus {
	onlineStatus: 'ONLINE' | 'OFFLINE' | 'RECENTLY_ACTIVE'
	lastActiveAt: string | null
}

interface ProfileHeroProfile {
	username: string
	displayName: string | null
	avatarUrl: string | null
	coverUrl: string | null
	joinedAt?: string | null
	badges?: ProfileBadge[]
	roleBadge?: ProfileBadge | null
	verified?: ProfileVerified | null
	activityStatus?: ProfileHeroActivityStatus
	isOwner?: boolean
}

interface ProfileHeroForm {
	username: string
	displayName: string
	avatarUrl: string
}

interface ProfileHeroAction {
	label: string
	icon: string
	to?: string
	onClick?: () => void
}

interface ProfileHeroProps {
	profile: ProfileHeroProfile
	mode?: ProfileHeroMode
	form?: ProfileHeroForm
	coverImage?: string
	subtitle?: string
	actions?: ProfileHeroAction[]
}

const props = withDefaults(defineProps<ProfileHeroProps>(), {
	mode: 'readonly',
	form: undefined,
	coverImage: undefined,
	subtitle: '',
	actions: () => [],
})
const { t, locale } = useI18n()
const localePath = useLocalePath()
const slots = useSlots()
const avatarImageRef = ref<HTMLImageElement | null>(null)
const avatarImageReady = ref(false)
const avatarImageFailed = ref(false)

const username = computed(() =>
	props.mode === 'edit'
		? props.form?.username || props.profile.username
		: props.profile.username,
)
const displayName = computed(() =>
	props.mode === 'edit'
		? props.form?.displayName || props.profile.username
		: props.profile.displayName || props.profile.username,
)
const avatarUrl = computed(() =>
	props.mode === 'edit' ? props.form?.avatarUrl || '' : props.profile.avatarUrl,
)
const effectiveCoverImage = computed(
	() =>
		(props.mode === 'edit' ? props.coverImage : props.profile.coverUrl) ||
		defaultCover,
)
const avatarInitial = computed(() =>
	(displayName.value || username.value || '?').slice(0, 1).toUpperCase(),
)
const hasActions = computed(
	() =>
		Boolean(slots.actions) ||
		props.actions.length > 0 ||
		(props.mode === 'public' && Boolean(props.profile.isOwner)),
)
const joinedDays = computed(() => {
	if (!props.profile.joinedAt) {
		return null
	}

	return Math.max(dayjs().diff(dayjs(props.profile.joinedAt), 'day'), 0)
})
const visibleBadges = computed(() => [
	...(props.profile.badges ?? []),
	...(props.profile.roleBadge ? [props.profile.roleBadge] : []),
])
const verifiedText = computed(() => {
	const verified = props.profile.verified

	if (!verified) {
		return ''
	}

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
const activityText = computed(() => {
	const activity = props.profile.activityStatus

	if (!activity) {
		return ''
	}

	if (activity.onlineStatus === 'ONLINE') {
		return t('profile.status.online')
	}

	if (activity.onlineStatus === 'RECENTLY_ACTIVE') {
		return activity.lastActiveAt
			? t('profile.status.recentlyActiveWithDate', {
					date: dayjs(activity.lastActiveAt).format('YYYY.MM.DD'),
				})
			: t('profile.status.recentlyActive')
	}

	return t('profile.status.offline')
})
const statusDotClass = computed(() => {
	const status = props.profile.activityStatus?.onlineStatus

	if (status === 'ONLINE') {
		return 'bg-emerald-400'
	}

	if (status === 'RECENTLY_ACTIVE') {
		return 'bg-amber-300'
	}

	return 'bg-slate-400'
})
const heroActionClass =
	'border border-white/18 !bg-slate-950/46 !text-white shadow-lg backdrop-blur-md hover:!bg-slate-950/62 disabled:!bg-slate-950/46 disabled:!text-white disabled:opacity-70'

const markAvatarImageReady = (): void => {
	avatarImageReady.value = true
	avatarImageFailed.value = false
}

const markAvatarImageFailed = (): void => {
	avatarImageReady.value = true
	avatarImageFailed.value = true
}

const syncCachedAvatarImageState = async (): Promise<void> => {
	await nextTick()

	if (!avatarUrl.value || !avatarImageRef.value?.complete) {
		return
	}

	if (avatarImageRef.value.naturalWidth > 0) {
		markAvatarImageReady()
		return
	}

	markAvatarImageFailed()
}

watch(avatarUrl, () => {
	avatarImageReady.value = false
	avatarImageFailed.value = false
	void syncCachedAvatarImageState()
})

onMounted(() => {
	void syncCachedAvatarImageState()
})
</script>
