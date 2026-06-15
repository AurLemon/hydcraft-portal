<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-3xl', body: 'p-0' }"
		@update:open="$emit('update:open', $event)"
	>
		<template #content>
			<div v-if="user" class="max-h-[86dvh] overflow-y-auto p-5 sm:p-6">
				<div class="flex items-start justify-between gap-4">
					<div class="flex min-w-0 items-center gap-4">
						<UAvatar
							:src="user.avatarUrl || undefined"
							:alt="user.displayName || user.username"
							size="3xl"
						/>
						<div class="min-w-0">
							<h2
								class="truncate text-2xl font-semibold text-slate-950 dark:text-white"
							>
								{{ user.displayName || user.username }}
							</h2>
							<p class="mt-1 font-mono text-xs text-slate-500">
								{{ user.id }}
							</p>
						</div>
					</div>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						@click="$emit('update:open', false)"
					/>
				</div>

				<div class="mt-6 grid gap-5">
					<section :class="sectionClass">
						<div :class="sectionHeaderClass">
							<h3 :class="sectionTitleClass">
								{{ t('admin.users.sections.identity') }}
							</h3>
							<UButton
								type="button"
								color="primary"
								variant="link"
								icon="i-lucide-check"
								:loading="savingSection === 'identity'"
								@click="saveIdentity"
							>
								{{ t('admin.actions.save') }}
							</UButton>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.username') }}</span>
								<UInput v-model="form.username" />
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.displayName') }}</span>
								<UInput v-model="form.displayName" />
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.createdAt') }}</span>
								<AdminDatePartsField
									v-model="form.createdAt"
									:allow-empty="false"
								/>
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.hydrolineId') }}</span>
								<div class="flex flex-col gap-2 sm:flex-row">
									<UInput
										:model-value="form.hydrolineId"
										readonly
										class="min-w-0 flex-1 font-mono"
									/>
									<UButton
										type="button"
										color="neutral"
										variant="soft"
										icon="i-lucide-refresh-cw"
										:loading="savingSection === 'hydroline'"
										@click="regenerateHydrolineId"
									>
										{{ t('admin.users.actions.regenerateHydrolineId') }}
									</UButton>
								</div>
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.role') }}</span>
								<USelect v-model="form.role" :items="roleItems" />
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.status') }}</span>
								<USelect v-model="form.status" :items="statusItems" />
							</label>
							<label :class="[fieldClass, 'md:col-span-2']">
								<span>{{ t('admin.users.fields.statusReason') }}</span>
								<UInput v-model="form.statusReason" />
							</label>
						</div>
					</section>

					<section :class="sectionClass">
						<div :class="sectionHeaderClass">
							<h3 :class="sectionTitleClass">
								{{ t('admin.users.sections.profile') }}
							</h3>
							<UButton
								type="button"
								color="primary"
								variant="link"
								icon="i-lucide-check"
								:loading="savingSection === 'profile'"
								@click="saveProfile"
							>
								{{ t('admin.actions.save') }}
							</UButton>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<label :class="[fieldClass, 'md:col-span-2']">
								<span>{{ t('admin.users.fields.bio') }}</span>
								<UTextarea v-model="form.bio" :rows="4" />
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.location') }}</span>
								<UInput v-model="form.location" />
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.countryOrRegion') }}</span>
								<USelect
									v-model="form.countryOrRegion"
									:items="localizedCountryItems"
								/>
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.birthday') }}</span>
								<AdminDatePartsField v-model="form.birthday" />
							</label>
						</div>
					</section>

					<section :class="sectionClass">
						<h3 :class="sectionTitleClass">
							{{ t('admin.users.sections.attachments') }}
						</h3>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="grid gap-2.5 text-sm">
								<span class="text-slate-500 dark:text-slate-400">
									{{ t('admin.users.fields.avatarUrl') }}
								</span>
								<div :class="mediaFrameClass">
									<USkeleton
										v-if="avatarPreviewUrl && !avatarPreviewReady"
										class="absolute inset-0"
									/>
									<img
										v-if="avatarPreviewUrl && !avatarPreviewFailed"
										:src="avatarPreviewUrl"
										:alt="user.displayName || user.username"
										class="h-full w-full object-cover transition-opacity duration-200"
										:class="avatarPreviewReady ? 'opacity-100' : 'opacity-0'"
										loading="lazy"
										decoding="async"
										@load="avatarPreviewReady = true"
										@error="markAvatarPreviewFailed"
									/>
									<div v-else :class="mediaEmptyClass">
										<UIcon name="i-lucide-image-off" class="h-5 w-5" />
										<span>{{ t('admin.users.media.avatarEmpty') }}</span>
									</div>
								</div>
								<div class="flex flex-wrap gap-2">
									<AttachmentUploadButton
										purpose="user-avatar"
										owner-type="user"
										:owner-id="user.id"
										preview-shape="circle"
										icon="i-lucide-upload"
										@uploaded="handleAvatarUploaded"
									>
										{{ t('admin.users.actions.uploadAvatar') }}
									</AttachmentUploadButton>
									<UButton
										type="button"
										size="sm"
										color="neutral"
										variant="soft"
										icon="i-lucide-rotate-ccw"
										:loading="savingSection === 'avatar'"
										@click="resetAvatar"
									>
										{{ t('admin.users.actions.resetAvatar') }}
									</UButton>
								</div>
							</div>
							<div class="grid gap-2.5 text-sm">
								<span class="text-slate-500 dark:text-slate-400">
									{{ t('admin.users.fields.coverUrl') }}
								</span>
								<div :class="mediaFrameClass">
									<USkeleton
										v-if="coverPreviewUrl && !coverPreviewReady"
										class="absolute inset-0"
									/>
									<img
										v-if="coverPreviewUrl && !coverPreviewFailed"
										:src="coverPreviewUrl"
										:alt="user.displayName || user.username"
										class="h-full w-full object-cover transition-opacity duration-200"
										:class="coverPreviewReady ? 'opacity-100' : 'opacity-0'"
										loading="lazy"
										decoding="async"
										@load="coverPreviewReady = true"
										@error="markCoverPreviewFailed"
									/>
									<div v-else :class="mediaEmptyClass">
										<UIcon name="i-lucide-image-off" class="h-5 w-5" />
										<span>{{ t('admin.users.media.coverEmpty') }}</span>
									</div>
								</div>
								<div class="flex flex-wrap gap-2">
									<AttachmentUploadButton
										purpose="user-cover"
										owner-type="user"
										:owner-id="user.id"
										preview-shape="cover"
										icon="i-lucide-upload"
										@uploaded="handleCoverUploaded"
									>
										{{ t('admin.users.actions.uploadCover') }}
									</AttachmentUploadButton>
									<UButton
										type="button"
										size="sm"
										color="neutral"
										variant="soft"
										icon="i-lucide-rotate-ccw"
										:loading="savingSection === 'cover'"
										@click="resetCover"
									>
										{{ t('admin.users.actions.resetCover') }}
									</UButton>
								</div>
							</div>
							<div :class="[readonlyFieldClass, 'md:col-span-2']">
								<span>{{ t('admin.users.fields.avatarAttachmentId') }}</span>
								<strong>{{ user.avatarAttachmentId || '-' }}</strong>
							</div>
							<div :class="[readonlyFieldClass, 'md:col-span-2']">
								<span>{{ t('admin.users.fields.coverAttachmentId') }}</span>
								<strong>{{ user.coverAttachmentId || '-' }}</strong>
							</div>
						</div>
					</section>

					<section :class="sectionClass">
						<div :class="sectionHeaderClass">
							<h3 :class="sectionTitleClass">
								{{ t('admin.users.sections.preferences') }}
							</h3>
							<UButton
								type="button"
								color="primary"
								variant="link"
								icon="i-lucide-check"
								:loading="savingSection === 'preferences'"
								@click="savePreferences"
							>
								{{ t('admin.actions.save') }}
							</UButton>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.language') }}</span>
								<USelect
									v-model="form.preferences.language"
									:items="languageItems"
								/>
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.timezoneMode') }}</span>
								<USelect
									v-model="form.preferences.timezoneMode"
									:items="timezoneModeItems"
								/>
							</label>
							<label :class="[fieldClass, 'md:col-span-2']">
								<span>{{ t('admin.users.fields.timezone') }}</span>
								<USelect
									v-model="form.preferences.timezone"
									:items="timezoneItems"
								/>
							</label>
						</div>
					</section>

					<section :class="sectionClass">
						<div :class="sectionHeaderClass">
							<h3 :class="sectionTitleClass">
								{{ t('admin.users.sections.social') }}
							</h3>
							<UButton
								type="button"
								color="primary"
								variant="link"
								icon="i-lucide-check"
								:loading="savingSection === 'social'"
								@click="saveSocial"
							>
								{{ t('admin.actions.save') }}
							</UButton>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<label :class="fieldClass">
								<span>GitHub</span>
								<UInput v-model="form.social.githubUsername" />
							</label>
							<label :class="fieldClass">
								<span>Wiki</span>
								<UInput v-model="form.social.h2wikiPageName" />
							</label>
							<label :class="fieldClass">
								<span>{{ t('admin.users.fields.websiteUrl') }}</span>
								<UInput v-model="form.social.websiteUrl" />
							</label>
							<label :class="fieldClass">
								<span>Bilibili</span>
								<UInput v-model="form.social.bilibiliUrl" />
							</label>
							<label :class="fieldClass">
								<span>QQ</span>
								<UInput v-model="form.social.qqNumber" />
							</label>
							<label :class="fieldClass">
								<span>微信</span>
								<UInput v-model="form.social.wechatId" />
							</label>
							<label :class="[fieldClass, 'md:col-span-2']">
								<span>{{ t('admin.users.fields.publicEmail') }}</span>
								<UInput v-model="form.social.publicEmail" />
							</label>
						</div>
					</section>

					<section :class="sectionClass">
						<div :class="sectionHeaderClass">
							<h3 :class="sectionTitleClass">
								{{ t('admin.users.sections.achievements') }}
							</h3>
							<UButton
								type="button"
								color="primary"
								variant="link"
								icon="i-lucide-check"
								:loading="savingSection === 'achievements'"
								@click="saveAchievements"
							>
								{{ t('admin.actions.save') }}
							</UButton>
						</div>
						<div class="grid gap-4">
							<div class="grid gap-2">
								<span class="text-sm text-slate-500 dark:text-slate-400">
									{{ t('admin.users.fields.badges') }}
								</span>
								<label
									v-for="badge in availableBadges"
									:key="badge.id"
									class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
								>
									<span class="text-slate-800 dark:text-slate-100">
										{{ badge.labelZhCn }}
									</span>
									<UCheckbox
										:model-value="form.badgeIds.includes(badge.id)"
										@update:model-value="toggleBadge(badge.id, $event)"
									/>
								</label>
							</div>
							<div class="grid gap-2">
								<span class="text-sm text-slate-500 dark:text-slate-400">
									{{ t('admin.users.fields.verified') }}
								</span>
								<label
									class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
								>
									<span class="text-slate-700 dark:text-slate-200">
										{{ t('admin.users.fields.verified') }}
									</span>
									<USwitch v-model="form.verified" />
								</label>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label :class="fieldClass">
									<span>简体中文</span>
									<UInput v-model="form.verifiedTextZhCn" />
								</label>
								<label :class="fieldClass">
									<span>繁體中文</span>
									<UInput v-model="form.verifiedTextZhTw" />
								</label>
								<label :class="fieldClass">
									<span>English</span>
									<UInput v-model="form.verifiedTextEnUs" />
								</label>
								<label :class="fieldClass">
									<span>日本語</span>
									<UInput v-model="form.verifiedTextJaJp" />
								</label>
							</div>
						</div>
					</section>

					<section :class="sectionClass">
						<h3 :class="sectionTitleClass">
							{{ t('admin.users.sections.privacy') }}
						</h3>
						<div class="grid gap-3 md:grid-cols-3">
							<label
								v-for="item in privacyItems"
								:key="item.key"
								class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
							>
								<span>{{ item.label }}</span>
								<USwitch
									:model-value="form.privacy[item.key]"
									@update:model-value="setPrivacyValue(item.key, $event)"
								/>
							</label>
						</div>
					</section>
				</div>

				<div class="mt-6 flex justify-end">
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						@click="$emit('update:open', false)"
					>
						{{ t('admin.actions.cancel') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type {
	AdminBadge,
	AdminUser,
	AdminUserRole,
	AdminUserStatus,
} from '~/components/admin/types'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	countryItems,
	languageItems,
	privacyItems,
	timezoneItems,
	type PrivacyKey,
	type ProfileLanguage,
	type TimezoneMode,
} from '~/utils/profile-edit'

interface SelectItem {
	label: string
	value: string
}

interface AdminUserForm {
	username: string
	hydrolineId: string
	displayName: string
	createdAt: string
	bio: string
	location: string
	countryOrRegion: string
	birthday: string
	role: AdminUserRole
	status: AdminUserStatus
	statusReason: string
	verified: boolean
	verifiedTextZhCn: string
	verifiedTextZhTw: string
	verifiedTextEnUs: string
	verifiedTextJaJp: string
	badgeIds: string[]
	preferences: {
		language: ProfileLanguage
		timezoneMode: TimezoneMode
		timezone: string
	}
	social: {
		h2wikiPageName: string
		githubUsername: string
		websiteUrl: string
		bilibiliUrl: string
		qqNumber: string
		wechatId: string
		publicEmail: string
	}
	privacy: Record<PrivacyKey, boolean>
}

type AdminUserSaveSection =
	| 'identity'
	| 'hydroline'
	| 'profile'
	| 'avatar'
	| 'cover'
	| 'preferences'
	| 'social'
	| 'achievements'
	| 'privacy'

const props = defineProps<{
	open: boolean
	user: AdminUser | null
	availableBadges: AdminBadge[]
	roleItems: SelectItem[]
	statusItems: SelectItem[]
}>()

const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: [user: AdminUser]
}>()

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const savingSection = ref<AdminUserSaveSection | null>(null)
const avatarPreviewReady = ref(false)
const avatarPreviewFailed = ref(false)
const coverPreviewReady = ref(false)
const coverPreviewFailed = ref(false)
let privacySaveTimer: ReturnType<typeof setTimeout> | null = null

