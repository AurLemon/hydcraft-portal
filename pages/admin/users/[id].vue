<template>
	<div class="-mt-2">
		<div
			class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
		>
			<div class="flex min-w-0 items-center gap-4">
				<UAvatar
					:src="user?.avatarUrl || undefined"
					:alt="user?.displayName || user?.username"
					size="3xl"
				/>
				<div class="min-w-0">
					<h1
						class="truncate text-2xl font-semibold text-slate-950 dark:text-white"
					>
						{{
							user?.displayName ||
							user?.username ||
							t('admin.users.edit.fallbackTitle')
						}}
					</h1>
					<p class="mt-1 font-mono text-xs text-slate-500">
						{{ user?.id ?? id }}
					</p>
				</div>
			</div>
			<UButton
				:to="localePath('/admin/users')"
				color="primary"
				variant="ghost"
				icon="i-lucide-arrow-left"
				class="-ml-2"
			>
				{{ t('admin.users.edit.back') }}
			</UButton>
		</div>

		<div
			v-if="pending && !user"
			class="mt-8 grid w-full gap-5 lg:columns-2 [&>section]:mb-5"
		>
			<USkeleton
				v-for="index in 4"
				:key="index"
				class="mb-5 h-56 rounded-lg break-inside-avoid"
			/>
		</div>

		<UAlert
			v-else-if="error || !user"
			color="error"
			icon="i-lucide-circle-alert"
			:title="t('admin.users.edit.loadFailed')"
			class="mt-8"
		/>

		<form
			v-else
			class="mt-8 w-full gap-5 lg:columns-2 [&>section]:mb-5"
			@submit.prevent
		>
			<AdminUserIdentitySection
				v-model:form="form"
				:submitting="savingSection === 'identity'"
				:regenerating="savingSection === 'hydroline'"
				:role-items="roleItems"
				:status-items="statusItems"
				@submit="saveIdentity"
				@regenerate-hydroline="regenerateHydrolineId"
			/>
			<AdminUserProfileSection
				v-model:form="form"
				:submitting="savingSection === 'profile'"
				:country-items="localizedCountryItems"
				@submit="saveProfile"
			/>
			<AdminUserAttachmentsSection
				:user="user"
				:avatar-uploading="savingSection === 'avatar'"
				:cover-uploading="savingSection === 'cover'"
				@avatar-uploaded="handleAvatarUploaded"
				@cover-uploaded="handleCoverUploaded"
				@reset-avatar="resetAvatar"
				@reset-cover="resetCover"
			/>
			<AdminUserMinecraftSection
				:accounts="user.minecraftAccounts"
				:binding="savingSection === 'minecraft-bind'"
				:unbinding-account-id="unbindingMinecraftAccountId"
				:primary-account-id="primaryMinecraftAccountId"
				@bind="bindMinecraftAccount"
				@set-primary="setPrimaryMinecraftAccount"
				@unbind="unbindMinecraftAccount"
			/>
			<AdminUserPreferencesSection
				v-model:form="form"
				:submitting="savingSection === 'preferences'"
				@submit="savePreferences"
			/>
			<AdminUserSocialSection
				v-model:form="form"
				:submitting="savingSection === 'social'"
				@submit="saveSocial"
			/>
			<AdminUserAchievementsSection
				v-model:form="form"
				:available-badges="availableBadges"
				:submitting="savingSection === 'achievements'"
				@submit="saveAchievements"
			/>
			<AdminUserPrivacySection v-model:form="form" />
		</form>
	</div>
</template>

<script setup lang="ts">
import type {
	AdminAchievementsResponse,
	AdminUser,
} from '~/components/admin/types'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	assignAdminUserForm,
	buildLocalizedCountryItems,
	createEmptyAdminUserForm,
	type AdminUserForm,
	type AdminUserSaveSection,
	type AdminUserSelectItem,
} from '~/utils/admin-user-edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()

const id = computed(() => String(route.params.id))

const {
	data: user,
	pending,
	error,
} = await useFetch<AdminUser>(() => `/api/admin/users/${id.value}`, {
	key: () => `admin-user-${id.value}`,
})
const { data: achievementsData } = await useFetch<AdminAchievementsResponse>(
	'/api/admin/achievements',
)

const availableBadges = computed(() =>
	(achievementsData.value?.badges ?? []).filter((badge) => badge.enabled),
)

const form = reactive<AdminUserForm>(createEmptyAdminUserForm())
const savingSection = ref<AdminUserSaveSection | null>(null)
const unbindingMinecraftAccountId = ref<string | null>(null)
const primaryMinecraftAccountId = ref<string | null>(null)
const privacySnapshot = ref('')
const skipUserWatchSync = ref(false)
let privacySaveTimer: ReturnType<typeof setTimeout> | null = null

const roleItems: AdminUserSelectItem[] = [
	{ label: 'USER', value: 'USER' },
	{ label: 'MEMBER', value: 'MEMBER' },
	{ label: 'ADMIN', value: 'ADMIN' },
	{ label: 'OWNER', value: 'OWNER' },
]
const statusItems: AdminUserSelectItem[] = [
	{ label: 'PENDING', value: 'PENDING' },
	{ label: 'ACTIVE', value: 'ACTIVE' },
	{ label: 'DISABLED', value: 'DISABLED' },
	{ label: 'BANNED', value: 'BANNED' },
]
const localizedCountryItems = computed<AdminUserSelectItem[]>(() =>
	buildLocalizedCountryItems(t),
)

