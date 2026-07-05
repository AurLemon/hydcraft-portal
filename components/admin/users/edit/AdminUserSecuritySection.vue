<template>
	<UAlert
		v-if="error"
		color="error"
		icon="i-lucide-circle-alert"
		:title="t('admin.users.security.empty.loadFailed')"
		class="mb-5 break-inside-avoid"
	/>

	<template v-else>
		<section class="mb-5 grid gap-3 break-inside-avoid">
			<div class="mx-1 flex flex-wrap items-center justify-between gap-3">
				<div :class="profileSectionTitleClass">
					{{ t('admin.users.security.sections.overview') }}
				</div>
			</div>
			<div :class="[profileCardClass, 'grid gap-4 md:grid-cols-2']">
				<template v-if="pending || !security">
					<USkeleton
						v-for="index in 6"
						:key="`overview-${index}`"
						class="h-14 rounded-lg"
					/>
				</template>
				<template v-else>
					<div :class="adminReadonlyFieldClass">
						<span>{{ t('admin.users.security.fields.accountStatus') }}</span>
						<strong>{{ userStatusLabel }}</strong>
					</div>
					<div :class="adminReadonlyFieldClass">
						<span>{{ t('admin.users.security.fields.currentRole') }}</span>
						<strong>{{ roleLabel }}</strong>
					</div>
					<div :class="adminReadonlyFieldClass">
						<span>{{ t('admin.users.security.fields.credentialType') }}</span>
						<strong>{{ credentialTypeLabel }}</strong>
					</div>
					<div :class="adminReadonlyFieldClass">
						<span>{{ t('admin.users.security.fields.primaryEmail') }}</span>
						<strong>{{ primaryEmailText }}</strong>
					</div>
					<div :class="adminReadonlyFieldClass">
						<span>{{ t('admin.users.security.fields.lastLogin') }}</span>
						<strong>{{ lastLoginText }}</strong>
					</div>
					<div :class="adminReadonlyFieldClass">
						<span>{{
							t('admin.users.security.fields.activeSessionCount')
						}}</span>
						<strong>{{ String(security.overview.activeSessionCount) }}</strong>
					</div>
					<div :class="adminReadonlyFieldClass">
						<span>{{
							t('admin.users.security.fields.recentSecurityEvents')
						}}</span>
						<strong>{{ String(security.overview.securityEventCount) }}</strong>
					</div>
				</template>
			</div>
		</section>

		<section class="mb-5 grid gap-3 break-inside-avoid">
			<div class="mx-1 flex items-center justify-between gap-3">
				<div :class="profileSectionTitleClass">
					{{ t('admin.users.security.sections.oauth') }}
				</div>
			</div>
			<div class="grid gap-4">
				<template v-if="pending || !security">
					<USkeleton
						v-for="index in 2"
						:key="`oauth-${index}`"
						class="h-28 rounded-lg"
					/>
				</template>
				<template v-else-if="security.oauthConnections.length">
					<div
						v-for="connection in security.oauthConnections"
						:key="connection.id"
						class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<strong class="text-sm text-slate-950 dark:text-slate-100">
										{{ connection.provider }}
									</strong>
									<UBadge
										:color="connection.disconnectedAt ? 'neutral' : 'success'"
										variant="soft"
									>
										{{
											connection.disconnectedAt
												? t('admin.users.security.states.disconnected')
												: t('admin.users.security.states.connected')
										}}
									</UBadge>
								</div>
								<p class="mt-1 break-all font-mono text-xs text-slate-500">
									{{ connection.id }}
								</p>
							</div>
							<UButton
								v-if="!connection.disconnectedAt"
								type="button"
								color="error"
								variant="soft"
								icon="i-lucide-unplug"
								:loading="unlinkingConnectionId === connection.id"
								@click="$emit('request-unlink-oauth', connection.id)"
							>
								{{ t('admin.users.security.actions.unlinkOAuth') }}
							</UButton>
						</div>
						<div class="grid gap-3 md:grid-cols-2">
							<div :class="adminReadonlyFieldClass">
								<span>{{
									t('admin.users.security.fields.providerAccountId')
								}}</span>
								<strong>{{ connection.providerAccountId }}</strong>
							</div>
							<div :class="adminReadonlyFieldClass">
								<span>{{
									t('admin.users.security.fields.providerUsername')
								}}</span>
								<strong>{{ connection.providerUsername || emptyText }}</strong>
							</div>
							<div :class="adminReadonlyFieldClass">
								<span>{{
									t('admin.users.security.fields.providerEmail')
								}}</span>
								<strong>{{ connection.providerEmail || emptyText }}</strong>
							</div>
							<div :class="adminReadonlyFieldClass">
								<span>{{ t('admin.users.security.fields.connectedAt') }}</span>
								<strong>{{ formatDateTime(connection.connectedAt) }}</strong>
							</div>
							<div :class="adminReadonlyFieldClass">
								<span>{{ t('admin.users.security.fields.lastUsedAt') }}</span>
								<strong>{{
									formatNullableDateTime(connection.lastUsedAt)
								}}</strong>
							</div>
							<div :class="adminReadonlyFieldClass">
								<span>{{
									t('admin.users.security.fields.disconnectedAt')
								}}</span>
								<strong>{{
									formatNullableDateTime(connection.disconnectedAt)
								}}</strong>
							</div>
						</div>
					</div>
				</template>
				<div
					v-else
					:class="[
						profileCardClass,
						'text-sm text-slate-500 dark:text-slate-400',
					]"
				>
					{{ t('admin.users.security.empty.oauthConnections') }}
				</div>
			</div>
		</section>

		<section class="mb-5 grid gap-3 break-inside-avoid">
			<div class="mx-1 flex items-center justify-between gap-3">
				<div :class="profileSectionTitleClass">
					{{ t('admin.users.security.sections.emails') }}
				</div>
			</div>
			<div class="grid gap-4">
				<template v-if="pending || !security">
					<USkeleton
						v-for="index in 2"
						:key="`email-${index}`"
						class="h-24 rounded-lg"
					/>
				</template>
				<template v-else-if="security.emails.length">
					<div
						v-for="email in orderedEmails"
						:key="email.id"
						class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-start sm:justify-between"
					>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<strong
									class="break-all text-sm text-slate-950 dark:text-slate-100"
								>
									{{ email.email }}
								</strong>
								<UBadge
									v-if="email.kind === 'PRIMARY'"
									color="primary"
									variant="soft"
								>
									{{ t('admin.users.security.states.primaryEmail') }}
								</UBadge>
								<UBadge
									:color="email.verifiedAt ? 'success' : 'error'"
									variant="soft"
								>
									{{
										email.verifiedAt
											? t('admin.users.security.states.verified')
											: t('admin.users.security.states.unverified')
									}}
								</UBadge>
							</div>
							<p class="mt-1 font-mono text-xs text-slate-500">
								{{ email.id }}
							</p>
							<p class="mt-1 text-sm text-slate-500">
								{{ formatDateTime(email.createdAt) }}
							</p>
						</div>
						<div
							v-if="email.kind !== 'PRIMARY'"
							class="flex shrink-0 flex-wrap items-center gap-2"
						>
							<UButton
								v-if="email.kind !== 'PRIMARY'"
								type="button"
								color="primary"
								variant="soft"
								icon="i-lucide-star"
								:disabled="!email.verifiedAt"
								:loading="changingPrimaryEmailId === email.id"
								@click="$emit('request-set-primary-email', email.id)"
							>
								{{ t('admin.users.security.actions.setPrimaryEmail') }}
							</UButton>
							<UButton
								v-if="email.kind !== 'PRIMARY'"
								type="button"
								color="error"
								variant="soft"
								icon="i-lucide-trash-2"
								:loading="deletingEmailId === email.id"
								@click="$emit('request-delete-email', email.id)"
							>
								{{ t('admin.users.security.actions.deleteEmail') }}
							</UButton>
						</div>
					</div>
				</template>
				<div
					v-else
					:class="[
						profileCardClass,
						'text-sm text-slate-500 dark:text-slate-400',
					]"
				>
					{{ t('admin.users.security.empty.emails') }}
				</div>
			</div>
		</section>

		<section class="mb-5 grid gap-3 break-inside-avoid">
			<div class="mx-1 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<div :class="profileSectionTitleClass">
						{{ t('admin.users.security.sections.sessions') }}
					</div>
					<UBadge variant="soft" color="neutral">
						{{
							t('admin.users.security.sessions.activeCount', {
								count: security?.sessions.length ?? 0,
							})
						}}
					</UBadge>
				</div>
				<UButton
					type="button"
					color="error"
					variant="link"
					icon="i-lucide-shield-x"
					:disabled="!security?.sessions.length"
					:loading="revokingAllSessions"
					@click="$emit('request-revoke-all-sessions')"
				>
					{{ t('admin.users.security.actions.revokeAllSessions') }}
				</UButton>
			</div>
			<div class="grid gap-4">
				<template v-if="pending || !security">
					<USkeleton
						v-for="index in 2"
						:key="`session-${index}`"
						class="h-24 rounded-lg"
					/>
				</template>
				<template v-else-if="security.sessions.length">
					<div
						v-for="session in security.sessions"
						:key="session.id"
						class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-start sm:justify-between"
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
									<UBadge v-if="session.current" color="primary" variant="soft">
										{{ t('admin.users.security.sessions.current') }}
									</UBadge>
								</div>
								<p class="mt-0.5 text-sm text-slate-500">
									{{ getIpLocationDisplay(session.ipLocation) }}
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
							icon="i-lucide-x"
							:disabled="session.current"
							:loading="revokingSessionId === session.id"
							@click="$emit('request-revoke-session', session.id)"
						>
							{{ t('admin.users.security.actions.revokeSession') }}
						</UButton>
					</div>
				</template>
				<div
					v-else
					:class="[
						profileCardClass,
						'text-sm text-slate-500 dark:text-slate-400',
					]"
				>
					{{ t('admin.users.security.empty.sessions') }}
				</div>
			</div>
		</section>

		<section class="mb-5 grid gap-3 break-inside-avoid">
			<div class="mx-1 flex items-center justify-between gap-3">
				<div :class="profileSectionTitleClass">
					{{ t('admin.users.security.sections.events') }}
				</div>
			</div>
			<div class="grid gap-4">
				<template v-if="pending || !security">
					<USkeleton
						v-for="index in 3"
						:key="`event-${index}`"
						class="h-20 rounded-lg"
					/>
				</template>
				<template v-else-if="security.events.length">
					<div
						v-for="eventItem in security.events"
						:key="eventItem.id"
						class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-start sm:justify-between"
					>
						<div class="flex min-w-0 items-start gap-3">
							<UIcon
								:name="getSecurityEventIcon(eventItem.type)"
								class="mt-1 size-5 shrink-0 text-slate-400"
							/>
							<div class="min-w-0">
								<div class="font-medium text-slate-950 dark:text-white">
									{{ getSecurityEventLabel(eventItem.type) }}
								</div>
								<p
									v-if="eventItem.description"
									class="mt-0.5 text-sm text-slate-500"
								>
									{{ eventItem.description }}
								</p>
								<p
									v-if="eventItem.ipLocation?.display"
									class="text-sm text-slate-500"
								>
									{{ eventItem.ipLocation.display }}
								</p>
								<p class="text-sm text-slate-500">
									{{ formatDateTime(eventItem.createdAt) }}
								</p>
							</div>
						</div>
					</div>
				</template>
				<div
					v-else
					:class="[
						profileCardClass,
						'text-sm text-slate-500 dark:text-slate-400',
					]"
				>
					{{ t('admin.users.security.empty.events') }}
				</div>
			</div>
		</section>

		<section class="mb-5 grid gap-3 break-inside-avoid pt-2">
			<div class="mx-1 flex items-center justify-between gap-3">
				<div :class="profileSectionTitleClass">
					{{ t('admin.users.security.sections.dangerZone') }}
				</div>
			</div>
			<div class="flex flex-wrap gap-3">
				<UButton
					type="button"
					color="warning"
					variant="soft"
					icon="i-lucide-key-round"
					:loading="passwordSubmitting"
					@click="$emit('request-password-reset')"
				>
					{{ t('admin.users.security.actions.resetPassword') }}
				</UButton>
				<UButton
					type="button"
					color="error"
					variant="soft"
					icon="i-lucide-trash-2"
					:loading="preparingDelete || deletingUser"
					@click="$emit('request-delete-user')"
				>
					{{ t('admin.users.security.actions.deleteUser') }}
				</UButton>
			</div>
		</section>
	</template>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type {
	AdminUserEmail,
	AdminUserSecurityResponse,
} from '~/components/admin/types'
import { adminReadonlyFieldClass } from '~/utils/admin/users/edit'
import {
	profileCardClass,
	profileSectionTitleClass,
} from '~/utils/profile/edit'