const sectionClass =
	'grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900'
const sectionHeaderClass = 'flex items-center justify-between gap-3'
const sectionTitleClass =
	'flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white'
const fieldClass =
	'grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 dark:[&>span]:text-slate-400'
const readonlyFieldClass =
	'grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 [&>span]:text-slate-500 dark:[&>span]:text-slate-400 [&>strong]:break-all [&>strong]:font-mono [&>strong]:text-xs [&>strong]:text-slate-950 dark:[&>strong]:text-slate-100'
const mediaFrameClass =
	'relative flex h-36 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
const mediaEmptyClass =
	'flex h-full w-full items-center justify-center gap-2 p-4 text-center text-sm text-slate-500 dark:text-slate-400'

const timezoneModeItems = [
	{ label: 'AUTO', value: 'AUTO' },
	{ label: 'MANUAL', value: 'MANUAL' },
]

const createEmptyForm = (): AdminUserForm => ({
	username: '',
	hydrolineId: '',
	displayName: '',
	createdAt: '',
	bio: '',
	location: '',
	countryOrRegion: '',
	birthday: '',
	role: 'USER',
	status: 'ACTIVE',
	statusReason: '',
	verified: false,
	verifiedTextZhCn: '',
	verifiedTextZhTw: '',
	verifiedTextEnUs: '',
	verifiedTextJaJp: '',
	badgeIds: [],
	preferences: {
		language: 'ZH_CN',
		timezoneMode: 'AUTO',
		timezone: 'Asia/Shanghai',
	},
	social: {
		h2wikiPageName: '',
		githubUsername: '',
		websiteUrl: '',
		bilibiliUrl: '',
		qqNumber: '',
		wechatId: '',
		publicEmail: '',
	},
	privacy: Object.fromEntries(
		privacyItems.map((item) => [item.key, true]),
	) as Record<PrivacyKey, boolean>,
})

