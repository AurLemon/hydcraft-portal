<template>
	<div class="mx-auto flex w-full flex-col items-center pb-16">
		<div v-if="pending" class="grid w-full gap-5">
			<USkeleton class="h-72 rounded-lg" />
			<USkeleton v-for="index in 4" :key="index" class="h-56 rounded-lg" />
		</div>

		<UAlert
			v-else-if="error"
			color="error"
			icon="i-lucide-circle-alert"
			:title="t('profile.empty.loadFailed')"
		/>

		<div v-else-if="profile" class="grid w-full gap-5">
			<div class="site-shell mx-auto w-full">
				<ProfileHero
					mode="edit"
					:cover-image="coverImage"
					:form="form"
					:profile="profile"
				>
					<template #actions>
						<UButton
							color="neutral"
							variant="soft"
							size="sm"
							icon="i-lucide-eye"
							class="border border-white/18 !bg-slate-950/46 !text-white shadow-lg backdrop-blur-md hover:!bg-slate-950/62 disabled:!bg-slate-950/46 disabled:!text-white disabled:opacity-70"
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
							button-class="border border-white/18 !bg-slate-950/46 !text-white shadow-lg backdrop-blur-md hover:!bg-slate-950/62 disabled:!bg-slate-950/46 disabled:!text-white disabled:opacity-70"
							@uploaded="handleCoverUploaded"
						>
							{{ t('profile.actions.editCover') }}
						</AttachmentUploadButton>
					</template>
					<template #avatar>
						<ProfileAvatarUploadButton
							:owner-id="profile.id"
							:avatar-url="form.avatarUrl"
							:display-name="form.displayName"
							:username="form.username"
							@uploaded="handleAvatarUploaded"
						/>
					</template>
				</ProfileHero>
			</div>

			<form class="mx-auto mt-16 grid w-full max-w-3xl gap-16" @submit.prevent>
				<ProfileUsernameSection
					v-model:form="form"
					:disabled="!canSubmitUsername"
					:public-profile-url="publicProfileUrl"
					:submitting="submittingSection === 'username'"
					:username-status-text="usernameStatusText"
					@submit="submitUsername"
				/>
				<ProfileBasicSection
					:profile-id="profile.id"
					:cover-image="coverImage"
					:created-at="profile.createdAt"
					:joined-at="profile.joinedAt"
					:hydroline-id="profile.hydrolineId"
					:submitting="submittingSection === 'basic'"
					v-model:form="form"
					@avatar-uploaded="handleAvatarUploaded"
					@cover-uploaded="handleCoverUploaded"
					@copy-hydroline-id="copyHydrolineId"
					@reset-avatar="handleAvatarReset"
					@reset-cover="handleCoverReset"
					@submit="submitBasicProfile"
				/>
				<ProfilePreferenceSection v-model:form="form" />
				<ProfileSocialSection
					v-model:form="form"
					:submitting="submittingSection === 'social'"
					@submit="submitSocialProfile"
				/>
				<ProfilePrivacySection v-model:form="form" />
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useToast } from '@nuxt/ui/composables'
import type { AttachmentUploadResult } from '~/composables/useAttachmentUploader'
import {
	assignProfileForm,
	buildProfilePatchPayload,
	createEmptyProfileForm,
	type EditableProfile,
	type ProfileResponse,
} from '~/utils/profile/edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

const toast = useToast()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const runtimeConfig = useRuntimeConfig()
const { user: currentUser } = usePortalAuth()
const { notifyError } = useAdminToast()
type ProfileSubmitSection = 'username' | 'basic' | 'social'
const USERNAME_SECTION_FIELDS = ['username'] as const
// Keep in sync with editable controls rendered in ProfileBasicSection.
const BASIC_SECTION_FIELDS = [
	'displayName',
	'bio',
	'schoolOrCompany',
	'occupationOrMajor',
	'location',
	'countryOrRegion',
	'gender',
	'birthday',
] as const
const SOCIAL_SECTION_FIELDS = ['social'] as const
const submittingSection = ref<ProfileSubmitSection | null>(null)
const originalProfile = ref<EditableProfile | null>(null)
const preferencesSnapshot = ref('')
const privacySnapshot = ref('')
const skipProfileWatchSync = ref(false)
const form = reactive(createEmptyProfileForm())
const { data, pending, error } = await useFetch<ProfileResponse>(
	'/api/users/me/profile',
)