interface SecurityEventDisplay {
	label: string
	icon: string
}

interface DeviceInfo {
	label: string
	icon: string
}

interface AdminUserSecuritySectionProps {
	security: AdminUserSecurityResponse['security'] | null
	pending: boolean
	error: boolean
	passwordSubmitting: boolean
	changingPrimaryEmailId: string | null
	deletingEmailId: string | null
	revokingSessionId: string | null
	revokingAllSessions: boolean
	unlinkingConnectionId: string | null
	preparingDelete: boolean
	deletingUser: boolean
}

const props = defineProps<AdminUserSecuritySectionProps>()
defineEmits<{
	'request-password-reset': []
	'request-set-primary-email': [emailId: string]
	'request-delete-email': [emailId: string]
	'request-revoke-session': [sessionId: string]
	'request-revoke-all-sessions': []
	'request-unlink-oauth': [connectionId: string]
	'request-delete-user': []
}>()

const { t, locale } = useI18n()

const roleLabels = {
	OWNER: 'profile.security.roles.OWNER',
	ADMIN: 'profile.security.roles.ADMIN',
	MEMBER: 'profile.security.roles.MEMBER',
	USER: 'profile.security.roles.USER',
} as const

const statusLabels = {
	ACTIVE: 'profile.security.accountStatus.ACTIVE',
	PENDING: 'profile.security.accountStatus.PENDING',
	DISABLED: 'profile.security.accountStatus.DISABLED',
	BANNED: 'profile.security.accountStatus.BANNED',
} as const