const form = reactive(createEmptyForm())
const avatarPreviewUrl = computed(() => props.user?.avatarUrl || '')
const coverPreviewUrl = computed(() => props.user?.coverUrl || '')
const localizedCountryItems = computed<SelectItem[]>(() =>
	countryItems.map((item) => ({
		value: item.value,
		label: t(`profile.options.country.${item.key}`),
	})),
)

const assignForm = (user: AdminUser): void => {
	form.username = user.username
	form.hydrolineId = user.hydrolineId
	form.displayName = user.displayName ?? ''
	form.createdAt = dayjs(user.createdAt).format('YYYY-MM-DD')
	form.bio = user.bio ?? ''
	form.location = user.location ?? ''
	form.countryOrRegion = user.countryOrRegion ?? ''
	form.birthday = user.birthday ? dayjs(user.birthday).format('YYYY-MM-DD') : ''
	form.role = user.role
	form.status = user.status
	form.statusReason = user.statusReason ?? ''
	form.verified = user.verified
	form.verifiedTextZhCn = user.verifiedTextZhCn ?? ''
	form.verifiedTextZhTw = user.verifiedTextZhTw ?? ''
	form.verifiedTextEnUs = user.verifiedTextEnUs ?? ''
	form.verifiedTextJaJp = user.verifiedTextJaJp ?? ''
	form.badgeIds = user.badges
		.map((badge) => badge.badgeId)
		.filter((badgeId): badgeId is string => Boolean(badgeId))
	form.preferences.language = user.preferences?.language ?? 'ZH_CN'
	form.preferences.timezoneMode = user.preferences?.timezoneMode ?? 'AUTO'
	form.preferences.timezone = user.preferences?.timezone ?? 'Asia/Shanghai'
	form.social.h2wikiPageName = user.profile?.h2wikiPageName ?? ''
	form.social.githubUsername = user.profile?.githubUsername ?? ''
	form.social.websiteUrl = user.profile?.websiteUrl ?? ''
	form.social.bilibiliUrl = user.profile?.bilibiliUrl ?? ''
	form.social.qqNumber = user.profile?.qqNumber ?? ''
	form.social.wechatId = user.profile?.wechatId ?? ''
	form.social.publicEmail = user.profile?.publicEmail ?? ''

	for (const item of privacyItems) {
		form.privacy[item.key] = user.privacy?.[item.key] ?? true
	}
}

