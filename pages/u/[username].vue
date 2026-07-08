<template>
	<div class="site-shell pb-16">
		<div v-if="pending" class="grid gap-5">
			<USkeleton class="h-80 rounded-lg" />
			<div class="grid gap-4 lg:grid-cols-3">
				<USkeleton class="h-96 rounded-lg lg:col-span-2" />
				<div class="grid gap-4">
					<USkeleton v-for="index in 3" :key="index" class="h-40 rounded-lg" />
				</div>
			</div>
		</div>

		<PageInlineException
			v-else-if="error || !profile"
			icon="i-lucide-eye-off"
			:title="t('profile.public.empty.unavailable')"
		/>

		<div v-else class="grid gap-12">
			<ProfilePublicHero :profile="profile" />

			<div class="flex flex-col-reverse gap-10 lg:grid lg:gap-6 lg:grid-cols-4">
				<div class="flex flex-col gap-8 lg:gap-10 lg:col-span-3">
					<section class="grid gap-3">
						<div
							class="mx-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
						>
							<div class="flex items-center gap-2">
								<div :class="profileSectionTitleClass">
									{{ t('profile.public.sections.minecraft') }}
								</div>
								<UBadge
									v-if="minecraftAccounts.length"
									variant="soft"
									color="neutral"
								>
									{{
										t('profile.public.minecraft.accountCount', {
											count: minecraftAccounts.length,
										})
									}}
								</UBadge>
							</div>
							<MinecraftPublicAccountsToolbar
								v-if="minecraftAccounts.length"
								:accounts="minecraftAccounts"
							/>
						</div>
						<div v-if="minecraftAccountsPending">
							<USkeleton class="h-96 rounded-lg" />
						</div>

						<div
							v-else-if="minecraftAccounts.length"
							class="flex flex-col gap-4"
						>
							<MinecraftPublicAccountsContent
								v-for="account in minecraftAccounts"
								:key="account.id"
								:account="account"
							/>
						</div>

						<div
							v-else
							class="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 text-sm"
						>
							{{ t('profile.public.empty.minecraft') }}
						</div>
					</section>

					<section v-if="historicalAccounts.length" class="grid gap-3">
						<div
							class="mx-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="flex items-center gap-2">
								<div :class="profileSectionTitleClass">
									{{ t('minecraftAccounts.history.profileSectionTitle') }}
								</div>
								<UBadge variant="soft" color="neutral">
									{{
										t('profile.public.minecraft.accountCount', {
											count: historicalAccounts.length,
										})
									}}
								</UBadge>
							</div>
						</div>
						<div class="flex flex-col gap-4">
							<MinecraftPublicAccountsContent
								v-for="account in historicalAccounts"
								:key="`history-${account.id}`"
								:account="account"
							/>
						</div>
					</section>

					<section class="grid gap-3">
						<div class="mx-1 flex items-center justify-between gap-3">
							<div :class="profileSectionTitleClass">
								{{ t('profile.public.sections.activity') }}
							</div>
						</div>
						<div :class="[profileCardClass, 'grid gap-4']">
							<div
								v-if="!activityPending && !activityEvents.length"
								class="text-sm"
							>
								{{ t('profile.public.empty.activity') }}
							</div>

							<USkeleton
								v-for="index in activityPending ? 3 : 0"
								:key="index"
								class="h-20 rounded-lg"
							/>

							<div
								v-for="event in activityEvents"
								:key="event.id"
								class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
							>
								<div class="flex min-w-0 items-start gap-3">
									<UIcon
										:name="getActivityEventIcon(event.type)"
										class="mt-1 size-5 shrink-0 text-slate-400"
									/>
									<div class="min-w-0">
										<div class="font-medium text-slate-950 dark:text-white">
											{{ getActivityEventLabel(event) }}
										</div>
										<p
											v-if="event.serverName"
											class="mt-0.5 text-sm text-slate-500"
										>
											{{ event.serverName }}
										</p>
										<p class="text-sm text-slate-500">
											{{ formatDateTime(event.occurredAt) }}
										</p>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>

				<div class="flex flex-col gap-4">
					<section
						v-if="birthdaySummary || genderSymbol || profile.bio"
						:class="sideCardClass"
					>
						<div v-if="birthdaySummary || genderSymbol" class="grid gap-1">
							<div class="flex flex-wrap items-baseline gap-1">
								<span
									v-if="birthdayAgeText"
									class="text-2xl text-slate-950 dark:text-white"
								>
									{{ birthdayAgeText }}
								</span>
								<span
									v-if="birthdayMetaText"
									class="text-sm text-slate-950 dark:text-white"
								>
									{{ birthdayMetaText }}
								</span>
							</div>
							<p
								v-if="birthdaySecondaryText"
								class="text-xs text-slate-500 dark:text-slate-400"
							>
								{{ birthdaySecondaryText }}
							</p>
						</div>
						<p
							v-if="profile.bio"
							:class="[
								'text-sm leading-7 text-slate-600 dark:text-slate-300',
								birthdaySummary || genderSymbol ? 'mt-2' : '',
							]"
						>
							{{ profile.bio }}
						</p>
					</section>

					<section :class="sideCardClass">
						<h3 :class="sideTitleClass">
							{{ t('profile.public.sections.profile') }}
						</h3>
						<div class="mt-4 grid gap-3">
							<ProfileInfoRow
								v-for="item in profileItems"
								:key="`${item.label}-${item.value}`"
								:label="item.label"
								:value="item.value"
								:href="item.href"
							/>
						</div>
					</section>

					<section v-if="hasAboutItems" :class="sideCardClass">
						<h3 :class="sideTitleClass">
							{{ t('profile.public.sections.about') }}
						</h3>
						<div class="mt-4 grid gap-3">
							<ProfileInfoRow
								v-for="item in aboutItems"
								:key="`${item.label}-${item.value}`"
								:label="item.label"
								:value="item.value"
								:href="item.href"
							/>
						</div>
					</section>

					<section v-if="hasSocialActions" :class="sideCardClass">
						<h3 :class="sideTitleClass">
							{{ t('profile.public.sections.social') }}
						</h3>
						<div class="mt-4 flex flex-wrap gap-2">
							<UTooltip
								v-for="action in socialActions"
								:key="action.label"
								:text="action.label"
							>
								<UButton
									color="neutral"
									variant="link"
									class="h-9 w-9 justify-start p-0 text-slate-800 opacity-100 transition-opacity hover:opacity-70 dark:text-slate-100"
									:aria-label="action.label"
									@click="handleSocialAction(action)"
								>
									<UIcon
										v-if="action.icon"
										:name="action.icon"
										class="size-5"
									/>
									<!-- eslint-disable vue/no-v-html -->
									<span
										v-else-if="action.logoSvg"
										class="inline-flex size-5 items-center justify-center [&_svg]:size-5 [&_svg]:fill-current"
										v-html="action.logoSvg"
									/>
									<!-- eslint-enable vue/no-v-html -->
								</UButton>
							</UTooltip>
						</div>
					</section>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import bilibiliLogo from '~/assets/resources/brands/logo_bilibili.svg?raw'