watch(
	user,
	(value) => {
		if (!value) {
			return
		}

		if (skipUserWatchSync.value) {
			skipUserWatchSync.value = false
			privacySnapshot.value = JSON.stringify(form.privacy)
			return
		}

		assignAdminUserForm(form, value)
		privacySnapshot.value = JSON.stringify(form.privacy)
	},
	{ immediate: true },
)

onBeforeUnmount(() => {
	if (privacySaveTimer) {
		clearTimeout(privacySaveTimer)
	}
})

const syncAdminFormSection = (
	nextUser: AdminUser,
	section: AdminUserSaveSection,
): void => {
	const nextForm = createEmptyAdminUserForm()
	assignAdminUserForm(nextForm, nextUser)

	switch (section) {
		case 'identity':
			form.username = nextForm.username
			form.hydrolineId = nextForm.hydrolineId
			form.displayName = nextForm.displayName
			form.joinedAt = nextForm.joinedAt
			form.role = nextForm.role
			form.status = nextForm.status
			form.statusReason = nextForm.statusReason
			return
		case 'hydroline':
			form.hydrolineId = nextForm.hydrolineId
			return
		case 'profile':
			form.bio = nextForm.bio
			form.location = nextForm.location
			form.countryOrRegion = nextForm.countryOrRegion
			form.birthday = nextForm.birthday
			return
		case 'avatar':
			return
		case 'cover':
			return
		case 'minecraft-bind':
			return
		case 'preferences':
			form.preferences = nextForm.preferences
			return
		case 'social':
			form.social = nextForm.social
			return
		case 'achievements':
			form.verified = nextForm.verified
			form.verifiedTextZhCn = nextForm.verifiedTextZhCn
			form.verifiedTextZhTw = nextForm.verifiedTextZhTw
			form.verifiedTextEnUs = nextForm.verifiedTextEnUs
			form.verifiedTextJaJp = nextForm.verifiedTextJaJp
			form.badgeIds = nextForm.badgeIds
			return
		case 'privacy':
			form.privacy = nextForm.privacy
			return
	}
}

const patchAdminUser = async (
	section: AdminUserSaveSection,
	body: Record<string, unknown>,
	options: {
		successTitle?: string
		silentSuccess?: boolean
	} = {},
): Promise<AdminUser | null> => {
	if (!user.value) {
		return null
	}

	savingSection.value = section

	try {
		const updated = await $fetch<AdminUser>(
			`/api/admin/users/${user.value.id}`,
			{
				method: 'PATCH',
				body,
			},
		)
		skipUserWatchSync.value = true
		user.value = updated
		syncAdminFormSection(updated, section)

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

const saveIdentity = async (): Promise<void> => {
	await patchAdminUser('identity', {
		username: form.username,
		displayName: form.displayName,
		joinedAt: form.joinedAt,
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

watch(
	() => form.privacy,
	() => {
		const nextSnapshot = JSON.stringify(form.privacy)
		if (!privacySnapshot.value) {
			privacySnapshot.value = nextSnapshot
			return
		}

		if (nextSnapshot === privacySnapshot.value) {
			return
		}

		privacySnapshot.value = nextSnapshot

		if (privacySaveTimer) {
			clearTimeout(privacySaveTimer)
		}

		privacySaveTimer = setTimeout(() => {
			privacySaveTimer = null
			void savePrivacy()
		}, 500)
	},
	{ deep: true },
)

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

const bindMinecraftAccount = async (username: string): Promise<void> => {
	if (!user.value || !username.trim()) {
		return
	}

	savingSection.value = 'minecraft-bind'

	try {
		const updated = await $fetch<AdminUser>(
			`/api/admin/users/${user.value.id}/minecraft-accounts`,
			{
				method: 'POST',
				body: {
					username,
				},
			},
		)
		skipUserWatchSync.value = true
		user.value = updated
		notifySuccess({
			title: t('admin.users.minecraft.notifications.bindSuccess'),
		})
	} catch (bindError) {
		notifyError(bindError, {
			title: t('admin.users.minecraft.notifications.bindFailed'),
		})
	} finally {
		savingSection.value = null
	}
}

const unbindMinecraftAccount = async (accountId: string): Promise<void> => {
	if (!user.value || !accountId || unbindingMinecraftAccountId.value) {
		return
	}

	unbindingMinecraftAccountId.value = accountId

	try {
		const updated = await $fetch<AdminUser>(
			`/api/admin/users/${user.value.id}/minecraft-accounts/${accountId}`,
			{
				method: 'DELETE',
			},
		)
		skipUserWatchSync.value = true
		user.value = updated
		notifySuccess({
			title: t('admin.users.minecraft.notifications.unbindSuccess'),
		})
	} catch (unbindError) {
		notifyError(unbindError, {
			title: t('admin.users.minecraft.notifications.unbindFailed'),
		})
	} finally {
		unbindingMinecraftAccountId.value = null
	}
}

const setPrimaryMinecraftAccount = async (accountId: string): Promise<void> => {
	if (!user.value || !accountId || primaryMinecraftAccountId.value) {
		return
	}

	primaryMinecraftAccountId.value = accountId

	try {
		const updated = await $fetch<AdminUser>(
			`/api/admin/users/${user.value.id}/minecraft-accounts/${accountId}`,
			{
				method: 'PATCH',
				body: {
					isPrimary: true,
				},
			},
		)
		skipUserWatchSync.value = true
		user.value = updated
		notifySuccess({
			title: t('admin.users.minecraft.notifications.primarySetSuccess'),
		})
	} catch (setPrimaryError) {
		notifyError(setPrimaryError, {
			title: t('admin.users.minecraft.notifications.primarySetFailed'),
		})
	} finally {
		primaryMinecraftAccountId.value = null
	}
}
</script>