const securityEventDisplayMap: Record<string, SecurityEventDisplay> = {
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
		icon: 'i-lucide-shield-x',
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

const emptyText = computed(() => t('admin.users.security.values.empty'))
const roleLabel = computed(() =>
	props.security
		? t(
				roleLabels[props.security.overview.role] ??
					'profile.security.roles.USER',
			)
		: emptyText.value,
)
const userStatusLabel = computed(() =>
	props.security
		? t(
				statusLabels[props.security.overview.status] ??
					'profile.security.accountStatus.UNKNOWN',
			)
		: emptyText.value,
)
const credentialTypeLabel = computed(() =>
	props.security?.overview.hasPassword
		? t('admin.users.security.values.passwordSet')
		: t('admin.users.security.values.passwordNotSet'),
)
const primaryEmailText = computed(
	() => props.security?.overview.primaryEmail ?? emptyText.value,
)
const lastLoginText = computed(() =>
	props.security?.overview.lastLoginAt
		? formatDateTime(props.security.overview.lastLoginAt)
		: t('admin.users.security.values.noRecord'),
)
const orderedEmails = computed(() =>
	[...(props.security?.emails ?? [])].sort((left, right) => {
		if (left.kind !== right.kind) {
			return left.kind === 'PRIMARY' ? -1 : 1
		}

		return (
			new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
		)
	}),
)

const formatDateTime = (value: string): string =>
	dayjs(value).format(
		locale.value === 'zh-CN' ? 'YYYY年M月D日 HH:mm:ss' : 'YYYY-MM-DD HH:mm:ss',
	)

const formatNullableDateTime = (value: string | null): string =>
	value ? formatDateTime(value) : emptyText.value

const getIpLocationDisplay = (
	location: AdminUserSecurityResponse['security']['sessions'][number]['ipLocation'],
): string =>
	location?.display ?? t('admin.users.security.values.unknownLocation')

const getIpAddressDisplay = (ipAddress: string | null): string =>
	ipAddress
		? t('admin.users.security.values.ipAddress', { ip: ipAddress })
		: t('admin.users.security.values.unknownIp')

const parseDeviceFromUA = (ua: string | null): DeviceInfo => {
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

const getSecurityEventDisplay = (type: string): SecurityEventDisplay =>
	securityEventDisplayMap[type] ?? defaultSecurityEventDisplay

const getSecurityEventLabel = (type: string): string =>
	t(getSecurityEventDisplay(type).label)

const getSecurityEventIcon = (type: string): string =>
	getSecurityEventDisplay(type).icon
</script>