import qqLogo from '~/assets/resources/brands/logo_QQ.svg?raw'
import wechatLogo from '~/assets/resources/brands/logo_WeChat.svg?raw'
import dayjs from 'dayjs'
import { useToast } from '@nuxt/ui/composables'
import { useExplicitRouteTitle } from '~/utils/layout/route-display'
import {
	countryItems,
	createSocialPreviewLink,
	extractBilibiliId,
	extractPathSegment,
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'
import {
	resolveBirthdaySummary,
	resolveGenderSymbol,
} from '~/utils/profile/birthday'
import type {
	MinecraftAccountForm,
	MinecraftAccountsResponse,
} from '~/utils/minecraft/accounts'

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
	createdAt?: string
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
	schoolOrCompany?: string | null
	occupationOrMajor?: string | null
	location?: string | null
	countryOrRegion?: string | null
	gender?: 'UNSPECIFIED' | 'MALE' | 'FEMALE'
	birthday?: string | null
	timezone?: string | null
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
		lastSavedLocation: MinecraftLocationSummary | null
		onlineLocation: MinecraftLocationSummary | null
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

interface MinecraftLocationSummary {
	worldName: string | null
	dimension: string | null
	x: number | null
	y: number | null
	z: number | null
	yaw?: number | null
	pitch?: number | null
	observedAt: string | null
}

interface PublicProfileResponse {
	profile: PublicProfile
}

interface ProfileInfoItem {
	label: string
	value: string
	href?: string
}

interface SocialAction {
	label: string
	icon?: string
	logoSvg?: string
	href?: string
	copyValue?: string
}

interface PublicActivityEvent {
	id: string
	type:
		| 'SESSION_OPENED'
		| 'SESSION_CLOSED'
		| 'ADVANCEMENT_UNLOCKED'
		| 'USER_REGISTERED'
		| 'BINDING_CHANGED'
	detail: string | null
	serverName: string | null
	occurredAt: string
}

interface PublicActivityResponse {
	events: PublicActivityEvent[]
}

const ACTIVITY_BINDING_LABEL_KEY_BY_DETAIL = {
	VERIFICATION_PASSED: 'profile.public.activity.binding.verificationPassed',
	BIND_CREATED: 'profile.public.activity.binding.bindCreated',
	PRIMARY_SET: 'profile.public.activity.binding.primarySet',
	UNBOUND: 'profile.public.activity.binding.unbound',
	TRANSFERRED: 'profile.public.activity.binding.transferred',
} as const

const route = useRoute()
const { t, locale } = useI18n()
const toast = useToast()
const username = computed(() => String(route.params.username ?? ''))
// 右列卡片样式：标题为同色小标题，标题在卡片内，下方为正文。
const sideCardClass = profileCardClass
const sideTitleClass =
	'text-base font-medium text-slate-700 dark:text-slate-200'
const { data, pending, error } = await useFetch<PublicProfileResponse>(
	() => `/api/public/users/${username.value}`,
)

const profile = computed(() => data.value?.profile ?? null)
const pageTitle = computed(() =>
	t('profile.public.pageTitle', {
		name: profile.value?.username || username.value,
	}),
)
const genderSymbol = computed(() =>
	resolveGenderSymbol(profile.value?.gender ?? null),
)
const birthdaySummary = computed(() =>
	resolveBirthdaySummary(profile.value?.birthday ?? null),
)
const birthdayAgeText = computed(() => {
	const summary = birthdaySummary.value

	if (!summary) {
		return ''
	}

	return t('profile.public.birthday.ageShort', {
		count: summary.age.years,
	})
})

const birthdayMetaText = computed(() => {
	const summary = birthdaySummary.value

	if (!summary) {
		return genderSymbol.value
	}

	const constellationText = summary.constellationKey
		? t(`profile.edit.birthday.constellations.${summary.constellationKey}`)
		: summary.constellationRaw
	const zodiacText = summary.zodiacKey
		? t(`profile.edit.birthday.zodiacs.${summary.zodiacKey}`)
		: summary.zodiacRaw

	if (locale.value === 'en-US') {
		return [constellationText, zodiacText, genderSymbol.value]
			.filter(Boolean)
			.join(' / ')
	}

	const parts: string[] = []

	parts.push(constellationText)
	parts.push(
		t('profile.public.birthday.zodiacLabel', {
			zodiac: zodiacText,
		}),
	)

	if (genderSymbol.value) {
		parts.push(genderSymbol.value)
	}

	return parts.join(' ')
})

const birthdaySecondaryText = computed(() => {
	const summary = birthdaySummary.value

	if (!summary || !profile.value?.birthday) {
		return ''
	}

	if (locale.value === 'en-US') {
		return t('profile.public.birthday.bornOn', {
			date: formatBirthdayDateParts(profile.value.birthday),
		})
	}

	const lunarText = summary.lunar
		? t('profile.edit.birthday.lunar', {
				leap: summary.lunar.isLeapMonth
					? t('profile.edit.birthday.lunarLeap')
					: '',
				month: summary.lunar.month,
				day: summary.lunar.day,
			})
		: ''

	return [formatBirthdayDateParts(profile.value.birthday), lunarText]
		.filter(Boolean)
		.join(' / ')
})

const displayCountryOrRegion = computed(() => {
	const rawValue = profile.value?.countryOrRegion

	if (!rawValue) {
		return ''
	}

	const normalizedValue =
		rawValue === '中国大陆'
			? '中国内地'
			: rawValue === '海外'
				? '海外地区'
				: rawValue
	const matched = countryItems.find((item) => item.value === normalizedValue)

	return matched ? t(`profile.options.country.${matched.key}`) : normalizedValue
})

const profileItems = computed<ProfileInfoItem[]>(() => {
	const social = profile.value?.social
	const items: ProfileInfoItem[] = []

	if (profile.value?.hydrolineId) {
		items.push({
			label: 'Hydroline ID',
			value: profile.value.hydrolineId,
		})
	}

	if (profile.value?.joinedAt) {
		items.push({
			label: t('profile.public.fields.joinedAt'),
			value: formatDate(profile.value.joinedAt),
		})
	}

	if (profile.value?.createdAt) {
		items.push({
			label: t('profile.public.fields.registeredAt'),
			value: formatDate(profile.value.createdAt),
		})
	}

	if (social?.h2wikiPageName) {
		const wikiPageName = extractPathSegment(
			social.h2wikiPageName,
			'https://wiki.hydcraft.cn/',
		)

		if (wikiPageName) {
			items.push({
				label: 'Wiki',
				value: wikiPageName,
				href: `https://wiki.hydcraft.cn/${wikiPageName}`,
			})
		}
	}

	return items
})

const aboutItems = computed<ProfileInfoItem[]>(() => {
	const social = profile.value?.social
	const items: ProfileInfoItem[] = []

	if (displayCountryOrRegion.value) {
		items.push({
			label: t('profile.public.fields.countryOrRegion'),
			value: displayCountryOrRegion.value,
		})
	}

	if (profile.value?.location) {
		items.push({
			label: t('profile.public.fields.location'),
			value: profile.value.location,
		})
	}

	if (profile.value?.schoolOrCompany) {
		items.push({
			label: t('profile.public.fields.schoolOrCompany'),
			value: profile.value.schoolOrCompany,
		})
	}

	if (profile.value?.occupationOrMajor) {
		items.push({
			label: t('profile.public.fields.occupationOrMajor'),
			value: profile.value.occupationOrMajor,
		})
	}

	if (social?.websiteUrl) {
		items.push({
			label: t('profile.public.social.website'),
			value: stripProtocol(social.websiteUrl),
			href: social.websiteUrl,
		})
	}

	if (social?.publicEmail) {
		items.push({
			label: t('profile.public.social.publicEmail'),
			value: social.publicEmail,
		})
	}

	return items
})

const hasAboutItems = computed(() => aboutItems.value.length > 0)

const socialActions = computed<SocialAction[]>(() => {
	const social = profile.value?.social

	if (!social) {
		return []
	}

	const actions: SocialAction[] = []

	if (social.githubUsername) {
		const githubPreview = createSocialPreviewLink(
			'https://github.com/',
			extractPathSegment(social.githubUsername, 'https://github.com/'),
		)

		if (githubPreview) {
			actions.push({
				label: 'GitHub',
				icon: 'i-lucide-github',
				href: githubPreview.href,
			})
		}
	}

	if (social.bilibiliUrl) {
		const bilibiliPreview = createSocialPreviewLink(
			'https://space.bilibili.com/',
			extractBilibiliId(social.bilibiliUrl),
		)

		if (bilibiliPreview) {
			actions.push({
				label: 'Bilibili',
				logoSvg: bilibiliLogo,
				href: bilibiliPreview.href,
			})
		}
	}

	if (social.qqNumber) {
		actions.push({
			label: 'QQ',
			logoSvg: qqLogo,
			copyValue: social.qqNumber,
		})
	}

	if (social.wechatId) {
		actions.push({
			label: t('profile.public.social.wechatId'),
			logoSvg: wechatLogo,
			copyValue: social.wechatId,
		})
	}

	return actions
})

const hasSocialActions = computed<boolean>(() => socialActions.value.length > 0)

// Minecraft 账号数组 + 选中态（复刻 /me/minecraft 的选中逻辑，裁掉 save/bind）。
const { data: minecraftAccountsData, pending: minecraftAccountsPending } =
	await useFetch<MinecraftAccountsResponse>(
		() => `/api/public/users/${username.value}/minecraft-accounts`,
		{
			default: () => ({ accounts: [] }),
		},
	)
const minecraftAccounts = computed<MinecraftAccountForm[]>(
	() => minecraftAccountsData.value?.accounts ?? [],
)
const { data: historicalMinecraftAccountsData } =
	await useFetch<MinecraftAccountsResponse>(
		() => `/api/public/users/${username.value}/historical-minecraft-accounts`,
		{
			default: () => ({ accounts: [] }),
		},
	)
const historicalAccounts = computed<MinecraftAccountForm[]>(
	() => historicalMinecraftAccountsData.value?.accounts ?? [],
)

// 最近活动事件流。
const { data: activityData, pending: activityPending } =
	await useFetch<PublicActivityResponse>(
		() => `/api/public/users/${username.value}/activity`,
		{
			default: () => ({ events: [] }),
		},
	)
const activityEvents = computed<PublicActivityEvent[]>(
	() => activityData.value?.events ?? [],
)
const getActivityEventIcon = (type: PublicActivityEvent['type']): string => {
	switch (type) {
		case 'SESSION_OPENED':
			return 'i-lucide-log-in'
		case 'SESSION_CLOSED':
			return 'i-lucide-log-out'
		case 'ADVANCEMENT_UNLOCKED':
			return 'i-lucide-trophy'
		case 'USER_REGISTERED':
			return 'i-lucide-user-plus'
		case 'BINDING_CHANGED':
			return 'i-lucide-link'
		default:
			return 'i-lucide-circle'
	}
}
const getActivityEventLabel = (event: PublicActivityEvent): string => {
	switch (event.type) {
		case 'SESSION_OPENED':
			return t('profile.public.activity.sessionOpened')
		case 'SESSION_CLOSED':
			return t('profile.public.activity.sessionClosed')
		case 'ADVANCEMENT_UNLOCKED':
			return t('profile.public.activity.advancementUnlocked')
		case 'USER_REGISTERED':
			return t('profile.public.activity.userRegistered')
		case 'BINDING_CHANGED': {
			const labelKey =
				event.detail && event.detail in ACTIVITY_BINDING_LABEL_KEY_BY_DETAIL
					? ACTIVITY_BINDING_LABEL_KEY_BY_DETAIL[
							event.detail as keyof typeof ACTIVITY_BINDING_LABEL_KEY_BY_DETAIL
						]
					: 'profile.public.activity.binding.unknown'

			return t(labelKey)
		}
		default:
			return t('profile.public.activity.unknown')
	}
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'medium',
	}).format(dayjs(value).toDate())
}

