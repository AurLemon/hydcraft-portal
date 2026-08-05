<template>
	<div class="mx-auto flex w-full flex-col items-center pb-16">
		<div
			v-if="
				(profilePending && !profileData) ||
				(connectionsPending && !connectionsData)
			"
			class="grid w-full gap-5"
		>
			<USkeleton class="h-72 rounded-lg" />
			<USkeleton v-for="index in 3" :key="index" class="h-56 rounded-lg" />
		</div>

		<UAlert
			v-else-if="
				(profileError && !profileData) || (connectionsError && !connectionsData)
			"
			color="error"
			icon="i-lucide-circle-alert"
			:title="t('profile.connections.empty.loadFailed')"
		/>

		<div v-else-if="profile && connections" class="grid w-full gap-5">
			<div class="site-shell mx-auto w-full">
				<ProfileHero :profile="profile" />
			</div>

			<div class="mx-auto mt-16 grid w-full max-w-3xl gap-16">
				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.connections.sections.oauth') }}
						</div>
					</div>
					<div class="grid gap-4">
						<Transition
							v-for="provider in connections.providers"
							:key="provider.provider"
							name="connection-card"
							mode="out-in"
						>
							<div
								:key="`${provider.provider}-${provider.connected}`"
								class="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:items-center sm:justify-between"
							>
								<div
									class="flex-1 flex flex-col sm:flex-row min-w-0 sm:items-center gap-4"
								>
									<div
										class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
									>
										<img
											v-if="provider.logoUrl"
											:src="provider.logoUrl"
											:alt="provider.label"
											class="size-6 object-contain"
										/>
										<UIcon v-else :name="provider.icon" class="size-6" />
									</div>
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<div class="font-semibold text-slate-950 dark:text-white">
												{{ provider.label }}
											</div>
											<UBadge
												:color="provider.connected ? 'primary' : 'neutral'"
												variant="soft"
												:class="
													provider.connected
														? 'inline-flex max-w-full items-center gap-1.5'
														: undefined
												"
											>
												<template v-if="!provider.configured">
													{{ t('profile.connections.status.unavailable') }}
												</template>
												<template v-else-if="provider.connected">
													<UIcon
														name="i-lucide-check"
														class="size-3.5 shrink-0"
													/>
													<UAvatar
														v-if="provider.account?.avatarUrl"
														:src="provider.account.avatarUrl"
														:alt="
															provider.account?.providerUsername ||
															provider.label
														"
														size="3xs"
													/>
													<span class="truncate">
														{{
															provider.account?.providerUsername ||
															provider.account?.providerEmail ||
															t('profile.connections.status.connected')
														}}
													</span>
												</template>
												<template v-else>
													{{ t('profile.connections.status.disconnected') }}
												</template>
											</UBadge>
										</div>
									</div>
								</div>
								<div class="h-fit flex shrink-0 gap-2 mt-2 sm:mt-0">
									<UButton
										v-if="!provider.connected"
										type="button"
										icon="i-lucide-link"
										:to="`/api/auth/oauth/${provider.provider.toLowerCase()}?locale=${locale}`"
										:disabled="!provider.configured"
										external
									>
										{{ t('profile.connections.actions.link') }}
									</UButton>
									<UButton
										v-else
										type="button"
										color="error"
										variant="soft"
										icon="i-lucide-unlink"
										:loading="unlinkingProvider === provider.provider"
										@click="unlinkProvider(provider.provider)"
									>
										{{ t('profile.connections.actions.unlink') }}
									</UButton>
								</div>
							</div>
						</Transition>
					</div>
				</section>

				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.connections.sections.oidc') }}
						</div>
					</div>
					<TransitionGroup
						v-if="connections.oidcGrants.length"
						name="connection-row"
						tag="div"
						class="relative grid gap-4"
					>
						<div
							v-for="grant in connections.oidcGrants"
							:key="grant.id"
							class="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="flex flex-wrap min-w-0 md:items-center gap-2">
									<div class="font-semibold text-slate-950 dark:text-white">
										{{ grant.clientName }}
									</div>
									<UBadge color="primary" variant="soft">
										{{ t('profile.connections.oidc.status.authorized') }}
									</UBadge>
								</div>
								<UButton
									type="button"
									class="shrink-0"
									color="error"
									variant="soft"
									icon="i-lucide-unplug"
									:loading="revokingGrantId === grant.id"
									@click="revokeOIDCGrant(grant.id)"
								>
									{{ t('profile.connections.oidc.actions.revoke') }}
								</UButton>
							</div>

							<div class="grid gap-1.5 text-sm">
								<span class="text-slate-500 dark:text-slate-400">
									{{ t('profile.connections.oidc.fields.scopes') }}
								</span>
								<div class="flex flex-wrap gap-2">
									<UBadge
										v-for="scope in grant.scopes"
										:key="scope"
										color="neutral"
										variant="soft"
									>
										{{ scope }}
									</UBadge>
								</div>
							</div>

							<div class="grid gap-3 text-sm sm:grid-cols-2">
								<div class="grid gap-1.5">
									<span class="text-slate-500 dark:text-slate-400">
										{{ t('profile.connections.oidc.fields.grantedAt') }}
									</span>
									<span class="text-slate-700 dark:text-slate-200">
										{{ formatDateTime(grant.grantedAt) }}
									</span>
								</div>
								<div class="grid gap-1.5">
									<span class="text-slate-500 dark:text-slate-400">
										{{ t('profile.connections.oidc.fields.updatedAt') }}
									</span>
									<span class="text-slate-700 dark:text-slate-200">
										{{ formatDateTime(grant.updatedAt) }}
									</span>
								</div>
							</div>
						</div>
					</TransitionGroup>
					<div
						v-else
						class="rounded-xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400"
					>
						{{ t('profile.connections.oidc.empty') }}
					</div>
				</section>

				<section class="grid gap-3">
					<div class="mx-1 flex items-center justify-between gap-3">
						<div :class="profileSectionTitleClass">
							{{ t('profile.connections.sections.minecraft') }}
						</div>
					</div>
					<div class="grid gap-4">
						<div
							class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 p-5 dark:border-slate-800 bg-linear-to-br from-emerald-600 to-emerald-700"
						>
							<div class="flex min-w-0 items-center gap-4">
								<div
									class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-950/40 text-emerald-300"
								>
									<UIcon name="i-lucide-box" class="size-6" />
								</div>
								<div class="min-w-0">
									<div class="text-lg font-semibold text-white">
										{{
											t('profile.connections.minecraft.boundAccounts', {
												count: connections.minecraft.count,
											})
										}}
									</div>
								</div>
							</div>
							<UButton
								type="button"
								color="success"
								icon="i-lucide-arrow-right"
								:to="localePath('/me/minecraft')"
								class="justify-center"
							>
								{{ t('profile.connections.actions.openMinecraftProfile') }}
							</UButton>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	profileSectionTitleClass,
	type ProfileResponse,
} from '~/utils/profile/edit'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