watch(
	() => props.user,
	(user) => {
		if (user) {
			assignForm(user)
		}
	},
	{ immediate: true },
)
watch(avatarPreviewUrl, () => {
	avatarPreviewReady.value = false
	avatarPreviewFailed.value = false
})
watch(coverPreviewUrl, () => {
	coverPreviewReady.value = false
	coverPreviewFailed.value = false
})

onBeforeUnmount(() => {
	if (privacySaveTimer) {
		clearTimeout(privacySaveTimer)
	}
})

const markAvatarPreviewFailed = (): void => {
	avatarPreviewReady.value = true
	avatarPreviewFailed.value = true
}

const markCoverPreviewFailed = (): void => {
	coverPreviewReady.value = true
	coverPreviewFailed.value = true
}

const patchAdminUser = async (
	section: AdminUserSaveSection,
	body: Record<string, unknown>,
	options: {
		successTitle?: string
		silentSuccess?: boolean
	} = {},
): Promise<AdminUser | null> => {
	if (!props.user) {
		return null
	}

	savingSection.value = section

	try {
		const updated = await $fetch<AdminUser>(
			`/api/admin/users/${props.user.id}`,
			{
				method: 'PATCH',
				body,
			},
		)
		assignForm(updated)
		emit('saved', updated)

		if (!options.silentSuccess) {
			notifySuccess({
				title: options.successTitle ?? t('admin.users.notifications.saved'),
			})
		}

		return updated
	} catch (saveError) {
		notifyError(saveError, {
			title: t('admin.users.notifications.saveFailed'),
		})
		return null
	} finally {
		savingSection.value = null
	}
}