function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(dayjs(value).toDate())
}

function formatDateText(value: string): string {
	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'long',
	}).format(dayjs(value).toDate())
}

function formatBirthdayDateParts(value: string): string {
	const parsed = dayjs(value)

	if (!parsed.isValid()) {
		return formatDateText(value)
	}

	if (locale.value === 'en-US') {
		return formatDateText(value)
	}

	return [
		parsed.year(),
		t('profile.dateParts.year'),
		parsed.month() + 1,
		t('profile.dateParts.month'),
		parsed.date(),
		t('profile.dateParts.day'),
	].join('')
}

function stripProtocol(value: string): string {
	return value.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

async function handleSocialAction(action: SocialAction): Promise<void> {
	if (action.href) {
		await navigateTo(action.href, {
			external: true,
			open: {
				target: '_blank',
			},
		})
		return
	}

	if (!action.copyValue) {
		return
	}

	try {
		await navigator.clipboard.writeText(action.copyValue)
		toast.add({
			title: t('profile.notifications.copied'),
			color: 'success',
			icon: 'i-lucide-check',
		})
	} catch {
		toast.add({
			title: t('profile.notifications.saveFailed'),
			color: 'error',
			icon: 'i-lucide-circle-alert',
		})
	}
}

useExplicitRouteTitle(pageTitle)
</script>
