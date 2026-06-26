<template>
	<div class="mx-auto flex w-full flex-col items-center pb-16">
		<div v-if="profilePending" class="grid w-full gap-5">
			<USkeleton class="h-72 rounded-lg" />
			<USkeleton v-for="index in 3" :key="index" class="h-44 rounded-lg" />
		</div>

		<UAlert
			v-else-if="profileError"
			color="error"
			icon="i-lucide-circle-alert"
			:title="t('profile.security.empty.profileLoadFailed')"
		/>

		<div v-else-if="profile" class="grid w-full gap-5">
			<div class="site-shell mx-auto w-full">
				<ProfileReadonlyHero :profile="profile" />
			</div>

			<div class="mx-auto mt-16 grid w-full max-w-3xl gap-16">
				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.security.sections.overview') }}
						</div>
						<UButton
							type="button"
							size="sm"
							variant="link"
							icon="i-lucide-key-round"
							@click="openPasswordModal"
						>
							{{ t('profile.security.actions.resetPassword') }}
						</UButton>
					</div>
					<div :class="profileCardClass" class="grid gap-4">
						<ProfileField :label="t('profile.security.fields.accountStatus')">
							<div :class="readonlyFieldClass">
								{{ userStatusLabel }}
							</div>
						</ProfileField>
						<ProfileField :label="t('profile.security.fields.credentialType')">
							<div :class="readonlyFieldClass">
								{{ credentialTypeLabel }}
							</div>
						</ProfileField>
						<ProfileField :label="t('profile.security.fields.currentRole')">
							<div :class="readonlyFieldClass">
								{{ roleLabel }}
							</div>
						</ProfileField>
						<ProfileField :label="t('profile.security.fields.lastLogin')">
							<div :class="readonlyFieldClass">
								<div>{{ lastLoginText }}</div>
								<div
									v-if="currentSessionLocation"
									class="mt-1 text-xs text-slate-500 dark:text-slate-400"
								>
									{{ currentSessionLocation }}
								</div>
							</div>
						</ProfileField>
					</div>
				</section>

				<section class="grid gap-3">
					<div
						class="mx-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div :class="profileSectionTitleClass">
							{{ t('profile.security.sections.emails') }}
						</div>
						<UButton
							type="button"
							size="sm"
							variant="link"
							icon="i-lucide-plus"
							@click="openAddEmailModal"
						>
							{{ t('profile.security.actions.addEmail') }}
						</UButton>
					</div>
					<div :class="profileCardClass" class="grid gap-4">
						<TransitionGroup name="email-row" tag="div" class="grid gap-4">
							<ProfileField
								v-for="(email, index) in orderedEmails"
								:key="email.id"
								:label="getEmailFieldLabel(email, index)"
							>
								<div :class="readonlyFieldClass">
									<div
										class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center"
									>
										<div class="flex min-w-0 flex-1 items-center gap-2">
											<span class="min-w-0 flex-1 truncate">
												{{ email.email }}
											</span>
											<UBadge
												v-if="email.kind === 'PRIMARY'"
												color="primary"
												variant="soft"
												class="shrink-0 whitespace-nowrap"
											>
												{{ t('profile.security.emailTags.primary') }}
											</UBadge>
											<UBadge
												:color="email.verifiedAt ? 'success' : 'error'"
												variant="soft"
												class="shrink-0 whitespace-nowrap"
											>
												{{
													email.verifiedAt
														? t('profile.security.status.verified')
														: t('profile.security.status.unverified')
												}}
											</UBadge>
										</div>
										<div class="flex shrink-0 flex-wrap items-center gap-2">
											<UButton
												v-if="!email.verifiedAt"
												type="button"
												size="xs"
												variant="soft"
												icon="i-lucide-mail-check"
												@click="openVerifyEmailModal(email)"
											>
												{{ t('profile.security.actions.verify') }}
											</UButton>
											<UButton
												v-if="email.kind !== 'PRIMARY'"
												type="button"
												size="xs"
												variant="soft"
												icon="i-lucide-star"
												:disabled="!email.verifiedAt"
												:loading="changingPrimaryEmailId === email.id"
												@click="changePrimaryEmail(email)"
											>
												{{ t('profile.security.actions.setPrimaryEmail') }}
											</UButton>
											<UButton
												v-if="email.kind !== 'PRIMARY'"
												type="button"
												size="xs"
												color="error"
												variant="soft"
												icon="i-lucide-trash-2"
												@click="openDeleteEmailModal(email)"
											>
												{{ t('profile.security.actions.deleteEmail') }}
											</UButton>
										</div>
									</div>
								</div>
							</ProfileField>
							<ProfileField
								v-if="!orderedEmails.length"
								key="empty-email"
								:label="t('profile.security.fields.primaryEmail')"
							>
								<div :class="readonlyFieldClass">
									{{
										currentUser?.email ||
										t('profile.security.empty.emailNotSet')
									}}
								</div>
							</ProfileField>
						</TransitionGroup>
					</div>
				</section>

				<section class="grid gap-3">
					<div
						class="mx-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div class="flex items-center gap-2">
							<div :class="profileSectionTitleClass">
								{{ t('profile.security.sections.sessions') }}
							</div>
							<UBadge variant="soft" color="neutral">
								{{
									t('profile.security.sessions.activeCount', {
										count: activeSessionCount,
									})
								}}
							</UBadge>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<UButton
								type="button"
								size="sm"
								variant="link"
								icon="i-lucide-shield-x"
								:disabled="activeSessionCount <= 1"
								@click="revokeSessionsModalOpen = true"
							>
								{{ t('profile.security.actions.revokeOtherSessions') }}
							</UButton>
							<UButton
								type="button"
								size="sm"
								variant="link"
								color="error"
								icon="i-lucide-log-out"
								@click="logoutModalOpen = true"
							>
								{{ t('profile.security.actions.logout') }}
							</UButton>
						</div>
					</div>
					<div :class="[profileCardClass, 'grid gap-4']">
						<UAlert
							v-if="securityError"
							color="error"
							icon="i-lucide-circle-alert"
							:title="t('profile.security.empty.sessionsLoadFailed')"
						/>
						<div v-else-if="securityPending" class="grid gap-3">
							<USkeleton
								v-for="index in 2"
								:key="index"
								class="h-24 rounded-lg"
							/>
						</div>
						<div v-else class="grid gap-3">
							<div
								v-for="session in activeSessions"
								:key="session.id"
								class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
							>
								<div class="flex min-w-0 items-start gap-3">
									<UIcon
										:name="parseDeviceFromUA(session.userAgent).icon"
										class="mt-1 size-5 shrink-0 text-slate-400"
									/>
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<div class="font-medium text-slate-950 dark:text-white">
												{{ parseDeviceFromUA(session.userAgent).label }}
											</div>
											<UBadge
												v-if="session.current"
												color="primary"
												variant="soft"
											>
												{{ t('profile.security.sessions.current') }}
											</UBadge>
										</div>
										<p class="mt-0.5 text-sm text-slate-500">
											{{ getIpLocationDisplay(session) }}
										</p>
										<p class="text-sm text-slate-500">
											{{ getIpAddressDisplay(session.ipAddress) }}
										</p>
										<p class="text-sm text-slate-500">
											{{ formatDateTime(session.updatedAt) }}
										</p>
									</div>
								</div>
								<UButton
									type="button"
									color="error"
									variant="soft"
									size="sm"
									icon="i-lucide-x"
									:disabled="session.current"
									:loading="revokingSessionId === session.id"
									@click="revokeSession(session)"
								>
									{{ t('profile.security.actions.revoke') }}
								</UButton>
							</div>
						</div>
					</div>
				</section>

				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.security.sections.events') }}
						</div>
					</div>
					<div :class="[profileCardClass, 'grid gap-4']">
						<div
							v-if="!securityPending && !securityEvents.length"
							class="text-sm"
						>
							{{ t('profile.security.empty.securityEvents') }}
						</div>
						<USkeleton
							v-for="index in securityPending ? 3 : 0"
							:key="index"
							class="h-20 rounded-lg"
						/>
						<div
							v-for="event in securityEvents"
							:key="event.id"
							class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
						>
							<div class="flex min-w-0 items-start gap-3">
								<UIcon
									:name="getSecurityEventIcon(event.type)"
									class="mt-1 size-5 shrink-0 text-slate-400"
								/>
								<div class="min-w-0">
									<div class="font-medium text-slate-950 dark:text-white">
										{{ getSecurityEventLabel(event.type) }}
									</div>
									<p
										v-if="event.description"
										class="mt-0.5 text-sm text-slate-500"
									>
										{{ event.description }}
									</p>
									<p class="text-sm text-slate-500">
										{{ formatDateTime(event.createdAt) }}
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>

		<UModal
			:open="passwordModalOpen"
			:ui="{ content: 'max-w-lg', body: 'p-0' }"
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
								{{ t('profile.security.modals.passwordReset.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('profile.security.modals.passwordReset.description') }}
							</p>
						</div>
					</div>

					<div class="mt-6 grid gap-1.5 text-sm font-medium">
						<span>{{ t('profile.security.fields.receiverEmail') }}</span>
						<div :class="readonlyFieldClass">
							{{ passwordResetReceiverEmail }}
						</div>
					</div>

					<div class="mt-6">
						<CapWidget
							ref="passwordResetCaptchaWidgetRef"
							v-model="passwordResetCaptcha.token.value"
						/>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="handlePasswordModalOpenChange(false)"
						>
							{{ t('profile.security.actions.cancel') }}
						</UButton>
						<UButton
							type="submit"
							icon="i-lucide-mail"
							:loading="passwordResetSubmitting"
							:disabled="
								!passwordResetReceiverEmail ||
								!passwordResetCaptcha.token.value ||
								passwordResetSubmitting
							"
						>
							{{ t('profile.security.actions.sendResetEmail') }}
						</UButton>
					</div>
				</form>
			</template>
		</UModal>

		<UModal
			:open="logoutModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="logoutModalOpen = $event"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
						>
							<UIcon name="i-lucide-log-out" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('profile.security.modals.logout.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('profile.security.modals.logout.description') }}
							</p>
						</div>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="logoutModalOpen = false"
						>
							{{ t('profile.security.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-log-out"
							:loading="logoutSubmitting"
							@click="submitLogout"
						>
							{{ t('profile.security.actions.confirmLogout') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="revokeSessionsModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="revokeSessionsModalOpen = $event"
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
								{{ t('profile.security.modals.revokeSessions.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('profile.security.modals.revokeSessions.description') }}
							</p>
						</div>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="revokeSessionsModalOpen = false"
						>
							{{ t('profile.security.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-shield-x"
							:loading="revokingOtherSessions"
							@click="revokeOtherSessions"
						>
							{{ t('profile.security.actions.confirmRevoke') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="addEmailModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="handleAddEmailModalOpenChange"
		>
			<template #content>
				<form class="p-5 sm:p-6" @submit.prevent="submitAddEmail">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
						>
							<UIcon name="i-lucide-mail-plus" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('profile.security.modals.addEmail.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('profile.security.modals.addEmail.description') }}
							</p>
						</div>
					</div>

					<label class="mt-6 grid gap-1.5 text-sm font-medium">
						<span>{{ t('profile.security.fields.emailAddress') }}</span>
						<UInput
							v-model="addEmailForm.email"
							type="email"
							required
							autocomplete="email"
							:disabled="addEmailStep === 'code'"
						/>
					</label>
					<label
						v-if="addEmailStep === 'code'"
						class="mt-4 grid gap-1.5 text-sm font-medium"
					>
						<span>{{ t('profile.security.fields.verificationCode') }}</span>
						<UInput
							v-model="addEmailForm.code"
							type="text"
							inputmode="numeric"
							maxlength="6"
							autocomplete="one-time-code"
							required
						/>
					</label>
					<div v-if="addEmailStep === 'email'" class="mt-4">
						<CapWidget
							ref="addEmailCaptchaWidgetRef"
							v-model="addEmailCaptcha.token.value"
						/>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="addEmailModalOpen = false"
						>
							{{ t('profile.security.actions.cancel') }}
						</UButton>
						<UButton
							type="submit"
							:icon="
								addEmailStep === 'code'
									? 'i-lucide-check'
									: 'i-lucide-mail-plus'
							"
							:loading="addEmailSubmitting || addEmailVerifying"
							:disabled="
								addEmailStep === 'email' &&
								(!addEmailForm.email ||
									!addEmailCaptcha.token.value ||
									addEmailSubmitting)
							"
						>
							{{
								addEmailStep === 'code'
									? t('profile.security.actions.confirmVerify')
									: t('profile.security.actions.sendVerificationEmail')
							}}
						</UButton>
					</div>
				</form>
			</template>
		</UModal>

		<UModal
			:open="deleteEmailModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="deleteEmailModalOpen = $event"
		>
			<template #content>
				<div class="p-5 sm:p-6">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
						>
							<UIcon name="i-lucide-mail-x" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('profile.security.modals.deleteEmail.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('profile.security.modals.deleteEmail.descriptionPrefix') }}
								<strong>{{ deleteEmailTarget?.email }}</strong>
								{{ t('profile.security.modals.deleteEmail.descriptionSuffix') }}
							</p>
						</div>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="deleteEmailModalOpen = false"
						>
							{{ t('profile.security.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							color="error"
							icon="i-lucide-trash-2"
							:loading="deleteEmailSubmitting"
							@click="deleteSelectedEmail"
						>
							{{ t('profile.security.actions.confirmDeleteEmail') }}
						</UButton>
					</div>
				</div>
			</template>
		</UModal>

		<UModal
			:open="verifyEmailModalOpen"
			:ui="{ content: 'max-w-md', body: 'p-0' }"
			@update:open="verifyEmailModalOpen = $event"
		>
			<template #content>
				<form class="p-5 sm:p-6" @submit.prevent="submitVerifyEmailCode">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
						>
							<UIcon name="i-lucide-mail-check" class="size-5" />
						</div>
						<div class="min-w-0">
							<h2 class="text-xl font-semibold text-slate-950 dark:text-white">
								{{ t('profile.security.modals.verifyEmail.title') }}
							</h2>
							<p class="mt-1 text-sm leading-6 text-slate-500">
								{{ t('profile.security.modals.verifyEmail.descriptionPrefix') }}
								<strong>{{ verifyEmailTarget?.email }}</strong>
								{{ t('profile.security.modals.verifyEmail.descriptionSuffix') }}
							</p>
						</div>
					</div>

					<label class="mt-6 grid gap-1.5 text-sm font-medium">
						<span>{{ t('profile.security.fields.verificationCode') }}</span>
						<UInput
							v-model="verifyEmailForm.code"
							type="text"
							inputmode="numeric"
							maxlength="6"
							autocomplete="one-time-code"
							required
						/>
					</label>
					<div class="mt-4">
						<CapWidget
							ref="verifyEmailCaptchaWidgetRef"
							v-model="verifyEmailCaptcha.token.value"
						/>
					</div>

					<div
						class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
					>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="verifyEmailModalOpen = false"
						>
							{{ t('profile.security.actions.cancel') }}
						</UButton>
						<UButton
							type="button"
							variant="soft"
							icon="i-lucide-send"
							:loading="verifyEmailSending"
							:disabled="
								verifyEmailCooldown > 0 ||
								verifyEmailSending ||
								!verifyEmailCaptcha.token.value
							"
							@click="sendVerifyEmailCode"
						>
							{{
								verifyEmailCooldown > 0
									? t('profile.security.actions.resendAfter', {
											seconds: verifyEmailCooldown,
										})
									: t('profile.security.actions.sendCode')
							}}
						</UButton>
						<UButton
							type="submit"
							icon="i-lucide-check"
							:loading="verifyEmailSubmitting"
						>
							{{ t('profile.security.actions.confirmVerify') }}
						</UButton>
					</div>
				</form>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import {
	profileCardClass,
	profileSectionTitleClass,
	type ProfileResponse,
} from '~/utils/profile-edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

type SecurityEventType =
	| 'LOGIN_SUCCESS'
	| 'LOGIN_FAILED'
	| 'LOGOUT'
	| 'SESSION_REVOKED'
	| 'SESSIONS_REVOKED'
	| 'EMAIL_VERIFICATION_SENT'
	| 'EMAIL_VERIFIED'
	| 'PRIMARY_EMAIL_CHANGED'
	| 'SECONDARY_EMAIL_ADDED'
	| 'SECONDARY_EMAIL_REMOVED'
	| 'PASSWORD_CHANGED'
	| 'OAUTH_LINKED'
	| 'OAUTH_UNLINKED'
	| 'MINECRAFT_ACCOUNT_BOUND'

interface AccountSecurityEmail {
	id: string
	email: string
	kind: 'PRIMARY' | 'SECONDARY'
	verifiedAt: string | null
	createdAt: string
	updatedAt: string
}

interface IpLocationSummary {
	raw: string | null
	country: string | null
	region: string | null
	province: string | null
	city: string | null
	district: string | null
	isp: string | null
	display: string | null
}

interface AccountSecuritySession {
	id: string
	userAgent: string | null
	ipAddress: string | null
	ipLocation: IpLocationSummary | null
	expiresAt: string
	createdAt: string
	updatedAt: string
	current: boolean
}

interface AccountSecurityEvent {
	id: string
	type: SecurityEventType
	title: string
	description: string | null
	ipAddress: string | null
	ipLocation: IpLocationSummary | null
	userAgent: string | null
	metadata: unknown
	createdAt: string
}

interface AccountSecurityResponse {
	security: {
		user: {
			id: string
			email: string | null
			emailVerifiedAt: string | null
			hasPassword: boolean
		}
		emails: AccountSecurityEmail[]
		sessions: AccountSecuritySession[]
		events: AccountSecurityEvent[]
	}
}

interface SessionsDeleteResponse {
	ok: boolean
	revokedCount: number
}

interface SecurityEventDisplay {
	label: string
	icon: string
}

const localePath = useLocalePath()
const { locale, t } = useI18n()
const { user: currentUser, logout } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const {
	data: profileData,
	pending: profilePending,
	error: profileError,
} = await useFetch<ProfileResponse>('/api/users/me/profile')
const {
	data: securityData,
	pending: securityPending,
	error: securityError,
	refresh: refreshSecurity,
} = await useFetch<AccountSecurityResponse>('/api/users/me/security')

const profile = computed(() => profileData.value?.profile ?? null)
const passwordModalOpen = ref(false)
const logoutModalOpen = ref(false)
const revokeSessionsModalOpen = ref(false)
const addEmailModalOpen = ref(false)
const deleteEmailModalOpen = ref(false)
const passwordResetSubmitting = ref(false)
const logoutSubmitting = ref(false)
const revokingOtherSessions = ref(false)
const revokingSessionId = ref<string | null>(null)
const changingPrimaryEmailId = ref<string | null>(null)
const addEmailSubmitting = ref(false)
const addEmailVerifying = ref(false)
const deleteEmailSubmitting = ref(false)
const addEmailStep = ref<'email' | 'code'>('email')
const addEmailForm = reactive<{ email: string; code: string }>({
	email: '',
	code: '',
})
const verifyEmailModalOpen = ref(false)
const verifyEmailSending = ref(false)
const verifyEmailSubmitting = ref(false)
const verifyEmailCooldown = ref(0)
const verifyEmailForm = reactive<{ code: string }>({ code: '' })
const verifyEmailTarget = ref<AccountSecurityEmail | null>(null)
let verifyEmailCooldownTimer: ReturnType<typeof setInterval> | null = null
const passwordResetCaptcha = useCap(true)
const passwordResetCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)
const addEmailCaptcha = useCap(true)
const addEmailCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)
const verifyEmailCaptcha = useCap(true)
const verifyEmailCaptchaWidgetRef = ref<{ reset: () => void } | null>(null)

const readonlyFieldClass =
	'w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
const roleLabels = {
	OWNER: 'profile.security.roles.OWNER',
	ADMIN: 'profile.security.roles.ADMIN',
	MEMBER: 'profile.security.roles.MEMBER',
	USER: 'profile.security.roles.USER',
}
const statusLabels = {
	ACTIVE: 'profile.security.accountStatus.ACTIVE',
	PENDING: 'profile.security.accountStatus.PENDING',
	DISABLED: 'profile.security.accountStatus.DISABLED',
	BANNED: 'profile.security.accountStatus.BANNED',
}
const securityEventDisplayMap: Record<SecurityEventType, SecurityEventDisplay> =
	{
		LOGIN_SUCCESS: {
			label: 'profile.security.events.LOGIN_SUCCESS',
			icon: 'i-lucide-log-in',
		},
		LOGIN_FAILED: {
			label: 'profile.security.events.LOGIN_FAILED',
			icon: 'i-lucide-circle-alert',
		},
		LOGOUT: {
			label: 'profile.security.events.LOGOUT',
			icon: 'i-lucide-log-out',
		},
		SESSION_REVOKED: {
			label: 'profile.security.events.SESSION_REVOKED',
			icon: 'i-lucide-monitor-x',
		},
		SESSIONS_REVOKED: {
			label: 'profile.security.events.SESSIONS_REVOKED',
			icon: 'i-lucide-shield-x',
		},
		EMAIL_VERIFICATION_SENT: {
			label: 'profile.security.events.EMAIL_VERIFICATION_SENT',
			icon: 'i-lucide-mail',
		},
		EMAIL_VERIFIED: {
			label: 'profile.security.events.EMAIL_VERIFIED',
			icon: 'i-lucide-mail-check',
		},
		PRIMARY_EMAIL_CHANGED: {
			label: 'profile.security.events.PRIMARY_EMAIL_CHANGED',
			icon: 'i-lucide-at-sign',
		},
		SECONDARY_EMAIL_ADDED: {
			label: 'profile.security.events.SECONDARY_EMAIL_ADDED',
			icon: 'i-lucide-mail-plus',
		},
		SECONDARY_EMAIL_REMOVED: {
			label: 'profile.security.events.SECONDARY_EMAIL_REMOVED',
			icon: 'i-lucide-mail-x',
		},
		PASSWORD_CHANGED: {
			label: 'profile.security.events.PASSWORD_CHANGED',
			icon: 'i-lucide-key-round',
		},
		OAUTH_LINKED: {
			label: 'profile.security.events.OAUTH_LINKED',
			icon: 'i-lucide-plug',
		},
		OAUTH_UNLINKED: {
			label: 'profile.security.events.OAUTH_UNLINKED',
			icon: 'i-lucide-unplug',
		},
		MINECRAFT_ACCOUNT_BOUND: {
			label: 'profile.security.events.MINECRAFT_ACCOUNT_BOUND',
			icon: 'i-lucide-gamepad-2',
		},
	}
const defaultSecurityEventDisplay: SecurityEventDisplay = {
	label: 'profile.security.events.UNKNOWN',
	icon: 'i-lucide-circle-help',
}

const roleLabel = computed(() =>
	currentUser.value
		? t(roleLabels[currentUser.value.role])
		: t('profile.security.roles.UNKNOWN'),
)
const userStatusLabel = computed(() =>
	currentUser.value
		? t(statusLabels[currentUser.value.status])
		: t('profile.security.accountStatus.UNKNOWN'),
)
const lastLoginText = computed(() =>
	currentUser.value?.lastLoginAt
		? dayjs(currentUser.value.lastLoginAt).format('YYYY-MM-DD HH:mm:ss')
		: t('profile.security.empty.noRecord'),
)
const primaryEmail = computed(
	() =>
		securityData.value?.security.emails.find(
			(email) => email.kind === 'PRIMARY',
		) ?? null,
)
const passwordResetReceiverEmail = computed(
	() =>
		securityData.value?.security.user.email ?? currentUser.value?.email ?? '',
)
const allEmails = computed(() => securityData.value?.security.emails ?? [])
const orderedEmails = computed(() =>
	[...allEmails.value].sort((left, right) => {
		if (left.kind !== right.kind) {
			return left.kind === 'PRIMARY' ? -1 : 1
		}

		return (
			new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
		)
	}),
)
const deleteEmailTarget = ref<AccountSecurityEmail | null>(null)
const credentialTypeLabel = computed(() =>
	securityData.value?.security.user.hasPassword
		? t('profile.security.credentials.password')
		: t('profile.security.credentials.passwordNotSet'),
)
const activeSessions = computed(
	() => securityData.value?.security.sessions ?? [],
)
const activeSessionCount = computed(() => activeSessions.value.length)
const currentSession = computed(
	() => activeSessions.value.find((session) => session.current) ?? null,
)
const currentSessionLocation = computed(
	() => currentSession.value?.ipLocation?.display ?? null,
)
const securityEvents = computed(() => securityData.value?.security.events ?? [])

const formatDateTime = (value: string): string =>
	dayjs(value).format(
		locale.value === 'zh-CN' ? 'YYYY年M月D日 HH:mm:ss' : 'YYYY-MM-DD HH:mm:ss',
	)

const getIpLocationDisplay = (
	session: Pick<AccountSecuritySession, 'ipLocation'>,
): string =>
	session.ipLocation?.display ?? t('profile.security.values.unknownLocation')

const getIpAddressDisplay = (ipAddress: string | null): string =>
	ipAddress
		? t('profile.security.values.ipAddress', { ip: ipAddress })
		: t('profile.security.values.unknownIp')

interface DeviceInfo {
	label: string
	icon: string
}

const parseDeviceFromUA = (ua: string | null): DeviceInfo => {
	if (!ua) {
		return {
			label: t('profile.security.devices.unknown'),
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
		label: t('profile.security.devices.unknown'),
		icon: 'i-lucide-monitor',
	}
}

const getSecurityEventDisplay = (
	type: SecurityEventType,
): SecurityEventDisplay =>
	securityEventDisplayMap[type] ?? defaultSecurityEventDisplay

const getSecurityEventLabel = (type: SecurityEventType): string =>
	t(getSecurityEventDisplay(type).label)

const getSecurityEventIcon = (type: SecurityEventType): string =>
	getSecurityEventDisplay(type).icon

const resetPasswordCaptcha = (): void => {
	passwordResetCaptcha.reset(true)
	passwordResetCaptchaWidgetRef.value?.reset()
}

const resetAddEmailCaptcha = (): void => {
	addEmailCaptcha.reset(true)
	addEmailCaptchaWidgetRef.value?.reset()
}

const resetVerifyEmailCaptcha = (): void => {
	verifyEmailCaptcha.reset(true)
	verifyEmailCaptchaWidgetRef.value?.reset()
}

const openPasswordModal = (): void => {
	resetPasswordCaptcha()
	passwordModalOpen.value = true
}

const handlePasswordModalOpenChange = (open: boolean): void => {
	passwordModalOpen.value = open
	if (!open) {
		resetPasswordCaptcha()
	}
}

const getEmailFieldLabel = (
	email: AccountSecurityEmail,
	index: number,
): string => {
	if (email.kind === 'PRIMARY') {
		return t('profile.security.fields.primaryEmail')
	}

	return t('profile.security.fields.emailIndex', { index: index + 1 })
}

const changePrimaryEmail = async (
	email: AccountSecurityEmail,
): Promise<void> => {
	if (email.kind === 'PRIMARY' || !email.verifiedAt) {
		return
	}

	changingPrimaryEmailId.value = email.id

	try {
		await $fetch('/api/auth/emails/primary', {
			method: 'PATCH',
			body: { emailId: email.id },
		})
		await refreshSecurity()
		notifySuccess({
			title: t('profile.security.notifications.primaryEmailChanged'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.primaryEmailChangeFailed'),
		})
	} finally {
		changingPrimaryEmailId.value = null
	}
}

const openDeleteEmailModal = (email: AccountSecurityEmail): void => {
	if (email.kind === 'PRIMARY') {
		return
	}

	deleteEmailTarget.value = email
	deleteEmailModalOpen.value = true
}

const deleteSelectedEmail = async (): Promise<void> => {
	if (!deleteEmailTarget.value || deleteEmailTarget.value.kind === 'PRIMARY') {
		return
	}

	deleteEmailSubmitting.value = true

	try {
		await $fetch(`/api/auth/emails/${deleteEmailTarget.value.id}`, {
			method: 'DELETE',
		})
		await refreshSecurity()
		deleteEmailModalOpen.value = false
		deleteEmailTarget.value = null
		notifySuccess({
			title: t('profile.security.notifications.emailDeleted'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.emailDeleteFailed'),
		})
	} finally {
		deleteEmailSubmitting.value = false
	}
}

const resetAddEmailForm = (): void => {
	addEmailStep.value = 'email'
	addEmailForm.email = ''
	addEmailForm.code = ''
	resetAddEmailCaptcha()
}

const openAddEmailModal = (): void => {
	resetAddEmailForm()
	addEmailModalOpen.value = true
}

const handleAddEmailModalOpenChange = (open: boolean): void => {
	addEmailModalOpen.value = open
	if (!open) {
		resetAddEmailForm()
	}
}

const submitAddEmail = async (): Promise<void> => {
	if (!addEmailForm.email) {
		return
	}

	if (addEmailStep.value === 'code') {
		await confirmAddEmail()
		return
	}

	if (!addEmailCaptcha.token.value || addEmailSubmitting.value) {
		return
	}

	addEmailSubmitting.value = true

	try {
		await $fetch('/api/auth/emails/verification/request', {
			method: 'POST',
			body: {
				email: addEmailForm.email,
				purpose: 'ADD_SECONDARY_EMAIL',
				captchaToken: addEmailCaptcha.consumeToken(),
			},
		})
		addEmailStep.value = 'code'
		addEmailForm.code = ''
		resetAddEmailCaptcha()
		notifySuccess({
			title: t('profile.security.notifications.verificationEmailSent'),
			description: t(
				'profile.security.notifications.verificationEmailSentDescription',
			),
		})
	} catch (submitError) {
		resetAddEmailCaptcha()
		notifyError(submitError, {
			title: t('profile.security.notifications.verificationEmailSendFailed'),
		})
	} finally {
		addEmailSubmitting.value = false
	}
}

const confirmAddEmail = async (): Promise<void> => {
	if (!addEmailForm.email || !addEmailForm.code) {
		return
	}

	addEmailVerifying.value = true

	try {
		await $fetch('/api/users/me/security/emails/secondary', {
			method: 'POST',
			body: {
				email: addEmailForm.email,
				code: addEmailForm.code,
			},
		})
		await refreshSecurity()
		addEmailModalOpen.value = false
		resetAddEmailForm()
		notifySuccess({
			title: t('profile.security.notifications.emailAdded'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.emailVerifyFailed'),
			description: t(
				'profile.security.notifications.emailVerifyFailedDescription',
			),
		})
	} finally {
		addEmailVerifying.value = false
	}
}

const startVerifyEmailCooldown = (): void => {
	verifyEmailCooldown.value = 60
	if (verifyEmailCooldownTimer) {
		clearInterval(verifyEmailCooldownTimer)
	}
	verifyEmailCooldownTimer = setInterval(() => {
		verifyEmailCooldown.value -= 1
		if (verifyEmailCooldown.value <= 0) {
			clearInterval(verifyEmailCooldownTimer!)
			verifyEmailCooldownTimer = null
		}
	}, 1000)
}

const openVerifyEmailModal = (email: AccountSecurityEmail): void => {
	verifyEmailTarget.value = email
	verifyEmailForm.code = ''
	verifyEmailCooldown.value = 0
	resetVerifyEmailCaptcha()
	verifyEmailModalOpen.value = true
}

const sendVerifyEmailCode = async (): Promise<void> => {
	if (
		!verifyEmailTarget.value ||
		!verifyEmailCaptcha.token.value ||
		verifyEmailSending.value ||
		verifyEmailCooldown.value > 0
	) {
		return
	}

	verifyEmailSending.value = true

	try {
		await $fetch('/api/users/me/security/email-verifications', {
			method: 'POST',
			body: {
				email: verifyEmailTarget.value.email,
				purpose: 'VERIFY_EMAIL',
				captchaToken: verifyEmailCaptcha.consumeToken(),
			},
		})
		resetVerifyEmailCaptcha()
		startVerifyEmailCooldown()
		notifySuccess({
			title: t('profile.security.notifications.codeSent'),
			description: t('profile.security.notifications.codeSentDescription'),
		})
	} catch (submitError) {
		resetVerifyEmailCaptcha()
		notifyError(submitError, {
			title: t('profile.security.notifications.codeSendFailed'),
		})
	} finally {
		verifyEmailSending.value = false
	}
}

const submitVerifyEmailCode = async (): Promise<void> => {
	if (!verifyEmailTarget.value || !verifyEmailForm.code) {
		return
	}

	verifyEmailSubmitting.value = true

	try {
		await $fetch('/api/users/me/security/emails/verify', {
			method: 'POST',
			body: {
				email: verifyEmailTarget.value.email,
				code: verifyEmailForm.code,
			},
		})
		verifyEmailModalOpen.value = false
		verifyEmailForm.code = ''
		verifyEmailTarget.value = null
		await refreshSecurity()
		notifySuccess({
			title: t('profile.security.notifications.emailVerified'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.emailVerifyFailed'),
			description: t(
				'profile.security.notifications.emailVerifyFailedDescription',
			),
		})
	} finally {
		verifyEmailSubmitting.value = false
	}
}

const submitPasswordReset = async (): Promise<void> => {
	if (!passwordResetReceiverEmail.value || !passwordResetCaptcha.token.value) {
		return
	}

	passwordResetSubmitting.value = true

	try {
		await $fetch('/api/users/me/security/password-reset', {
			method: 'POST',
			body: {
				captchaToken: passwordResetCaptcha.consumeToken(),
			},
		})
		passwordModalOpen.value = false
		resetPasswordCaptcha()
		notifySuccess({
			title: t('profile.security.notifications.resetEmailSent'),
			description: t(
				'profile.security.notifications.resetEmailSentDescription',
			),
		})
		await refreshSecurity()
	} catch (submitError) {
		resetPasswordCaptcha()
		notifyError(submitError, {
			title: t('profile.security.notifications.resetEmailSendFailed'),
		})
	} finally {
		passwordResetSubmitting.value = false
	}
}

const submitLogout = async (): Promise<void> => {
	logoutSubmitting.value = true

	try {
		await logout()
		await navigateTo(localePath('/'))
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.logoutFailed'),
		})
	} finally {
		logoutSubmitting.value = false
	}
}

const revokeSession = async (
	session: AccountSecuritySession,
): Promise<void> => {
	if (session.current) {
		return
	}

	revokingSessionId.value = session.id

	try {
		await $fetch<{ ok: boolean }>(`/api/auth/sessions/${session.id}`, {
			method: 'DELETE',
		})
		await refreshSecurity()
		notifySuccess({
			title: t('profile.security.notifications.sessionRevoked'),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.sessionRevokeFailed'),
		})
	} finally {
		revokingSessionId.value = null
	}
}

const revokeOtherSessions = async (): Promise<void> => {
	revokingOtherSessions.value = true

	try {
		const response = await $fetch<SessionsDeleteResponse>(
			'/api/auth/sessions',
			{
				method: 'DELETE',
			},
		)
		await refreshSecurity()
		revokeSessionsModalOpen.value = false
		notifySuccess({
			title: t('profile.security.notifications.otherSessionsRevoked'),
			description: t(
				'profile.security.notifications.otherSessionsRevokedDescription',
				{ count: response.revokedCount },
			),
		})
	} catch (submitError) {
		notifyError(submitError, {
			title: t('profile.security.notifications.otherSessionsRevokeFailed'),
		})
	} finally {
		revokingOtherSessions.value = false
	}
}
</script>

<style scoped>
.email-row-move,
.email-row-enter-active,
.email-row-leave-active {
	transition:
		transform 180ms ease,
		opacity 180ms ease;
}

.email-row-enter-from,
.email-row-leave-to {
	opacity: 0;
	transform: translateY(6px);
}

.email-row-leave-active {
	position: absolute;
}
</style>
