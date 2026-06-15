<template>
	<div class="site-shell mx-auto -mt-2 pb-16">
		<div v-if="pending" class="grid gap-5">
			<USkeleton class="h-80 rounded-lg" />
			<div class="grid gap-4 lg:grid-cols-3">
				<USkeleton v-for="index in 3" :key="index" class="h-72 rounded-lg" />
			</div>
		</div>

		<UAlert
			v-else-if="error || !profile"
			color="neutral"
			icon="i-lucide-eye-off"
			:title="t('profile.public.empty.unavailable')"
		/>

		<div v-else class="grid gap-5">
			<ProfilePublicHero :profile="profile" />

			<div class="grid gap-4 lg:grid-cols-3">
				<section :class="cardClass">
					<div :class="cardTitleClass">
						<UIcon name="i-lucide-user" class="h-5 w-5 text-primary" />
						<span>{{ t('profile.public.sections.about') }}</span>
					</div>
					<div
						class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300"
					>
						{{ profile.bio || t('profile.public.empty.bio') }}
					</div>
					<div class="mt-5 grid gap-3">
						<ProfileInfoRow
							v-if="locationText"
							:label="t('profile.public.fields.location')"
							:value="locationText"
						/>
						<ProfileInfoRow
							v-if="profile.joinedAt"
							:label="t('profile.public.fields.joinedAt')"
							:value="formatDate(profile.joinedAt)"
						/>
						<ProfileInfoRow
							:label="t('profile.public.fields.timezone')"
							:value="t('profile.public.values.defaultTimezone')"
						/>
						<ProfileInfoRow
							v-if="profile.hydrolineId"
							label="Hydroline ID"
							:value="profile.hydrolineId"
						/>
					</div>
				</section>

				<section :class="cardClass">
					<div :class="cardTitleClass">
						<UIcon name="i-lucide-link" class="h-5 w-5 text-primary" />
						<span>{{ t('profile.public.sections.social') }}</span>
					</div>
					<div v-if="socialLinks.length" class="mt-4 grid gap-1">
						<component
							:is="link.href ? 'NuxtLink' : 'div'"
							v-for="link in socialLinks"
							:key="link.label"
							:to="link.href || undefined"
							:external="link.href ? true : undefined"
							:target="link.href ? '_blank' : undefined"
							:rel="link.href ? 'noopener noreferrer' : undefined"
							:class="[
								'flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-slate-600 dark:text-slate-300',
								link.href
									? 'transition-colors hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white'
									: '',
							]"
						>
							<span>{{ link.label }}</span>
							<span class="flex min-w-0 items-center gap-2">
								<span class="truncate text-slate-500 dark:text-slate-400">
									{{ link.text }}
								</span>
								<UIcon
									v-if="link.href"
									name="i-lucide-external-link"
									class="h-4 w-4"
								/>
							</span>
						</component>
					</div>
					<div v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">
						{{ t('profile.public.empty.social') }}
					</div>
				</section>

				<section :class="cardClass">
					<div :class="cardTitleClass">
						<UIcon name="i-lucide-box" class="h-5 w-5 text-emerald-500" />
						<span>{{ t('profile.public.sections.minecraft') }}</span>
					</div>
					<div v-if="profile.minecraftSummary" class="mt-5 grid gap-4">
						<div class="flex gap-4">
							<div
								class="flex h-32 w-28 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5"
							>
								<UAvatar
									:src="profile.minecraftSummary.skinPreviewUrl || undefined"
									:alt="profile.minecraftSummary.minecraftName"
									size="3xl"
								/>
							</div>
							<div class="grid min-w-0 flex-1 gap-3">
								<ProfileInfoRow
									:label="t('profile.public.fields.minecraftName')"
									:value="profile.minecraftSummary.minecraftName"
								/>
								<ProfileInfoRow
									v-if="profile.minecraftSummary.currentServer"
									:label="t('profile.public.fields.currentServer')"
									:value="profile.minecraftSummary.currentServer"
								/>
								<ProfileInfoRow
									:label="t('profile.public.fields.onlineStatus')"
									:value="minecraftStatusText"
								/>
								<div class="flex flex-wrap gap-2">
									<UBadge
										v-for="role in profile.minecraftSummary.minecraftRoles"
										:key="role"
										color="success"
										variant="soft"
									>
										{{ role }}
									</UBadge>
								</div>
							</div>
						</div>
						<UButton
							color="neutral"
							variant="soft"
							icon="i-lucide-arrow-right"
							class="justify-center"
							:to="profile.minecraftSummary.profileUrl"
						>
							{{ t('profile.public.actions.viewMinecraftProfile') }}
						</UButton>
					</div>
					<div v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">
						{{ t('profile.public.empty.minecraft') }}
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import {
	createSocialPreviewLink,
	extractBilibiliId,
	extractPathSegment,
} from '~/utils/profile-edit'

