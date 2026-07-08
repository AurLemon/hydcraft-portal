<template>
	<div>
		<div
			class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
		>
			<div class="flex min-w-0 items-center gap-4">
				<NuxtLink
					v-if="user?.username"
					:to="localePath(`/u/${user.username}`)"
					class="shrink-0 rounded-full transition-opacity hover:opacity-90"
				>
					<UAvatar
						:src="user.avatarUrl || undefined"
						:alt="user.displayName || user.username"
						size="3xl"
					/>
				</NuxtLink>
				<UAvatar
					v-else
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
					<p class="mt-1 text-xs text-slate-500">
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
			class="mt-8 w-full gap-10 lg:columns-2 [&>section]:mb-12"
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
				:user-id="user.id"
				:accounts="user.minecraftAccounts"
				:historical-accounts="user.historicalMinecraftAccounts"
				:binding="savingSection === 'minecraft-bind'"
				:historical-binding="savingSection === 'historical-minecraft-bind'"
				:unbinding-account-id="unbindingMinecraftAccountId"
				:historical-unbinding-account-id="unbindingHistoricalMinecraftAccountId"
				:primary-account-id="primaryMinecraftAccountId"
				@bind="bindMinecraftAccount"
				@bind-historical="bindHistoricalMinecraftAccount"
				@set-primary="setPrimaryMinecraftAccount"
				@unbind="unbindMinecraftAccount"
				@unbind-historical="unbindHistoricalMinecraftAccount"
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
			<AdminUserSecuritySection
				:security="securityData?.security ?? null"
				:pending="securityPending"
				:error="Boolean(securityError)"
				:password-submitting="passwordSubmitting"
				:changing-primary-email-id="changingPrimaryEmailId"
				:deleting-email-id="deletingEmailId"
				:revoking-session-id="revokingSessionId"
				:revoking-all-sessions="revokingAllSessions"
				:unlinking-connection-id="unlinkingOAuthConnectionId"
				:preparing-delete="deletePreviewPending"
				:deleting-user="deletingUser"
				@request-password-reset="passwordModalOpen = true"
				@request-set-primary-email="openSetPrimaryEmailModal"
				@request-delete-email="openDeleteEmailModal"
				@request-revoke-session="openRevokeSessionModal"
				@request-revoke-all-sessions="revokeAllSessionsModalOpen = true"
				@request-unlink-oauth="openUnlinkOAuthModal"
				@request-delete-user="openDeleteUserModal"
			/>
		</form>

		<UModal
			:open="passwordModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="handlePasswordModalOpenChange"
		>
			<template #content>
				<form class="p-5 sm:p-6" @submit.prevent="submitPasswordReset">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
						>
							<UIcon name="i-lucide-key-round" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.passwordReset.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('admin.users.security.modals.passwordReset.description') }}
							</p>
						</div>
					</div>

					<label class="mt-6 grid gap-1.5 text-sm font-medium">
						<span>{{ t('admin.users.security.fields.newPassword') }}</span>
						<UInput
							v-model="passwordForm.password"
							type="password"
							autocomplete="new-password"
							required
						/>
					</label>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handlePasswordModalOpenChange(false)"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="submit"
							icon="i-lucide-check"
							:loading="passwordSubmitting"
							:disabled="!passwordForm.password.trim()"
						>
							{{ t('admin.users.security.actions.confirmResetPassword') }}
						</UButton>
					</div>
				</form>
			</template>
		</UModal>

		<UModal
			:open="setPrimaryEmailModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="handleSetPrimaryEmailModalOpenChange"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
						>
							<UIcon name="i-lucide-at-sign" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.setPrimaryEmail.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{
									t('admin.users.security.modals.setPrimaryEmail.description', {
										email: setPrimaryEmailTarget?.email ?? '',
									})
								}}
							</p>
						</div>
					</div>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handleSetPrimaryEmailModalOpenChange(false)"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							icon="i-lucide-check"
							:loading="changingPrimaryEmailId === setPrimaryEmailTargetId"
							@click="submitSetPrimaryEmail"
						>
							{{ t('admin.users.security.actions.confirmSetPrimaryEmail') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="deleteEmailModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="handleDeleteEmailModalOpenChange"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
						>
							<UIcon name="i-lucide-trash-2" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.deleteEmail.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{
									t('admin.users.security.modals.deleteEmail.description', {
										email: deleteEmailTarget?.email ?? '',
									})
								}}
							</p>
						</div>
					</div>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handleDeleteEmailModalOpenChange(false)"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-trash-2"
							:loading="deletingEmailId === deleteEmailTargetId"
							@click="submitDeleteEmail"
						>
							{{ t('admin.users.security.actions.confirmDeleteEmail') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="revokeSessionModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="handleRevokeSessionModalOpenChange"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
						>
							<UIcon name="i-lucide-shield-x" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.revokeSession.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{
									t('admin.users.security.modals.revokeSession.description', {
										device:
											revokeSessionTargetDeviceLabel ||
											t('admin.users.security.devices.unknown'),
									})
								}}
							</p>
						</div>
					</div>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handleRevokeSessionModalOpenChange(false)"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-shield-x"
							:loading="revokingSessionId === revokeSessionTargetId"
							@click="submitRevokeSession"
						>
							{{ t('admin.users.security.actions.confirmRevokeSession') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="revokeAllSessionsModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="revokeAllSessionsModalOpen = $event"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
						>
							<UIcon name="i-lucide-shield-x" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.revokeAllSessions.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{
									t('admin.users.security.modals.revokeAllSessions.description')
								}}
							</p>
						</div>
					</div>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="revokeAllSessionsModalOpen = false"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-shield-x"
							:loading="revokingAllSessions"
							@click="submitRevokeAllSessions"
						>
							{{ t('admin.users.security.actions.confirmRevokeAllSessions') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="unlinkOAuthModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="handleUnlinkOAuthModalOpenChange"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
						>
							<UIcon name="i-lucide-unplug" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.unlinkOAuth.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{
									t('admin.users.security.modals.unlinkOAuth.description', {
										provider: unlinkOAuthTarget?.provider ?? '',
									})
								}}
							</p>
						</div>
					</div>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handleUnlinkOAuthModalOpenChange(false)"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-unplug"
							:loading="unlinkingOAuthConnectionId === unlinkOAuthTargetId"
							@click="submitUnlinkOAuth"
						>
							{{ t('admin.users.security.actions.confirmUnlinkOAuth') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="deleteUserModalOpen"
			:ui="{ content: 'max-w-lg', body: 'p-0' }"
			@update:open="handleDeleteUserModalOpenChange"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
						>
							<UIcon name="i-lucide-trash-2" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('admin.users.security.modals.deleteUser.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{
									t('admin.users.security.modals.deleteUser.description', {
										username:
											deletePreview?.user.username ?? user?.username ?? '',
										userId: deletePreview?.user.id ?? user?.id ?? '',
									})
								}}
							</p>
						</div>
					</div>

					<div
						v-if="deletePreview"
						class="mt-6 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800"
					>
						<div class="flex items-center justify-between gap-3">
							<span>{{ t('admin.users.security.deleteImpact.emails') }}</span>
							<strong>{{ deletePreview.impact.emails }}</strong>
						</div>
						<div class="flex items-center justify-between gap-3">
							<span>{{
								t('admin.users.security.deleteImpact.oauthConnections')
							}}</span>
							<strong>{{ deletePreview.impact.oauthConnections }}</strong>
						</div>
						<div class="flex items-center justify-between gap-3">
							<span>{{
								t('admin.users.security.deleteImpact.refreshTokens')
							}}</span>
							<strong>{{ deletePreview.impact.refreshTokens }}</strong>
						</div>
						<div class="flex items-center justify-between gap-3">
							<span>{{
								t('admin.users.security.deleteImpact.securityEvents')
							}}</span>
							<strong>{{ deletePreview.impact.securityEvents }}</strong>
						</div>
						<div class="flex items-center justify-between gap-3">
							<span>{{
								t('admin.users.security.deleteImpact.minecraftAccounts')
							}}</span>
							<strong>{{ deletePreview.impact.minecraftAccounts }}</strong>
						</div>
						<div class="flex items-center justify-between gap-3">
							<span>{{
								t('admin.users.security.deleteImpact.attachments')
							}}</span>
							<strong>{{ deletePreview.impact.attachments }}</strong>
						</div>
					</div>

					<div class="mt-6 flex gap-2 sm:justify-end">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handleDeleteUserModalOpenChange(false)"
						>
							{{ t('admin.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-trash-2"
							:loading="deletingUser"
							@click="submitDeleteUser"
						>
							{{ t('admin.users.security.actions.confirmDeleteUser') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import type {
	AdminAchievementsResponse,
	AdminUser,
	AdminUserDeletePreviewResponse,
	AdminUserSecurityResponse,
} from '~/components/admin/types'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	assignAdminUserForm,
	buildLocalizedCountryItems,
	createEmptyAdminUserForm,
	type AdminUserForm,
	type AdminUserSaveSection,
	type AdminUserSelectItem,
} from '~/utils/admin/users/edit'

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
const {
	data: securityData,
	pending: securityPending,
	error: securityError,
	refresh: refreshSecurity,
} = await useFetch<AdminUserSecurityResponse>(
	() => `/api/admin/users/${id.value}/security`,
	{
		key: () => `admin-user-security-${id.value}`,
	},
)
const { data: achievementsData } = await useFetch<AdminAchievementsResponse>(
	'/api/admin/achievements',
)

const availableBadges = computed(() =>
	(achievementsData.value?.badges ?? []).filter((badge) => badge.enabled),
)

const form = reactive<AdminUserForm>(createEmptyAdminUserForm())
const savingSection = ref<AdminUserSaveSection | null>(null)
const unbindingMinecraftAccountId = ref<string | null>(null)
const unbindingHistoricalMinecraftAccountId = ref<string | null>(null)
const primaryMinecraftAccountId = ref<string | null>(null)
const privacySnapshot = ref('')
const skipUserWatchSync = ref(false)
let privacySaveTimer: ReturnType<typeof setTimeout> | null = null
const passwordModalOpen = ref(false)
const passwordForm = reactive({
	password: '',
})
const passwordSubmitting = ref(false)
const setPrimaryEmailModalOpen = ref(false)
const setPrimaryEmailTargetId = ref<string | null>(null)
const changingPrimaryEmailId = ref<string | null>(null)
const deleteEmailModalOpen = ref(false)
const deleteEmailTargetId = ref<string | null>(null)
const deletingEmailId = ref<string | null>(null)
const revokeSessionModalOpen = ref(false)
const revokeSessionTargetId = ref<string | null>(null)
const revokingSessionId = ref<string | null>(null)
const revokeAllSessionsModalOpen = ref(false)
const revokingAllSessions = ref(false)
const unlinkOAuthModalOpen = ref(false)
const unlinkOAuthTargetId = ref<string | null>(null)
const unlinkingOAuthConnectionId = ref<string | null>(null)
const deleteUserModalOpen = ref(false)
const deletePreviewPending = ref(false)
const deletePreview = ref<AdminUserDeletePreviewResponse | null>(null)
const deletingUser = ref(false)

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
		case 'historical-minecraft-bind':
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

const syncLoadedUser = (nextUser: AdminUser): void => {
	skipUserWatchSync.value = true
	user.value = nextUser
}

const reloadUserDetail = async (): Promise<AdminUser | null> => {
	if (!user.value) {
		return null
	}

	const updated = await $fetch<AdminUser>(`/api/admin/users/${user.value.id}`)
	syncLoadedUser(updated)
	return updated
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
		syncLoadedUser(updated)
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

const bindHistoricalMinecraftAccount = async (
	accountId: string,
): Promise<void> => {
	if (!user.value || !accountId) {
		return
	}

	savingSection.value = 'historical-minecraft-bind'

	try {
		await $fetch(`/api/admin/historical-players/${accountId}/assign`, {
			method: 'POST',
			body: {
				username: user.value.username,
			},
		})
		await reloadUserDetail()

		notifySuccess({
			title: t('admin.users.historicalMinecraft.notifications.bindSuccess'),
		})
	} catch (bindError) {
		notifyError(bindError, {
			title: t('admin.users.historicalMinecraft.notifications.bindFailed'),
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
		syncLoadedUser(updated)
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

const unbindHistoricalMinecraftAccount = async (
	accountId: string,
): Promise<void> => {
	if (
		!user.value ||
		!accountId ||
		unbindingHistoricalMinecraftAccountId.value
	) {
		return
	}

	unbindingHistoricalMinecraftAccountId.value = accountId

	try {
		await $fetch(`/api/admin/historical-players/${accountId}/unassign`, {
			method: 'POST',
		})
		await reloadUserDetail()

		notifySuccess({
			title: t('admin.users.historicalMinecraft.notifications.unbindSuccess'),
		})
	} catch (unbindError) {
		notifyError(unbindError, {
			title: t('admin.users.historicalMinecraft.notifications.unbindFailed'),
		})
	} finally {
		unbindingHistoricalMinecraftAccountId.value = null
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
		syncLoadedUser(updated)
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

const security = computed(() => securityData.value?.security ?? null)
const securityEmails = computed(() => security.value?.emails ?? [])
const securitySessions = computed(() => security.value?.sessions ?? [])
const securityOauthConnections = computed(
	() => security.value?.oauthConnections ?? [],
)
const setPrimaryEmailTarget = computed(
	() =>
		securityEmails.value.find(
			(email) => email.id === setPrimaryEmailTargetId.value,
		) ?? null,
)
const deleteEmailTarget = computed(
	() =>
		securityEmails.value.find(
			(email) => email.id === deleteEmailTargetId.value,
		) ?? null,
)
const revokeSessionTarget = computed(
	() =>
		securitySessions.value.find(
			(session) => session.id === revokeSessionTargetId.value,
		) ?? null,
)
const unlinkOAuthTarget = computed(
	() =>
		securityOauthConnections.value.find(
			(connection) => connection.id === unlinkOAuthTargetId.value,
		) ?? null,
)

const parseDeviceFromUA = (
	ua: string | null,
): {
	label: string
	icon: string
} => {
	if (!ua) {
		return {
			label: t('admin.users.security.devices.unknown'),
			icon: 'i-lucide-monitor',
		}
	}

	const lower = ua.toLowerCase()

	if (lower.includes('android')) {
		return { label: 'Android', icon: 'i-lucide-smartphone' }
	}
	if (lower.includes('iphone') || lower.includes('ipod')) {
		return { label: 'iPhone', icon: 'i-lucide-smartphone' }
	}
	if (lower.includes('ipad')) {
		return { label: 'iPad', icon: 'i-lucide-tablet-smartphone' }
	}
	if (lower.includes('macintosh') || lower.includes('mac os')) {
		return { label: 'macOS', icon: 'i-lucide-monitor' }
	}
	if (lower.includes('windows')) {
		return { label: 'Windows', icon: 'i-lucide-monitor' }
	}
	if (lower.includes('linux')) {
		return { label: 'Linux', icon: 'i-lucide-monitor' }
	}

	return {
		label: t('admin.users.security.devices.unknown'),
		icon: 'i-lucide-monitor',
	}
}

const revokeSessionTargetDeviceLabel = computed(
	() => parseDeviceFromUA(revokeSessionTarget.value?.userAgent ?? null).label,
)

const handlePasswordModalOpenChange = (open: boolean): void => {
	passwordModalOpen.value = open
	if (!open) {
		passwordForm.password = ''
	}
}

const handleSetPrimaryEmailModalOpenChange = (open: boolean): void => {
	setPrimaryEmailModalOpen.value = open
	if (!open) {
		setPrimaryEmailTargetId.value = null
	}
}

const handleDeleteEmailModalOpenChange = (open: boolean): void => {
	deleteEmailModalOpen.value = open
	if (!open) {
		deleteEmailTargetId.value = null
	}
}

const handleRevokeSessionModalOpenChange = (open: boolean): void => {
	revokeSessionModalOpen.value = open
	if (!open) {
		revokeSessionTargetId.value = null
	}
}

const handleUnlinkOAuthModalOpenChange = (open: boolean): void => {
	unlinkOAuthModalOpen.value = open
	if (!open) {
		unlinkOAuthTargetId.value = null
	}
}

const handleDeleteUserModalOpenChange = (open: boolean): void => {
	deleteUserModalOpen.value = open
	if (!open) {
		deletePreview.value = null
	}
}

const openSetPrimaryEmailModal = (emailId: string): void => {
	setPrimaryEmailTargetId.value = emailId
	setPrimaryEmailModalOpen.value = true
}

const openDeleteEmailModal = (emailId: string): void => {
	deleteEmailTargetId.value = emailId
	deleteEmailModalOpen.value = true
}

const openRevokeSessionModal = (sessionId: string): void => {
	revokeSessionTargetId.value = sessionId
	revokeSessionModalOpen.value = true
}

const openUnlinkOAuthModal = (connectionId: string): void => {
	unlinkOAuthTargetId.value = connectionId
	unlinkOAuthModalOpen.value = true
}

const openDeleteUserModal = async (): Promise<void> => {
	if (!user.value || deletePreviewPending.value) {
		return
	}

	deletePreviewPending.value = true

	try {
		deletePreview.value = await $fetch<AdminUserDeletePreviewResponse>(
			`/api/admin/users/${user.value.id}/delete-preview`,
		)
		deleteUserModalOpen.value = true
	} catch (previewError) {
		notifyError(previewError, {
			title: t('admin.users.security.notifications.deletePreviewFailed'),
		})
	} finally {
		deletePreviewPending.value = false
	}
}

const submitPasswordReset = async (): Promise<void> => {
	if (
		!user.value ||
		!passwordForm.password.trim() ||
		passwordSubmitting.value
	) {
		return
	}

	passwordSubmitting.value = true

	try {
		await $fetch(`/api/admin/users/${user.value.id}/security/password`, {
			method: 'POST',
			body: {
				password: passwordForm.password,
			},
		})
		await refreshSecurity()
		handlePasswordModalOpenChange(false)
		notifySuccess({
			title: t('admin.users.security.notifications.passwordReset'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.passwordResetFailed'),
		})
	} finally {
		passwordSubmitting.value = false
	}
}

const submitSetPrimaryEmail = async (): Promise<void> => {
	if (
		!user.value ||
		!setPrimaryEmailTarget.value ||
		changingPrimaryEmailId.value
	) {
		return
	}

	changingPrimaryEmailId.value = setPrimaryEmailTarget.value.id

	try {
		await $fetch(`/api/admin/users/${user.value.id}/security/emails/primary`, {
			method: 'POST',
			body: {
				emailId: setPrimaryEmailTarget.value.id,
			},
		})
		await refreshSecurity()
		handleSetPrimaryEmailModalOpenChange(false)
		notifySuccess({
			title: t('admin.users.security.notifications.primaryEmailChanged'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.primaryEmailChangeFailed'),
		})
	} finally {
		changingPrimaryEmailId.value = null
	}
}

const submitDeleteEmail = async (): Promise<void> => {
	if (!user.value || !deleteEmailTarget.value || deletingEmailId.value) {
		return
	}

	deletingEmailId.value = deleteEmailTarget.value.id

	try {
		await $fetch(
			`/api/admin/users/${user.value.id}/security/emails/${deleteEmailTarget.value.id}`,
			{
				method: 'DELETE',
			},
		)
		await refreshSecurity()
		handleDeleteEmailModalOpenChange(false)
		notifySuccess({
			title: t('admin.users.security.notifications.emailDeleted'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.emailDeleteFailed'),
		})
	} finally {
		deletingEmailId.value = null
	}
}

const submitRevokeSession = async (): Promise<void> => {
	if (!user.value || !revokeSessionTarget.value || revokingSessionId.value) {
		return
	}

	revokingSessionId.value = revokeSessionTarget.value.id

	try {
		await $fetch(
			`/api/admin/users/${user.value.id}/security/sessions/${revokeSessionTarget.value.id}`,
			{
				method: 'DELETE',
			},
		)
		await refreshSecurity()
		handleRevokeSessionModalOpenChange(false)
		notifySuccess({
			title: t('admin.users.security.notifications.sessionRevoked'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.sessionRevokeFailed'),
		})
	} finally {
		revokingSessionId.value = null
	}
}

const submitRevokeAllSessions = async (): Promise<void> => {
	if (!user.value || revokingAllSessions.value) {
		return
	}

	revokingAllSessions.value = true

	try {
		await $fetch(
			`/api/admin/users/${user.value.id}/security/sessions/revoke-all`,
			{
				method: 'POST',
			},
		)
		await refreshSecurity()
		revokeAllSessionsModalOpen.value = false
		notifySuccess({
			title: t('admin.users.security.notifications.allSessionsRevoked'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.allSessionsRevokeFailed'),
		})
	} finally {
		revokingAllSessions.value = false
	}
}

const submitUnlinkOAuth = async (): Promise<void> => {
	if (
		!user.value ||
		!unlinkOAuthTarget.value ||
		unlinkingOAuthConnectionId.value
	) {
		return
	}

	unlinkingOAuthConnectionId.value = unlinkOAuthTarget.value.id

	try {
		await $fetch(
			`/api/admin/users/${user.value.id}/security/oauth/${unlinkOAuthTarget.value.id}`,
			{
				method: 'DELETE',
			},
		)
		await refreshSecurity()
		handleUnlinkOAuthModalOpenChange(false)
		notifySuccess({
			title: t('admin.users.security.notifications.oauthUnlinked'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.oauthUnlinkFailed'),
		})
	} finally {
		unlinkingOAuthConnectionId.value = null
	}
}

const submitDeleteUser = async (): Promise<void> => {
	if (!user.value || deletingUser.value) {
		return
	}

	deletingUser.value = true

	try {
		await $fetch(`/api/admin/users/${user.value.id}`, {
			method: 'DELETE',
		})
		notifySuccess({
			title: t('admin.users.security.notifications.userDeleted'),
		})
		await navigateTo(localePath('/admin/users'))
	} catch (submitError) {
		notifyError(submitError, {
			title: t('admin.users.security.notifications.userDeleteFailed'),
		})
	} finally {
		deletingUser.value = false
	}
}
</script>