type Provider = string

interface ExternalAccountSummary {
	id: string
	provider: Provider
	providerAccountId: string
	providerUsername: string | null
	providerEmail: string | null
	avatarUrl: string | null
	lastUsedAt: string | null
	createdAt: string
	updatedAt: string
}

interface ConnectionProvider {
	provider: Provider
	label: string
	icon: string
	logoUrl?: string
	configured: boolean
	connected: boolean
	account: ExternalAccountSummary | null
}

interface OIDCGrantSummary {
	id: string
	clientName: string
	scopes: string[]
	grantedAt: string
	updatedAt: string
}

interface ConnectionsResponse {
	connections: {
		hasPassword: boolean
		providers: ConnectionProvider[]
		minecraft: {
			count: number
			href: string
		}
		oidcGrants: OIDCGrantSummary[]
	}
}

const localePath = useLocalePath()
const { locale, t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const {
	data: profileData,
	pending: profilePending,
	error: profileError,
} = await useFetch<ProfileResponse>('/api/users/me/profile')
const {
	data: connectionsData,
	pending: connectionsPending,
	error: connectionsError,
} = await useFetch<ConnectionsResponse>('/api/users/me/connections')

const profile = computed(() => profileData.value?.profile ?? null)
const connectionState = ref<ConnectionsResponse['connections'] | null>(null)
watch(
	connectionsData,
	(value) => {
		if (value?.connections) {
			connectionState.value = value.connections
		}
	},
	{ immediate: true },
)
const connections = computed(() => connectionState.value)
const unlinkingProvider = ref<Provider | null>(null)
const revokingGrantId = ref<string | null>(null)

const formatDateTime = (value: string): string =>
	new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))

const revokeOIDCGrant = async (grantId: string): Promise<void> => {
	revokingGrantId.value = grantId

	try {
		await $fetch(`/api/users/me/oidc-grants/${grantId}`, {
			method: 'DELETE',
		})
		if (connectionState.value) {
			connectionState.value = {
				...connectionState.value,
				oidcGrants: connectionState.value.oidcGrants.filter(
					(grant) => grant.id !== grantId,
				),
			}
		}
		notifySuccess({
			title: t('profile.connections.oidc.notifications.revoked'),
		})
	} catch (error) {
		notifyError(error, {
			title: t('profile.connections.oidc.notifications.revokeFailed'),
		})
	} finally {
		revokingGrantId.value = null
	}
}

const unlinkProvider = async (provider: Provider): Promise<void> => {
	unlinkingProvider.value = provider

	try {
		await $fetch(`/api/users/me/connections/${provider.toLowerCase()}`, {
			method: 'DELETE',
		})
		if (connectionState.value) {
			connectionState.value = {
				...connectionState.value,
				providers: connectionState.value.providers.map((item) =>
					item.provider === provider
						? { ...item, connected: false, account: null }
						: item,
				),
			}
		}
		notifySuccess({
			title: t('profile.connections.notifications.unlinked', { provider }),
		})
	} catch (error) {
		notifyError(error, {
			title: t('profile.connections.notifications.unlinkFailed', { provider }),
		})
	} finally {
		unlinkingProvider.value = null
	}
}
</script>

<style scoped>
.connection-card-enter-active,
.connection-card-leave-active {
	transition:
		transform 180ms ease,
		opacity 180ms ease;
}

.connection-card-enter-from,
.connection-card-leave-to {
	opacity: 0;
	transform: translateY(6px);
}

.connection-row-move,
.connection-row-enter-active,
.connection-row-leave-active {
	transition:
		transform 180ms ease,
		opacity 180ms ease;
}

.connection-row-enter-from,
.connection-row-leave-to {
	opacity: 0;
	transform: translateY(6px);
}

.connection-row-leave-active {
	position: absolute;
	width: 100%;
}
</style>