const toggleBadge = (
	badgeId: string,
	checked: boolean | 'indeterminate',
): void => {
	if (checked === true && !form.badgeIds.includes(badgeId)) {
		form.badgeIds.push(badgeId)
		return
	}

	if (checked !== true) {
		form.badgeIds = form.badgeIds.filter((item) => item !== badgeId)
	}
}

const saveIdentity = async (): Promise<void> => {
	await patchAdminUser('identity', {
		username: form.username,
		displayName: form.displayName,
		createdAt: form.createdAt,
		role: form.role,
		status: form.status,
		statusReason: form.statusReason,
	})
}

const regenerateHydrolineId = async (): Promise<void> => {
	await patchAdminUser('hydroline', {
		regenerateHydrolineId: true,
	})
}

const saveProfile = async (): Promise<void> => {
	await patchAdminUser('profile', {
		bio: form.bio,
		location: form.location,
		countryOrRegion: form.countryOrRegion,
		birthday: form.birthday || null,
	})
}

const savePreferences = async (): Promise<void> => {
	await patchAdminUser('preferences', {
		preferences: form.preferences,
	})
}

const saveSocial = async (): Promise<void> => {
	await patchAdminUser('social', {
		social: form.social,
	})
}

const saveAchievements = async (): Promise<void> => {
	await patchAdminUser('achievements', {
		badgeIds: form.badgeIds,
		verified: form.verified,
		verifiedTextZhCn: form.verifiedTextZhCn,
		verifiedTextZhTw: form.verifiedTextZhTw,
		verifiedTextEnUs: form.verifiedTextEnUs,
		verifiedTextJaJp: form.verifiedTextJaJp,
	})
}

const savePrivacy = async (): Promise<void> => {
	await patchAdminUser(
		'privacy',
		{
			privacy: form.privacy,
		},
		{
			silentSuccess: true,
		},
	)
}

const setPrivacyValue = (
	key: PrivacyKey,
	value: boolean | 'indeterminate',
): void => {
	form.privacy[key] = value === true

	if (privacySaveTimer) {
		clearTimeout(privacySaveTimer)
	}

	privacySaveTimer = setTimeout(() => {
		privacySaveTimer = null
		void savePrivacy()
	}, 500)
}

const handleAvatarUploaded = async (
	result: AttachmentUploadResult,
): Promise<void> => {
	await patchAdminUser('avatar', {
		avatarAttachmentId: result.id,
	})
}

const handleCoverUploaded = async (
	result: AttachmentUploadResult,
): Promise<void> => {
	await patchAdminUser('cover', {
		coverAttachmentId: result.id,
	})
}

const resetAvatar = async (): Promise<void> => {
	await patchAdminUser('avatar', {
		resetAvatar: true,
	})
}

const resetCover = async (): Promise<void> => {
	await patchAdminUser('cover', {
		resetCover: true,
	})
}
</script>