definePageMeta({
	headerVariant: 'solid',
})

interface PublicProfile {
	hydrolineId?: string
	username: string
	displayName: string | null
	avatarUrl: string | null
	coverUrl: string | null
	joinedAt?: string
	badges?: Array<{
		id: string
		badgeId: string | null
		key: string | null
		label: string
		labelZhCn: string
		labelZhTw: string
		labelEnUs: string
		labelJaJp: string
		color: string | null
		sortOrder: number
	}>
	roleBadge?: {
		id: string
		badgeId: string | null
		key: string | null
		label: string
		labelZhCn: string
		labelZhTw: string
		labelEnUs: string
		labelJaJp: string
		color: string | null
		sortOrder: number
	} | null
	verified?: {
		enabled: boolean
		textZhCn: string | null
		textZhTw: string | null
		textEnUs: string | null
		textJaJp: string | null
	}
	bio?: string | null
	location?: string | null
	countryOrRegion?: string | null
	social?: {
		h2wikiPageName: string | null
		githubUsername: string | null
		websiteUrl: string | null
		bilibiliUrl: string | null
		qqNumber: string | null
		wechatId: string | null
		publicEmail: string | null
	}
	activityStatus?: {
		onlineStatus: 'ONLINE' | 'OFFLINE' | 'RECENTLY_ACTIVE'
		lastActiveAt: string | null
	}
	minecraftSummary?: {
		minecraftName: string
		javaUuid: string | null
		bedrockXuid: string | null
		skinPreviewUrl: string | null
		currentServer: string | null
		onlineStatus: 'ONLINE' | 'OFFLINE' | 'RECENTLY_ACTIVE'
		lastActiveAt: string | null
		minecraftRoles: string[]
		profileUrl: string
		status: string
	} | null
	isOwner: boolean
}

interface PublicProfileResponse {
	profile: PublicProfile
}

interface SocialLink {
	label: string
	text: string
	href?: string
}

const route = useRoute()
const { t, locale } = useI18n()
const username = computed(() => String(route.params.username ?? ''))
const cardClass =
	'rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950'
const cardTitleClass =
	'flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white'
const { data, pending, error } = await useFetch<PublicProfileResponse>(
	() => `/api/public/users/${username.value}`,
)

const profile = computed(() => data.value?.profile ?? null)
const locationText = computed(() => {
	if (!profile.value) {
		return ''
	}

	return [profile.value.countryOrRegion, profile.value.location]
		.filter(Boolean)
		.join(' · ')
})
const minecraftStatusText = computed(() => {
	const status = profile.value?.minecraftSummary?.onlineStatus

	if (status === 'ONLINE') {
		return t('profile.status.online')
	}

	if (status === 'RECENTLY_ACTIVE') {
		return t('profile.status.recentlyActive')
	}

	return t('profile.status.offline')
})
const socialLinks = computed<SocialLink[]>(() => {
	const social = profile.value?.social

	if (!social) {
		return []
	}

	const links: SocialLink[] = []

	if (social.githubUsername) {
		const githubPreview = createSocialPreviewLink(
			'https://github.com/',
			extractPathSegment(social.githubUsername, 'https://github.com/'),
		)

		if (githubPreview) {
			links.push({
				label: 'GitHub',
				text: githubPreview.text,
				href: githubPreview.href,
			})
		}
	}

	if (social.websiteUrl) {
		links.push({
			label: t('profile.public.social.website'),
			text: stripProtocol(social.websiteUrl),
			href: social.websiteUrl,
		})
	}

	if (social.bilibiliUrl) {
		const bilibiliPreview = createSocialPreviewLink(
			'https://space.bilibili.com/',
			extractBilibiliId(social.bilibiliUrl),
		)

		if (bilibiliPreview) {
			links.push({
				label: 'Bilibili',
				text: bilibiliPreview.text,
				href: bilibiliPreview.href,
			})
		}
	}

	if (social.h2wikiPageName) {
		const wikiPreview = createSocialPreviewLink(
			'https://wiki.hydcraft.cn/',
			extractPathSegment(social.h2wikiPageName, 'https://wiki.hydcraft.cn/'),
		)

		if (wikiPreview) {
			links.push({
				label: 'Wiki',
				text: wikiPreview.text,
				href: wikiPreview.href,
			})
		}
	}

	if (social.publicEmail) {
		links.push({
			label: t('profile.public.social.publicEmail'),
			text: social.publicEmail,
			href: `mailto:${social.publicEmail}`,
		})
	}

	if (social.qqNumber) {
		links.push({
			label: 'QQ',
			text: social.qqNumber,
		})
	}

	if (social.wechatId) {
		links.push({
			label: '微信',
			text: social.wechatId,
		})
	}

	return links
})

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'medium',
	}).format(dayjs(value).toDate())
}

function stripProtocol(value: string): string {
	return value.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
</script>