const profile = computed(() => data.value?.profile ?? null)
const coverImage = computed(() => profile.value?.coverUrl ?? '')
const publicProfileUrl = computed(() => {
	const siteUrl = runtimeConfig.public.siteUrl.replace(/\/$/, '')
	return `${siteUrl}/u/${form.username}`
})
const trimmedUsername = computed(() => form.username.trim())
const isUsernameCaseOnlyChange = computed(() => {
	if (!profile.value) {
		return false
	}

	return (
		trimmedUsername.value !== profile.value.username &&
		trimmedUsername.value.toLowerCase() === profile.value.username.toLowerCase()
	)
})
const isUsernameChangedBeyondCase = computed(() => {
	if (!profile.value) {
		return false
	}

	return (
		trimmedUsername.value !== profile.value.username &&
		!isUsernameCaseOnlyChange.value
	)
})
const isUsernameCooldownActive = computed(() => {
	const canChangeAt = profile.value?.canChangeUsernameAt

	if (!canChangeAt) {
		return false
	}

	return dayjs(canChangeAt).isAfter(dayjs())
})
const canSubmitUsername = computed(
	() => !isUsernameCooldownActive.value || !isUsernameChangedBeyondCase.value,
)
const formattedCanChangeUsernameAt = computed(() => {
	const canChangeAt = profile.value?.canChangeUsernameAt

	if (!canChangeAt) {
		return ''
	}

	return new Intl.DateTimeFormat(String(locale.value), {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(dayjs(canChangeAt).toDate())
})
const usernameStatusText = computed(() => {
	if (isUsernameCooldownActive.value) {
		if (isUsernameCaseOnlyChange.value) {
			return t('profile.edit.hints.usernameCaseOnlyAvailableUntil', {
				date: formattedCanChangeUsernameAt.value,
			})
		}

		return t('profile.edit.hints.usernameLockedUntil', {
			date: formattedCanChangeUsernameAt.value,
			days: profile.value?.usernameChangeCooldownDays ?? 30,
		})
	}

	return t('profile.edit.hints.usernameAvailableNow', {
		days: profile.value?.usernameChangeCooldownDays ?? 30,
	})
})

watch(
	profile,
	(value) => {
		if (!value) {
			return
		}

		if (skipProfileWatchSync.value) {
			skipProfileWatchSync.value = false
			originalProfile.value = value
			preferencesSnapshot.value = JSON.stringify(form.preferences)
			privacySnapshot.value = JSON.stringify(form.privacy)
			return
		}

		originalProfile.value = value
		assignProfileForm(form, value)
		preferencesSnapshot.value = JSON.stringify(form.preferences)
		privacySnapshot.value = JSON.stringify(form.privacy)
	},
	{
		immediate: true,
	},
)

const copyHydrolineId = async (): Promise<void> => {
	if (!profile.value) {
		return
	}

	await navigator.clipboard.writeText(profile.value.hydrolineId)
	toast.add({
		title: t('profile.notifications.copied'),
		color: 'success',
		icon: 'i-lucide-check',
	})
}

const pickPayload = (
	payload: Record<string, unknown>,
	keys: string[],
): Record<string, unknown> =>
	Object.fromEntries(
		keys.flatMap((key) => (key in payload ? [[key, payload[key]]] : [])),
	)

const syncProfileSection = (
	nextProfile: EditableProfile,
	section:
		| 'username'
		| 'basic'
		| 'social'
		| 'preferences'
		| 'privacy'
		| 'media',
): void => {
	const nextForm = createEmptyProfileForm()
	assignProfileForm(nextForm, nextProfile)

	switch (section) {
		case 'username':
			form.username = nextForm.username
			return
		case 'basic':
			form.displayName = nextForm.displayName
			form.bio = nextForm.bio
			form.schoolOrCompany = nextForm.schoolOrCompany
			form.occupationOrMajor = nextForm.occupationOrMajor
			form.location = nextForm.location
			form.countryOrRegion = nextForm.countryOrRegion
			form.gender = nextForm.gender
			form.birthday = nextForm.birthday
			return
		case 'social':
			form.social = nextForm.social
			return
		case 'preferences':
			form.preferences = nextForm.preferences
			return
		case 'privacy':
			form.privacy = nextForm.privacy
			return
		case 'media':
			form.avatarUrl = nextForm.avatarUrl
			return
	}
}

const applyProfileResponse = (
	response: ProfileResponse,
	section:
		| 'username'
		| 'basic'
		| 'social'
		| 'preferences'
		| 'privacy'
		| 'media',
): void => {
	skipProfileWatchSync.value = true
	data.value = response
	syncProfileSection(response.profile, section)

	if (currentUser.value) {
		currentUser.value = {
			...currentUser.value,
			username: response.profile.username,
			displayName: response.profile.displayName,
			avatarUrl: response.profile.avatarUrl,
			coverUrl: response.profile.coverUrl,
			bio: response.profile.bio,
			preferences: {
				language: response.profile.preferences.language,
			},
		}
	}
}

const patchProfile = async (
	payload: Record<string, unknown>,
): Promise<ProfileResponse> =>
	await $fetch<ProfileResponse>('/api/users/me/profile', {
		method: 'PATCH',
		body: payload,
	})

const submitProfileSection = async (
	section: ProfileSubmitSection,
	keys: string[],
): Promise<void> => {
	const payload = pickPayload(
		buildProfilePatchPayload(form, originalProfile.value),
		keys,
	)

	if (!Object.keys(payload).length) {
		toast.add({
			title: t('profile.notifications.noChanges'),
			color: 'neutral',
		})
		return
	}

	submittingSection.value = section

	try {
		applyProfileResponse(await patchProfile(payload), section)
		toast.add({
			title: t('profile.notifications.saved'),
			color: 'success',
			icon: 'i-lucide-check',
		})
	} catch (saveError) {
		notifyError(saveError, {
			title: t('profile.notifications.saveFailed'),
		})
	} finally {
		submittingSection.value = null
	}
}

const submitUsername = async (): Promise<void> => {
	await submitProfileSection('username', [...USERNAME_SECTION_FIELDS])
}

const submitBasicProfile = async (): Promise<void> => {
	await submitProfileSection('basic', [...BASIC_SECTION_FIELDS])
}

const submitSocialProfile = async (): Promise<void> => {
	await submitProfileSection('social', [...SOCIAL_SECTION_FIELDS])
}

const patchProfileAttachment = async (
	payload: Record<string, string | null>,
	title: string,
): Promise<void> => {
	try {
		applyProfileResponse(await patchProfile(payload), 'media')
		toast.add({
			title,
			color: 'success',
			icon: 'i-lucide-check',
		})
	} catch (saveError) {
		notifyError(saveError, {
			title: t('profile.notifications.imageSaveFailed'),
		})
	}
}

const handleAvatarUploaded = async (
	result: AttachmentUploadResult,
): Promise<void> => {
	await patchProfileAttachment(
		{
			avatarAttachmentId: result.id,
		},
		t('profile.notifications.avatarUpdated'),
	)
}

const handleCoverUploaded = async (
	result: AttachmentUploadResult,
): Promise<void> => {
	await patchProfileAttachment(
		{
			coverAttachmentId: result.id,
		},
		t('profile.notifications.coverUpdated'),
	)
}

const handleAvatarReset = async (): Promise<void> => {
	await patchProfileAttachment(
		{
			avatarAttachmentId: null,
		},
		t('profile.notifications.avatarReset'),
	)
}

const handleCoverReset = async (): Promise<void> => {
	await patchProfileAttachment(
		{
			coverAttachmentId: null,
		},
		t('profile.notifications.coverReset'),
	)
}

let preferencesSaveTimer: ReturnType<typeof setTimeout> | null = null
let privacySaveTimer: ReturnType<typeof setTimeout> | null = null

const savePreferencesLater = (): void => {
	if (preferencesSaveTimer) {
		clearTimeout(preferencesSaveTimer)
	}

	preferencesSaveTimer = setTimeout(() => {
		preferencesSaveTimer = null
		const payload = pickPayload(
			buildProfilePatchPayload(form, originalProfile.value),
			['preferences'],
		)

		if (!Object.keys(payload).length) {
			return
		}

		void patchProfile(payload)
			.then((response) => {
				applyProfileResponse(response, 'preferences')
				toast.add({
					title: t('profile.notifications.preferencesSaved'),
					color: 'success',
					icon: 'i-lucide-check',
				})
			})
			.catch((saveError) => {
				notifyError(saveError, {
					title: t('profile.notifications.preferencesSaveFailed'),
				})
			})
	}, 500)
}

const savePrivacyLater = (): void => {
	if (privacySaveTimer) {
		clearTimeout(privacySaveTimer)
	}

	privacySaveTimer = setTimeout(() => {
		privacySaveTimer = null
		const payload = pickPayload(
			buildProfilePatchPayload(form, originalProfile.value),
			['privacy'],
		)

		if (!Object.keys(payload).length) {
			return
		}

		void patchProfile(payload)
			.then((response) => {
				applyProfileResponse(response, 'privacy')
				toast.add({
					title: t('profile.notifications.privacySaved'),
					color: 'success',
					icon: 'i-lucide-check',
				})
			})
			.catch((saveError) => {
				notifyError(saveError, {
					title: t('profile.notifications.privacySaveFailed'),
				})
			})
	}, 500)
}

onBeforeUnmount(() => {
	if (preferencesSaveTimer) {
		clearTimeout(preferencesSaveTimer)
	}

	if (privacySaveTimer) {
		clearTimeout(privacySaveTimer)
	}
})

watch(
	() => form.preferences,
	() => {
		const nextSnapshot = JSON.stringify(form.preferences)
		if (!preferencesSnapshot.value) {
			preferencesSnapshot.value = nextSnapshot
			return
		}

		if (nextSnapshot !== preferencesSnapshot.value) {
			preferencesSnapshot.value = nextSnapshot
			savePreferencesLater()
		}
	},
	{ deep: true },
)

watch(
	() => form.privacy,
	() => {
		const nextSnapshot = JSON.stringify(form.privacy)
		if (!privacySnapshot.value) {
			privacySnapshot.value = nextSnapshot
			return
		}

		if (nextSnapshot !== privacySnapshot.value) {
			privacySnapshot.value = nextSnapshot
			savePrivacyLater()
		}
	},
	{ deep: true },
)
</script>
